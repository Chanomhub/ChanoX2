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
