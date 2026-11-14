/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        organa: {
          burgundy: {
            DEFAULT: '#702C3B',
            deep: '#421923',
            light: '#F0E4E7',
            muted: '#986A75',
            hover: '#5A232F',
            subtle: '#FAF5F6',
          },
          bg: {
            soft: '#F7F4F3',
            pure: '#FFFFFF',
            card: '#FFFFFF',
          },
          text: {
            primary: '#282326',
            secondary: '#81777A',
            muted: '#A59D9F',
          },
          border: {
            DEFAULT: '#EAE3E4',
            light: '#F2ECEE',
          },
          gold: {
            DEFAULT: '#D4AF37',
            light: '#FDF8E8',
          },
          success: {
            DEFAULT: '#10B981',
            light: '#ECFDF5',
          },
          warning: {
            DEFAULT: '#F59E0B',
            light: '#FFFBEB',
          },
          danger: {
            DEFAULT: '#EF4444',
            light: '#FEF2F2',
          },
          info: {
            DEFAULT: '#3B82F6',
            light: '#EFF6FF',
          }
        },
      },
      fontFamily: {
        arabic: ['var(--font-ibm-plex-arabic)', 'IBM Plex Sans Arabic', 'Tahoma', 'sans-serif'],
        english: ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        'organa-sm': '0 1px 3px 0 rgba(66, 25, 35, 0.05)',
        'organa-md': '0 4px 6px -1px rgba(66, 25, 35, 0.07), 0 2px 4px -2px rgba(66, 25, 35, 0.05)',
        'organa-lg': '0 10px 15px -3px rgba(66, 25, 35, 0.08), 0 4px 6px -4px rgba(66, 25, 35, 0.05)',
        'organa-xl': '0 20px 25px -5px rgba(66, 25, 35, 0.09), 0 8px 10px -6px rgba(66, 25, 35, 0.05)',
      },
      borderRadius: {
        'organa': '0.75rem',
      }
    },
  },
  plugins: [],
};

