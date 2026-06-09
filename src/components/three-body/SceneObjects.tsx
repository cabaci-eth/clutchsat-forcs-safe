import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Body } from "@/lib/threeBodyPhysics";

interface BodyMeshProps {
  body: Body;
  selected: boolean;
  onClick: () => void;
  trailLength: number;
  trailWidth: number;
  showTrail: boolean;
  rainbowTrail: boolean;
}

export function BodyMesh({ body, selected, onClick, trailLength, trailWidth, showTrail, rainbowTrail }: BodyMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const trailRef = useRef<THREE.Line>(null);

  const color = new THREE.Color(body.color);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...body.position);
    }
    if (glowRef.current) {
      glowRef.current.position.set(...body.position);
    }

    // Update trail geometry
    if (trailRef.current && showTrail && body.trail.length > 1) {
      const geo = trailRef.current.geometry as THREE.BufferGeometry;
      const len = Math.min(body.trail.length, trailLength);
      const pts = body.trail.slice(-len);
      const positions = new Float32Array(pts.length * 3);
      const colors = new Float32Array(pts.length * 3);
      
      for (let i = 0; i < pts.length; i++) {
        positions[i * 3] = pts[i][0];
        positions[i * 3 + 1] = pts[i][1];
        positions[i * 3 + 2] = pts[i][2];
        
        if (rainbowTrail) {
          const hue = (i / pts.length) * 360;
          const c = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
          colors[i * 3] = c.r;
          colors[i * 3 + 1] = c.g;
          colors[i * 3 + 2] = c.b;
        } else {
          const alpha = i / pts.length;
          colors[i * 3] = color.r * alpha;
          colors[i * 3 + 1] = color.g * alpha;
          colors[i * 3 + 2] = color.b * alpha;
        }
      }
      
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.setDrawRange(0, pts.length);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Body sphere */}
      <mesh ref={meshRef} position={body.position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[body.radius, 24, 24]} />
        <meshStandardMaterial
          color={body.color}
          emissive={body.color}
          emissiveIntensity={0.6}
        />
        {selected && (
          <mesh>
            <sphereGeometry args={[body.radius * 1.4, 16, 16]} />
            <meshBasicMaterial color="white" wireframe transparent opacity={0.3} />
          </mesh>
        )}
      </mesh>

      {/* Glow light */}
      <pointLight ref={glowRef} color={body.color} intensity={body.mass * 0.5} distance={5 + body.mass} position={body.position} />

      {/* Label */}
      {body.showLabel && (
        <Html position={body.position} center style={{ pointerEvents: "none", zIndex: 1 }}>
          <div className="text-xs font-mono text-white/80 whitespace-nowrap" style={{ transform: "translateY(-20px)" }}>
            {body.name}
          </div>
        </Html>
      )}

      {/* Trail */}
      {showTrail && body.trail.length > 1 && (
        <line ref={trailRef as any}>
          <bufferGeometry />
          <lineBasicMaterial vertexColors transparent linewidth={trailWidth} />
        </line>
      )}
    </group>
  );
}

export function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(3000);
    for (let i = 0; i < 3000; i++) {
      arr[i] = (Math.random() - 0.5) * 200;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={1000} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function ReferenceGrid() {
  return <gridHelper args={[40, 40, "#333333", "#1a1a1a"]} position={[0, -0.01, 0]} />;
}
