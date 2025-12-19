# ChanoX2

ChanoX2 is the desktop application for ChanomHub, built with Electron, React, and TypeScript. It serves as a game launcher and management platform, providing users with a seamless experience to discover, download, and play games from ChanomHub.

## ✨ Features

- **Desktop Experience**: Native desktop application for Windows, Linux, and macOS.
- **Game Management**: Browse library, install, update, and launch games.
- **Real-time Notifications**: Stay updated with notifications for new content, comments, and system alerts.
- **User Authentication**: Secure login and session management via Supabase.
- **Multilingual Support**: Fully localized interface (Thai & English support).
- **Modern UI**: Sleek, responsive interface built with Tailwind CSS and Radix UI.
- **Settings & Customization**: Customizable user experience including theme and language preferences.

## 🛠️ Tech Stack

- **Core**: [Electron](https://www.electronjs.org/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) (Icons)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Backend/API**: [Supabase](https://supabase.com/), [GraphQL](https://graphql.org/)
- **Real-time**: [Socket.io](https://socket.io/) / Ably
- **Utilities**: `7zip-bin`, `node-7z` (File handling), `i18next` (Localization)

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher is recommended.
- **npm**: Comes with Node.js.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ChanoX2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the application in development mode with hot-reloading:

```bash
npm run electron:dev
```

This command runs the Vite dev server and launches the Electron app simultaneously.

### Building for Production

To build the application for your current operating system:

```bash
npm run electron:build
```

The output files (installers, executables) will be generated in the `release` directory.

## 📂 Project Structure

```
ChanoX2/
├── electron/        # Electron main process code
│   ├── main.cjs     # Main entry point
│   └── preload.cjs  # Preload script
├── src/             # React frontend code
│   ├── components/  # Reusable UI components
│   ├── contexts/    # React Context providers
│   ├── libs/        # Utility libraries (API, i18n, etc.)
│   ├── pages/       # Application views/pages
│   ├── stores/      # Zustand state stores
│   └── ...
├── public/          # Static assets (icons, images)
├── release/         # Build outputs (generated)
└── package.json     # Project configuration and scripts
```

## 📦 Scripts

- `npm run dev`: Start Vite dev server only (web mode).
- `npm run electron:dev`: Start Electron app in development mode.
- `npm run electron:build`: Build the production application.
- `npm run electron:prod`: Preview the production build locally.

## 📄 License

This project is proprietary software of ChanomHub.
