"use client";

import { homography, toGl, type Pt } from "./homography";
import type { LayoutPattern } from "@/bots/tile/domain/quote";

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Mỗi pixel ảnh → toạ độ thật trên mặt phẳng (mét) qua homography → xác định viên gạch, ron, rồi lấy mẫu vân.
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPhoto;
uniform sampler2D uTile;
uniform sampler2D uMask;
uniform mat3 uH;
uniform vec2 uTileM;      // kích thước viên gạch (m)
uniform float uGroutM;    // độ rộng ron (m)
uniform vec3 uGroutColor;
uniform int uPattern;     // 0 thẳng, 1 so le 1/2, 2 so le 1/3, 3 xương cá
uniform float uMeanLum;   // độ sáng trung bình vùng được chọn
uniform float uStrength;  // mức giữ bóng đổ 0..1
uniform float uShadeLod;  // mức mip để lấy ánh sáng nền (càng cao càng mờ)

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  // Đạo hàm phải tính trước mọi nhánh return/if (GLSL yêu cầu luồng đồng nhất)
  vec3 q = uH * vec3(vUv, 1.0);
  vec2 p = q.xy / q.z;
  vec2 dpx = dFdx(p);
  vec2 dpy = dFdy(p);
  float aa = max(length(dpx), length(dpy));   // mét trên mỗi pixel màn hình

  vec4 photo = texture(uPhoto, vUv);
  float m = texture(uMask, vUv).r;
  if (m < 0.01) { outColor = photo; return; }

  vec2 cell = uTileM + vec2(uGroutM);
  vec2 local;   // vị trí trong viên (m)
  vec2 size;    // kích thước viên đang xét (m)
  vec2 id;      // định danh viên (để xoay/lệch vân ngẫu nhiên)
  bool rotated = false;
  float groutCov = 0.0;   // độ phủ của ron tại pixel này (0..1, đã khử răng cưa)

  if (uPattern == 3) {
    // Xương cá với viên w × (n·w): mạng tịnh tiến (1,1) và (n,−n) theo đơn vị w.
    float w = min(uTileM.x, uTileM.y) + uGroutM;
    float n = max(2.0, floor(max(uTileM.x, uTileM.y) / min(uTileM.x, uTileM.y) + 0.5));
    vec2 g = p / w;
    vec2 c = floor(g);
    float j = floor((c.x - c.y + n) / (2.0 * n));
    vec2 gp = g - vec2(j * n, -j * n);
    vec2 cp = floor(gp);
    float d = cp.x - cp.y;
    if (d >= 0.0) {
      float k = cp.y;
      local = (gp - vec2(k, k)) * w;
      size = vec2(n * w, w);
    } else {
      float k = cp.x;
      local = vec2(gp.y - (k + 1.0), gp.x - k) * w;
      size = vec2(n * w, w);
      rotated = true;
    }
    id = vec2(j, d >= 0.0 ? cp.y : cp.x + 1000.0);
    vec2 inn = size - vec2(uGroutM);
    groutCov = (local.x > inn.x || local.y > inn.y) ? 1.0 : 0.0;
  } else {
    float row = floor(p.y / cell.y);
    float shift = 0.0;
    if (uPattern == 1) shift = mod(row, 2.0) * 0.5;
    else if (uPattern == 2) shift = mod(row, 3.0) / 3.0;
    vec2 pp = vec2(p.x + shift * cell.x, p.y);
    id = floor(pp / cell);
    local = pp - id * cell;
    size = cell;
    // Ron: dải rộng uGroutM nằm giữa hai viên; khử răng cưa theo kích thước pixel và luôn giữ ron thấy được
    // (tối thiểu ~1,5 pixel) để đường ron không đứt nét khi ảnh thu nhỏ.
    float hw = min(max(uGroutM * 0.5, aa * 0.75), 0.18 * min(cell.x, cell.y));
    vec2 dc = vec2(
      min(abs(local.x - (cell.x - uGroutM * 0.5)), local.x + uGroutM * 0.5),
      min(abs(local.y - (cell.y - uGroutM * 0.5)), local.y + uGroutM * 0.5));
    float feather = max(aa * 0.75, 1e-5);
    float gx = 1.0 - smoothstep(hw - feather, hw + feather, dc.x);
    float gy = 1.0 - smoothstep(hw - feather, hw + feather, dc.y);
    groutCov = uGroutM <= 0.0001 ? 0.0 : max(gx, gy);
  }

  vec2 inner = size - vec2(uGroutM);
  vec2 uv = clamp(local / inner, 0.0, 1.0);
  if (rotated) uv = uv.yx;
  // Lật ngẫu nhiên từng viên để vân không lặp lộ liễu
  float r = hash(id);
  if (r > 0.5) uv.x = 1.0 - uv.x;
  if (fract(r * 7.0) > 0.5) uv.y = 1.0 - uv.y;
  float maxInner = max(inner.x, inner.y);
  vec3 tileColor = textureGrad(uTile, uv, dpx / maxInner, dpy / maxInner).rgb;
  // Mỗi viên lệch sáng nhẹ (như gạch thật, mỗi viên một sắc độ) + viền vát hơi tối
  tileColor *= 0.955 + 0.09 * hash(id + vec2(3.7, 9.1));
  float e = min(min(local.x, inner.x - local.x), min(local.y, inner.y - local.y)) / max(uGroutM * 2.0, 0.003);
  tileColor *= mix(0.88, 1.0, clamp(e, 0.0, 1.0));
  tileColor = mix(tileColor, uGroutColor, groutCov);

  // Giữ bóng đổ/ánh sáng của ảnh gốc — chỉ phần ánh sáng thay đổi chậm (mip thấp), KHÔNG giữ hoa văn
  // của sàn cũ (thảm, vân gỗ cũ...) nếu không sẽ lộ xuyên qua lớp gạch mới.
  float shade = clamp(lum(textureLod(uPhoto, vUv, uShadeLod).rgb) / max(uMeanLum, 0.05), 0.4, 1.5);
  vec3 lit = tileColor * mix(1.0, shade, uStrength);
  outColor = vec4(mix(photo.rgb, lit, m), 1.0);
}`;

export interface RenderParams {
  /** 4 góc vùng (chuẩn hoá 0..1): trên-trái, trên-phải, dưới-phải, dưới-trái */
  quad: Pt[];
  /** Kích thước thật của tứ giác (m): rộng (cạnh trên) × sâu */
  widthM: number;
  depthM: number;
  tileWidthMm: number;
  tileHeightMm: number;
  groutMm: number;
  groutColor: string;
  pattern: LayoutPattern;
  shadowStrength?: number;
}

const PATTERN_INDEX: Record<LayoutPattern, number> = { straight: 0, half_offset: 1, third_offset: 2, herringbone: 3 };

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export class TileRenderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private tex: { photo: WebGLTexture; tile: WebGLTexture; mask: WebGLTexture };
  private meanLum = 0.5;
  private photoSize = { w: 1, h: 1 };
  private hasMask = false;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error("Trình duyệt không hỗ trợ WebGL2");
    this.gl = gl;
    this.prog = this.program(VERT, FRAG);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = { photo: gl.createTexture()!, tile: gl.createTexture()!, mask: gl.createTexture()! };
  }

  private program(vs: string, fs: string) {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link error");
    return p;
  }

  private upload(tex: WebGLTexture, source: TexImageSource, mipmap: boolean) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }

  setPhoto(img: ImageBitmap | HTMLCanvasElement) {
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.photoSize = { w: img.width, h: img.height };
    this.upload(this.tex.photo, img, true);
    this.clearMask();
  }

  /** Chưa có vùng nào: chỉ hiện ảnh gốc (mặt nạ rỗng) — để ảnh luôn hiện ngay khi khách chọn xong. */
  clearMask() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex.mask);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.hasMask = true;
    this.meanLum = 0.5;
    this.drawPlain();
  }

  private drawPlain() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.photo);
    gl.uniform1i(gl.getUniformLocation(this.prog, "uPhoto"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.tile);
    gl.uniform1i(gl.getUniformLocation(this.prog, "uTile"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.mask);
    gl.uniform1i(gl.getUniformLocation(this.prog, "uMask"), 2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Ảnh vân gạch (1 viên). Ảnh SVG được vẽ ra canvas để có mipmap. */
  setTileTexture(img: HTMLImageElement | ImageBitmap | HTMLCanvasElement) {
    const c = document.createElement("canvas");
    const max = 1024;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    c.width = Math.max(2, Math.round(img.width * scale));
    c.height = Math.max(2, Math.round(img.height * scale));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    this.upload(this.tex.tile, c, true);
  }

  /**
   * Mặt nạ vùng phủ gạch. Nếu có mặt nạ SAM thì dùng (giao với tứ giác); nếu không, dùng chính tứ giác.
   * Đồng thời tính độ sáng trung bình vùng để giữ bóng đổ.
   */
  setMask(photo: ImageBitmap | HTMLCanvasElement, quad: Pt[], sam: { mask: Uint8Array; width: number; height: number } | null) {
    const { w, h } = this.photoSize;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    if (sam) {
      const img = ctx.createImageData(sam.width, sam.height);
      for (let i = 0; i < sam.mask.length; i++) {
        const v = sam.mask[i];
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      const tmp = document.createElement("canvas");
      tmp.width = sam.width;
      tmp.height = sam.height;
      tmp.getContext("2d")!.putImageData(img, 0, 0);
      ctx.filter = "blur(1.5px)";
      ctx.drawImage(tmp, 0, 0, w, h);
      ctx.filter = "none";
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      quad.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
      ctx.closePath();
      ctx.fill();
    }
    this.hasMask = true;
    this.upload(this.tex.mask, c, false);

    // Độ sáng trung bình trong vùng
    const pc = document.createElement("canvas");
    const sw = 160, sh = Math.max(1, Math.round((160 * h) / w));
    pc.width = sw;
    pc.height = sh;
    const pctx = pc.getContext("2d", { willReadFrequently: true })!;
    pctx.drawImage(photo, 0, 0, sw, sh);
    const pd = pctx.getImageData(0, 0, sw, sh).data;
    const mctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    mctx.canvas.width = sw;
    mctx.canvas.height = sh;
    mctx.drawImage(c, 0, 0, sw, sh);
    const md = mctx.getImageData(0, 0, sw, sh).data;
    let sum = 0, n = 0;
    for (let i = 0; i < md.length; i += 4) {
      if (md[i] > 127) {
        sum += (0.299 * pd[i] + 0.587 * pd[i + 1] + 0.114 * pd[i + 2]) / 255;
        n++;
      }
    }
    this.meanLum = n ? sum / n : 0.5;
  }

  render(p: RenderParams) {
    if (!this.hasMask) return;
    const gl = this.gl;
    // Tứ giác trên ảnh ↔ hình chữ nhật thật W × D (m)
    const H = homography(p.quad, [
      [0, 0],
      [p.widthM, 0],
      [p.widthM, p.depthM],
      [0, p.depthM],
    ]);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.prog);
    const u = (n: string) => gl.getUniformLocation(this.prog, n);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.photo);
    gl.uniform1i(u("uPhoto"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.tile);
    gl.uniform1i(u("uTile"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.tex.mask);
    gl.uniform1i(u("uMask"), 2);
    gl.uniformMatrix3fv(u("uH"), false, toGl(H));
    gl.uniform2f(u("uTileM"), p.tileWidthMm / 1000, p.tileHeightMm / 1000);
    gl.uniform1f(u("uGroutM"), p.groutMm / 1000);
    gl.uniform3fv(u("uGroutColor"), hexToRgb(p.groutColor));
    gl.uniform1i(u("uPattern"), PATTERN_INDEX[p.pattern]);
    gl.uniform1f(u("uMeanLum"), this.meanLum);
    gl.uniform1f(u("uStrength"), p.shadowStrength ?? 0.9);
    gl.uniform1f(u("uShadeLod"), Math.max(3, Math.log2(Math.max(this.photoSize.w, this.photoSize.h) / 40)));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  toJpegBase64(quality = 0.85): string {
    return this.canvas.toDataURL("image/jpeg", quality).split(",")[1];
  }
}

/** Đọc ảnh khách chọn, xoay đúng chiều EXIF và thu nhỏ cạnh dài về tối đa maxSide. */
export async function loadPhoto(file: Blob, maxSide = 1280): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không tải được ảnh vân gạch"));
    img.src = url;
  });
}

export function thumbnailBase64(c: HTMLCanvasElement, maxSide = 512): string {
  const scale = Math.min(1, maxSide / Math.max(c.width, c.height));
  const t = document.createElement("canvas");
  t.width = Math.round(c.width * scale);
  t.height = Math.round(c.height * scale);
  t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL("image/jpeg", 0.8).split(",")[1];
}
