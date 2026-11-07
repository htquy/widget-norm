"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Billboard, ContactShadows, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { colorHex } from "../design";
import { applyCatalogColor } from "../vision/tint";
import { fitModel, footprint, insideFloor, overlaps, yawDeg, type Floor, type Placed } from "../vision/placement";

/**
 * Phòng 3D đúng tỉ lệ (1 đơn vị = 1 m). Sàn W × D cm; toạ độ đồ (x, y) cm → world (x - W/2, y - D/2) / 100.
 * Món có .glb dựng 3D thật; có ảnh tách nền dựng tấm đứng luôn quay về camera; còn lại là khối đúng số đo.
 */
const toWorld = (v: number, size: number) => (v - size / 2) / 100;

function Model({ url, p }: { url: string; p: Placed }) {
  const { scene } = useGLTF(url);
  const { obj, rotY, warn } = useMemo(() => {
    const clone = scene.clone(true);
    applyCatalogColor(clone, p.color);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const fit = fitModel({ x: size.x, y: size.y, z: size.z }, p);
    // Đưa tâm mặt đáy về gốc để xoay/đặt dễ
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    const holder = new THREE.Group();
    holder.add(clone);
    holder.scale.set(fit.scale.x, fit.scale.y, fit.scale.z);
    return { obj: holder, rotY: fit.rotY, warn: fit.distortion > 0.15 };
  }, [scene, p.color, p.widthCm, p.depthCm, p.heightCm]);
  return (
    <group rotation={[0, (yawDeg(p) * Math.PI) / 180, 0]}>
      <group rotation={[0, rotY, 0]}>
        <primitive object={obj} />
        {warn && null}
      </group>
    </group>
  );
}

function Cutout({ url, p }: { url: string; p: Placed }) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const w = p.widthCm / 100;
  return (
    <Billboard follow lockX lockZ position={[0, p.heightCm / 200, 0]}>
      <mesh>
        <planeGeometry args={[w, p.heightCm / 100]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

function Box({ p }: { p: Placed }) {
  return (
    <mesh position={[0, p.heightCm / 200, 0]} rotation={[0, (yawDeg(p) * Math.PI) / 180, 0]} castShadow>
      <boxGeometry args={[p.widthCm / 100, p.heightCm / 100, p.depthCm / 100]} />
      <meshStandardMaterial color={colorHex(p.color)} roughness={0.8} />
    </mesh>
  );
}

function Item({ p, floor, selected, bad, onSelect, onDragStart }: { p: Placed; floor: Floor; selected: boolean; bad: boolean; onSelect: () => void; onDragStart: () => void }) {
  const fp = footprint(p);
  return (
    <group
      position={[toWorld(p.x, floor.widthCm), 0, toWorld(p.y, floor.depthCm)]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onSelect();
        onDragStart();
      }}
    >
      <Suspense fallback={<Box p={p} />}>{p.modelUrl ? <Model url={p.modelUrl} p={p} /> : p.cutoutUrl ? <Cutout url={p.cutoutUrl} p={p} /> : <Box p={p} />}</Suspense>
      {/* Vòng chân đồ: trắng khi chọn, đỏ khi ra ngoài phòng / chồng nhau */}
      {(selected || bad) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <planeGeometry args={[fp.w / 100 + 0.08, fp.d / 100 + 0.08]} />
          <meshBasicMaterial color={bad ? "#e5484d" : "#ffffff"} transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}

function Room({ floor, floorColor, wallColor }: { floor: Floor; floorColor: string; wallColor: string }) {
  const W = floor.widthCm / 100;
  const D = floor.depthCm / 100;
  const H = 2.7;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
    </group>
  );
}

/** Mặt phẳng sàn vô hình bắt sự kiện kéo */
function DragPlane({ floor, active, onMove, onEnd }: { floor: Floor; active: boolean; onMove: (xCm: number, yCm: number) => void; onEnd: () => void }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} visible={false} onPointerMove={(e) => active && onMove(e.point.x * 100 + floor.widthCm / 2, e.point.z * 100 + floor.depthCm / 2)} onPointerUp={onEnd} onPointerLeave={onEnd}>
      <planeGeometry args={[40, 40]} />
    </mesh>
  );
}

function Camera({ floor }: { floor: Floor }) {
  const { camera } = useThree();
  useEffect(() => {
    const D = floor.depthCm / 100;
    const W = floor.widthCm / 100;
    camera.position.set(0, Math.max(W, D) * 0.55, D / 2 + Math.max(W, D) * 0.55);
    camera.lookAt(0, 0.4, 0);
  }, [camera, floor.widthCm, floor.depthCm]);
  return null;
}

export default function Room3D({
  floor,
  placed,
  selected,
  floorColor = "#b99470",
  wallColor = "#e4d9c6",
  onSelect,
  onMove,
}: {
  floor: Pick<Floor, "widthCm" | "depthCm"> & Partial<Floor>;
  placed: Placed[];
  selected: string | null;
  floorColor?: string;
  wallColor?: string;
  onSelect: (key: string | null) => void;
  onMove: (key: string, xCm: number, yCm: number) => void;
}) {
  const f = floor as Floor;
  const drag = useRef<{ key: string; dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const orbit = useRef<{ enabled: boolean } | null>(null);
  const bad = (p: Placed) => !insideFloor(f, p) || placed.some((o) => o.key !== p.key && overlaps(o, p));
  return (
    <Canvas shadows camera={{ fov: 45, near: 0.1, far: 100 }} dpr={[1, 2]} gl={{ toneMapping: THREE.NoToneMapping }} onPointerMissed={() => onSelect(null)} style={{ touchAction: "none" }}>
      <color attach="background" args={["#f4f1ec"]} />
      <Camera floor={f} />
      <hemisphereLight args={["#ffffff", "#c9b79e", 0.75]} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <Room floor={f} floorColor={floorColor} wallColor={wallColor} />
      <ContactShadows position={[0, 0.003, 0]} opacity={0.45} scale={Math.max(f.widthCm, f.depthCm) / 100 + 2} blur={2.4} far={2} />
      {placed.map((p) => (
        <Item
          key={p.key}
          p={p}
          floor={f}
          selected={p.key === selected}
          bad={bad(p)}
          onSelect={() => onSelect(p.key)}
          onDragStart={() => {
            drag.current = { key: p.key, dx: 0, dy: 0 };
            setDragging(true);
          }}
        />
      ))}
      <DragPlane
        floor={f}
        active={dragging}
        onMove={(x, y) => {
          const d = drag.current;
          if (!d) return;
          // Ghim theo lưới 5 cm
          onMove(d.key, Math.round(x / 5) * 5, Math.round(y / 5) * 5);
        }}
        onEnd={() => {
          drag.current = null;
          setDragging(false);
        }}
      />
      <OrbitControls ref={orbit as never} enabled={!dragging} enablePan={false} maxPolarAngle={Math.PI / 2.05} minDistance={1.5} maxDistance={20} target={[0, 0.4, 0]} makeDefault />
    </Canvas>
  );
}
