"use client";

// ============================================================================
// 0. 核心依赖导入
// ============================================================================
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Trail, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";
import { ArrowRight, Link, Zap, Calendar, Code, FileText, User, Clock } from "lucide-react";
import { BloomEffect } from 'postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';


// ============================================================================
// A. UI & 工具组件 (合并自多个文件)
// ============================================================================

// A.1. 工具函数与样式
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const GlobalTimelineStyles = () => (
  <style jsx global>{`
    .backdrop-blur-lg { backdrop-filter: blur(16px); }
    .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
    .border-white\\/30 { border-color: rgba(255, 255, 255, 0.3); }
    .bg-black\\/90 { background-color: rgba(0, 0, 0, 0.9); }
    .text-white\\/70 { color: rgba(255, 255, 255, 0.7); }
    .text-white\\/80 { color: rgba(255, 255, 255, 0.8); }
  `}</style>
);

// A.2. UI基础组件
const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", { variants: { variant: { default: "border-transparent bg-primary text-primary-foreground", outline: "text-foreground" } }, defaultVariants: { variant: "default" } });
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => (<div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />));
Badge.displayName = "Badge";
const buttonVariants = cva("inline-flex items-center justify-center rounded-md text-sm font-medium", { variants: { variant: { outline: "border border-input bg-transparent hover:bg-accent" }, size: { sm: "h-9 px-3" } }, defaultVariants: { variant: "outline", size: "sm" } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => { const Comp = asChild ? Slot : "button"; return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />; });
Button.displayName = "Button";
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (<div ref={ref} {...props} />));
Card.displayName = "Card";
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (<div ref={ref} {...props} />));
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>((props, ref) => (<h3 ref={ref} {...props} />));
CardTitle.displayName = "CardTitle";
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (<div ref={ref} {...props} />));
CardContent.displayName = "CardContent";

// ============================================================================
// B. 3D轨道菜单核心组件
// ============================================================================

// B.1. 数据与类型定义
interface TimelineItem { id: number; title: string; date: string; content: string; icon: React.ComponentType<{ size?: number; className?: string }>; relatedIds: number[]; status: "completed" | "in-progress" | "pending"; energy: number; }
const timelineData: TimelineItem[] = [
    { id: 1, title: "规划", date: "2024年1月", content: "项目规划与需求收集阶段。", icon: Calendar, relatedIds: [2], status: "completed", energy: 100 },
    { id: 2, title: "设计", date: "2024年2月", content: "UI/UX 设计及系统架构。", icon: FileText, relatedIds: [1, 3], status: "completed", energy: 90 },
    { id: 3, title: "开发", date: "2024年3月", content: "核心功能实现与单元测试。", icon: Code, relatedIds: [2, 4], status: "in-progress", energy: 60 },
    { id: 4, title: "测试", date: "2024年4月", content: "用户测试与 Bug 修复。", icon: User, relatedIds: [3, 5], status: "pending", energy: 30 },
    { id: 5, title: "发布", date: "2024年5月", content: "最终部署与正式发布。", icon: Clock, relatedIds: [4], status: "pending", energy: 10 },
];

// B.2. 单个3D菜单节点组件
const MenuNode: React.FC<{ item: TimelineItem; position: [number, number, number]; isExpanded: boolean; isRelated: boolean; onClick: () => void; onToggleRelated: (id: number) => void; }> = ({ item, position, isExpanded, isRelated, onClick, onToggleRelated }) => {
    const { icon: Icon } = item; const [isHovered, setIsHovered] = useState(false);
    const getStatusStyles = (status: TimelineItem["status"]): string => {
        switch (status) {
            case "completed": return "text-white bg-green-500 border-green-500";
            case "in-progress": return "text-black bg-yellow-400 border-yellow-400";
            case "pending": return "text-white bg-gray-500/80 border-gray-500/80";
            default: return "text-white bg-black/40 border-white/50";
        }
    };
    return (
        <group position={position}>
            <mesh onClick={onClick} onPointerOver={() => setIsHovered(true)} onPointerOut={() => setIsHovered(false)} scale={isHovered ? 1.2 : 1}>
                <sphereGeometry args={[0.1, 32, 32]} />
                <meshStandardMaterial color={"#ffffff"} emissive={isExpanded ? "#818cf8" : isRelated ? "#facc15" : "#60a5fa"} emissiveIntensity={isExpanded ? 2.5 : isRelated ? 4 : 1.5} toneMapped={false} />
            </mesh>
            <Html center>
                <div className="transition-all duration-300 pointer-events-none text-white" style={{ width: '256px', opacity: isExpanded ? 1 : 0, visibility: isExpanded ? 'visible' : 'hidden', transform: 'translateY(15px)' }}>
                    <Card className="bg-black/90 backdrop-blur-lg border-white/30 shadow-xl shadow-white/10 overflow-visible pointer-events-auto">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50"></div>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-center"><Badge variant="outline" className={`px-2 text-xs ${getStatusStyles(item.status)}`}>{item.status === "completed" ? "已完成" : item.status === "in-progress" ? "进行中" : "待定"}</Badge><span className="text-xs font-mono text-white/50">{item.date}</span></div>
                            <CardTitle className="text-sm mt-2 text-white">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 text-xs text-white/80">
                            <p>{item.content}</p>
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex justify-between items-center text-xs mb-1"><span className="flex items-center"><Zap size={10} className="mr-1" />能量</span><span className="font-mono">{item.energy}%</span></div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${item.energy}%` }}></div></div>
                            </div>
                            {item.relatedIds.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <div className="flex items-center mb-2"><Link size={10} className="text-white/70 mr-1" /><h4 className="text-xs uppercase tracking-wider font-medium text-white/70">关联</h4></div>
                                    <div className="flex flex-wrap gap-1">
                                        {item.relatedIds.map((id) => { const rel = timelineData.find(i => i.id === id); return (
                                            <Button key={id} variant="outline" size="sm" className="h-6 px-2 py-0 text-xs" onClick={(e) => { e.stopPropagation(); onToggleRelated(id); }}>{rel?.title}<ArrowRight size={8} className="ml-1" /></Button>
                                        );})}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className={`absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-wider transition-all duration-300 pointer-events-none ${isExpanded ? "opacity-0" : "opacity-100"}`}><div className='flex flex-col items-center gap-2'><Icon size={16} className={`${isRelated ? 'text-yellow-400' : 'text-white/80'}`} /><span className={`${isRelated ? 'text-yellow-400' : 'text-white/80'}`}>{item.title}</span></div></div>
            </Html>
        </group>
    );
};

// B.3. 3D菜单轨道控制器
const OrbitalMenu: React.FC<{ timelineData: TimelineItem[] }> = ({ timelineData }) => {
    const [activeId, setActiveId] = useState<number | null>(null);
    const getRelatedIds = (id: number | null) => id === null ? [] : timelineData.find(item => item.id === id)?.relatedIds || [];
    const handleToggleItem = (id: number) => setActiveId(p => (p === id ? null : id));
    const calculateNodePosition = (i: number, total: number, r: number): [number, number, number] => [r*Math.cos(i/total*Math.PI*2), 0, r*Math.sin(i/total*Math.PI*2)];
    return (
        <group>
            <mesh><sphereGeometry args={[0.3, 32, 32]} /><meshStandardMaterial color="#ff6030" emissive="#ff6030" emissiveIntensity={2} toneMapped={false} /></mesh>
            <pointLight color="#ff6030" intensity={20} distance={5} />
            {timelineData.map((item, index) => (
                <MenuNode key={item.id} item={item} position={calculateNodePosition(index, timelineData.length, 6)} isExpanded={activeId === item.id} isRelated={getRelatedIds(activeId).includes(item.id)} onClick={() => handleToggleItem(item.id)} onToggleRelated={handleToggleItem}/>
            ))}
        </group>
    );
};

// ============================================================================
// C. 场景组件
// ============================================================================

// C.1. 类型定义
interface StarfieldProps { speed?: number; particleCount?: number; warpSpeedActive?: boolean; accelerationDuration?: number; maxSpeed?: number; insideColor: string; outsideColor: string; }
interface GalaxyParams { count: number; size: number; radius: number; branches: number; spin: number; randomness: number; randomnessPower: number; insideColor: string; outsideColor: string; }
interface GalaxyProps { params: GalaxyParams; }
interface SceneProps { galaxyParams: GalaxyParams; }

// C.2. 开场动画核心组件
const Starfield: React.FC<StarfieldProps> = ({ speed = 2, particleCount = 1500, warpSpeedActive = false, accelerationDuration = 2, maxSpeed = 50, insideColor, outsideColor }) => {
  const ref = useRef<THREE.Points>(null!); const warpStartTime = useRef(0);
  const [particleTexture, setParticleTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => { const c=document.createElement('canvas');c.width=64;c.height=64;const ctx=c.getContext('2d');if(ctx){ctx.beginPath();ctx.arc(32,32,30,0,2*Math.PI);ctx.fillStyle='white';ctx.fill();}setParticleTexture(new THREE.CanvasTexture(c));}, []);
  const [positions, colors] = useMemo(() => { const p=new Float32Array(particleCount*3); const c=new Float32Array(particleCount*3); const ci=new THREE.Color(insideColor); const co=new THREE.Color(outsideColor); for(let i=0; i<particleCount; i++){const i3=i*3;const r=Math.random()*5;p[i3]=(Math.random()-0.5)*10;p[i3+1]=(Math.random()-0.5)*10;p[i3+2]=(Math.random()-1)*5;const mc=ci.clone().lerp(co,r/5);c[i3]=mc.r;c[i3+1]=mc.g;c[i3+2]=mc.b;} return [p,c]; }, [particleCount, insideColor, outsideColor]);
  useEffect(() => { if(warpSpeedActive){warpStartTime.current=Date.now();}}, [warpSpeedActive]);
  useFrame((_,delta) => { if(ref.current){const p=ref.current.geometry.attributes.position.array as Float32Array;let cs;if(warpSpeedActive){const et=(Date.now()-warpStartTime.current)/1000;const ap=Math.min(et/accelerationDuration,1);const ep=1-Math.pow(1-ap,3);cs=speed+(maxSpeed-speed)*ep;}else{cs=speed;}for(let i=0;i<particleCount;i++){p[i*3+2]+=delta*cs;if(p[i*3+2]>5){p[i*3]=(Math.random()-0.5)*10;p[i*3+1]=(Math.random()-0.5)*10;p[i*3+2]=-5;}}ref.current.geometry.attributes.position.needsUpdate=true;}});
  if(!particleTexture) return null;
  return (<points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/><bufferAttribute attach="attributes-color" args={[colors,3]}/></bufferGeometry><pointsMaterial size={0.05} sizeAttenuation map={particleTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} vertexColors/></points>);
};
const TextShineEffect = ({ text, subtitle, onClick }: { text: string; subtitle?: string; onClick?: () => void; }) => (<svg width="100%" height="100%" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" className="select-none cursor-pointer" onClick={onClick}><defs><linearGradient id="textGradient"><stop offset="0%" stopColor="#ff6030"/><stop offset="50%" stopColor="#ffffff"/><stop offset="100%" stopColor="#1b3984"/></linearGradient><motion.radialGradient id="revealMask" r="25%" animate={{cx:["-25%","125%"]}} transition={{duration:4,ease:"linear",repeat:Infinity,repeatType:"reverse"}}><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="black"/></motion.radialGradient><mask id="textMask"><rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)"/></mask></defs><text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text><text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>{subtitle && (<><text x="50%" y="70%" textAnchor="middle" fill="white" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text><text x="50%" y="70%" textAnchor="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text></>)}</svg>);
const OpeningAnimation: React.FC<{ onAnimationFinish: () => void; galaxyColors: { insideColor: string; outsideColor: string; } }> = ({ onAnimationFinish, galaxyColors }) => {
  const [animationState, setAnimationState] = useState('initial'); const [isAnimationVisible, setIsAnimationVisible] = useState(true);
  const handleEnter = () => { if (animationState === 'initial') { sessionStorage.setItem('hasVisitedHomePage','true'); setAnimationState('textFading'); setTimeout(() => setAnimationState('warping'), 1500); setTimeout(() => { setIsAnimationVisible(false); onAnimationFinish(); }, 3000); } };
  return (<AnimatePresence>{isAnimationVisible && (<motion.div key="anim-wrap" className="fixed inset-0 z-[100] bg-black" exit={{opacity:0,transition:{duration:1.0,delay:0.5}}}><motion.div className="absolute inset-0 flex items-center justify-center z-10" animate={{opacity:animationState==='initial'||animationState==='textFading'?1:0,scale:animationState==='textFading'?0.8:1}} transition={{duration:1.5,ease:"easeInOut"}}><div className="w-full max-w-2xl px-4"><TextShineEffect text="Apex" subtitle="轻触，开启非凡" onClick={handleEnter}/></div></motion.div><motion.div className="absolute inset-0 pointer-events-none" initial={{opacity:0}} animate={{opacity:animationState==='warping'||animationState==='textFading'?1:0}} transition={{duration:2.0,ease:"easeIn"}}><Canvas camera={{position:[0,0,5],fov:75}}><Starfield warpSpeedActive={animationState==='warping'} insideColor={galaxyColors.insideColor} outsideColor={galaxyColors.outsideColor}/><EffectComposer><Bloom luminanceThreshold={animationState==='warping'?0.0:0.1} luminanceSmoothing={0.8} height={300} intensity={animationState==='warping'?30.0:0.5}/></EffectComposer></Canvas></motion.div></motion.div>)}</AnimatePresence>);
}

// C.3. 主3D场景组件
const Galaxy: React.FC<GalaxyProps> = ({ params }) => {
    const ref = useRef<THREE.Points>(null!);
    const [p, c] = useMemo(() => { const ps=new Float32Array(params.count*3); const cs=new Float32Array(params.count*3); const ci=new THREE.Color(params.insideColor); const co=new THREE.Color(params.outsideColor); for(let i=0;i<params.count;i++){ const i3=i*3; const r=Math.random()*params.radius; const sa=r*params.spin; const ba=(i%params.branches)/params.branches*Math.PI*2; const rx=Math.pow(Math.random(),params.randomnessPower)*(Math.random()<.5?1:-1)*params.randomness*r; const ry=Math.pow(Math.random(),params.randomnessPower)*(Math.random()<.5?1:-1)*params.randomness*r; const rz=Math.pow(Math.random(),params.randomnessPower)*(Math.random()<.5?1:-1)*params.randomness*r; ps[i3]=Math.cos(ba+sa)*r+rx; ps[i3+1]=ry; ps[i3+2]=Math.sin(ba+sa)*r+rz; const mc=ci.clone().lerp(co,r/params.radius); cs[i3]=mc.r; cs[i3+1]=mc.g; cs[i3+2]=mc.b; } return [ps,cs]; }, [params]);
    return (<points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[p,3]}/><bufferAttribute attach="attributes-color" args={[c,3]}/></bufferGeometry><pointsMaterial size={params.size} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} vertexColors/></points>);
};
const Comet: React.FC<{id:string;startPosition:THREE.Vector3;controlPoint:THREE.Vector3;size:number;duration:number;onImpact:()=>void;onFaded:(id:string)=>void;}> = ({id,startPosition,controlPoint,size,duration,onImpact,onFaded}) => {
    const ref=useRef<THREE.Mesh>(null!);const mat=useRef<THREE.MeshBasicMaterial>(null!);const[s,setS]=useState<'flying'|'dying'|'dead'>('flying');const[fp,setFp]=useState<THREE.Vector3|null>(null);const curve=useMemo(()=>new THREE.QuadraticBezierCurve3(startPosition,controlPoint,new THREE.Vector3(0,-2,0)),[startPosition,controlPoint]);const st=useRef(Date.now());
    useFrame((_,d)=>{if(!ref.current||s==='dead')return;if(s==='flying'){const p=(Date.now()-st.current)/duration;if(p<1)ref.current.position.copy(curve.getPoint(p));else{onImpact();setFp(ref.current.position.clone());setS('dying');}}if(s==='dying'){if(mat.current)mat.current.opacity-=d*2.0;if(mat.current.opacity<=0){setS('dead');onFaded(id);}}});
    const m=<mesh ref={ref} position={s==='dying'?fp!:startPosition}><sphereGeometry args={[size,16,16]}/><meshBasicMaterial ref={mat} color={'#FFFFFF'} toneMapped={false} transparent opacity={1}/></mesh>;
    if(s==='flying')return<Trail width={size*12} length={5} color={'#FFFAE8'} attenuation={(t)=>t*t}>{m}</Trail>;
    if(s==='dying'&&fp)return m;return null;
};
const CometsController: React.FC<{ triggerPulse: () => void }> = ({ triggerPulse }) => {
    const [comets, setComets] = useState<Omit<React.ComponentProps<typeof Comet>,'onImpact'|'onFaded'|'key'>[]>([]); const onFaded = (id:string) => setComets(p=>p.filter(c=>c.id!==id));
    useEffect(()=>{const ts:NodeJS.Timeout[]=[];const schedule=()=>{for(let i=0;i<8;i++){const d=Math.random()*15000;ts.push(setTimeout(()=>{const sph=new THREE.Spherical(20+Math.random()*15,Math.random()*Math.PI,Math.random()*Math.PI*2);const sp=new THREE.Vector3().setFromSpherical(sph);const mp=sp.clone().multiplyScalar(0.5);const od=new THREE.Vector3().crossVectors(sp,new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize()).normalize();const cp=mp.add(od.multiplyScalar(sp.length()*0.4));const sz=0.01+Math.random()*0.015;const dur=8000+Math.random()*5000;setComets(p=>[...p,{id:uuidv4(),startPosition:sp,controlPoint:cp,size:sz,duration:dur}]);},d));}};schedule();const int=setInterval(schedule,15000);return()=>{clearInterval(int);ts.forEach(clearTimeout);};},[]);
    return <>{comets.map(c=><Comet key={c.id} {...c} onImpact={triggerPulse} onFaded={onFaded}/>)}</>;
};

// 分离后的背景场景
const BackgroundScene = ({ galaxyParams, camera }: { galaxyParams: GalaxyParams; camera: THREE.Camera }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const bloomRef = useRef<BloomEffect>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.02;
  });

  return (
    <>
      <primitive object={camera} />
      <ambientLight intensity={0.2} />
      <group ref={groupRef} rotation-x={-0.4} position-y={-2}>
        <Galaxy params={galaxyParams} />
      </group>
      <CometsController triggerPulse={() => {
        if (bloomRef.current) {
          bloomRef.current.intensity = 5;
          setTimeout(() => { if (bloomRef.current) bloomRef.current.intensity = 1.2; }, 250);
        }
      }} />
      <EffectComposer>
        <Bloom ref={bloomRef} luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.2} />
      </EffectComposer>
    </>
  );
};

// 分离后的前景场景
const ForegroundScene = ({ onReady }: { onReady: (camera: THREE.Camera) => void }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useFrame((state, delta) => {
    controlsRef.current?.update();
    onReady(state.camera);
  });
  
  return (
    <>
      <group rotation-x={-0.4} position-y={-2}>
        <OrbitalMenu timelineData={timelineData} />
      </group>
      <OrbitControls ref={controlsRef} enableDamping autoRotate={false} />
    </>
  );
};

// C.4. 主页面和状态控制器
export default function Page() {
    const [isClient, setIsClient] = useState(false);
    const [mainContentVisible, setMainContentVisible] = useState(false);
    const [cam, setCam] = useState<THREE.Camera | null>(null);

    const galaxyParams: GalaxyParams = useMemo(() => ({ count: 200000, size: 0.015, radius: 10, branches: 5, spin: 1.5, randomness: 0.5, randomnessPower: 3, insideColor: '#ff6030', outsideColor: '#1b3984' }), []);
    
    useEffect(() => { setIsClient(true); if (sessionStorage.getItem('hasVisitedHomePage')) setMainContentVisible(true); }, []);
    
    const handleAnimationFinish = () => setTimeout(() => setMainContentVisible(true), 500);

    return (
        <div className="relative w-full h-screen bg-[#000] text-white overflow-hidden" style={{ background: 'linear-gradient(to bottom, #000000, #030615)' }}>
            <GlobalTimelineStyles />
            {isClient && !mainContentVisible && ( <OpeningAnimation onAnimationFinish={handleAnimationFinish} galaxyColors={{ insideColor: galaxyParams.insideColor, outsideColor: galaxyParams.outsideColor }} /> )}
            <AnimatePresence>
                {mainContentVisible && (
                    <motion.div className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}>
                       {/* 背景Canvas */}
                       <div className="absolute inset-0 z-0">
                          {cam && <Canvas style={{ background: 'transparent' }}><BackgroundScene galaxyParams={galaxyParams} camera={cam} /></Canvas>}
                       </div>
                       {/* 前景Canvas */}
                       <div className="absolute inset-0 z-10">
                           <Canvas style={{ background: 'transparent' }} camera={{ position: [0, 4, 15], fov: 60 }}><ForegroundScene onReady={setCam} /></Canvas>
                       </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
