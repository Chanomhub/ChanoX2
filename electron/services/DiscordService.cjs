const RPC = require('discord-rpc');
const path = require('path');

class DiscordService {
    constructor() {
        this.client = null;
        this.clientId = '1491120618043609280'; // ChanoX2 Client ID
        this.currentActivity = null;
        this.startTime = Date.now();
        this.reconnectTimer = null;
        this.isConnecting = false;
    }

    async init() {
        if (this.client || this.isConnecting) return;
        
        // Final safety check: read settings from file
        try {
            const { app } = require('electron');
            const fs = require('fs');
            const path = require('path');
            const settingsFile = path.join(app.getPath('userData'), 'settings.json');
            if (fs.existsSync(settingsFile)) {
                const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
                if (settings.discordRPCEnabled === false) {
                    console.log('🎮 [Discord] Skipping initialization: Disabled in settings');
                    return;
                }
            }
        } catch (e) {
            console.warn('⚠️ [Discord] Error checking settings:', e.message);
        }

        console.log('🎮 [Discord] Initializing Discord RPC...');
        this.isConnecting = true;

        try {
            this.client = new RPC.Client({ transport: 'ipc' });

            this.client.on('ready', () => {
                console.log('✅ [Discord] Rich Presence ready');
                this.isConnecting = false;
                this.setIdleActivity();
            });

            this.client.on('disconnected', () => {
                console.log('❌ [Discord] Disconnected');
                this.cleanup();
                this.scheduleReconnect();
            });

            await this.client.login({ clientId: this.clientId }).catch(err => {
                console.warn('⚠️ [Discord] Could not connect to Discord (is it running?):', err.message);
                this.isConnecting = false;
                this.scheduleReconnect();
            });
        } catch (error) {
            console.error('🔥 [Discord] Initialization error:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.init();
        }, 15000); // Try again in 15s
    }

    cleanup() {
        this.client = null;
        this.isConnecting = false;
    }

    async setActivity(activity) {
        if (!this.client) return;

        try {
            this.currentActivity = {
                ...activity,
                largeImageKey: 'icon', // Asset name in Discord Dev Portal
                largeImageText: 'ChanoX2 Launcher',
                instance: false,
            };
            await this.client.setActivity(this.currentActivity);
        } catch (err) {
            console.error('🔥 [Discord] Failed to set activity:', err);
        }
    }

    setIdleActivity() {
        this.setActivity({
            details: 'Browsing Games',
            state: 'Idle',
            startTimestamp: this.startTime,
        });
    }

    setGameActivity(gameTitle, startTime = Date.now()) {
        this.setActivity({
            details: `Playing ${gameTitle}`,
            state: 'In Game',
            startTimestamp: startTime,
        });
    }

    shutdown() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.client) {
            try {
                const destroyPromise = this.client.destroy();
                if (destroyPromise && typeof destroyPromise.catch === 'function') {
                    destroyPromise.catch(e => console.warn('⚠️ [Discord] Error while destroying client:', e?.message));
                }
            } catch (e) {
                console.warn('⚠️ [Discord] Error while destroying client:', e.message);
            }
            this.client = null;
        }
    }
}

module.exports = new DiscordService();
