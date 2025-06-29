"use client";

// ============================================================================
// 0. 核心依赖导入
// ============================================================================
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
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
// 新增: 响应式设备检测 Hook
// 作用: 检测当前设备类型（手机、平板、PC），以便动态调整渲染质量。
// ============================================================================
type DeviceType = 'mobile' | 'tablet' | 'desktop';

const useDeviceDetect = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setDeviceType('mobile');
      } else if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    handleResize(); // 初始检测
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
};


// ============================================================================
// A. “旋转菜单栏” (RadialOrbitalTimeline) 组件 (已进行响应式优化)
// ============================================================================

// ----------------------------------------------------------------------------
// A.1. 工具函数与样式 (保持原样)
// ----------------------------------------------------------------------------
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
// A.2. UI基础组件 (保持原样)
// ----------------------------------------------------------------------------
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  { variants: { variant: { default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80", secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80", destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80", outline: "text-foreground", }, }, defaultVariants: { variant: "default" }, }
);
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
));
Badge.displayName = "Badge";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  { variants: { variant: { default: "bg-primary text-primary-foreground hover:bg-primary/90", destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90", outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground", secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80", ghost: "hover:bg-accent hover:text-accent-foreground", link: "text-primary underline-offset-4 hover:underline", }, size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3", lg: "h-11 rounded-md px-8", icon: "h-10 w-10", }, }, defaultVariants: { variant: "default", size: "default" }, }
);
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

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
// A.3. 主时间轴组件 (已优化)
// ----------------------------------------------------------------------------
interface TimelineItem {
  id: number; title: string; date: string; content: string; category: string; icon: React.ComponentType<{ size?: number }>; relatedIds: number[]; status: "completed" | "in-progress" | "pending"; energy: number;
}
const timelineData: TimelineItem[] = [
  { id: 1, title: "规划", date: "2024年1月", content: "项目规划与需求收集阶段。", category: "Planning", icon: Calendar, relatedIds: [2], status: "completed", energy: 100, },
  { id: 2, title: "设计", date: "2024年2月", content: "UI/UX 设计及系统架构。", category: "Design", icon: FileText, relatedIds: [1, 3], status: "completed", energy: 90, },
  { id: 3, title: "开发", date: "2024年3月", content: "核心功能实现与单元测试。", category: "Development", icon: Code, relatedIds: [2, 4], status: "in-progress", energy: 60, },
  { id: 4, title: "测试", date: "2024年4月", content: "用户测试与 Bug 修复。", category: "Testing", icon: User, relatedIds: [3, 5], status: "pending", energy: 30, },
  { id: 5, title: "发布", date: "2024年5月", content: "最终部署与正式发布。", category: "Release", icon: Clock, relatedIds: [4], status: "pending", energy: 10, },
];

function RadialOrbitalTimeline({ deviceType }: { deviceType: DeviceType }) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // 修复: 动态计算轨道半径和容器尺寸以实现边缘对齐
  const { orbitRadius, containerSize } = useMemo(() => {
    let radius: number;
    // 节点轨道半径
    switch (deviceType) {
      case 'mobile':
        radius = 65;
        break;
      case 'tablet':
        radius = 80;
        break;
      case 'desktop':
      default:
        radius = 120;
        break;
    }
    // 节点最外层光晕的半径（能量最大时 width: 90px -> radius: 45px)
    const nodeOuterRadius = 45; 
    // 整个系统的总半径 = 轨道半径 + 节点光晕半径
    const totalRadius = radius + nodeOuterRadius;
    // 容器尺寸应为总半径的两倍，以确保圆形完全容纳在内
    const size = totalRadius * 2;
    return { orbitRadius: radius, containerSize: size };
  }, [deviceType]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({}); setActiveNodeId(null); setPulseEffect({}); setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => { if (parseInt(key) !== id) { newState[parseInt(key)] = false; } });
      newState[id] = !prev[id];
      if (!prev[id]) {
        setActiveNodeId(id); setAutoRotate(false);
        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => { newPulseEffect[relId] = true; });
        setPulseEffect(newPulseEffect); centerViewOnNode(id);
      } else {
        setActiveNodeId(null); setAutoRotate(true); setPulseEffect({});
      }
      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;
    if (autoRotate) { rotationTimer = setInterval(() => { setRotationAngle((prev) => (prev + 0.5) % 360); }, 50); }
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
    const radius = orbitRadius; 
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian); const y = radius * Math.sin(radian);
    const zIndex = Math.round(100 + 50 * Math.sin(radian));
    const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId); return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId); return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed": return "text-white bg-green-500 border-green-500";
      case "in-progress": return "text-black bg-yellow-400 border-yellow-400";
      case "pending": return "text-white bg-gray-500/80 border-gray-500/80";
      default: return "text-white bg-black/40 border-white/50";
    }
  };
  
  // 修复: 移除外层容器的 padding
  return (
    <div 
        className="absolute inset-0 flex items-end justify-end pointer-events-none"
        ref={containerRef} 
    >
      <GlobalTimelineStyles />
      {/* 修复: 使用动态计算的尺寸，并使其可交互 */}
      <div 
          className="relative pointer-events-auto"
          style={{ width: `${containerSize}px`, height: `${containerSize}px` }}
          onClick={handleContainerClick}
      >
        <div 
          className="absolute w-full h-full flex items-center justify-center" 
          ref={orbitRef} 
          style={{ perspective: "1000px" }}
        >
          <div className="absolute w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#ff9830] z-10 flex items-center justify-center animate-pulse" style={{ boxShadow: '0 0 35px 8px #ff6030, 0 0 60px 20px rgba(255, 165, 0, 0.5), 0 0 90px 45px rgba(255, 255, 255, 0.1)', animationDuration: '4s', }}>
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white opacity-95 blur-sm"></div>
          </div>
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id]; const isRelated = isRelatedToActive(item.id); const isPulsing = pulseEffect[item.id]; const Icon = item.icon;
            const nodeStyle: React.CSSProperties = { transform: `translate(${position.x}px, ${position.y}px)`, zIndex: isExpanded ? 200 : position.zIndex, opacity: isExpanded ? 1 : position.opacity, };
            
            const cardPositionClass = deviceType === 'mobile' ? 'bottom-16' : 'bottom-20';
            const cardHorizontalPositionClass = 'right-8';

            return (
              <div key={item.id} ref={(el) => { nodeRefs.current[item.id] = el; }} className="absolute transition-all duration-700 cursor-pointer" style={nodeStyle} onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}>
                <div className={`absolute rounded-full -inset-1 ${isPulsing ? "animate-pulse duration-1000" : ""}`} style={{ background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`, width: `${item.energy * 0.5 + 40}px`, height: `${item.energy * 0.5 + 40}px`, left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`, top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`, }} ></div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 transform ${isExpanded ? "bg-white text-black border-white shadow-lg shadow-white/30 scale-150" : isRelated ? "bg-white/50 text-black border-white animate-pulse" : "bg-black text-white border-white/40"}`}> <Icon size={deviceType === 'mobile' ? 12 : 16} /> </div>
                <div className={`absolute top-10 md:top-12 whitespace-nowrap text-xs font-semibold tracking-wider transition-all duration-300 ${isExpanded ? "text-white scale-125" : "text-white/70"}`}>{item.title}</div>
                {isExpanded && (
                  <Card className={`absolute w-64 bg-black/90 backdrop-blur-lg border-white/30 shadow-xl shadow-white/10 overflow-visible ${cardPositionClass} ${cardHorizontalPositionClass}`}>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50"></div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center"><Badge variant="outline" className={`px-2 text-xs ${getStatusStyles(item.status)}`}>{item.status === "completed" ? "已完成" : item.status === "in-progress" ? "进行中" : "待定"}</Badge><span className="text-xs font-mono text-white/50">{item.date}</span></div>
                      <CardTitle className="text-sm mt-2 text-white">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/80">
                      <p>{item.content}</p>
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-xs mb-1"><span className="flex items-center"><Zap size={10} className="mr-1" />能量指数</span><span className="font-mono">{item.energy}%</span></div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${item.energy}%` }}></div></div>
                      </div>
                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center mb-2"><Link size={10} className="text-white/70 mr-1" /><h4 className="text-xs uppercase tracking-wider font-medium text-white/70">关联节点</h4></div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find((i) => i.id === relatedId);
                              return ( <Button key={relatedId} variant="outline" size="sm" className="flex items-center h-6 px-2 py-0 text-xs rounded-none border-white/20 bg-transparent hover:bg-white/10 text-white/80 hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); toggleItem(relatedId); }}>{relatedItem?.title}<ArrowRight size={8} className="ml-1 text-white/60" /></Button> );
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
// B. “黑洞特效标题” (BlackHoleTitle) 组件 (已优化)
// ============================================================================
interface Pointer { x?: number; y?: number; }
class ParticleClass {
    ox: number; oy: number; cx: number; cy: number; or: number; cr: number; pv: number; ov: number; f: number; rgb: number[];
    constructor(x: number, y: number, animationForce: number, rgb: number[] = [(Math.random() * 128), (Math.random() * 128), (Math.random() * 128)]) {
        const rand = (max = 1, min = 0, dec = 0): number => +(min + Math.random() * (max - min)).toFixed(dec);
        this.ox = x; this.oy = y; this.cx = x; this.cy = y;
        this.or = rand(3, 1); this.cr = this.or;
        this.pv = 0; this.ov = 0;
        this.f = rand(animationForce + 15, animationForce - 15);
        this.rgb = rgb.map(c => Math.max(0, c + rand(13, -13)));
    }
    draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = `rgb(${this.rgb.join(',')})`;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, this.cr, 0, 2 * Math.PI); ctx.fill();
    }
    move(interactionRadius: number, hasPointer: boolean, pointer: Pointer) {
        if (hasPointer && pointer.x !== undefined && pointer.y !== undefined) {
            const dx = this.cx - pointer.x; const dy = this.cy - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < interactionRadius && dist > 0) {
                const force = Math.min(this.f, (interactionRadius - dist) / dist * 2);
                this.cx += (dx / dist) * force; this.cy += (dy / dist) * force;
            }
        }
        const odx = this.ox - this.cx; const ody = this.oy - this.cy;
        const od = Math.hypot(odx, ody);
        if (od > 1) {
            const restore = Math.min(od * 0.1, 3);
            this.cx += (odx / od) * restore; this.cy += (ody / od) * restore;
        }
    }
}
interface TextBox { str: string; x?: number; y?: number; w?: number; h?: number; }
export interface BlackHoleTitleProps {
  title: string;
  subtitle: string;
  colors?: string[];
  className?: string;
  animationForce?: number;
  particleDensity?: number;
  deviceType: DeviceType; // 新增
}

// ----------------------------------------------------------------------------
// B.2. 黑洞特效标题核心组件
// ----------------------------------------------------------------------------
const BlackHoleTitle: React.FC<BlackHoleTitleProps> = ({
  title = 'TITLE',
  subtitle = 'Subtitle',
  colors = ['ff6030', 'ffad70', 'f7d297', 'edb9a1', '1b3984'],
  className = '',
  animationForce = 80,
  particleDensity = 3,
  deviceType, // 接收设备类型
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const particlesRef = useRef<ParticleClass[]>([]);
  const pointerRef = useRef<Pointer>({});
  const hasPointerRef = useRef<boolean>(false);
  const interactionRadiusRef = useRef<number>(100);

  // 优化: 根据设备类型调整画布大小和标题字体，避免移动端模糊和卡顿
  const { width, height, titleFontSizeFactor } = useMemo(() => {
    switch (deviceType) {
      case 'mobile': return { width: 360, height: 180, titleFontSizeFactor: 12 };
      case 'tablet': return { width: 600, height: 300, titleFontSizeFactor: 10 };
      case 'desktop': default: return { width: 800, height: 400, titleFontSizeFactor: 10 };
    }
  }, [deviceType]);

  const titleBox = useMemo<TextBox>(() => ({ str: title }), [title]);
  const subtitleBox = useMemo<TextBox>(() => ({ str: subtitle }), [subtitle]);

  const writeAndDottify = useCallback(() => {
      const canvas = canvasRef.current; const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = [];

      // 使用动态字号因子
      titleBox.h = Math.floor(canvas.width / (titleBox.str.length > 0 ? Math.min(titleBox.str.length, titleFontSizeFactor) : titleFontSizeFactor));
      ctx.font = `900 ${titleBox.h}px Verdana, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      titleBox.w = Math.round(ctx.measureText(titleBox.str).width);
      titleBox.x = Math.max(0, 0.5 * (canvas.width - titleBox.w));
      titleBox.y = 0.5 * (canvas.height - titleBox.h) - titleBox.h * 0.3;

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const N = colors.length - 1;
      colors.forEach((c, i) => gradient.addColorStop(i / N, `#${c}`));
      ctx.fillStyle = gradient;
      ctx.fillText(titleBox.str, 0.5 * canvas.width, 0.5 * canvas.height - titleBox.h * 0.3);
      
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const pixels = [];
      for (let y = 0; y < canvas.height; y += particleDensity) {
          for (let x = 0; x < canvas.width; x += particleDensity) {
              const i = (y * canvas.width + x) * 4;
              if (data[i + 3] > 128) {
                  pixels.push({ x: x, y: y, rgb: [data[i], data[i+1], data[i+2]] });
              }
          }
      }
      pixels.forEach(p => { particlesRef.current.push(new ParticleClass(p.x, p.y, animationForce, p.rgb)); });
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 副标题渲染 (不参与粒子化，以提高性能和清晰度)
      subtitleBox.h = Math.floor(titleBox.h * 0.3);
      ctx.font = `400 ${subtitleBox.h}px Verdana, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText(subtitleBox.str, 0.5 * canvas.width, 0.5 * canvas.height + subtitleBox.h * 0.8);

  }, [animationForce, particleDensity, colors, title, subtitle, width, height, titleFontSizeFactor]);
  
  const animate = useCallback(() => {
    const ctx = ctxRef.current; const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 重新绘制副标题，因为它没有被粒子化
    subtitleBox.h = Math.floor(titleBox.h! * 0.3);
    ctx.font = `400 ${subtitleBox.h}px Verdana, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(subtitleBox.str, 0.5 * canvas.width, 0.5 * canvas.height + subtitleBox.h * 0.8);
    
    particlesRef.current.forEach(p => {
        p.move(interactionRadiusRef.current, hasPointerRef.current, pointerRef.current);
        p.draw(ctx);
    });
    animationIdRef.current = requestAnimationFrame(animate);
  }, [subtitle, subtitleBox, titleBox]);
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    ctxRef.current = canvas.getContext('2d');
    
    // 使用动态宽高
    canvas.width = width;
    canvas.height = height;
    interactionRadiusRef.current = Math.max(50, (canvas.width / 10) * 1.5);
    writeAndDottify();
    
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    animate();

    return () => { if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current); };
  }, [writeAndDottify, animate, width, height]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    pointerRef.current.x = (e.clientX - rect.left) * scaleX;
    pointerRef.current.y = (e.clientY - rect.top) * scaleY;
    if (!hasPointerRef.current) { hasPointerRef.current = true; }
  };
  const handlePointerLeave = () => { hasPointerRef.current = false; };

  return (
    <canvas
      ref={canvasRef}
      className={`max-w-full max-h-full ${className} pointer-events-auto`}
      style={{width: `${width}px`, height: `${height}px`}}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    />
  );
};

// ============================================================================
// C. page.tsx 核心组件 (已进行响应式优化)
// ============================================================================
interface QualitySettings {
    dpr: [number, number] | number;
    starfieldCount: number;
    bloomIntensity: { main: number; warp: number; };
    galaxyCount: number;
    cometCount: number;
    particleDensity: number;
}
interface StarfieldProps { speed?: number; particleCount: number; warpSpeedActive?: boolean; accelerationDuration?: number; maxSpeed?: number; insideColor: string; outsideColor: string; }
interface GalaxyParams { count: number; size: number; radius: number; branches: number; spin: number; randomness: number; randomnessPower: number; insideColor: string; outsideColor: string; }
interface GalaxyProps { params: GalaxyParams; }
interface SceneProps { galaxyParams: GalaxyParams; quality: QualitySettings; }
interface OpeningAnimationProps { onAnimationFinish: () => void; galaxyColors: { insideColor: string; outsideColor: string; }; quality: QualitySettings; }

// ----------------------------------------------------------------------------
// C.2. 开场动画核心组件 (已优化)
// ----------------------------------------------------------------------------
const Starfield: React.FC<StarfieldProps> = ({ speed = 2, particleCount, warpSpeedActive = false, accelerationDuration = 2, maxSpeed = 50, insideColor, outsideColor }) => {
  const ref = useRef<THREE.Points>(null!); const warpStartTime = useRef(0);
  const [particleTexture, setParticleTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) { context.beginPath(); context.arc(32, 32, 30, 0, 2 * Math.PI); context.fillStyle = 'white'; context.fill(); }
    setParticleTexture(new THREE.CanvasTexture(canvas));
  }, []);
  const [positions, colors] = useMemo(() => {
    const particles = new Float32Array(particleCount * 3); const particleColors = new Float32Array(particleCount * 3);
    const colorInside = new THREE.Color(insideColor); const colorOutside = new THREE.Color(outsideColor);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3; const radius = Math.random() * 5;
      particles[i3] = (Math.random() - 0.5) * 10; particles[i3 + 1] = (Math.random() - 0.5) * 10; particles[i3 + 2] = (Math.random() - 1) * 5;
      const mixedColor = colorInside.clone().lerp(colorOutside, radius / 5);
      particleColors[i3] = mixedColor.r; particleColors[i3 + 1] = mixedColor.g; particleColors[i3 + 2] = mixedColor.b;
    }
    return [particles, particleColors];
  }, [particleCount, insideColor, outsideColor]);
  useEffect(() => { if (warpSpeedActive) { warpStartTime.current = Date.now(); } }, [warpSpeedActive]);
  useFrame((state, delta) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array; let currentSpeed;
      if (warpSpeedActive) {
        const elapsedTime = (Date.now() - warpStartTime.current) / 1000;
        const accelerationProgress = Math.min(elapsedTime / accelerationDuration, 1);
        const easedProgress = 1 - Math.pow(1 - accelerationProgress, 3);
        currentSpeed = speed + (maxSpeed - speed) * easedProgress;
      } else { currentSpeed = speed; }
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
            <linearGradient id="textGradient"><stop offset="0%" stopColor="#ff6030" /><stop offset="50%" stopColor="#ffffff" /><stop offset="100%" stopColor="#1b3984" /></linearGradient>
            <motion.radialGradient id="revealMask" gradientUnits="userSpaceOnUse" r="25%" animate={{ cx: ["-25%", "125%"] }} transition={{ duration: 4, ease: "linear", repeat: Infinity, repeatType: "reverse" }}>
                <stop offset="0%" stopColor="white" />
                <stop offset="100%" stopColor="black" />
            </motion.radialGradient>
            <mask id="textMask"><rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)" /></mask>
        </defs>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>
        {subtitle && (<><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text></>)}
    </svg>
);

const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onAnimationFinish, galaxyColors, quality }) => {
  const [animationState, setAnimationState] = useState('initial'); const [isAnimationVisible, setIsAnimationVisible] = useState(true);
  const handleEnter = () => {
      if (animationState === 'initial') {
          sessionStorage.setItem('hasVisitedHomePage', 'true'); setAnimationState('textFading');
          setTimeout(() => setAnimationState('warping'), 1500);
          setTimeout(() => { setIsAnimationVisible(false); onAnimationFinish(); }, 1500 + 1500);
      }
  };
  return (
    <AnimatePresence>
        {isAnimationVisible && (
            <motion.div key="animation-wrapper" className="fixed inset-0 z-[100] bg-black" exit={{ opacity: 0, transition: { duration: 1.0, delay: 0.5 } }}>
                <motion.div className="absolute inset-0 flex items-center justify-center z-10" animate={{ opacity: animationState === 'initial' || animationState === 'textFading' ? 1 : 0, scale: animationState === 'textFading' ? 0.8 : 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}>
                    <div className="w-full max-w-2xl px-4"><TextShineEffect text="Galaxy" subtitle="轻触，开启非凡" onClick={handleEnter} /></div>
                </motion.div>
                <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: animationState === 'warping' || animationState === 'textFading' ? 1 : 0 }} transition={{ duration: 2.0, ease: "easeIn" }}>
                    <Canvas camera={{ position: [0, 0, 5], fov: 75 }} dpr={quality.dpr}>
                        <Starfield 
                            warpSpeedActive={animationState === 'warping'} 
                            insideColor={galaxyColors.insideColor} 
                            outsideColor={galaxyColors.outsideColor}
                            particleCount={quality.starfieldCount} 
                        />
                        <EffectComposer>
                           <Bloom luminanceThreshold={animationState === 'warping' ? 0.0 : 0.1} luminanceSmoothing={0.8} height={300} intensity={animationState === 'warping' ? quality.bloomIntensity.warp : 0.5} />
                        </EffectComposer>
                    </Canvas>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
  );
}

// ----------------------------------------------------------------------------
// C.3. 主场景组件 (已优化)
// ----------------------------------------------------------------------------
const Galaxy: React.FC<GalaxyProps> = ({ params }) => {
    const pointsRef = useRef<THREE.Points>(null!);
    const [positions, colors] = useMemo(() => {
        const positions = new Float32Array(params.count * 3); const colors = new Float32Array(params.count * 3);
        const colorInside = new THREE.Color(params.insideColor); const colorOutside = new THREE.Color(params.outsideColor);
        for (let i = 0; i < params.count; i++) {
            const i3 = i * 3; const radius = Math.random() * params.radius; const spinAngle = radius * params.spin; const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;
            const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX; positions[i3 + 1] = randomY; positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
            const mixedColor = colorInside.clone().lerp(colorOutside, radius / params.radius);
            colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
        }
        return [positions, colors];
    }, [params]);
    useFrame((_, delta) => { if (pointsRef.current) { pointsRef.current.rotation.y += delta * 0.05; } });
    return (
        <points ref={pointsRef} rotation-x={-0.4} position-y={-2}>
            <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /><bufferAttribute attach="attributes-color" args={[colors, 3]} /></bufferGeometry>
            <pointsMaterial size={params.size} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} vertexColors />
        </points>
    );
};
const Comet: React.FC<{id: string; startPosition: THREE.Vector3; controlPoint: THREE.Vector3; size: number; duration: number; onImpact: () => void; onFaded: (id: string) => void;}> = ({ id, startPosition, controlPoint, size, duration, onImpact, onFaded }) => {
    const meshRef = useRef<THREE.Mesh>(null!); const materialRef = useRef<THREE.MeshBasicMaterial>(null!);
    const [status, setStatus] = useState<'flying' | 'dying' | 'dead'>('flying'); const [finalPosition, setFinalPosition] = useState<THREE.Vector3 | null>(null);
    const curve = useMemo(() => new THREE.QuadraticBezierCurve3(startPosition, controlPoint, new THREE.Vector3(0, -2, 0)), [startPosition, controlPoint]);
    const startTime = useRef(Date.now());
    useFrame((_, delta) => {
        if (!meshRef.current || status === 'dead') return;
        if (status === 'flying') { const progress = (Date.now() - startTime.current) / duration; if (progress < 1) meshRef.current.position.copy(curve.getPoint(progress)); else { onImpact(); setFinalPosition(meshRef.current.position.clone()); setStatus('dying'); } }
        if (status === 'dying') { if (materialRef.current) materialRef.current.opacity -= delta * 2.0; if (materialRef.current.opacity <= 0) { setStatus('dead'); onFaded(id); } }
    });
    const cometMesh = <mesh ref={meshRef} position={status === 'dying' ? finalPosition! : startPosition}><sphereGeometry args={[size, 16, 16]} /><meshBasicMaterial ref={materialRef} color={'#FFFFFF'} toneMapped={false} transparent opacity={1}/></mesh>;
    if (status === 'flying') return <Trail width={size * 12} length={5} color={'#FFFAE8'} attenuation={(t) => t * t}>{cometMesh}</Trail>;
    if (status === 'dying' && finalPosition) return cometMesh;
    return null;
};
const CometsController: React.FC<{ triggerPulse: () => void; cometCount: number }> = ({ triggerPulse, cometCount }) => {
    const [comets, setComets] = useState<Omit<React.ComponentProps<typeof Comet>, 'onImpact' | 'onFaded' | 'key'>[]>([]);
    const handleFaded = (cometId: string) => setComets(prev => prev.filter(c => c.id !== cometId));
    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = [];
        const scheduleComets = () => {
            for (let i = 0; i < cometCount; i++) {
                const delay = Math.random() * 15000;
                timeouts.push(setTimeout(() => {
                    const spherical = new THREE.Spherical(20 + Math.random() * 15, Math.random() * Math.PI, Math.random() * Math.PI * 2); const startPosition = new THREE.Vector3().setFromSpherical(spherical);
                    const midPoint = startPosition.clone().multiplyScalar(0.5);
                    const offsetDirection = new THREE.Vector3().crossVectors(startPosition, new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()).normalize();
                    const controlPoint = midPoint.add(offsetDirection.multiplyScalar(startPosition.length() * 0.4));
                    const size = 0.01 + Math.random() * 0.015; const duration = 8000 + Math.random() * 5000;
                    setComets(prev => [...prev, { id: uuidv4(), startPosition, controlPoint, size, duration }]);
                }, delay));
            }
        };
        scheduleComets(); const intervalId = setInterval(scheduleComets, 15000);
        return () => { clearInterval(intervalId); timeouts.forEach(clearTimeout); };
    }, [cometCount]);
    return <>{comets.map(comet => <Comet key={comet.id} {...comet} onImpact={triggerPulse} onFaded={handleFaded}/>)}</>;
};
const Scene: React.FC<SceneProps> = ({ galaxyParams, quality }) => {
    const bloomRef = useRef<{ intensity: number }>(null!);
    const triggerPulse = () => {
        if (bloomRef.current) { bloomRef.current.intensity = 5; }
        setTimeout(() => { if (bloomRef.current) { bloomRef.current.intensity = quality.bloomIntensity.main; } }, 250);
    };
    return (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 2, 15], fov: 60 }} dpr={quality.dpr}>
                <Galaxy params={galaxyParams} />
                <CometsController triggerPulse={triggerPulse} cometCount={quality.cometCount}/>
                <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} autoRotate={true} autoRotateSpeed={0.2} />
                <EffectComposer><Bloom ref={bloomRef} luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={quality.bloomIntensity.main} /></EffectComposer>
            </Canvas>
        </div>
    );
};

// ----------------------------------------------------------------------------
// C.4. 主页面和状态控制器 (已集成优化)
// ----------------------------------------------------------------------------
export default function Page() {
    const [isClient, setIsClient] = useState(false);
    const [mainContentVisible, setMainContentVisible] = useState(false);
    
    // 使用设备检测Hook
    const deviceType = useDeviceDetect();

    // 优化: 根据设备类型定义不同的质量配置
    const qualitySettings: QualitySettings = useMemo(() => {
        switch (deviceType) {
            case 'mobile':
                return {
                    dpr: 1, starfieldCount: 500,
                    bloomIntensity: { main: 0.8, warp: 15.0 },
                    galaxyCount: 30000, cometCount: 2, particleDensity: 6,
                };
            case 'tablet':
                return {
                    dpr: 1.5, starfieldCount: 1000,
                    bloomIntensity: { main: 1.0, warp: 20.0 },
                    galaxyCount: 100000, cometCount: 5, particleDensity: 4,
                };
            case 'desktop':
            default:
                return {
                    dpr: [1, 2], starfieldCount: 1500,
                    bloomIntensity: { main: 1.2, warp: 30.0 },
                    galaxyCount: 200000, cometCount: 8, particleDensity: 3,
                };
        }
    }, [deviceType]);
    
    const galaxyParams: GalaxyParams = useMemo(() => ({
        count: qualitySettings.galaxyCount, // 使用动态粒子数
        size: 0.015, radius: 10, branches: 5, spin: 1.5, randomness: 0.5,
        randomnessPower: 3, insideColor: '#ff6030', outsideColor: '#1b3984'
    }), [qualitySettings.galaxyCount]);

    useEffect(() => {
        setIsClient(true);
        if (sessionStorage.getItem('hasVisitedHomePage')) { setMainContentVisible(true); }
    }, []);
    const handleAnimationFinish = () => { setTimeout(() => { setMainContentVisible(true); }, 500); };

    if (!isClient) {
        // 在客户端完全加载前，可以显示一个简单的占位符或null，防止SSR/hydration错误
        return null;
    }

    return (
        <div className="relative w-full h-screen bg-[#000] text-white overflow-hidden" style={{ background: 'linear-gradient(to bottom, #000000, #030615)' }}>
            
            {!mainContentVisible && (
                <OpeningAnimation 
                    onAnimationFinish={handleAnimationFinish}
                    galaxyColors={{ insideColor: galaxyParams.insideColor, outsideColor: galaxyParams.outsideColor }}
                    quality={qualitySettings}
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
                        {/* 静态银河背景 (z-0), 传入质量配置 */}
                        <Scene galaxyParams={galaxyParams} quality={qualitySettings} />
                        
                        {/* 优化: 容器采用 flex 布局，以更好地适应不同屏幕尺寸 */}
                        {/* 在小屏幕上，标题和时间轴垂直堆叠；大屏幕上则按原设计分布 */}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-12 lg:pt-0 lg:justify-center pointer-events-none">
                            <BlackHoleTitle
                                title="GALAXY"
                                subtitle="星河遇见你"
                                particleDensity={qualitySettings.particleDensity}
                                deviceType={deviceType}
                            />
                        </div>

                        {/* 旋转菜单栏 (z-10), 传入设备类型以调整布局 */}
                        <RadialOrbitalTimeline deviceType={deviceType} />

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};