# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClawX is a cross-platform Electron desktop app (React 19 + Vite + TypeScript) providing a GUI for the OpenClaw AI agent runtime. It uses pnpm as its package manager (pinned version in `packageManager` field).

## Key Commands

```bash
pnpm run init          # Install deps + download uv
pnpm dev               # Start with hot reload
pnpm run lint          # ESLint with auto-fix
pnpm run typecheck     # TypeScript validation
pnpm test              # Unit tests (Vitest)
pnpm run test:e2e      # Playwright Electron E2E tests
pnpm run build:vite    # Build frontend only
pnpm build             # Full production build
```

Run a single test file: `pnpm test -- <path>`

## Architecture

### Dual-Process Model

```
┌─────────────────────────────────────┐
│  Electron Main Process              │
│  • Window & app lifecycle            │
│  • Gateway process supervision       │
│  • System integration (tray, keychain)│
│  • Host API proxy routes            │
└────────────────┬────────────────────┘
                 │ IPC
                 ▼
┌─────────────────────────────────────┐
│  React Renderer Process             │
│  • UI (React 19 + Zustand)          │
│  • Single entry: src/lib/host-api.ts│
│  • src/lib/api-client.ts            │
└─────────────────────────────────────┘
                 │
                 ▼ Main-owned transport
┌─────────────────────────────────────┐
│  OpenClaw Gateway (port 18789)      │
│  • WS first, HTTP fallback          │
│  • IPC fallback for reliability     │
└─────────────────────────────────────┘
```

### Critical: Renderer/Main API Boundary

**Renderer must use `src/lib/host-api.ts` and `src/lib/api-client.ts` as the single entry for backend calls.**

- Do NOT add direct `window.electron.ipcRenderer.invoke(...)` calls in pages/components
- Do NOT call Gateway HTTP endpoints directly from renderer (`fetch('http://127.0.0.1:18789/...')`)
- Use Main-process proxy channels (`hostapi:fetch`, `gateway:httpProxy`) to avoid CORS
- Transport policy is Main-owned: WS -> HTTP -> IPC fallback; renderer should not implement protocol switching

### Directory Structure

- `electron/` — Main process (Electron)
  - `api/routes/` — RPC/HTTP proxy route handlers
  - `gateway/` — OpenClaw Gateway process manager (supervisor, lifecycle, restart, etc.)
  - `main/` — App entry, windows, IPC handlers
  - `preload/` — Secure IPC bridge
  - `services/` — Provider management, secrets (keychain)
  - `utils/` — Config, paths, OAuth, OpenClaw CLI wrappers
- `src/` — Renderer process (React)
  - `lib/` — host-api.ts (SINGLE entry), api-client.ts, gateway-client.ts, error-model.ts
  - `stores/` — Zustand stores (chat, channels, gateway, providers, settings, etc.)
  - `pages/` — Route pages (Dashboard, Chat, Channels, Skills, Cron, Settings)
  - `components/` — Reusable UI components
- `tests/e2e/` — Playwright Electron E2E tests
- `tests/unit/` — Vitest unit tests

### Important Development Notes

- **No database**: Uses `electron-store` (JSON files) and OS keychain. No database setup needed.
- **Gateway startup**: When running `pnpm dev`, Gateway starts on port 18789. Takes ~10-30s to become ready. UI works without it (shows "connecting").
- **pnpm version**: Use `corepack enable && corepack prepare` to activate the pinned version before installing.
- **Doc sync rule**: After functional/architecture changes, update `README.md`, `README.zh-CN.md`, and `README.ja-JP.md` in the same PR.
- **UI change validation**: Any user-visible UI change should include/update an E2E spec in the same PR.
- **Comms changes**: If touching communication paths (gateway events, runtime send/receive, delivery, fallback), run `comms:replay` and `comms:compare` before pushing.
