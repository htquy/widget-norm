"use client";

import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { fitModel } from "./placement";
import { applyCatalogColor } from "./tint";

/**
 * Dựng mô hình 3D (.glb) thành "tem" PNG trong suốt ở GÓC XOAY BẤT KỲ, để dán lên ảnh phòng thật.
 * Camera trực giao (không méo) nhìn từ độ chúi `pitchDeg` — độ chúi suy ra từ sàn trên ảnh nên đồ trông cùng góc máy với ảnh.
 * Quy ước: góc 0 = mặt trước hướng về người nhìn; góc dương quay mặt trước sang phải (giống three.js rotation.y).
 */
export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Vị trí (px trong tem) của điểm chạm sàn ở tâm món — điểm neo khi dán lên ảnh */
  ox: number;
  oy: number;
  /** Số px của tem trên 1 mét ngoài đời */
  pxPerM: number;
  /** Hộp bao phần có hình (px trong tem) — để chọn món bằng chạm/click */
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface SpriteSpec {
  url: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  /** Màu catalogue của món (vd "xám ghi") — nhuộm vật liệu chính của mô hình cho khớp */
  color?: string;
  /** Độ xoay quanh trục đứng */
  yaw: number;
  pitch: number;
  size?: number;
}

let renderer: THREE.WebGLRenderer | null = null;
let envTexture: THREE.Texture | null = null;
const SIZE = 512;
const models = new Map<string, Promise<THREE.Object3D>>();
const sprites = new Map<string, Sprite>();
const loading = new Map<string, Promise<Sprite>>();

function gl() {
  if (renderer) return renderer;
  const canvas = document.createElement("canvas");
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer);
  envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  return renderer;
}

function loadModel(url: string): Promise<THREE.Object3D> {
  let p = models.get(url);
  if (!p) {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.5/");
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    p = loader.loadAsync(url).then((g) => g.scene);
    p.catch(() => models.delete(url));
    models.set(url, p);
  }
  return p;
}

const keyOf = (s: SpriteSpec) => `${s.url}|${s.color ?? ""}|${s.widthCm}|${s.depthCm}|${s.heightCm}|${Math.round(s.yaw / 2) * 2}|${Math.round(s.pitch / 3) * 3}|${s.size ?? SIZE}`;

/** Tem đã dựng sẵn (đồng bộ) — null nếu chưa có */
export const cachedSprite = (s: SpriteSpec) => sprites.get(keyOf(s)) ?? null;

export function renderSprite(spec: SpriteSpec): Promise<Sprite> {
  const key = keyOf(spec);
  const hit = sprites.get(key);
  if (hit) return Promise.resolve(hit);
  let job = loading.get(key);
  if (!job) {
    job = loadModel(spec.url)
      .then((scene) => {
        const s = draw(scene, spec);
        sprites.set(key, s);
        // Giữ tối đa 80 tem (xoay liên tục sinh nhiều tem)
        if (sprites.size > 80) sprites.delete(sprites.keys().next().value as string);
        return s;
      })
      .finally(() => loading.delete(key));
    loading.set(key, job);
  }
  return job;
}

function draw(source: THREE.Object3D, spec: SpriteSpec): Sprite {
  const r = gl();
  const size = spec.size ?? SIZE;
  r.setSize(size, size, false);

  // Co giãn mô hình về đúng số đo catalogue (cùng cách với phòng 3D)
  const clone = source.clone(true);
  applyCatalogColor(clone, spec.color);
  const box = new THREE.Box3().setFromObject(clone);
  const dim = box.getSize(new THREE.Vector3());
  const fit = fitModel({ x: dim.x, y: dim.y, z: dim.z }, spec);
  const center = box.getCenter(new THREE.Vector3());
  clone.position.set(-center.x, -box.min.y, -center.z);
  const holder = new THREE.Group();
  holder.add(clone);
  holder.scale.set(fit.scale.x, fit.scale.y, fit.scale.z);
  const fitted = new THREE.Group();
  fitted.rotation.y = fit.rotY;
  fitted.add(holder);
  const yawGroup = new THREE.Group();
  yawGroup.rotation.y = (spec.yaw * Math.PI) / 180;
  yawGroup.add(fitted);

  const scene = new THREE.Scene();
  scene.environment = envTexture;
  scene.environmentIntensity = 0.9;
  scene.add(yawGroup);
  const sun = new THREE.DirectionalLight(0xfff4e5, 1.6);
  sun.position.set(-2.5, 4, 3);
  scene.add(sun, new THREE.AmbientLight(0xffffff, 0.25));

  const W = spec.widthCm / 100;
  const D = spec.depthCm / 100;
  const H = spec.heightCm / 100;
  const half = (0.5 * Math.sqrt(W * W + D * D + H * H)) * 1.04;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 50);
  const pitch = (spec.pitch * Math.PI) / 180;
  const target = new THREE.Vector3(0, H / 2, 0);
  cam.position.copy(target).add(new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch)).multiplyScalar(12));
  cam.lookAt(target);
  cam.updateMatrixWorld();

  r.render(scene, cam);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(r.domElement, 0, 0, size, size);

  const ground = new THREE.Vector3(0, 0, 0).project(cam);
  const sprite: Sprite = {
    canvas,
    ox: ((ground.x + 1) / 2) * size,
    oy: ((1 - ground.y) / 2) * size,
    pxPerM: size / (2 * half),
    bbox: alphaBounds(ctx, size),
  };
  // Giải phóng bộ nhớ GPU của bản sao (geometry/texture gốc dùng chung nên không dispose)
  scene.remove(yawGroup);
  return sprite;
}

function alphaBounds(ctx: CanvasRenderingContext2D, size: number) {
  const { data } = ctx.getImageData(0, 0, size, size);
  let x0 = size, y0 = size, x1 = 0, y1 = 0;
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (data[(y * size + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 > x0 ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: size, y1: size };
}

/** Ảnh nhỏ (data URL, nền trong suốt, cắt sát hình) của mô hình — dùng làm hình đại diện món có 3D */
export async function spriteThumb(spec: SpriteSpec, max = 160): Promise<string> {
  const s = await renderSprite({ ...spec, size: 320 });
  const { x0, y0, x1, y1 } = s.bbox;
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const k = Math.min(max / w, max / h, 1);
  const c = document.createElement("canvas");
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext("2d")!.drawImage(s.canvas, x0, y0, w, h, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}
