# ChanoX2

Desktop application for **ChanomHub**, built with **Expo**, **React Native**, and **Electron**.

## 🚀 Features

- **Cross-Platform:** Runs on Web, Windows, macOS, Linux, Android, and iOS.
- **Game/Article Browsing:** Browse and search for games/articles with detailed information.
- **Download Management:** Integrated download manager for handling game files and mods with progress tracking.
- **GraphQL API:** Efficient data fetching using GraphQL.
- **Localization:** Support for multiple languages.

## 🛠 Tech Stack

- **Core:** [React Native](https://reactnative.dev/) (via [Expo](https://expo.dev/))
- **Desktop Wrapper:** [Electron](https://www.electronjs.org/)
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/)
- **State/Data:** GraphQL (`graphql-request`)
- **Runtime:** [Bun](https://bun.sh/) (used for some development scripts)

## 📦 Prerequisites

- **Node.js** (Latest LTS recommended)
- **Bun** (Required for running some scripts like `electron:start`)
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd ChanoX2
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Run Development Server:**

    - **Electron (Desktop):**
      Starts the local web server and launches the Electron window.
      ```bash
      npm run electron:start
      ```
    
    - **Web:**
      ```bash
      npm run web
      ```

    - **Android/iOS:**
      ```bash
      npm run android
      # or
      npm run ios
      ```

## 📜 Scripts

| Script | Description |
| :--- | :--- |
| `npm start` | Start Expo development server |
| `npm run electron:start` | Start Electron development with hot reload (requires Bun) |
| `npm run build:web` | Build the web version (Export to `dist`) |
| `npm run build:electron` | Build the Electron app for production |
| `npm run build:all` | Build both web and Electron versions |
| `npm test` | Run tests with Jest |

## 📂 Project Structure

- `app/` - Expo Router pages and layouts (file-based routing).
- `src/` - Source code (components, hooks, services, API).
- `electron/` - Electron specific configuration.
- `electron-main.js` - Main process file for Electron (window management, download handling).
- `assets/` - Static assets (images, icons).
- `scripts/` - Utility scripts for build and dev processes.
- `dist/` - Output directory for web build (served by Electron).

## 📚 Documentation

For more detailed information, please refer to:

- [GraphQL API](./GRAPHQL_API.md) - API Schema and Query documentation.
- [CI/CD Setup](./CICD_SETUP.md) - Pipeline configuration.
- [Downloads Guide](./DOWNLOADS.md) - Information about the download system.

## 📝 License

Private - ChanomHub
