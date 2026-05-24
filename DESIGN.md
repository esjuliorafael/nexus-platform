# Design

## Theme
Una interfaz de administración de alta gama que utiliza una paleta neutra con acentos terrosos (brand-500: #b47e74). El diseño se basa en la precisión tipográfica, animaciones fluidas (`--ease-emil`) y una jerarquía visual clara que evita el ruido innecesario.

## Color Palette
- **Base (Light)**: App: `#fbf7f6`, Card: `#ffffff`, Muted: `#f5f5f4`.
- **Base (Dark)**: App: `#0A0A0B`, Card: `#161618`, Muted: `#1E1E20`.
- **Brand**: `#b47e74` (Main), con variantes desde 50 a 900.
- **Semantic**: Emerald (Success), Rose (Error), Amber (Warning), Blue (Info).

## Typography
- **Primary Font**: Inter (Sans-serif)
- **Scale**: Fixed `rem` scale for product UI.
- **Ratio**: 1.125 (Major Second)
- **Hierarchy Tokens**:
  - `--text-hero`: 3rem (48px) | font-black | tracking-tighter
  - `--text-display`: 2.25rem (36px) | font-black | tracking-tighter
  - `--text-h1`: 1.5rem (24px) | font-black | tracking-tight
  - `--text-h2`: 1.25rem (20px) | font-bold | tracking-tight
  - `--text-body`: 1rem (16px) | font-normal
  - `--text-secondary`: 0.875rem (14px) | font-medium
  - `--text-label`: 0.625rem (10px) | font-black | uppercase | tracking-[0.2em]

## Layout
- **Rhythm**: Variado para evitar monotonía. Espaciado generoso en secciones (`p-8 sm:p-10`).
- **Cards**: `rounded-[2rem]` o `rounded-[3rem]` para un look suave pero moderno.
- **Borders**: `1px solid var(--border-main)`.

## Motion
- **Easing**: `cubic-bezier(0.23, 1, 0.32, 1)` (Emil's Easing).
- **Transitions**: 200-300ms para cambios de estado. 700ms para entradas de Hero.
- **Purpose**: Las animaciones deben guiar la atención y suavizar las transiciones de vista.
