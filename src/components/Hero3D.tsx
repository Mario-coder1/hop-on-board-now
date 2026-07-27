import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";

/**
 * Ridesharing hero: stylised low-poly car speeding along a glowing route.
 * Positioned on the right half so hero text on the left stays fully readable.
 */

const Car = () => {
  const group = useRef<THREE.Group>(null!);
  const wheels = useRef<THREE.Group[]>([]);
  useFrame((s) => {
    if (group.current) {
      group.current.position.y = Math.sin(s.clock.elapsedTime * 1.4) * 0.06;
      group.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.2) * 0.02;
    }
    wheels.current.forEach((w) => {
      if (w) w.rotation.x = s.clock.elapsedTime * 8;
    });
  });

  const wheelPositions: [number, number, number][] = [
    [-0.55, -0.28, 0.42],
    [0.55, -0.28, 0.42],
    [-0.55, -0.28, -0.42],
    [0.55, -0.28, -0.42],
  ];

  return (
    <group ref={group} rotation={[0, -0.5, 0]}>
      {/* body lower */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <boxGeometry args={[1.7, 0.35, 0.85]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* body upper / cabin */}
      <mesh position={[0.05, 0.22, 0]}>
        <boxGeometry args={[1.05, 0.35, 0.78]} />
        <meshStandardMaterial color="#1e40af" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* windshield glass */}
      <mesh position={[0.05, 0.22, 0]}>
        <boxGeometry args={[1.055, 0.28, 0.79]} />
        <meshStandardMaterial
          color="#0ea5e9"
          metalness={0.9}
          roughness={0.05}
          transparent
          opacity={0.55}
          emissive="#38bdf8"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* headlights */}
      <mesh position={[0.86, -0.02, 0.28]}>
        <boxGeometry args={[0.04, 0.1, 0.15]} />
        <meshStandardMaterial color="#fff7cc" emissive="#fde68a" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0.86, -0.02, -0.28]}>
        <boxGeometry args={[0.04, 0.1, 0.15]} />
        <meshStandardMaterial color="#fff7cc" emissive="#fde68a" emissiveIntensity={3} />
      </mesh>
      {/* taillights */}
      <mesh position={[-0.86, -0.02, 0.28]}>
        <boxGeometry args={[0.04, 0.1, 0.14]} />
        <meshStandardMaterial color="#ff4d5e" emissive="#ef4444" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[-0.86, -0.02, -0.28]}>
        <boxGeometry args={[0.04, 0.1, 0.14]} />
        <meshStandardMaterial color="#ff4d5e" emissive="#ef4444" emissiveIntensity={2.5} />
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
            <cylinderGeometry args={[0.18, 0.18, 0.12, 24]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.13, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}
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
        t < 0.3 ? t / 0.3 : t > 3.5 ? (4 - t) / 0.5 : 0.9;
    }
  });
  return (
    <mesh ref={ref} position={[2.5, y, z]}>
      <boxGeometry args={[0.6, 0.02, 0.02]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
};

const RoadDash = ({ i }: { i: number }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    const t = (s.clock.elapsedTime * 2 + i * 0.5) % 6;
    if (ref.current) ref.current.position.x = 3 - t;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[3, -0.55, 0]}>
      <planeGeometry args={[0.35, 0.06]} />
      <meshBasicMaterial color="#93c5fd" transparent opacity={0.6} />
    </mesh>
  );
};

const Ground = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]}>
    <planeGeometry args={[14, 4]} />
    <meshStandardMaterial
      color="#0b1e3f"
      metalness={0.3}
      roughness={0.6}
      transparent
      opacity={0.55}
    />
  </mesh>
);

const Scene = () => {
  const group = useRef<THREE.Group>(null!);
  useFrame((s) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.25) * 0.08;
    }
  });
  const dashes = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  return (
    <group ref={group} position={[0.2, 0, 0]}>
      <Ground />
      {dashes.map((i) => (
        <RoadDash key={i} i={i} />
      ))}
      <Car />
      <SpeedLine y={0.05} z={0.6} delay={0} />
      <SpeedLine y={0.15} z={-0.55} delay={0.7} color="#38bdf8" />
      <SpeedLine y={-0.15} z={0.3} delay={1.4} />
      <SpeedLine y={0.25} z={0.1} delay={2.1} color="#38bdf8" />
      <SpeedLine y={-0.05} z={-0.3} delay={2.8} />
    </group>
  );
};

const Hero3D = () => {
  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[60%] -z-10 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [1.2, 1.1, 3.6], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[4, 6, 3]} intensity={1.3} />
          <pointLight position={[-2, 1, 3]} color="#38bdf8" intensity={2} />
          <pointLight position={[3, -1, -2]} color="#a78bfa" intensity={1.2} />
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;
