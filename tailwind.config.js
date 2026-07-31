/** @type {import('tailwindcss').Config} */

/* Two token conventions live side by side, on purpose:

   hsl(--x)      The shadcn-style names (background, foreground, primary,
                 secondary, muted, accent, border, …). calendarkit-pro's
                 markup is written against these, and it feeds its own
                 CalendarTheme in by setting `--background`, `--primary`, …
                 as *HSL triples* inline on its wrapper — so inside the
                 calendar they resolve to the calendar's theme, and
                 everywhere else to ours.

   rgb(--rgb-x)  Our own semantic scale (accent-soft, danger-ink, success-fg,
                 …), kept in RGB because the raw palette is authored in RGB.

   Both sets are defined per theme in globals.css. */
const hsl = name => `hsl(var(${name}) / <alpha-value>)`
const rgb = name => `rgb(var(${name}) / <alpha-value>)`

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/calendarkit-pro/**/*.{js,mjs}',
  ],
  theme: {
    extend: {
      colors: {
        /* ---- shared shadcn contract ---- */
        background: hsl('--background'),
        foreground: hsl('--foreground'),
        border: hsl('--border'),
        input: hsl('--input'),
        ring: hsl('--ring'),
        card: {
          DEFAULT: hsl('--card'),
          foreground: hsl('--card-foreground'),
        },
        popover: {
          DEFAULT: hsl('--popover'),
          foreground: hsl('--popover-foreground'),
        },
        primary: {
          DEFAULT: hsl('--primary'),
          foreground: hsl('--primary-foreground'),
        },
        secondary: {
          DEFAULT: hsl('--secondary'),
          foreground: hsl('--secondary-foreground'),
        },
        muted: {
          DEFAULT: hsl('--muted'),
          foreground: hsl('--muted-foreground'),
        },
        destructive: {
          DEFAULT: hsl('--destructive'),
          foreground: hsl('--destructive-foreground'),
        },

        /* ---- our semantic scale ----
           DEFAULT  the color itself
           hover    one step deeper, for :hover fills
           soft     pale tint, for subtle backgrounds
           strong   saturated dark shade, for rings/borders/active states
           ink      dark shade that stays readable as text on white
           fg       foreground to place *on top of* the DEFAULT fill */
        accent: {
          DEFAULT: hsl('--accent'),
          foreground: hsl('--accent-foreground'),
          hover: rgb('--rgb-accent-hover'),
          soft: rgb('--rgb-accent-soft'),
          strong: rgb('--rgb-accent-strong'),
          ink: rgb('--rgb-accent-ink'),
          fg: rgb('--rgb-accent-fg'),
        },
        danger: {
          DEFAULT: rgb('--rgb-danger'),
          hover: rgb('--rgb-danger-hover'),
          soft: rgb('--rgb-danger-soft'),
          strong: rgb('--rgb-danger-strong'),
          ink: rgb('--rgb-danger-ink'),
          fg: rgb('--rgb-danger-fg'),
        },
        success: {
          DEFAULT: rgb('--rgb-success'),
          hover: rgb('--rgb-success-hover'),
          soft: rgb('--rgb-success-soft'),
          strong: rgb('--rgb-success-strong'),
          ink: rgb('--rgb-success-ink'),
          fg: rgb('--rgb-success-fg'),
        },
        warning: {
          DEFAULT: rgb('--rgb-warning'),
          hover: rgb('--rgb-warning-hover'),
          soft: rgb('--rgb-warning-soft'),
          strong: rgb('--rgb-warning-strong'),
          ink: rgb('--rgb-warning-ink'),
          fg: rgb('--rgb-warning-fg'),
        },
        info: {
          DEFAULT: rgb('--rgb-info'),
          hover: rgb('--rgb-info-hover'),
          soft: rgb('--rgb-info-soft'),
          strong: rgb('--rgb-info-strong'),
          ink: rgb('--rgb-info-ink'),
          fg: rgb('--rgb-info-fg'),
        },
        surface: {
          DEFAULT: rgb('--rgb-surface'),
          alt: rgb('--rgb-surface-alt'),
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
