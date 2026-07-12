import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** PrimeNG preset aligned with HAMBOX brand green and dark surfaces. */
export const HamboxPrimePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#2dbb7c',
      600: '#24a86d',
      700: '#1f9460',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f4f6f8',
          100: '#eef1f5',
          200: '#e2e8f0',
          300: '#cbd5e0',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#f4f6f8',
        },
        primary: {
          color: '#2dbb7c',
          contrastColor: '#ffffff',
          hoverColor: '#24a86d',
          activeColor: '#1f9460',
        },
        formField: {
          background: '#f1f4f8',
          borderColor: '#e2e8f0',
          color: '#0f172a',
          placeholderColor: '#94a3b8',
        },
        content: {
          background: '#ffffff',
          hoverBackground: '#f1f5f9',
          borderColor: '#e2e8f0',
        },
      },
      dark: {
        surface: {
          0: '#e5e2e3',
          50: '#bbcbbc',
          100: '#8f9a90',
          200: '#5c6360',
          300: '#45484a',
          400: '#353436',
          500: '#2a2a2b',
          600: '#222224',
          700: '#1a1a1c',
          800: '#161618',
          900: '#131314',
          950: '#0e0e0f',
        },
        primary: {
          color: '{primary.400}',
          contrastColor: '#00391d',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        formField: {
          background: '{surface.700}',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '{surface.0}',
          placeholderColor: 'rgba(187, 203, 188, 0.55)',
        },
        content: {
          background: '{surface.900}',
          hoverBackground: '{surface.800}',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  },
});

/** Matches ThemeService `data-theme` attribute on `<html>`. */
export const HAMBOX_PRIME_DARK_MODE_SELECTOR =
  'html[data-theme="hambox-dark"], html:not([data-theme])';
