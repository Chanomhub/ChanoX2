# ChanoX2 Development Guide

## Deep Linking (chanox2://)

The application supports deep linking via the `chanox2://` protocol. This allows the website to trigger actions in the desktop app (e.g., navigating to a specific article).

### Linux Setup (Dev Mode)

On Linux, deep links require a `.desktop` file registration. If you are developing on Linux, run the following command once to register the protocol to your local dev environment:

```bash
bun run setup:linux-protocol
```

This will create a local desktop entry that maps `chanox2://` to `bun run electron:dev` in your current directory.

### Windows Setup

On Windows, Electron's `app.setAsDefaultProtocolClient` usually handles registration automatically when the app is launched for the first time. If it fails, you may need to run the app as Administrator once.

### Usage in Code

- **Main Process:** Handles URL parsing in `electron/main.cjs`.
- **Renderer Process:** Use the `useDeepLink` hook in `App.tsx` to listen for incoming links.

Example link: `chanox2://article/some-article-slug`

## UI & Design System Rules (Single Source of Truth)

All pages and UI components in ChanoX2 must follow the unified ChanomHub brand design:
- **Design Specifications:** Refer to [DESIGN.md](./DESIGN.md)
- **UI Architecture & Rules:** Refer to [UI_RULES.md](./UI_RULES.md)
- **Brand Palette:** Warm Amber/Tea (`hsl(38 92% 52%)` / `#f59e0b`) as `--primary` accent over deep velvety warm background (`bg-background`).
- **No Arbitrary Colors:** Never hardcode Steam blue (`#66c0f4`, `#1b2838`, `#1a2a3a`) or random colors (`rose-500`). Always use semantic Tailwind tokens (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`).

## Git Commit Convention

All commits must follow the **Conventional Commits** standard to ensure automated GitHub Release changelog categorization:
- **Specification & Guidelines:** Refer to [COMMIT_RULES.md](./COMMIT_RULES.md)
- **Format:** `<type>(<scope>): <subject>` (e.g. `feat(library): ...`, `fix(download): ...`, `style(ui): ...`)
- **Automated Validation:** Enforced by Commitlint via Husky hook (`.husky/commit-msg`).

## AI Coding Rules & Conventions

### 1. No Emojis in Backend (.cjs) Files
- Do NOT use emojis in `.cjs` files (including `electron/main.cjs`, `electron/preload.cjs`, and services/platforms).
- Console logging must use clean, bracketed text prefixes instead of emojis:
  - Good: `console.log('[Main] Loading configuration...');`
  - Good: `console.error('[Error] Failed to connect:', err.message);`
  - Good: `console.warn('[Warn] Deprecated setting detected');`
  - Bad: `console.log('📝 [Main] Loading...');`
  - Bad: `console.error('❌ Failed:', err);`
  - Bad: `console.log('✅ Done!');`

### 2. Translation Suite Naming (Lingo-Translate)
- The visual novel / RPG translation tool is **Lingo-Translate** (or **Lingo**), maintained under `ProjectErotic/Lingo-Translate`.
- Do NOT name new files, components, functions, or variables with `nst` or `NST` (e.g. use `LingoSettings.tsx`, not `NstSettings.tsx`; `openLingoCli`, not `openNstCli`).
- Keep legacy `nst` references strictly as backward-compatible fallback aliases for existing user workspaces and paths.

