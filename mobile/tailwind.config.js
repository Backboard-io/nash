/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        presentation: '#ffffff',
        'text-primary': '#212121',
        'text-secondary': '#424242',
        'text-tertiary': '#595959',
        'surface-primary': '#ffffff',
        'surface-primary-alt': '#ffffff',
        'surface-secondary': '#f7f7f8',
        'surface-tertiary': '#ececec',
        'surface-hover': '#e3e3e3',
        'surface-active-alt': '#e3e3e3',
        'surface-chat': '#ffffff',
        'border-light': '#e3e3e3',
        'border-medium': '#cdcdcd',
        'ring-primary': '#595959',
        'brand-purple': '#ab68ff',
        'brand-purple-soft': '#f4edff',
        'overlay-mask': 'rgba(7,7,7,0.4)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['Inter'],
        mono: ['RobotoMono'],
      },
      fontSize: {
        xxs: '10px',
      },
      spacing: {
        18: '72px',
      },
      animation: {
        'slide-in-left': 'slideInLeft 200ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
