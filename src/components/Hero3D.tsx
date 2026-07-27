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
      group.current.rotation.z = Math.sin(t * 1.8) * 0.012;
    }
    wheels.current.forEach((w) => {
      if (w) w.rotation.x = t * 10;
    });
  });

  // Octavia 3 wheelbase ~ longer, wider stance
  const wheelPositions: [number, number, number][] = [
    [-0.78, -0.24, 0.44],
    [0.78, -0.24, 0.44],
    [-0.78, -0.24, -0.44],
    [0.78, -0.24, -0.44],
  ];

  // Silver metallic body — signature Škoda "Brilliant Silver"
  const bodyColor = "#c9ced4";
  const bodyDark = "#9aa2ab";

  return (
    <group ref={group}>
      {/* main body — long liftback silhouette */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <boxGeometry args={[2.3, 0.24, 0.88]} />
        <meshStandardMaterial color={bodyColor} metalness={0.9} roughness={0.22} />
      </mesh>

      {/* lower rocker panel (darker) */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[2.25, 0.06, 0.9]} />
        <meshStandardMaterial color="#3a4049" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* bonnet — flat with sharp crease */}
      <mesh position={[0.85, 0.04, 0]}>
        <boxGeometry args={[0.7, 0.05, 0.84]} />
        <meshStandardMaterial color={bodyColor} metalness={0.92} roughness={0.2} />
      </mesh>

      {/* front bumper */}
      <mesh position={[1.18, -0.1, 0]}>
        <boxGeometry args={[0.12, 0.24, 0.84]} />
        <meshStandardMaterial color={bodyDark} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Škoda signature split grille — two chrome bars */}
      <mesh position={[1.24, -0.02, 0.14]}>
        <boxGeometry args={[0.02, 0.08, 0.22]} />
        <meshStandardMaterial color="#0b1120" roughness={0.7} />
      </mesh>
      <mesh position={[1.24, -0.02, -0.14]}>
        <boxGeometry args={[0.02, 0.08, 0.22]} />
        <meshStandardMaterial color="#0b1120" roughness={0.7} />
      </mesh>
      {/* chrome grille frame */}
      <mesh position={[1.24, 0.02, 0]}>
        <boxGeometry args={[0.01, 0.005, 0.56]} />
        <meshStandardMaterial color="#e5e7eb" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[1.24, -0.06, 0]}>
        <boxGeometry args={[0.01, 0.005, 0.56]} />
        <meshStandardMaterial color="#e5e7eb" metalness={1} roughness={0.1} />
      </mesh>

      {/* rear liftback — sloping */}
      <mesh position={[-0.95, 0.02, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.5, 0.22, 0.84]} />
        <meshStandardMaterial color={bodyColor} metalness={0.92} roughness={0.22} />
      </mesh>

      {/* rear bumper */}
      <mesh position={[-1.18, -0.1, 0]}>
        <boxGeometry args={[0.1, 0.24, 0.84]} />
        <meshStandardMaterial color={bodyDark} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* cabin / greenhouse — Octavia's characteristic long roofline */}
      <mesh position={[-0.08, 0.2, 0]}>
        <boxGeometry args={[1.15, 0.26, 0.78]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.6}
          roughness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* A-pillar & C-pillar tint darker frames */}
      <mesh position={[0.48, 0.2, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.06, 0.28, 0.8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.62, 0.2, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.06, 0.28, 0.8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.9} roughness={0.2} />
      </mesh>

      {/* roof top */}
      <mesh position={[-0.08, 0.335, 0]}>
        <boxGeometry args={[1.0, 0.03, 0.74]} />
        <meshStandardMaterial color={bodyColor} metalness={0.92} roughness={0.2} />
      </mesh>

      {/* door line / character crease */}
      <mesh position={[0, -0.02, 0.442]}>
        <boxGeometry args={[1.9, 0.008, 0.005]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.02, -0.442]}>
        <boxGeometry args={[1.9, 0.008, 0.005]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* LED headlights — angular, Octavia style */}
      <mesh position={[1.19, 0.02, 0.32]}>
        <boxGeometry args={[0.04, 0.06, 0.14]} />
        <meshStandardMaterial color="#fffbe6" emissive="#fef3c7" emissiveIntensity={4.5} />
      </mesh>
      <mesh position={[1.19, 0.02, -0.32]}>
        <boxGeometry args={[0.04, 0.06, 0.14]} />
        <meshStandardMaterial color="#fffbe6" emissive="#fef3c7" emissiveIntensity={4.5} />
      </mesh>
      {/* DRL strip below headlights */}
      <mesh position={[1.2, -0.04, 0.32]}>
        <boxGeometry args={[0.02, 0.015, 0.16]} />
        <meshBasicMaterial color="#e0f2fe" />
      </mesh>
      <mesh position={[1.2, -0.04, -0.32]}>
        <boxGeometry args={[0.02, 0.015, 0.16]} />
        <meshBasicMaterial color="#e0f2fe" />
      </mesh>

      {/* C-shaped taillights (Škoda signature) */}
      <mesh position={[-1.18, 0.0, 0.3]}>
        <boxGeometry args={[0.025, 0.07, 0.16]} />
        <meshStandardMaterial color="#ff5c6c" emissive="#ef4444" emissiveIntensity={3.5} />
      </mesh>
      <mesh position={[-1.18, 0.0, -0.3]}>
        <boxGeometry args={[0.025, 0.07, 0.16]} />
        <meshStandardMaterial color="#ff5c6c" emissive="#ef4444" emissiveIntensity={3.5} />
      </mesh>

      {/* Škoda badge on rear — small chrome dot */}
      <mesh position={[-1.21, 0.05, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
        <meshStandardMaterial color="#22c55e" metalness={0.9} roughness={0.2} emissive="#166534" emissiveIntensity={0.6} />
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
            <cylinderGeometry args={[0.21, 0.21, 0.12, 32]} />
            <meshStandardMaterial color="#0b1120" roughness={0.85} />
          </mesh>
          {/* alloy rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.126, 28]} />
            <meshStandardMaterial color="#d1d5db" metalness={0.95} roughness={0.18} />
          </mesh>
          {/* five spokes — Octavia-style alloys */}
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} rotation={[(Math.PI / 2.5) * k, 0, Math.PI / 2]}>
              <boxGeometry args={[0.025, 0.02, 0.24]} />
              <meshStandardMaterial color="#e5e7eb" metalness={0.92} roughness={0.2} />
            </mesh>
          ))}
          {/* hub */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.13, 12]} />
            <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}

      {/* ground glow under car */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
        <planeGeometry args={[2.6, 1.2]} />
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
