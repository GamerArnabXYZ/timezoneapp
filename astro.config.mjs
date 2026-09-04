// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://gamerarnabxyz.github.io',
  base: '/timezoneapp', // repo name = "timezoneapp" (not the username.github.io pattern)
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
