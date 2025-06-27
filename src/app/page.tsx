"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Trail } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

// --- 彗星组件 Props 定义 ---
type CometProps = {
    id: string;
    startPosition: THREE.Vector3;
    controlPoint: THREE.Vector3;
    size: number;
    duration: number;
    onImpact: () => void;
    onFaded: (id: string) => void;
};

// --- 统一的彗星组件 ---
const Comet: React.FC<CometProps> = ({ id, startPosition, controlPoint, size, duration, onImpact, onFaded }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null!);

    // 内部状态机，管理彗星的完整生命周期
    const [status, setStatus] = useState<'flying' | 'dying' | 'dead'>('flying');
    // 用于在状态切换时保存彗星的最终位置
    const [finalPosition, setFinalPosition] = useState<THREE.Vector3 | null>(null);

    const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
        startPosition,
        controlPoint,
        new THREE.Vector3(0, -2, 0)
    ), [startPosition, controlPoint]);

    const startTime = useRef(Date.now());

    useFrame((_, delta) => {
        if (!meshRef.current || status === 'dead') return;

        // 状态一: 飞行中
        if (status === 'flying') {
            const progress = (Date.now() - startTime.current) / duration;
            if (progress < 1) {
                meshRef.current.position.copy(curve.getPoint(progress));
            } else {
                // 飞行结束，准备切换到消亡状态
                onImpact();
                setFinalPosition(meshRef.current.position.clone());
                setStatus('dying');
            }
        }
        
        // 状态二: 消亡中
        if (status === 'dying') {
            if (!materialRef.current) return;
            materialRef.current.opacity -= delta * 2.0; // 淡出
            if (materialRef.current.opacity <= 0) {
                // 完全消失后，通知父组件可以移除自己
                setStatus('dead');
                onFaded(id);
            }
        }
    });

    // 最终修复: 核心逻辑 - 根据状态动态渲染
    // 1. 定义一个可复用的 mesh 核心
    const cometMesh = (
        <mesh 
            ref={meshRef} 
            // 在消亡阶段，使用保存的最终位置
            position={status === 'dying' ? finalPosition! : startPosition}
        >
            <sphereGeometry args={[size, 16, 16]} />
            <meshBasicMaterial
                ref={materialRef}
                color={'#FFFFFF'}
                toneMapped={false}
                transparent={true} // 始终开启透明，以便于后续的淡出
                opacity={1}
            />
        </mesh>
    );

    // 2. 根据状态决定如何渲染
    if (status === 'flying') {
        // 飞行中: 渲染带轨迹的彗星
        return <Trail width={size * 12} length={5} color={'#FFFAE8'} attenuation={(t) => t * t}>{cometMesh}</Trail>;
    }
    
    if (status === 'dying' && finalPosition) {
        // 消亡中: 只渲染彗星核心，不再有 Trail 组件
        return cometMesh;
    }

    // 状态为 'dead' 或其他无效状态时，不渲染任何东西
    return null;
};

// --- 彗星控制器 ---
const CometsController: React.FC<{ triggerPulse: () => void }> = ({ triggerPulse }) => {
    const [comets, setComets] = useState<Omit<CometProps, 'onImpact' | 'onFaded'>[]>([]);

    const handleFaded = (cometId: string) => {
        setComets(prev => prev.filter(c => c.id !== cometId));
    };

    useEffect(() => {
        const timeouts: NodeJS.Timeout[] = [];
        const scheduleComets = () => {
            for (let i = 0; i < 8; i++) {
                const delay = Math.random() * 15000;
                const timeoutId = setTimeout(() => {
                    const spherical = new THREE.Spherical(20 + Math.random() * 15, Math.random() * Math.PI, Math.random() * Math.PI * 2);
                    const startPosition = new THREE.Vector3().setFromSpherical(spherical);
                    const midPoint = startPosition.clone().multiplyScalar(0.5);
                    const offsetDirection = new THREE.Vector3().crossVectors(startPosition, new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()).normalize();
                    const controlPoint = midPoint.add(offsetDirection.multiplyScalar(startPosition.length() * 0.4));
                    const size = 0.01 + Math.random() * 0.015;
                    const duration = 8000 + Math.random() * 5000;
                    const newComet = { id: uuidv4(), startPosition, controlPoint, size, duration };
                    setComets(prev => [...prev, newComet]);
                }, delay);
                timeouts.push(timeoutId);
            }
        };
        scheduleComets();
        const intervalId = setInterval(scheduleComets, 15000);
        return () => {
            clearInterval(intervalId);
            timeouts.forEach(clearTimeout);
        };
    }, []);

    return (
        <>
            {comets.map(comet => (
                <Comet
                    key={comet.id}
                    {...comet}
                    onImpact={triggerPulse}
                    onFaded={handleFaded}
                />
            ))}
        </>
    );
};


// --- Galaxy (星系) 组件 (保持不变) ---
const Galaxy = () => {
    const pointsRef = useRef<THREE.Points>(null!);
    const params = useMemo(() => ({
        count: 200000, size: 0.015, radius: 10, branches: 5, spin: 1.5, randomness: 0.5,
        randomnessPower: 3, insideColor: '#ff6030', outsideColor: '#1b3984'
    }), []);

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
            const mixedColor = colorInside.clone();
            mixedColor.lerp(colorOutside, radius / params.radius);
            colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
        }
        return [positions, colors];
    }, [params]);

    useFrame((state, delta) => {
        if (pointsRef.current) { pointsRef.current.rotation.y += delta * 0.05; }
    });

    return (
        <points ref={pointsRef} rotation-x={-0.4} position-y={-2}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <pointsMaterial size={params.size} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} vertexColors={true} />
        </points>
    );
};

// --- Scene (3D场景) 组件 ---
const Scene = () => {
    const bloomRef = useRef<{ intensity: number }>(null!);

    const triggerPulse = () => {
        if (bloomRef.current) {
            bloomRef.current.intensity = 5;
        }
        setTimeout(() => {
            if (bloomRef.current) {
                bloomRef.current.intensity = 1.2;
            }
        }, 250);
    };

    return (
        <div className="absolute inset-0 w-full h-full z-0" style={{ pointerEvents: 'none' }}>
            <Canvas camera={{ position: [0, 2, 15], fov: 60 }}>
                <Galaxy />
                <CometsController triggerPulse={triggerPulse} />
                <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} autoRotate={true} autoRotateSpeed={0.2} />
                <EffectComposer>
                    <Bloom
                        ref={bloomRef}
                        luminanceThreshold={0}
                        luminanceSmoothing={0.9}
                        height={300}
                        intensity={1.2}
                    />
                </EffectComposer>
            </Canvas>
        </div>
    );
};

// --- 主要的页面组件 (保持不变) ---
export default function Page() {
  return (
    <div className="relative w-full h-screen bg-[#000] text-white overflow-hidden" style={{background: 'linear-gradient(to bottom, #000000, #030615)'}}>
      <Scene />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center p-8" style={{ pointerEvents: 'auto' }}>
          {/* 这里可以放置UI内容 */}
      </div>
    </div>
  );
};
