/** Sinh ảnh vân gạch mẫu (SVG, 1 viên) cho dữ liệu demo — shop thật sẽ tải ảnh scan/ảnh chụp vân gạch. */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

export function marble(seed: number, base: string, vein: string, w = 512, h = 512): string {
  const r = rng(seed);
  let paths = "";
  for (let i = 0; i < 7; i++) {
    let d = `M ${-20} ${r() * h}`;
    for (let x = 0; x <= w + 40; x += 64) d += ` Q ${x + 32} ${r() * h} ${x + 64} ${r() * h}`;
    paths += `<path d="${d}" fill="none" stroke="${vein}" stroke-opacity="${0.15 + r() * 0.35}" stroke-width="${0.6 + r() * 2.4}"/>`;
  }
  return wrap(
    w,
    h,
    `<defs><filter id="b"><feGaussianBlur stdDeviation="0.8"/></filter></defs><rect width="${w}" height="${h}" fill="${base}"/><g filter="url(#b)">${paths}</g>`,
  );
}

export function wood(seed: number, base: string, grain: string, w = 1200, h = 200): string {
  const r = rng(seed);
  let lines = "";
  for (let y = 4; y < h; y += 5 + r() * 9) {
    const amp = 2 + r() * 5;
    lines += `<path d="M0 ${y} C ${w * 0.3} ${y - amp} ${w * 0.6} ${y + amp} ${w} ${y}" fill="none" stroke="${grain}" stroke-opacity="${0.15 + r() * 0.3}" stroke-width="${0.8 + r() * 1.6}"/>`;
  }
  for (let i = 0; i < 3; i++) {
    lines += `<ellipse cx="${r() * w}" cy="${r() * h}" rx="${10 + r() * 18}" ry="${4 + r() * 5}" fill="${grain}" fill-opacity="0.25"/>`;
  }
  return wrap(w, h, `<rect width="${w}" height="${h}" fill="${base}"/>${lines}`);
}

export function terrazzo(seed: number, base: string, chips: string[], w = 512, h = 512): string {
  const r = rng(seed);
  let dots = "";
  for (let i = 0; i < 260; i++) {
    const c = chips[Math.floor(r() * chips.length)];
    const rx = 2 + r() * 9;
    dots += `<ellipse cx="${r() * w}" cy="${r() * h}" rx="${rx}" ry="${rx * (0.5 + r() * 0.5)}" transform="rotate(${r() * 180})" fill="${c}"/>`;
  }
  return wrap(w, h, `<rect width="${w}" height="${h}" fill="${base}"/>${dots}`);
}

export function cement(seed: number, base: string, w = 512, h = 512): string {
  return wrap(
    w,
    h,
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0"/></filter><rect width="${w}" height="${h}" fill="${base}"/><rect width="${w}" height="${h}" filter="url(#n)"/>`,
  );
}

export function pattern(base: string, ink: string, w = 400, h = 400): string {
  return wrap(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${base}"/><g fill="none" stroke="${ink}" stroke-width="10"><circle cx="0" cy="0" r="200"/><circle cx="400" cy="0" r="200"/><circle cx="0" cy="400" r="200"/><circle cx="400" cy="400" r="200"/><circle cx="200" cy="200" r="90"/></g><rect x="185" y="185" width="30" height="30" fill="${ink}" transform="rotate(45 200 200)"/>`,
  );
}
/** Ngói (1 viên, phần lộ ra): nền đất nung/màu, sóng dọc + mép dưới tối — shader thêm đổ bóng chồng mí. */
export function roofTile(base: string, dark: string, waves = 2, w = 400, h = 460): string {
  let ridges = "";
  for (let i = 0; i < waves; i++) {
    const x0 = (i * w) / waves;
    ridges += `<rect x="${x0}" y="0" width="${w / waves}" height="${h}" fill="url(#g)"/>`;
  }
  return wrap(
    w,
    h,
    `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${dark}" stop-opacity="0.45"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="${dark}" stop-opacity="0.45"/></linearGradient>` +
      `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0"/></filter></defs>` +
      `<rect width="${w}" height="${h}" fill="${base}"/>${ridges}<rect width="${w}" height="${h}" filter="url(#n)"/>` +
      `<rect y="${h - 14}" width="${w}" height="14" fill="${dark}" fill-opacity="0.5"/>`,
  );
}

/** Gạch thẻ (subway) men bóng: viền vát sáng + loang men nhẹ. */
export function subway(base: string, w = 600, h = 300): string {
  return wrap(
    w,
    h,
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.15" stop-color="#fff" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="${base}"/><rect width="${w}" height="${h}" fill="url(#s)"/>`,
  );
}

/** Đá granite / đá tự nhiên nhám: hạt li ti nhiều sắc độ. */
export function granite(seed: number, base: string, specks: string[], w = 512, h = 512): string {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 2 ** 32);
  let dots = "";
  for (let i = 0; i < 1400; i++) {
    dots += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.6 + r() * 2.2).toFixed(1)}" fill="${specks[Math.floor(r() * specks.length)]}" fill-opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
  }
  return wrap(w, h, `<rect width="${w}" height="${h}" fill="${base}"/>${dots}`);
}
