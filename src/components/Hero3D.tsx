import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";

/**
 * Sleek modern sports-car silhouette, small and animated.
 * Sits bottom-right on mobile (below text), right-side on desktop.
 */

const Car = () => {
  const group = useRef<THREE.Group>(null!);
  const wheels = useRef<THREE.Group[]>([]);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (group.current) {
      group.current.position.y = -0.15 + Math.sin(t * 2) * 0.03;
      group.current.rotation.y = -0.55 + Math.sin(t * 0.4) * 0.06;
      group.current.rotation.z = Math.sin(t * 1.8) * 0.015;
    }
    wheels.current.forEach((w) => {
      if (w) w.rotation.x = t * 10;
    });
  });

  const wheelPositions: [number, number, number][] = [
    [-0.6, -0.24, 0.4],
    [0.6, -0.24, 0.4],
    [-0.6, -0.24, -0.4],
    [0.6, -0.24, -0.4],
  ];

  return (
    <group ref={group}>
      {/* main chassis — sleek wedge */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <boxGeometry args={[1.9, 0.22, 0.82]} />
        <meshStandardMaterial color="#2563eb" metalness={0.85} roughness={0.18} />
      </mesh>

      {/* front nose (tapered) */}
      <mesh position={[0.92, -0.08, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.35, 0.16, 0.78]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* rear boot */}
      <mesh position={[-0.92, -0.05, 0]}>
        <boxGeometry args={[0.28, 0.2, 0.8]} />
        <meshStandardMaterial color="#1e40af" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* cabin / greenhouse — low sloping roof */}
      <mesh position={[-0.05, 0.16, 0]}>
        <boxGeometry args={[0.95, 0.22, 0.72]} />
        <meshStandardMaterial
          color="#0ea5e9"
          metalness={0.95}
          roughness={0.05}
          transparent
          opacity={0.75}
          emissive="#38bdf8"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* roof strip (modern glass panel) */}
      <mesh position={[-0.05, 0.28, 0]}>
        <boxGeometry args={[0.7, 0.02, 0.6]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* side accent (light bar) */}
      <mesh position={[0, -0.14, 0.415]}>
        <boxGeometry args={[1.4, 0.015, 0.005]} />
        <meshBasicMaterial color="#93c5fd" />
      </mesh>
      <mesh position={[0, -0.14, -0.415]}>
        <boxGeometry args={[1.4, 0.015, 0.005]} />
        <meshBasicMaterial color="#93c5fd" />
      </mesh>

      {/* headlights — sleek slim */}
      <mesh position={[1.06, -0.05, 0.28]}>
        <boxGeometry args={[0.03, 0.045, 0.16]} />
        <meshStandardMaterial color="#fffbe6" emissive="#fef3c7" emissiveIntensity={4} />
      </mesh>
      <mesh position={[1.06, -0.05, -0.28]}>
        <boxGeometry args={[0.03, 0.045, 0.16]} />
        <meshStandardMaterial color="#fffbe6" emissive="#fef3c7" emissiveIntensity={4} />
      </mesh>

      {/* taillight strip */}
      <mesh position={[-1.06, -0.02, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.6]} />
        <meshStandardMaterial color="#ff5c6c" emissive="#ef4444" emissiveIntensity={3} />
      </mesh>

      {/* wheels */}
      {wheelPositions.map((p, i) => (
        <group
          key={i}
          position={p}
          ref={(el) => {
            if (el) wheels.current[i] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.19, 0.19, 0.11, 28]} />
            <meshStandardMaterial color="#0b1120" roughness={0.85} />
          </mesh>
          {/* rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.116, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* spokes */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.02, 0.02, 0.19]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh rotation={[Math.PI / 3, 0, Math.PI / 2]}>
            <boxGeometry args={[0.02, 0.02, 0.19]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh rotation={[-Math.PI / 3, 0, Math.PI / 2]}>
            <boxGeometry args={[0.02, 0.02, 0.19]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* hub */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.12, 12]} />
            <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}

      {/* ground glow under car */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
        <planeGeometry args={[2.2, 1.1]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.18} />
      </mesh>
    </group>
  );
};

const SpeedLine = ({ y, z, delay, color = "#60a5fa" }: { y: number; z: number; delay: number; color?: string }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    const t = (s.clock.elapsedTime * 3 + delay) % 4;
    if (ref.current) {
      ref.current.position.x = 2.5 - t;
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        t < 0.25 ? t / 0.25 : t > 3.5 ? (4 - t) / 0.5 : 0.85;
    }
  });
  return (
    <mesh ref={ref} position={[2.5, y, z]}>
      <boxGeometry args={[0.5, 0.015, 0.015]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
};

const RoadDash = ({ i }: { i: number }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    const t = (s.clock.elapsedTime * 2.2 + i * 0.6) % 6;
    if (ref.current) ref.current.position.x = 3 - t;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[3, -0.5, 0]}>
      <planeGeometry args={[0.3, 0.05]} />
      <meshBasicMaterial color="#60a5fa" transparent opacity={0.55} />
    </mesh>
  );
};

const Scene = () => {
  const dashes = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  return (
    <group position={[0, 0.15, 0]}>
      {dashes.map((i) => (
        <RoadDash key={i} i={i} />
      ))}
      <Car />
      <SpeedLine y={0.1} z={0.55} delay={0} />
      <SpeedLine y={0.2} z={-0.5} delay={0.7} color="#38bdf8" />
      <SpeedLine y={-0.1} z={0.25} delay={1.4} />
      <SpeedLine y={0.28} z={0.05} delay={2.1} color="#38bdf8" />
      <SpeedLine y={-0.02} z={-0.28} delay={2.8} />
    </group>
  );
};

const Hero3D = () => {
  return (
    <>
      {/* Mobile: small car in bottom-right corner, doesn't overlap text */}
      <div className="absolute bottom-20 right-0 w-[70%] h-[220px] md:hidden -z-10 pointer-events-none opacity-90">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [1.4, 1.0, 3.4], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[4, 6, 3]} intensity={1.3} />
            <pointLight position={[-2, 1, 3]} color="#38bdf8" intensity={2} />
            <pointLight position={[3, -1, -2]} color="#a78bfa" intensity={1.2} />
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* Desktop: right side, smaller & floating */}
      <div className="hidden md:block absolute top-[8%] right-[4%] w-[42%] h-[70%] -z-10 pointer-events-none">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [1.4, 1.2, 4.2], fov: 36 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[4, 6, 3]} intensity={1.3} />
            <pointLight position={[-2, 1, 3]} color="#38bdf8" intensity={2} />
            <pointLight position={[3, -1, -2]} color="#a78bfa" intensity={1.2} />
            <Scene />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
};

export default Hero3D;
