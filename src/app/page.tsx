"use client";

// ============================================================================
// 0. 核心依赖导入
// ============================================================================
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Trail } from '@react-three/drei';
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
// A. 新增：合并后的 “旋转菜单栏” (RadialOrbitalTimeline) 组件
// 这是根据您提供的6个文件合并、优化后的生产级组件。
// ============================================================================

// ----------------------------------------------------------------------------
// A.1. 工具函数与样式 (来自 lib/utils, globals.css)
// ----------------------------------------------------------------------------

/**
 * 合并 Tailwind CSS 类的工具函数
 * @param inputs - 要合并的类名
 * @returns 合并后的类名字符串
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 注入全局样式的组件 (来自 globals.css)
 * 这些样式对于动画 (如脉冲、ping) 和自定义视觉效果至关重要。
 */
const GlobalTimelineStyles = () => (
  <style jsx global>{`
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes ping {
      75%, 100% { transform: scale(2); opacity: 0; }
    }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
    .backdrop-blur-lg { backdrop-filter: blur(16px); }
    .bg-gradient-orbital { background: linear-gradient(to bottom right, #6366f1, #3b82f6, #14b8a6); }
    .shadow-orbital { box-shadow: 0 0 15px rgba(255, 255, 255, 0.1); }
    .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
    .border-white\\/20 { border-color: rgba(255, 255, 255, 0.2); }
    .border-white\\/30 { border-color: rgba(255, 255, 255, 0.3); }
    .border-white\\/40 { border-color: rgba(255, 255, 255, 0.4); }
    .bg-black\\/90 { background-color: rgba(0, 0, 0, 0.9); }
    .bg-white\\/50 { background-color: rgba(255, 255, 255, 0.5); }
    .bg-white\\/80 { background-color: rgba(255, 255, 255, 0.8); }
    .text-white\\/70 { color: rgba(255, 255, 255, 0.7); }
    .text-white\\/80 { color: rgba(255, 255, 255, 0.8); }
  `}</style>
);


// ----------------------------------------------------------------------------
// A.2. UI基础组件 (来自 badge.tsx, button.tsx, card.tsx)
// ----------------------------------------------------------------------------

// Badge 组件
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
));
Badge.displayName = "Badge";

// Button 组件
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

// Card 组件
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
));
Card.displayName = "Card";
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
));
CardTitle.displayName = "CardTitle";
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";


// ----------------------------------------------------------------------------
// A.3. 主时间轴组件 (来自 radial-orbital-timeline.tsx, demo.tsx)
// ----------------------------------------------------------------------------

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ComponentType<{ size?: number }>;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

const timelineData: TimelineItem[] = [
  { id: 1, title: "规划", date: "2024年1月", content: "项目规划与需求收集阶段。", category: "Planning", icon: Calendar, relatedIds: [2], status: "completed", energy: 100, },
  { id: 2, title: "设计", date: "2024年2月", content: "UI/UX 设计及系统架构。", category: "Design", icon: FileText, relatedIds: [1, 3], status: "completed", energy: 90, },
  { id: 3, title: "开发", date: "2024年3月", content: "核心功能实现与单元测试。", category: "Development", icon: Code, relatedIds: [2, 4], status: "in-progress", energy: 60, },
  { id: 4, title: "测试", date: "2024年4月", content: "用户测试与 Bug 修复。", category: "Testing", icon: User, relatedIds: [3, 5], status: "pending", energy: 30, },
  { id: 5, title: "发布", date: "2024年5月", content: "最终部署与正式发布。", category: "Release", icon: Clock, relatedIds: [4], status: "pending", energy: 10, },
];

function RadialOrbitalTimeline() {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });
      newState[id] = !prev[id];
      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => { newPulseEffect[relId] = true; });
        setPulseEffect(newPulseEffect);
        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }
      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;
    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => (prev + 0.5) % 360);
      }, 50);
    }
    return () => clearInterval(rotationTimer);
  }, [autoRotate]);

  const centerViewOnNode = (nodeId: number) => {
    if (!nodeRefs.current[nodeId]) return;
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 90; // 动态半径，增加视觉层次感
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 50 * Math.sin(radian));
    const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed": return "text-white bg-green-500 border-green-500";
      case "in-progress": return "text-black bg-yellow-400 border-yellow-400";
      case "pending": return "text-white bg-gray-500/80 border-gray-500/80";
      default: return "text-white bg-black/40 border-white/50";
    }
  };

  return (
    <div
      className="relative z-10 w-full h-full flex flex-col items-center justify-center bg-transparent overflow-hidden pointer-events-auto"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <GlobalTimelineStyles />
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div 
          className="absolute w-full h-full flex items-center justify-center" 
          ref={orbitRef} 
          style={{ 
            perspective: "1000px", 
            transform: 'translateX(42vw) translateY(35vh)' 
          }}
        >
          <div
            className="absolute w-16 h-16 rounded-full bg-[#ff9830] z-10 flex items-center justify-center animate-pulse"
            style={{
              boxShadow: '0 0 35px 8px #ff6030, 0 0 60px 20px rgba(255, 165, 0, 0.5), 0 0 90px 45px rgba(255, 255, 255, 0.1)',
              animationDuration: '4s',
            }}
          >
            <div className="w-5 h-5 rounded-full bg-white opacity-95 blur-sm"></div>
          </div>
          
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle: React.CSSProperties = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div key={item.id} ref={(el) => { nodeRefs.current[item.id] = el; }} className="absolute transition-all duration-700 cursor-pointer" style={nodeStyle} onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}>
                <div className={`absolute rounded-full -inset-1 ${isPulsing ? "animate-pulse duration-1000" : ""}`} style={{ background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`, width: `${item.energy * 0.5 + 40}px`, height: `${item.energy * 0.5 + 40}px`, left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`, top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`, }} ></div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 transform ${isExpanded ? "bg-white text-black border-white shadow-lg shadow-white/30 scale-150" : isRelated ? "bg-white/50 text-black border-white animate-pulse" : "bg-black text-white border-white/40"}`}>
                  <Icon size={16} />
                </div>
                <div className={`absolute top-12 whitespace-nowrap text-xs font-semibold tracking-wider transition-all duration-300 ${isExpanded ? "text-white scale-125" : "text-white/70"}`}>
                  {item.title}
                </div>
                {isExpanded && (
                  <Card className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 bg-black/90 backdrop-blur-lg border-white/30 shadow-xl shadow-white/10 overflow-visible">
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50"></div>
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
                                <Button key={relatedId} variant="outline" size="sm" className="flex items-center h-6 px-2 py-0 text-xs rounded-none border-white/20 bg-transparent hover:bg-white/10 text-white/80 hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); toggleItem(relatedId); }}>
                                  {relatedItem?.title}
                                  <ArrowRight size={8} className="ml-1 text-white/60" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// B. 您原始的 page.tsx 组件 (已修改)
// 下方的代码是您原始的页面组件，我已根据您的需求进行了修改。
// ============================================================================

// ----------------------------------------------------------------------------
// B.1. 类型定义 (已修改)
// ----------------------------------------------------------------------------
interface StarfieldProps {
  speed?: number; particleCount?: number; warpSpeedActive?: boolean; accelerationDuration?: number; maxSpeed?: number; insideColor: string; outsideColor: string;
}
// [修改] 为星系参数添加了新的 shape 和 rotationX 属性
interface GalaxyParams {
  count: number; size: number; radius: number; branches: number; spin: number; randomness: number; randomnessPower: number; insideColor: string; outsideColor: string;
  shape: 'spiral' | 'disk'; // 'spiral' 是经典旋臂，'disk' 是吸积盘
  rotationX?: number; // 用于控制特定视角的旋转
  bloomIntensity: number; // 为每个星系定制辉光强度
}
interface GalaxyProps { params: GalaxyParams; }
interface SceneProps { galaxyParams: GalaxyParams; }

// [新增] 5种星系形态的预设参数
const galaxyPresets: GalaxyParams[] = [
  // 预设 0: 炽热旋涡 (灵感源自 fbb9f88b5d2e85443e1463cbedc4c9df.jpg)
  { count: 200000, size: 0.015, radius: 10, branches: 5, spin: 1.5, randomness: 0.5, randomnessPower: 3, insideColor: '#add8e6', outsideColor: '#ff8c00', shape: 'spiral', bloomIntensity: 1.5, rotationX: -0.4 },
  // 预设 1: 蓝色吧台 (灵感源自 f394cddabfa1495e66d162d99086eb99.jpg)
  { count: 250000, size: 0.012, radius: 12, branches: 2, spin: 0.5, randomness: 0.8, randomnessPower: 2.5, insideColor: '#ffd700', outsideColor: '#4169e1', shape: 'spiral', bloomIntensity: 1.8, rotationX: -0.4 },
  // 预设 2: 类银河系 (灵感源自 9bcb415805af9c0eb5350eb231da7353.png)
  { count: 300000, size: 0.01, radius: 11, branches: 4, spin: 1.0, randomness: 0.4, randomnessPower: 2.5, insideColor: '#FFFFFF', outsideColor: '#6495ED', shape: 'spiral', bloomIntensity: 1.2, rotationX: -0.4 },
  // 预设 3: 黑洞吸积盘 (灵感源自 1cf4a1e8101bfcf96f7fc9fc0a88c4de.jpg)
  { count: 150000, size: 0.02, radius: 6, branches: 1, spin: 0, randomness: 1.0, randomnessPower: 1, insideColor: '#FFFFFF', outsideColor: '#FFA500', shape: 'disk', bloomIntensity: 2.5, rotationX: -0.6 },
  // 预设 4: 创生之柱 (灵感源自 a6e7f676436d8228e899372b179f6b2a.jpg) - 侧视星系
  { count: 200000, size: 0.018, radius: 12, branches: 2, spin: 0.2, randomness: 1.5, randomnessPower: 2, insideColor: '#add8e6', outsideColor: '#ff4500', shape: 'spiral', bloomIntensity: 2.0, rotationX: -Math.PI / 2 + 0.15 },
];

// ----------------------------------------------------------------------------
// B.2. 开场动画核心组件 (原始)
// ----------------------------------------------------------------------------
const Starfield: React.FC<StarfieldProps> = ({ speed = 2, particleCount = 1500, warpSpeedActive = false, accelerationDuration = 2, maxSpeed = 50, insideColor, outsideColor }) => {
  const ref = useRef<THREE.Points>(null!);
  const warpStartTime = useRef(0);
  const [particleTexture, setParticleTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath(); context.arc(32, 32, 30, 0, 2 * Math.PI); context.fillStyle = 'white'; context.fill();
    }
    setParticleTexture(new THREE.CanvasTexture(canvas));
  }, []);

  const [positions, colors] = useMemo(() => {
    const particles = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const colorInside = new THREE.Color(insideColor);
    const colorOutside = new THREE.Color(outsideColor);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 5;
      particles[i3] = (Math.random() - 0.5) * 10;
      particles[i3 + 1] = (Math.random() - 0.5) * 10;
      particles[i3 + 2] = (Math.random() - 1) * 5;
      const mixedColor = colorInside.clone().lerp(colorOutside, radius / 5);
      particleColors[i3] = mixedColor.r;
      particleColors[i3 + 1] = mixedColor.g;
      particleColors[i3 + 2] = mixedColor.b;
    }
    return [particles, particleColors];
  }, [particleCount, insideColor, outsideColor]);

  useEffect(() => {
    if (warpSpeedActive) { warpStartTime.current = Date.now(); }
  }, [warpSpeedActive]);

  useFrame((state, delta) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      let currentSpeed;
      if (warpSpeedActive) {
        const elapsedTime = (Date.now() - warpStartTime.current) / 1000;
        const accelerationProgress = Math.min(elapsedTime / accelerationDuration, 1);
        const easedProgress = 1 - Math.pow(1 - accelerationProgress, 3);
        currentSpeed = speed + (maxSpeed - speed) * easedProgress;
      } else {
        currentSpeed = speed;
      }
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 2] += delta * currentSpeed;
        if (positions[i * 3 + 2] > 5) {
          positions[i * 3] = (Math.random() - 0.5) * 10;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
          positions[i * 3 + 2] = -5;
        }
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!particleTexture) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} sizeAttenuation map={particleTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} vertexColors />
    </points>
  );
};

const TextShineEffect = ({ text, subtitle, onClick }: { text: string; subtitle?: string; onClick?: () => void; }) => (
    <svg width="100%" height="100%" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" className="select-none cursor-pointer" onClick={onClick}>
        <defs>
            <linearGradient id="textGradient"><stop offset="0%" stopColor="#ff6030"></stop><stop offset="50%" stopColor="#ffffff"></stop><stop offset="100%" stopColor="#1b3984"></stop></linearGradient>
            {/* [修复] 将自闭合的 <stop /> 改为 <stop></stop> 以解决潜在的 TSX 解析错误 */}
            <motion.radialGradient id="revealMask" gradientUnits="userSpaceOnUse" r="25%" animate={{ cx: ["-25%", "125%"] }} transition={{ duration: 4, ease: "linear", repeat: Infinity, repeatType: "reverse" }}><stop offset="0%" stopColor="white"></stop><stop offset="100%" stopColor="black"></stop></motion.radialGradient>
            <mask id="textMask"><rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)"></rect></mask>
        </defs>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>
        {subtitle && (<><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text></>)}
    </svg>
);

const OpeningAnimation: React.FC<{ onAnimationFinish: () => void; galaxyColors: { insideColor: string; outsideColor: string; } }> = ({ onAnimationFinish, galaxyColors }) => {
  const [animationState, setAnimationState] = useState('initial');
  const [isAnimationVisible, setIsAnimationVisible] = useState(true);

  const handleEnter = () => {
      if (animationState === 'initial') {
          sessionStorage.setItem('hasVisitedHomePage', 'true');
          setAnimationState('textFading');
          setTimeout(() => setAnimationState('warping'), 1500);
          setTimeout(() => {
              setIsAnimationVisible(false);
              onAnimationFinish();
          }, 1500 + 1500);
      }
  };

  return (
    <AnimatePresence>
        {isAnimationVisible && (
            <motion.div key="animation-wrapper" className="fixed inset-0 z-[100] bg-black" exit={{ opacity: 0, transition: { duration: 1.0, delay: 0.5 } }}>
                <motion.div className="absolute inset-0 flex items-center justify-center z-10" animate={{ opacity: animationState === 'initial' || animationState === 'textFading' ? 1 : 0, scale: animationState === 'textFading' ? 0.8 : 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}>
                    <div className="w-full max-w-2xl px-4">
                        <TextShineEffect text="Apex" subtitle="轻触，开启非凡" onClick={handleEnter} />
                    </div>
                </motion.div>
                <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: animationState === 'warping' || animationState === 'textFading' ? 1 : 0 }} transition={{ duration: 2.0, ease: "easeIn" }}>
                    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                        <Starfield warpSpeedActive={animationState === 'warping'} insideColor={galaxyColors.insideColor} outsideColor={galaxyColors.outsideColor} />
                        <EffectComposer>
                           <Bloom luminanceThreshold={animationState === 'warping' ? 0.0 : 0.1} luminanceSmoothing={0.8} height={300} intensity={animationState === 'warping' ? 30.0 : 0.5} />
                        </EffectComposer>
                    </Canvas>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
  );
}

// ----------------------------------------------------------------------------
// B.3. 主场景组件 (已修改)
// ----------------------------------------------------------------------------

/**
 * [新增] 这是一个独立的辅助函数，用于根据给定的参数生成星系粒子数据。
 * @param params 星系参数
 * @returns [positions, colors] 包含位置和颜色信息的数组
 */
const generateGalaxy = (params: GalaxyParams): [Float32Array, Float32Array] => {
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const colorInside = new THREE.Color(params.insideColor);
    const colorOutside = new THREE.Color(params.outsideColor);

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;
        const radius = Math.random() * params.radius;
        let x, y, z;

        if (params.shape === 'disk') {
            // 为“吸积盘”形状生成粒子
            const angle = Math.random() * Math.PI * 2;
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            y = (Math.random() - 0.5) * 0.2 * (radius / params.radius); // 盘面有轻微厚度
        } else {
            // 为经典的“旋臂”形状生成粒子
            const spinAngle = radius * params.spin;
            const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;
            const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            x = Math.cos(branchAngle + spinAngle) * radius + randomX;
            y = randomY;
            z = Math.sin(branchAngle + spinAngle) * radius + randomZ;
        }

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        const mixedColor = colorInside.clone().lerp(colorOutside, radius / params.radius);
        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }
    return [positions, colors];
};


/**
 * [重大修改] Galaxy 组件现在可以处理形态之间的平滑过渡动画
 */
const Galaxy: React.FC<GalaxyProps> = ({ params }) => {
    const pointsRef = useRef<THREE.Points>(null!);
    const transitionRef = useRef({ inProgress: false, startTime: 0, duration: 8000 }); // 8秒过渡时间

    const bufferDataRef = useRef<{
        positions: Float32Array | null,
        colors: Float32Array | null,
        targetPositions: Float32Array | null,
        targetColors: Float32Array | null
    }>({ positions: null, colors: null, targetPositions: null, targetColors: null });

    // 此 effect 会在 params 改变时触发，启动过渡动画
    useEffect(() => {
        // 如果是首次渲染，直接生成并应用初始粒子数据
        if (!bufferDataRef.current.positions) {
            const [positions, colors] = generateGalaxy(params);
            bufferDataRef.current.positions = positions;
            bufferDataRef.current.colors = colors;
            if (pointsRef.current) {
                pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                pointsRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }
            return;
        }

        // 如果 params 变化，生成新的目标数据，并启动过渡动画
        const [targetPositions, targetColors] = generateGalaxy(params);
        bufferDataRef.current.targetPositions = targetPositions;
        bufferDataRef.current.targetColors = targetColors;

        transitionRef.current = { inProgress: true, startTime: Date.now(), duration: 8000 };

    }, [params]);

    useFrame((_, delta) => {
        // 标准自转
        if (pointsRef.current) {
            pointsRef.current.rotation.y += delta * 0.05;
        }

        // 过渡动画逻辑
        const { inProgress, startTime, duration } = transitionRef.current;
        const { positions, colors, targetPositions, targetColors } = bufferDataRef.current;

        if (inProgress && positions && colors && targetPositions && targetColors) {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1.0);
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease In-Out 缓动函数

            // 逐点计算插值
            for (let i = 0; i < params.count; i++) {
                const i3 = i * 3;
                // 位置插值
                positions[i3] = THREE.MathUtils.lerp(positions[i3], targetPositions[i3], easedProgress);
                positions[i3 + 1] = THREE.MathUtils.lerp(positions[i3 + 1], targetPositions[i3 + 1], easedProgress);
                positions[i3 + 2] = THREE.MathUtils.lerp(positions[i3 + 2], targetPositions[i3 + 2], easedProgress);
                // 颜色插值
                colors[i3] = THREE.MathUtils.lerp(colors[i3], targetColors[i3], easedProgress);
                colors[i3 + 1] = THREE.MathUtils.lerp(colors[i3 + 1], targetColors[i3 + 1], easedProgress);
                colors[i3 + 2] = THREE.MathUtils.lerp(colors[i3 + 2], targetColors[i3 + 2], easedProgress);
            }

            // 标记 buffer attribute 需要更新
            if (pointsRef.current) {
                pointsRef.current.geometry.attributes.position.needsUpdate = true;
                pointsRef.current.geometry.attributes.color.needsUpdate = true;
            }

            // 动画结束
            if (progress >= 1.0) {
                transitionRef.current.inProgress = false;
                // 为防止浮点数误差，直接设置为目标值
                bufferDataRef.current.positions?.set(targetPositions);
                bufferDataRef.current.colors?.set(targetColors);
            }
        }
    });
    
    // 初始渲染时，我们提供一个空的 buffer geometry，它将在 useEffect 中被填充
    return (
        <points ref={pointsRef} rotation-x={params.rotationX ?? -0.4} position-y={-2}>
            <bufferGeometry />
            <pointsMaterial size={params.size} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} vertexColors />
        </points>
    );
};


const Comet: React.FC<{id: string; startPosition: THREE.Vector3; controlPoint: THREE.Vector3; size: number; duration: number; onImpact: () => void; onFaded: (id: string) => void;}> = ({ id, startPosition, controlPoint, size, duration, onImpact, onFaded }) => {
    const meshRef = useRef<THREE.Mesh>(null!); const materialRef = useRef<THREE.MeshBasicMaterial>(null!);
    const [status, setStatus] = useState<'flying' | 'dying' | 'dead'>('flying');
    const [finalPosition, setFinalPosition] = useState<THREE.Vector3 | null>(null);
    const curve = useMemo(() => new THREE.QuadraticBezierCurve3(startPosition, controlPoint, new THREE.Vector3(0, -2, 0)), [startPosition, controlPoint]);
    const startTime = useRef(Date.now());
    useFrame((_, delta) => {
        if (!meshRef.current || status === 'dead') return;
        if (status === 'flying') {
            const progress = (Date.now() - startTime.current) / duration;
            if (progress < 1) meshRef.current.position.copy(curve.getPoint(progress));
            else { onImpact(); setFinalPosition(meshRef.current.position.clone()); setStatus('dying'); }
        }
        if (status === 'dying') {
            if (materialRef.current) materialRef.current.opacity -= delta * 2.0;
            if (materialRef.current.opacity <= 0) { setStatus('dead'); onFaded(id); }
        }
    });
    const cometMesh = <mesh ref={meshRef} position={status === 'dying' ? finalPosition! : startPosition}><sphereGeometry args={[size, 16, 16]} /><meshBasicMaterial ref={materialRef} color={'#FFFFFF'} toneMapped={false} transparent opacity={1}/></mesh>;
    if (status === 'flying') return <Trail width={size * 12} length={5} color={'#FFFAE8'} attenuation={(t) => t * t}>{cometMesh}</Trail>;
    if (status === 'dying' && finalPosition) return cometMesh;
    return null;
};

// [修改] CometsController 现在会根据星系半径动态调整流星的生成范围
const CometsController: React.FC<{ triggerPulse: () => void, galaxyRadius: number }> = ({ triggerPulse, galaxyRadius }) => {
    const [comets, setComets] = useState<Omit<React.ComponentProps<typeof Comet>, 'onImpact' | 'onFaded' | 'key'>[]>([]);
    const handleFaded = (cometId: string) => setComets(prev => prev.filter(c => c.id !== cometId));
    
    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = [];
        const scheduleComets = () => {
            for (let i = 0; i < 8; i++) {
                const delay = Math.random() * 15000;
                timeouts.push(setTimeout(() => {
                    // [修改] 流星的起始距离与星系半径关联
                    const spherical = new THREE.Spherical(galaxyRadius * 2 + Math.random() * 15, Math.random() * Math.PI, Math.random() * Math.PI * 2);
                    const startPosition = new THREE.Vector3().setFromSpherical(spherical);
                    const midPoint = startPosition.clone().multiplyScalar(0.5);
                    const offsetDirection = new THREE.Vector3().crossVectors(startPosition, new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()).normalize();
                    const controlPoint = midPoint.add(offsetDirection.multiplyScalar(startPosition.length() * 0.4));
                    const size = 0.01 + Math.random() * 0.015;
                    const duration = 8000 + Math.random() * 5000;
                    setComets(prev => [...prev, { id: uuidv4(), startPosition, controlPoint, size, duration }]);
                }, delay));
            }
        };
        scheduleComets(); const intervalId = setInterval(scheduleComets, 15000);
        return () => { clearInterval(intervalId); timeouts.forEach(clearTimeout); };
    }, [galaxyRadius]); // [修改] 依赖项增加了 galaxyRadius

    return <>{comets.map(comet => <Comet key={comet.id} {...comet} onImpact={triggerPulse} onFaded={handleFaded}/>)}</>;
};

// [修改] Scene 组件现在可以动态调整辉光强度
const Scene: React.FC<SceneProps> = ({ galaxyParams }) => {
    const bloomRef = useRef<{ intensity: number }>(null!);
    
    // 使用 useFrame 平滑地过渡辉光强度
    useFrame((_, delta) => {
        if(bloomRef.current) {
            const currentIntensity = bloomRef.current.intensity;
            const targetIntensity = galaxyParams.bloomIntensity;
            bloomRef.current.intensity = THREE.MathUtils.lerp(currentIntensity, targetIntensity, delta * 0.5);
        }
    });

    const triggerPulse = () => {
        if (bloomRef.current) { 
            // 脉冲强度在当前目标强度的基础上增加
            bloomRef.current.intensity = galaxyParams.bloomIntensity + 3.0;
        }
        // 脉冲结束后会通过 useFrame 自动平滑恢复到 targetIntensity
    };
    
    return (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 2, 15], fov: 60 }}>
                <Galaxy params={galaxyParams} />
                <CometsController triggerPulse={triggerPulse} galaxyRadius={galaxyParams.radius} />
                <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} autoRotate={true} autoRotateSpeed={0.2} />
                <EffectComposer>
                    <Bloom ref={bloomRef} luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={galaxyParams.bloomIntensity} />
                </EffectComposer>
            </Canvas>
        </div>
    );
};

// ----------------------------------------------------------------------------
// B.4. 主页面和状态控制器 (已修改)
// ----------------------------------------------------------------------------
export default function Page() {
    const [isClient, setIsClient] = useState(false);
    const [mainContentVisible, setMainContentVisible] = useState(false);
    
    // [新增] 使用 state 来管理当前星系的预设索引
    const [presetIndex, setPresetIndex] = useState(0);

    // [新增] 每隔1分钟（60000毫秒）自动切换到下一个星系预设
    useEffect(() => {
        const intervalId = setInterval(() => {
            setPresetIndex(current => (current + 1) % galaxyPresets.length);
        }, 60000); // 60秒
        return () => clearInterval(intervalId);
    }, []);

    // [修改] 当前的星系参数现在由 presetIndex 动态决定
    const galaxyParams = galaxyPresets[presetIndex];

    useEffect(() => {
        setIsClient(true);
        if (sessionStorage.getItem('hasVisitedHomePage')) {
            setMainContentVisible(true);
        }
    }, []);

    const handleAnimationFinish = () => {
        setTimeout(() => {
            setMainContentVisible(true);
        }, 500);
    };
    
    // [修改] 开场动画的颜色使用第一个预设的颜色
    const openingGalaxyColors = {
        insideColor: galaxyPresets[0].insideColor,
        outsideColor: galaxyPresets[0].outsideColor
    };

    return (
        <div className="relative w-full h-screen bg-[#000] text-white overflow-hidden" style={{ background: 'linear-gradient(to bottom, #000000, #030615)' }}>
            
            {isClient && !mainContentVisible && (
                <OpeningAnimation 
                    onAnimationFinish={handleAnimationFinish}
                    galaxyColors={openingGalaxyColors}
                />
            )}

            <AnimatePresence>
                {mainContentVisible && (
                    <motion.div
                        className="w-full h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    >
                        {/* [修改] Scene 现在接收动态的 galaxyParams */}
                        <Scene galaxyParams={galaxyParams} />
                        
                        {/* 您的旋转菜单栏组件保持不变 */}
                        <RadialOrbitalTimeline />

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};