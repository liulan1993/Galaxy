"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Trail } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// 0. 类型定义
// ============================================================================
interface StarfieldProps {
  speed?: number;
  particleCount?: number;
  warpSpeedActive?: boolean;
  accelerationDuration?: number;
  maxSpeed?: number;
  insideColor: string;
  outsideColor: string;
}

interface GalaxyParams {
  count: number;
  size: number;
  radius: number;
  branches: number;
  spin: number;
  randomness: number;
  randomnessPower: number;
  insideColor: string;
  outsideColor: string;
}

interface GalaxyProps {
    params: GalaxyParams;
}

interface SceneProps {
    galaxyParams: GalaxyParams;
}


// ============================================================================
// 1. 开场动画核心组件
// ============================================================================

const Starfield: React.FC<StarfieldProps> = ({
  speed = 2,
  particleCount = 1500,
  warpSpeedActive = false,
  accelerationDuration = 2,
  maxSpeed = 50,
  insideColor,
  outsideColor,
}) => {
  const ref = useRef<THREE.Points>(null!);
  const warpStartTime = useRef(0);
  const [particleTexture, setParticleTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
        context.beginPath();
        context.arc(32, 32, 30, 0, 2 * Math.PI);
        context.fillStyle = 'white';
        context.fill();
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
    if (warpSpeedActive) {
      warpStartTime.current = Date.now();
    }
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
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        map={particleTexture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
};

const TextShineEffect = ({
  text,
  subtitle,
  onClick
}: {
  text: string;
  subtitle?: string;
  onClick?: () => void;
}) => {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" className="select-none cursor-pointer" onClick={onClick}>
        <defs>
            <linearGradient id="textGradient"><stop offset="0%" stopColor="#ff6030" /><stop offset="50%" stopColor="#ffffff" /><stop offset="100%" stopColor="#1b3984" /></linearGradient>
            <motion.radialGradient id="revealMask" gradientUnits="userSpaceOnUse" r="25%" animate={{ cx: ["-25%", "125%"] }} transition={{ duration: 4, ease: "linear", repeat: Infinity, repeatType: "reverse" }}><stop offset="0%" stopColor="white" /><stop offset="100%" stopColor="black" /></motion.radialGradient>
            <mask id="textMask"><rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)" /></mask>
        </defs>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>
        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-6xl sm:text-7xl md:text-8xl font-bold">{text}</text>
        {subtitle && (<><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text><text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradient)" mask="url(#textMask)" className="font-[Helvetica] text-xl sm:text-2xl md:text-3xl font-semibold">{subtitle}</text></>)}
    </svg>
  );
};

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
            <motion.div
                key="animation-wrapper"
                className="fixed inset-0 z-[100] bg-black"
                exit={{ opacity: 0, transition: { duration: 1.0, delay: 0.5 } }}
            >
                <motion.div
                    className="absolute inset-0 flex items-center justify-center z-10"
                    animate={{
                        opacity: animationState === 'initial' || animationState === 'textFading' ? 1 : 0,
                        scale: animationState === 'textFading' ? 0.8 : 1,
                    }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                    <div className="w-full max-w-2xl px-4">
                        <TextShineEffect
                            text="Apex"
                            subtitle="轻触，开启非凡"
                            onClick={handleEnter}
                        />
                    </div>
                </motion.div>
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: animationState === 'warping' || animationState === 'textFading' ? 1 : 0,
                    }}
                    transition={{ duration: 2.0, ease: "easeIn" }}
                >
                    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                        <Starfield
                            warpSpeedActive={animationState === 'warping'}
                            insideColor={galaxyColors.insideColor}
                            outsideColor={galaxyColors.outsideColor}
                        />
                        <EffectComposer>
                           <Bloom
                             luminanceThreshold={animationState === 'warping' ? 0.0 : 0.1}
                             luminanceSmoothing={0.8}
                             height={300}
                             intensity={animationState === 'warping' ? 30.0 : 0.5}
                           />
                        </EffectComposer>
                    </Canvas>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
  );
}

// ============================================================================
// 2. 主场景组件
// ============================================================================

const Galaxy: React.FC<GalaxyProps> = ({ params }) => {
    const pointsRef = useRef<THREE.Points>(null!);
    const [positions, colors] = useMemo(() => {
        const positions = new Float32Array(params.count * 3);
        const colors = new Float32Array(params.count * 3);
        const colorInside = new THREE.Color(params.insideColor);
        const colorOutside = new THREE.Color(params.outsideColor);
        for (let i = 0; i < params.count; i++) {
            const i3 = i * 3;
            const radius = Math.random() * params.radius;
            const spinAngle = radius * params.spin;
            const branchAngle = (i % params.branches) / params.branches * Math.PI * 2;
            const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
            positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
            positions[i3 + 1] = randomY;
            positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
            const mixedColor = colorInside.clone().lerp(colorOutside, radius / params.radius);
            colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
        }
        return [positions, colors];
    }, [params]);

    useFrame((_, delta) => { if (pointsRef.current) { pointsRef.current.rotation.y += delta * 0.05; } });

    return (
        <points ref={pointsRef} rotation-x={-0.4} position-y={-2}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <pointsMaterial size={params.size} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} vertexColors />
        </points>
    );
};

const Comet: React.FC<{id: string; startPosition: THREE.Vector3; controlPoint: THREE.Vector3; size: number; duration: number; onImpact: () => void; onFaded: (id: string) => void;}> = ({ id, startPosition, controlPoint, size, duration, onImpact, onFaded }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null!);
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

const CometsController: React.FC<{ triggerPulse: () => void }> = ({ triggerPulse }) => {
    const [comets, setComets] = useState<Omit<React.ComponentProps<typeof Comet>, 'onImpact' | 'onFaded' | 'key'>[]>([]);
    const handleFaded = (cometId: string) => setComets(prev => prev.filter(c => c.id !== cometId));

    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = [];
        const scheduleComets = () => {
            for (let i = 0; i < 8; i++) {
                const delay = Math.random() * 15000;
                timeouts.push(setTimeout(() => {
                    const spherical = new THREE.Spherical(20 + Math.random() * 15, Math.random() * Math.PI, Math.random() * Math.PI * 2);
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
        scheduleComets();
        const intervalId = setInterval(scheduleComets, 15000);
        return () => { clearInterval(intervalId); timeouts.forEach(clearTimeout); };
    }, []);

    return <>{comets.map(comet => <Comet key={comet.id} {...comet} onImpact={triggerPulse} onFaded={handleFaded}/>)}</>;
};


const Scene: React.FC<SceneProps> = ({ galaxyParams }) => {
    const bloomRef = useRef<{ intensity: number }>(null!);
    const triggerPulse = () => {
        if (bloomRef.current) { bloomRef.current.intensity = 5; }
        setTimeout(() => { if (bloomRef.current) { bloomRef.current.intensity = 1.2; } }, 250);
    };

    return (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 2, 15], fov: 60 }}>
                <Galaxy params={galaxyParams} />
                <CometsController triggerPulse={triggerPulse} />
                <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} autoRotate={true} autoRotateSpeed={0.2} />
                <EffectComposer>
                    <Bloom ref={bloomRef} luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.2} />
                </EffectComposer>
            </Canvas>
        </div>
    );
};

// ============================================================================
// 3. 主页面和状态控制器
// ============================================================================
export default function Page() {
    const [isClient, setIsClient] = useState(false);
    const [mainContentVisible, setMainContentVisible] = useState(false);

    const galaxyParams: GalaxyParams = useMemo(() => ({
        count: 200000, size: 0.015, radius: 10, branches: 5, spin: 1.5, randomness: 0.5,
        randomnessPower: 3, insideColor: '#ff6030', outsideColor: '#1b3984'
    }), []);

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

    return (
        <div className="relative w-full h-screen bg-[#000] text-white overflow-hidden" style={{ background: 'linear-gradient(to bottom, #000000, #030615)' }}>
            
            {isClient && !mainContentVisible && (
                <OpeningAnimation 
                    onAnimationFinish={handleAnimationFinish}
                    galaxyColors={{ 
                        insideColor: galaxyParams.insideColor, 
                        outsideColor: galaxyParams.outsideColor 
                    }}
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
                        <Scene galaxyParams={galaxyParams} />
                        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center p-8 pointer-events-auto">
                           <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                                欢迎来到星尘之间
                           </h1>
                           <p className="text-xl text-neutral-300">主内容已加载完毕。</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
