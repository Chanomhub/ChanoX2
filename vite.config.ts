import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    base: './',
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core
                    'vendor-react': ['react', 'react-dom'],
                    // Routing
                    'vendor-router': ['react-router-dom'],
                    // Data fetching
                    'vendor-query': ['@tanstack/react-query', 'graphql', 'graphql-request'],
                    // Auth/Backend
                    'vendor-supabase': ['@supabase/supabase-js'],
                    // UI Components
                    'vendor-radix': [
                        '@radix-ui/react-checkbox',
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-scroll-area',
                        '@radix-ui/react-slot'
                    ],
                    // i18n
                    'vendor-i18n': ['i18next', 'react-i18next'],
                    // Utils
                    'vendor-utils': ['dompurify', 'zustand', 'ably']
                }
            }
        }
    },
    server: {
        port: 5173,
    },
})
