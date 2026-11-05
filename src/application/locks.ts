/**
 * Khoá theo khoá chuỗi trong 1 tiến trình: các tác vụ cùng khoá chạy tuần tự.
 * Dùng cho: 2 tin nhắn cùng lúc của một khách, 2 khách đặt cùng khung giờ.
 * (Chạy nhiều instance → thay bằng advisory lock Postgres/Redis, cùng chữ ký hàm.)
 */
const locks = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  const tail = run.catch(() => undefined);
  locks.set(key, tail);
  void tail.then(() => {
    if (locks.get(key) === tail) locks.delete(key);
  });
  return run;
}
