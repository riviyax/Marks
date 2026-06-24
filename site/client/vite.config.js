import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Vite's dev server otherwise sets a strict Cross-Origin-Opener-Policy,
    // which blocks Firebase's signInWithPopup from detecting that the
    // Google popup closed — the promise then never resolves and the login
    // modal appears to hang. This header only applies in dev; a production
    // build/host won't include it unless you set it yourself.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
