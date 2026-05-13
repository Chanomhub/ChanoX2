#!/bin/bash
# ChanoX2 Linux Protocol Setup (Dev Mode)
# This script registers the chanox2:// protocol to trigger 'bun run electron:dev'

APP_PATH=$(pwd)
APP_NAME="chanox2-dev"
ICON_PATH="$APP_PATH/public/icon.png"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_NAME.desktop"
BUN_PATH=$(which bun)

if [ -z "$BUN_PATH" ]; then
    echo "❌ Error: 'bun' not found in PATH. Please install bun first."
    exit 1
fi

echo "🔧 Setting up ChanoX2 protocol handler for Linux (Dev Mode)..."

mkdir -p "$HOME/.local/share/applications"

cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Name=ChanoX2 (Dev)
Comment=ChanomHub Desktop App (Development Mode)
Exec=$APP_PATH/node_modules/.bin/electron $APP_PATH . %u
Icon=$ICON_PATH
Type=Application
Terminal=false
MimeType=x-scheme-handler/chanox2;
Categories=Development;Game;
EOF

chmod +x "$DESKTOP_FILE"
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null
xdg-mime default "$APP_NAME.desktop" x-scheme-handler/chanox2 2>/dev/null

echo "✅ Protocol 'chanox2://' is now linked to 'bun run electron:dev' in this folder."
echo "💡 Note: You may need to restart your browser or logout/login for changes to take effect."
echo "💡 To test, try: xdg-open chanox2://article/test-slug"
