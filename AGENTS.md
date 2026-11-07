<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Widget Norm

Kế hoạch, kiến trúc hub đa chatbot, lộ trình bot tương lai: **[docs/PLAN.md](docs/PLAN.md)** — làm xong việc nào thì tick ở mục 3 và ghi một dòng vào mục 6. Kế hoạch LLM/jev: **[docs/PLAN-LLM.md](docs/PLAN-LLM.md)**. Nội thất 3D/AR: **[docs/PLAN-FURNITURE-3D.md](docs/PLAN-FURNITURE-3D.md)**. Trước khi thêm bot/bảng/trang marketing, đọc `.claude/skills/hub-architecture/SKILL.md` và `hub-landing-design/SKILL.md`.

```bash
npm run typecheck && npm test
npm run eval:decision   # cần OPENROUTER_API_KEY
```
