/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pixel: {
          void: '#050709',
          charcoal: '#0E1216',
          slate: '#171D22',
          border: '#2A343C',
          borderLight: '#435360',
          textMuted: '#708390',
          textMain: '#D0D7DA',
          textBright: '#F0F4F6',
          gold: '#E5B869',
          goldBright: '#F3C77C',
          goldGlow: '#FFE082',
          emerald: '#2E8B57',
          emeraldBright: '#34D399',
          emeraldDark: '#133E27',
          amber: '#D97706',
          ruby: '#E63946',
          silver: '#9EADB2'
        }
      },
      fontFamily: {
        pixel: ['"Silkscreen"', 'monospace'],
        pixelHeading: ['"Press Start 2P"', 'monospace'],
        mono: ['"Space Mono"', 'monospace', 'Courier New'],
      },
      boxShadow: {
        'pixel-sm': '2px 2px 0px #000000',
        'pixel-md': '3px 3px 0px #000000',
        'pixel-lg': '4px 4px 0px #000000',
        'pixel-gold': '3px 3px 0px #A0782C',
        'pixel-emerald': '3px 3px 0px #133E27',
      }
    },
  },
  plugins: [],
}
