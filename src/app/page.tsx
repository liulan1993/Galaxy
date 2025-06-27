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


// ============================================================================
// A. UI & 工具组件 (合并自多个文件)
// ============================================================================

// ----------------------------------------------------------------------------
// A.1. 工具函数与样式 (来自 lib/utils, globals.css)
// ----------------------------------------------------------------------------
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GlobalTimelineStyles = () => (
  <style jsx global>{`
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
    .backdrop-blur-lg { backdrop-filter: blur(16px); }
    .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
    .border-white\\/20 { border-color: rgba(255, 255, 255, 0.2); }
    .border-white\\/30 { border-color: rgba(255, 255, 255, 0.3); }
    .bg-black\\/90 { background-color: rgba(0, 0, 0, 0.9); }
    .text-white\\/70 { color: rgba(255, 255, 255, 0.7); }
    .text-white\\/80 { color: rgba(255, 255, 255, 0.8); }
  `}</style>
);

// ----------------------------------------------------------------------------
// A.2. UI基础组件 (来自 badge.tsx, button.tsx, card.tsx)
// ----------------------------------------------------------------------------
const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", { variants: { variant: { default: "border-transparent bg-primary text-primary-foreground", secondary: "border-transparent bg-secondary text-secondary-foreground", destructive: "border-transparent bg-destructive text-destructive-foreground", outline: "text-foreground" } }, defaultVariants: { variant: "default" } });
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => (<div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />));
Badge.displayName = "Badge";

const buttonVariants = cva("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-primary text-primary-foreground hover:bg-primary/90", destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90", outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground", secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80", ghost: "hover:bg-accent hover:text-accent-foreground", link: "text-primary underline-offset-4 hover:underline" }, size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3", lg: "h-11 rounded-md px-8", icon: "h-10 w-10" } }, defaultVariants: { variant: "default", size: "default" } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => { const Comp = asChild ? Slot : "button"; return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />; });
Button.displayName = "Button";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (<div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />));
Card.displayName = "Card";
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (<div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />));
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (<h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />));
CardTitle.displayName = "CardTitle";
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (<div ref={ref} className={cn("p-6 pt-0", className)} {...props} />));
CardContent.displayName = "CardContent";


// ============================================================================
// B. 新增：3D轨道菜单核心组件
// ============================================================================

// ----------------------------------------------------------------------------
// B.1. 数据与类型定义
// ----------------------------------------------------------------------------
interface TimelineItem {
  id: number; title: string; date: string; content: string; category: string; icon: React.ComponentType<{ size?: number; className?: string }>; relatedIds: number[]; status: "completed" | "in-progress" | "pending"; energy: number;
}

const timelineData: TimelineItem[] = [
    { id: 1, title: "规划", date: "2024年1月", content: "项目规划与需求收集阶段。", category: "Planning", icon: Calendar, relatedIds: [2], status: "completed", energy: 100 },
    { id: 2, title: "设计", date: "2024年2月", content: "UI/UX 设计及系统架构。", category: "Design", icon: FileText, relatedIds: [1, 3], status: "completed", energy: 90 },
    { id: 3, title: "开发", date: "2024年3月", content: "核心功能实现与单元测试。", category: "Development", icon: Code, relatedIds: [2, 4], status: "in-progress", energy: 60 },
    { id: 4, title: "测试", date: "2024年4月", content: "用户测试与 Bug 修复。", category: "Testing", icon: User, relatedIds: [3, 5], status: "pending", energy: 30 },
    { id: 5, title: "发布", date: "2024年5月", content: "最终部署与正式发布。", category: "Release", icon: Clock, relatedIds: [4], status: "pending", energy: 10 },
];

// ----------------------------------------------------------------------------
// B.2. 单个3D菜单节点组件
// ----------------------------------------------------------------------------
const MenuNode: React.FC<{
    item: TimelineItem;
    position: [number, number, number];
    isExpanded: boolean;
    isRelated: boolean;
    onClick: () => void;
    onToggleRelated: (id: number) => void;
}> = ({ item, position, isExpanded, isRelated, onClick, onToggleRelated }) => {
    const { icon: Icon } = item; // 修复点：将 { Icon } 修改为 { icon: Icon }
    const [isHovered, setIsHovered] = useState(false);
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
            <mesh
                onClick={onClick}
                onPointerOver={() => setIsHovered(true)}
                onPointerOut={() => setIsHovered(false)}
                scale={isHovered ? 1.2 : 1}
            >
                <sphereGeometry args={[0.1, 32, 32]} />
                <meshStandardMaterial
                    color={"#ffffff"}
                    emissive={isExpanded ? "#818cf8" : isRelated ? "#facc15" : "#60a5fa"}
                    emissiveIntensity={isExpanded ? 2.5 : isRelated ? 4 : 1.5}
                    toneMapped={false}
                />
            </mesh>

            <Html center>
                <div
                    className="transition-all duration-300 pointer-events-none text-white"
                    style={{
                        width: '256px',
                        opacity: isExpanded ? 1 : 0,
                        visibility: isExpanded ? 'visible' : 'hidden',
                        transform: 'translateY(15px)',
                    }}
                >
                    <Card className="bg-black/90 backdrop-blur-lg border-white/30 shadow-xl shadow-white/10 overflow-visible pointer-events-auto">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50"></div>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <Badge variant="outline" className={`px-2 text-xs ${getStatusStyles(item.status)}`}>
                                    {item.status === "completed" ? "已完成" : item.status === "in-progress" ? "进行中" : "待定"}
                                </Badge>
                                <span className="text-xs font-mono text-white/50">{item.date}</span>
                            </div>
                            <CardTitle className="text-sm mt-2 text-white">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-white/80">
                            <p>{item.content}</p>
                            <div className="mt-4 pt-3 border-t border-white/10">
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="flex items-center"><Zap size={10} className="mr-1" />能量指数</span>
                                    <span className="font-mono">{item.energy}%</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${item.energy}%` }}></div>
                                </div>
                            </div>
                            {item.relatedIds.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-white/10">
                                    <div className="flex items-center mb-2"><Link size={10} className="text-white/70 mr-1" /><h4 className="text-xs uppercase tracking-wider font-medium text-white/70">关联节点</h4></div>
                                    <div className="flex flex-wrap gap-1">
                                        {item.relatedIds.map((relatedId) => {
                                            const relatedItem = timelineData.find((i) => i.id === relatedId);
                                            return (
                                                <Button key={relatedId} variant="outline" size="sm" className="flex items-center h-6 px-2 py-0 text-xs rounded-none border-white/20 bg-transparent hover:bg-white/10 text-white/80 hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); onToggleRelated(relatedId); }}>
                                                    {relatedItem?.title} <ArrowRight size={8} className="ml-1 text-white/60" />
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div
                    className={`absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-wider transition-all duration-300 pointer-events-none ${isExpanded ? "opacity-0" : "opacity-100"}`}
                >
                    <div className='flex flex-col items-center gap-2'>
                        <Icon size={16} className={`${isRelated ? 'text-yellow-400' : 'text-white/80'}`} />
                        <span className={`${isRelated ? 'text-yellow-400' : 'text-white/80'}`}>{item.title}</span>
                    </div>
                </div>
            </Html>
        </group>
    );
};

// ----------------------------------------------------------------------------
// B.3. 3D菜单轨道控制器
// ----------------------------------------------------------------------------
const OrbitalMenu: React.FC<{ timelineData: TimelineItem[] }> = ({ timelineData }) => {
    const [activeId, setActiveId] = useState<number | null>(null);
    const getRelatedIds = (id: number | null) => id === null ? [] : timelineData.find(item => item.id === id)?.relatedIds || [];
    
    const handleToggleItem = (id: number) => {
        setActiveId(prevId => (prevId === id ? null : id));
    };

    const calculateNodePosition = (index: number, total: number, radius: number): [number, number, number] => {
        const angle = (index / total) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        return [x, 0, z];
    };

    return (
        <group>
            <mesh>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial color="#ff6030" emissive="#ff6030" emissiveIntensity={2} toneMapped={false} />
            </mesh>
            <pointLight color="#ff6030" intensity={20} distance={5} />

            {timelineData.map((item, index) => {
                const position = calculateNodePosition(index, timelineData.length, 6);
                const relatedIds = getRelatedIds(activeId);
                return (
                    <MenuNode
                        key={item.id}
                        item={item}
                        position={position}
                        isExpanded={activeId === item.id}
                        isRelated={relatedIds.includes(item.id)}
                        onClick={() => handleToggleItem(item.id)}
                        onToggleRelated={handleToggleItem}
                    />
                );
            })}
        </group>
    );
};


// ============================================================================
// C. 原始场景与页面组件 (已修改以集成新3D菜单)
// ============================================================================

// ----------------------------------------------------------------------------
// C.1. 类型定义 (原始)
// ----------------------------------------------------------------------------
interface StarfieldProps { speed?: number; particleCount?: number; warpSpeedActive?: boolean; accelerationDuration?: number; maxSpeed?: number; insideColor: string; outsideColor: string; }
interface GalaxyParams { count: number; size: number; radius: number; branches: number; spin: number; randomness: number; randomnessPower: number; insideColor: string; outsideColor: string; }
interface GalaxyProps { params: GalaxyParams; }
interface SceneProps { galaxyParams: GalaxyParams; }

// ----------------------------------------------------------------------------
// C.2. 开场动画核心组件 (原始)
// ----------------------------------------------------------------------------
const Starfield: React.FC<StarfieldProps> = ({ speed = 2, particleCount = 1500, warpSpeedActive = false, accelerationDuration = 2, maxSpeed = 50, insideColor, outsideColor }) => {
  const ref = useRef<THREE.Points>(null!); const warpStartTime = useRef(0);
  const [particleTexture, setParticleTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => { const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const context = canvas.getContext('2d'); if (context) { context.beginPath(); context.arc(32, 32, 30, 0, 2 * Math.PI); context.fillStyle = 'white'; context.fill(); } setParticleTexture(new THREE.CanvasTexture(canvas)); }, []);
  const [positions, colors] = useMemo(() => { const particles = new Float32Array(particleCount * 3); const particleColors = new Float32Array(particleCount * 3); const colorInside = new THREE.Color(insideColor); const colorOutside = new THREE.Color(outsideColor); for (let i = 0; i < particleCount; i++) { const i3 = i * 3; const radius = Math.random() * 5; particles[i3] = (Math.random() - 0.5) * 10; particles[i3 + 1] = (Math.random() - 0.5) * 10; particles[i3 + 2] = (Math.random() - 1) * 5; const mixedColor = colorInside.clone().lerp(colorOutside, radius / 5); particleColors[i3] = mixedColor.r; particleColors[i3 + 1] = mixedColor.g; particleColors[i3 + 2] = mixedColor.b; } return [particles, particleColors]; }, [particleCount, insideColor, outsideColor]);
  useEffect(() => { if (warpSpeedActive) { warpStartTime.current = Date.now(); } }, [warpSpeedActive]);
  useFrame((state, delta) => { if (ref.current) { const positions = ref.current.geometry.attributes.position.array as Float32Array; let currentSpeed; if (warpSpeedActive) { const elapsedTime = (Date.now() - warpStartTime.current) / 1000; const accelerationProgress = Math.min(elapsedTime / accelerationDuration, 1); const easedProgress = 1 - Math.pow(1 - accelerationProgress, 3); currentSpeed = speed + (maxSpeed - speed) * easedProgress; } else { currentSpeed = speed; } for (let i = 0; i < particleCount; i++) { positions[i * 3 + 2] += delta * currentSpeed; if (positions[i * 3 + 2] > 5) { positions[i * 3] = (Math.random() - 0.5) * 10; positions[i * 3 + 1] = (Math.random() - 0.5) * 10; positions[i * 3 + 2] = -5; } } ref.current.geometry.attributes.position.needsUpdate = true; } });
  if (!particleTexture) return null;
  return (<points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /><bufferAttribute attach="attributes-color" args={[colors, 3]} /></bufferGeometry><pointsMaterial size={0.05} sizeAttenuation map={particleTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} vertexColors /></points>);
};
const TextShineEffect = ({ text, subtitle, onClick }: { text: string; subtitle?: string; onClick?: () => void; }) => (<svg width="100%" height="100%" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" className="select-none cursor-pointer" onClick={onClick}><defs><linearGradient id="textGradient"><stop offset="0%" stopColor="#ff6030" /><stop offset="50%" stopColor="#ffffff" /><stop offset="100%" stopColor="#1b3984" /></linearGradient><motion.radialGradient id="revealMask" gradientUnits="userSpaceOnUse" r="25%" animate={{ cx: ["-25%", "125%"] }} transition={{ duration: 4, ease: "linear", repeat: Infinity, repeatType: "reverse" }}><stop offset="0%" stopColor="white" /><stop offset="100%" stopColor="black" /></motion.radialGradient><mask id="textMask"><rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)" /></mask></defs><text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text><text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>{subtitle && (<><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text></>)}</svg>);
const OpeningAnimation: React.FC<{ onAnimationFinish: () => void; galaxyColors: { insideColor: string; outsideColor: string; } }> = ({ onAnimationFinish, galaxyColors }) => {
  const [animationState, setAnimationState] = useState('initial'); const [isAnimationVisible, setIsAnimationVisible] = useState(true);
  const handleEnter = () => { if (animationState === 'initial') { sessionStorage.setItem('hasVisitedHomePage', 'true'); setAnimationState('textFading'); setTimeout(() => setAnimationState('warping'), 1500); setTimeout(() => { setIsAnimationVisible(false); onAnimationFinish(); }, 1500 + 1500); } };
  return (<AnimatePresence>{isAnimationVisible && (<motion.div key="animation-wrapper" className="fixed inset-0 z-[100] bg-black" exit={{ opacity: 0, transition: { duration: 1.0, delay: 0.5 } }}><motion.div className="absolute inset-0 flex items-center justify-center z-10" animate={{ opacity: animationState === 'initial' || animationState === 'textFading' ? 1 : 0, scale: animationState === 'textFading' ? 0.8 : 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}><div className="w-full max-w-2xl px-4"><TextShineEffect text="Apex" subtitle="轻触，开启非凡" onClick={handleEnter} /></div></motion.div><motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: animationState === 'warping' || animationState === 'textFading' ? 1 : 0 }} transition={{ duration: 2.0, ease: "easeIn" }}><Canvas camera={{ position: [0, 0, 5], fov: 75 }}><Starfield warpSpeedActive={animationState === 'warping'} insideColor={galaxyColors.insideColor} outsideColor={galaxyColors.outsideColor} /><EffectComposer><Bloom luminanceThreshold={animationState === 'warping' ? 0.0 : 0.1} luminanceSmoothing={0.8} height={300} intensity={animationState === 'warping' ? 30.0 : 0.5} /></EffectComposer></Canvas></motion.div></motion.div>)}</AnimatePresence>);
}

// ----------------------------------------------------------------------------
// C.3. 主3D场景组件 (已修改)
// ----------------------------------------------------------------------------
const Galaxy: React.FC<GalaxyProps> = ({ params }) => {
    const pointsRef = useRef<THREE.Points>(null!);
    const [positions, colors] = useMemo(() => {
        const positions = new Float32Array(params.count * 3); const colors = new Float32Array(params.count * 3);
        const colorInside = new THREE.Color(params.insideColor); const colorOutside = new THREE.Color(params.outsideColor);
        for (let i = 0; i < params.count; i++) { const i3 = i * 3; const radius = Math.random() * params.radius; const spinAngle = radius * params.spin; const branchAngle = (i % params.branches) / params.branches * Math.PI * 2; const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius; const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius; const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius; positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX; positions[i3 + 1] = randomY; positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ; const mixedColor = colorInside.clone().lerp(colorOutside, radius / params.radius); colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b; }
        return [positions, colors];
    }, [params]);
    // NOTE: Self-rotation removed to sync with parent group rotation.
    return (<points ref={pointsRef}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /><bufferAttribute attach="attributes-color" args={[colors, 3]} /></bufferGeometry><pointsMaterial size={params.size} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} vertexColors /></points>);
};
const Comet: React.FC<{id: string; startPosition: THREE.Vector3; controlPoint: THREE.Vector3; size: number; duration: number; onImpact: () => void; onFaded: (id: string) => void;}> = ({ id, startPosition, controlPoint, size, duration, onImpact, onFaded }) => {
    const meshRef = useRef<THREE.Mesh>(null!); const materialRef = useRef<THREE.MeshBasicMaterial>(null!); const [status, setStatus] = useState<'flying' | 'dying' | 'dead'>('flying'); const [finalPosition, setFinalPosition] = useState<THREE.Vector3 | null>(null); const curve = useMemo(() => new THREE.QuadraticBezierCurve3(startPosition, controlPoint, new THREE.Vector3(0, -2, 0)), [startPosition, controlPoint]); const startTime = useRef(Date.now());
    useFrame((_, delta) => { if (!meshRef.current || status === 'dead') return; if (status === 'flying') { const progress = (Date.now() - startTime.current) / duration; if (progress < 1) meshRef.current.position.copy(curve.getPoint(progress)); else { onImpact(); setFinalPosition(meshRef.current.position.clone()); setStatus('dying'); } } if (status === 'dying') { if (materialRef.current) materialRef.current.opacity -= delta * 2.0; if (materialRef.current.opacity <= 0) { setStatus('dead'); onFaded(id); } } });
    const cometMesh = <mesh ref={meshRef} position={status === 'dying' ? finalPosition! : startPosition}><sphereGeometry args={[size, 16, 16]} /><meshBasicMaterial ref={materialRef} color={'#FFFFFF'} toneMapped={false} transparent opacity={1}/></mesh>;
    if (status === 'flying') return <Trail width={size * 12} length={5} color={'#FFFAE8'} attenuation={(t) => t * t}>{cometMesh}</Trail>;
    if (status === 'dying' && finalPosition) return cometMesh; return null;
};
const CometsController: React.FC<{ triggerPulse: () => void }> = ({ triggerPulse }) => {
    const [comets, setComets] = useState<Omit<React.ComponentProps<typeof Comet>, 'onImpact' | 'onFaded' | 'key'>[]>([]); const handleFaded = (cometId: string) => setComets(prev => prev.filter(c => c.id !== cometId));
    useEffect(() => { const timeouts: NodeJS.Timeout[] = []; const scheduleComets = () => { for (let i = 0; i < 8; i++) { const delay = Math.random() * 15000; timeouts.push(setTimeout(() => { const spherical = new THREE.Spherical(20 + Math.random() * 15, Math.random() * Math.PI, Math.random() * Math.PI * 2); const startPosition = new THREE.Vector3().setFromSpherical(spherical); const midPoint = startPosition.clone().multiplyScalar(0.5); const offsetDirection = new THREE.Vector3().crossVectors(startPosition, new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()).normalize(); const controlPoint = midPoint.add(offsetDirection.multiplyScalar(startPosition.length() * 0.4)); const size = 0.01 + Math.random() * 0.015; const duration = 8000 + Math.random() * 5000; setComets(prev => [...prev, { id: uuidv4(), startPosition, controlPoint, size, duration }]); }, delay)); } }; scheduleComets(); const intervalId = setInterval(scheduleComets, 15000); return () => { clearInterval(intervalId); timeouts.forEach(clearTimeout); }; }, []);
    return <>{comets.map(comet => <Comet key={comet.id} {...comet} onImpact={triggerPulse} onFaded={handleFaded}/>)}</>;
};

const Scene: React.FC<SceneProps> = ({ galaxyParams }) => {
    const groupRef = useRef<THREE.Group>(null!);
    const bloomRef = useRef<{ intensity: number }>(null!);
    const triggerPulse = () => { if (bloomRef.current) { bloomRef.current.intensity = 5; } setTimeout(() => { if (bloomRef.current) { bloomRef.current.intensity = 1.2; } }, 250); };
    useFrame((_, delta) => { if (groupRef.current) { groupRef.current.rotation.y += delta * 0.02; } });
    return (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-auto">
            <GlobalTimelineStyles />
            <Canvas camera={{ position: [0, 4, 15], fov: 60 }}>
                <ambientLight intensity={0.2} />
                <group ref={groupRef} rotation-x={-0.4} position-y={-2}>
                    <Galaxy params={galaxyParams} />
                    <OrbitalMenu timelineData={timelineData} />
                </group>
                <CometsController triggerPulse={triggerPulse} />
                <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} autoRotate={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
                <EffectComposer>
                    <Bloom ref={bloomRef} luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.2} />
                </EffectComposer>
            </Canvas>
        </div>
    );
};

// ----------------------------------------------------------------------------
// C.4. 主页面和状态控制器 (已修改)
// ----------------------------------------------------------------------------
export default function Page() {
    const [isClient, setIsClient] = useState(false);
    const [mainContentVisible, setMainContentVisible] = useState(false);
    const galaxyParams: GalaxyParams = useMemo(() => ({ count: 200000, size: 0.015, radius: 10, branches: 5, spin: 1.5, randomness: 0.5, randomnessPower: 3, insideColor: '#ff6030', outsideColor: '#1b3984' }), []);
    useEffect(() => { setIsClient(true); if (sessionStorage.getItem('hasVisitedHomePage')) { setMainContentVisible(true); } }, []);
    const handleAnimationFinish = () => { setTimeout(() => { setMainContentVisible(true); }, 500); };

    return (
        <div className="relative w-full h-screen bg-[#000] text-white overflow-hidden" style={{ background: 'linear-gradient(to bottom, #000000, #030615)' }}>
            {isClient && !mainContentVisible && ( <OpeningAnimation onAnimationFinish={handleAnimationFinish} galaxyColors={{ insideColor: galaxyParams.insideColor, outsideColor: galaxyParams.outsideColor }} /> )}
            <AnimatePresence>
                {mainContentVisible && (
                    <motion.div className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}>
                        <Scene galaxyParams={galaxyParams} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};