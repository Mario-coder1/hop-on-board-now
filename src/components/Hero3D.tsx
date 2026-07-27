import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";

/**
 * Ridesharing-themed 3D hero:
 * - A stylised globe (wireframe sphere) representing Slovakia / the network
 * - Glowing route arcs jumping between cities (ridesharing connections)
 * - Pulsing city pins on the surface
 */

const CITY_POINTS: [number, number][] = [
  // [latitude, longitude] approximation of key SK cities (spread on globe)
  [48.15, 17.11], // Bratislava
  [48.72, 21.26], // Košice
  [49.22, 18.74], // Žilina
  [48.99, 21.24], // Prešov
  [48.31, 18.09], // Nitra
  [48.74, 19.15], // B. Bystrica
  [49.06, 20.30], // Poprad
  [48.89, 18.04], // Trenčín
  [48.37, 17.59], // Trnava
];

const latLonToVec3 = (lat: number, lon: number, r: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 20) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
};

const Globe = () => {
  const ref = useRef<THREE.Group>(null!);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.08;
  });
  return (
    <group ref={ref}>
      {/* soft inner sphere */}
      <mesh>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshStandardMaterial
          color="#0b2a5b"
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* wireframe overlay */}
      <mesh>
        <sphereGeometry args={[1.605, 40, 24]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  );
};

const CityPin = ({ pos, delay }: { pos: THREE.Vector3; delay: number }) => {
  const ref = useRef<THREE.Mesh>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    const t = (s.clock.elapsedTime + delay) % 2.4;
    const p = t / 2.4;
    if (ring.current) {
      const scale = 1 + p * 2.5;
      ring.current.scale.setScalar(scale);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 1 - p;
    }
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 2 + delay) * 0.1);
    }
  });
  return (
    <group position={pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#60a5fa"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} lookAt={[0, 0, 0] as any}>
        <ringGeometry args={[0.05, 0.065, 32]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const Arc = ({
  from,
  to,
  speed = 0.5,
  phase = 0,
  color = "#60a5fa",
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  speed?: number;
  phase?: number;
  color?: string;
}) => {
  const { curve, points } = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dist = from.distanceTo(to);
    mid.normalize().multiplyScalar(1.6 + dist * 0.55);
    const c = new THREE.QuadraticBezierCurve3(from, mid, to);
    return { curve: c, points: c.getPoints(64) };
  }, [from, to]);

  const lineGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  const dotRef = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    const t = ((s.clock.elapsedTime * speed + phase) % 1);
    const p = curve.getPoint(t);
    if (dotRef.current) dotRef.current.position.copy(p);
  });

  return (
    <group>
      <primitive
        object={new THREE.Line(
          lineGeom,
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 })
        )}
      />
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
      </mesh>
    </group>
  );
};

const Scene = () => {
  const group = useRef<THREE.Group>(null!);
  useFrame((s) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.15) * 0.25;
      group.current.rotation.x = Math.cos(s.clock.elapsedTime * 0.1) * 0.12;
    }
  });

  const pinPositions = useMemo(
    () => CITY_POINTS.map(([lat, lon]) => latLonToVec3(lat, lon, 1.62)),
    []
  );

  const arcs = useMemo(() => {
    const pairs: Array<[number, number]> = [
      [0, 1], // BA-KE
      [0, 2], // BA-ZA
      [0, 4], // BA-NR
      [2, 3], // ZA-PO
      [1, 6], // KE-PP
      [5, 0], // BB-BA
      [7, 0], // TN-BA
      [8, 0], // TT-BA (short)
    ];
    return pairs.map(([a, b], i) => ({
      from: pinPositions[a],
      to: pinPositions[b],
      speed: 0.25 + (i % 3) * 0.08,
      phase: (i * 0.17) % 1,
      color: i % 2 === 0 ? "#60a5fa" : "#38bdf8",
    }));
  }, [pinPositions]);

  return (
    <group ref={group}>
      <Globe />
      {pinPositions.map((p, i) => (
        <CityPin key={i} pos={p} delay={i * 0.3} />
      ))}
      {arcs.map((a, i) => (
        <Arc key={i} {...a} />
      ))}
    </group>
  );
};

const Hero3D = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.3, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={1.1} />
          <pointLight position={[-4, -2, -2]} color="#38bdf8" intensity={2} />
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3D;
