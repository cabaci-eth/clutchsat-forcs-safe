import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Body, centerOfMass } from "@/lib/threeBodyPhysics";

interface Props {
  bodies: Body[];
  visible: boolean;
}

export function CenterOfMassMarker({ bodies, visible }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const lineGeometries = useMemo(() => {
    return [
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.15, 0, 0), new THREE.Vector3(-0.15, 0, 0)]),
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.15, 0), new THREE.Vector3(0, -0.15, 0)]),
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.15), new THREE.Vector3(0, 0, -0.15)]),
    ];
  }, []);

  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5 }), []);

  useFrame(() => {
    if (!groupRef.current || !visible || bodies.length === 0) return;
    const com = centerOfMass(bodies);
    groupRef.current.position.set(com.pos[0], com.pos[1], com.pos[2]);
  });

  if (!visible || bodies.length === 0) return null;

  return (
    <group ref={groupRef}>
      {lineGeometries.map((geo, i) => (
        <primitive key={i} object={new THREE.Line(geo, lineMat)} />
      ))}
      <mesh>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
