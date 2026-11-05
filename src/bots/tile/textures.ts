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
