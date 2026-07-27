import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment } from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";

const Blob = () => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.15;
    ref.current.rotation.y = state.clock.elapsedTime * 0.2;
  });
  return (
    <mesh ref={ref} scale={1.6}>
      <icosahedronGeometry args={[1, 40]} />
      <MeshDistortMaterial
        color="#2563eb"
        distort={0.45}
        speed={1.6}
        roughness={0.15}
        metalness={0.6}
      />
    </mesh>
  );
};

const OrbitingRing = ({ radius = 2.4, tilt = 0, speed = 0.6, color = "#60a5fa" }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * speed;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.015, 16, 200]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
};

const Dot = ({ radius = 2.4, tilt = 0, speed = 0.6, phase = 0, color = "#f0f9ff" }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.y = Math.sin(t) * radius * Math.cos(tilt);
    ref.current.position.z = Math.sin(t) * radius * Math.sin(tilt);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
    </mesh>
  );
};

const Hero3D = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-4, -2, -2]} color="#38bdf8" intensity={2} />
          <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
            <Blob />
          </Float>
          <OrbitingRing radius={2.6} tilt={0.4} speed={0.3} color="#3b82f6" />
          <OrbitingRing radius={3.1} tilt={-0.6} speed={0.2} color="#60a5fa" />
          <Dot radius={2.6} tilt={0.4} speed={0.6} phase={0} />
          <Dot radius={2.6} tilt={0.4} speed={0.6} phase={Math.PI} color="#38bdf8" />
          <Dot radius={3.1} tilt={-0.6} speed={0.4} phase={1.2} color="#a78bfa" />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;
