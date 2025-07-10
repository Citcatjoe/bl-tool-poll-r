import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: "./", // Remplace par '/ton-dossier/' si ton site est dans un sous-dossier
  plugins: [react()],
  css: {
    postcss: './postcss.config.cjs',
  },
  server: {
    open: true,
  },
  build: {
    outDir: 'dist', // Définit le répertoire de sortie des builds
    assetsDir: "assets", // Où les fichiers générés (CSS, JS) sont stockés
  },
});


