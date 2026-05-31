import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'editor';
          }
          if (id.includes('react') || id.includes('react-router-dom')) {
            return 'react-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          if (id.includes('axios') || id.includes('dompurify')) {
            return 'app-vendor';
          }
          return undefined;
        },
      },
    },
  },
})
