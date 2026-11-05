/** Kiểm định z hai tỷ lệ (hai phía). Trả về p-value và khoảng chênh lệch. */
export function twoProportionTest(x1: number, n1: number, x2: number, n2: number) {
  if (n1 === 0 || n2 === 0) return { p: 1, diff: 0, z: 0 };
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  if (se === 0) return { p: 1, diff: p1 - p2, z: 0 };
  const z = (p1 - p2) / se;
  return { p: 2 * (1 - normalCdf(Math.abs(z))), diff: p1 - p2, z };
}

/** Xấp xỉ CDF phân phối chuẩn (Abramowitz–Stegun 7.1.26). */
function normalCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + y);
}
