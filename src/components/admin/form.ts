"use client";

import { startTransition } from "react";

/** Gửi form qua server action mà không để React tự xoá trắng các ô nhập (kể cả khi lỗi). */
export const submitWith = (action: (f: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
};
