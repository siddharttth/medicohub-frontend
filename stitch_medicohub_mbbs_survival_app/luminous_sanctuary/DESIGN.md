---
name: Luminous Sanctuary
colors:
  surface: '#0a122b'
  surface-dim: '#0a122b'
  surface-bright: '#313853'
  surface-container-lowest: '#050c26'
  surface-container-low: '#131a34'
  surface-container: '#171e38'
  surface-container-high: '#212943'
  surface-container-highest: '#2c344f'
  on-surface: '#dce1ff'
  on-surface-variant: '#cbc4d3'
  inverse-surface: '#dce1ff'
  inverse-on-surface: '#282f4a'
  outline: '#948e9d'
  outline-variant: '#494551'
  surface-tint: '#cfbcff'
  primary: '#cfbcff'
  on-primary: '#39197c'
  primary-container: '#b599ff'
  on-primary-container: '#472a8a'
  inverse-primary: '#684dad'
  secondary: '#c5c5d6'
  on-secondary: '#2e303d'
  secondary-container: '#444654'
  on-secondary-container: '#b3b4c5'
  tertiary: '#c5c5d6'
  on-tertiary: '#2e303d'
  tertiary-container: '#a8a8b9'
  on-tertiary-container: '#3c3d4b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005c'
  on-primary-fixed-variant: '#503493'
  secondary-fixed: '#e1e1f3'
  secondary-fixed-dim: '#c5c5d6'
  on-secondary-fixed: '#191b27'
  on-secondary-fixed-variant: '#444654'
  tertiary-fixed: '#e1e1f3'
  tertiary-fixed-dim: '#c5c5d6'
  on-tertiary-fixed: '#191b27'
  on-tertiary-fixed-variant: '#444654'
  background: '#0a122b'
  on-background: '#dce1ff'
  surface-variant: '#2c344f'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  accent-note:
    fontFamily: Caveat
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.2'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The brand identity centers on the "Survival" aspect of medical education—providing a calm, focused sanctuary amidst the high-pressure environment of MBBS studies. The aesthetic is a sophisticated blend of **Glassmorphism** and **Modern Tonal** styles, prioritizing visual comfort for long study sessions. 

The emotional response should be one of "Premium Focus": the interface feels expensive and curated, yet the soft purple glows and handwriting accents introduce a human, empathetic touch. It avoids the clinical sterility of traditional health apps, opting instead for a nocturnal, immersive environment that reduces eye strain and signals high-value content.

## Colors

This design system utilizes a deep-space palette to create a sense of depth and focus. 

- **Atmosphere:** The core background is a deep navy-black (`#070810`), providing a canvas for depth.
- **Surfaces:** Tiered depth is achieved through two surface variants—`#10121E` for primary content containers and `#0C0E1A` for secondary sidebars or nested elements.
- **The Glow:** The Primary Accent (`#B599FF`) is used sparingly for interactive elements and brand moments. It is frequently applied as a low-opacity radial gradient (`rgba(181, 153, 255, 0.15)`) behind cards to simulate a "warm purple glow."
- **Text Hierarchy:** Primary information uses a high-contrast off-white (`#F3F4F6`), while metadata and inactive states use a muted slate-blue (`#8B92B2`).

## Typography

The typographic system relies on **Inter** for all functional UI elements, ensuring maximum legibility and a systematic, Discord-like efficiency. Weights are used to establish hierarchy rather than color alone.

For "emotional accents"—such as motivational quotes, study tips, or hand-drawn annotations—**Caveat** is employed. These accents should be treated as secondary layers, often rotated slightly (2-3 degrees) to mimic real-world sticky notes or margin scribbles. Headlines should use tighter letter spacing to maintain a premium "editorial" feel.

## Layout & Spacing

This design system uses a **Fixed Grid** approach for desktop views to maintain the "Notion-like" workspace feel, while transitioning to a fluid model for mobile. 

The layout relies on a 12-column grid with generous 24px gutters. Content should be grouped into large, rounded containers. Vertical rhythm is strictly governed by an 8px baseline, ensuring that even dense medical data remains scannable. Navigation should ideally be positioned in a left-hand sidebar (Discord-style) or a floating bottom pill for mobile.

## Elevation & Depth

Depth is not communicated through heavy shadows, but through **Tonal Layering** and **Subtle Border Glows**.

- **Surfaces:** Elevation is signaled by lightness. The "higher" an object is in the hierarchy, the closer it moves toward the secondary surface color (`#10121E`).
- **Borders:** Use low-opacity white borders (`rgba(255, 255, 255, 0.06)`) to define card edges against the dark background. This creates a "glass" hairline effect.
- **The Halo Effect:** Instead of drop shadows, use a primary-colored radial glow behind key cards or buttons to create a "bloom" effect. This should look like a soft light source behind the component, not a shadow cast by it.
- **Backdrop Blur:** Use a `blur(12px)` on all floating elements (modals, dropdowns) to maintain context while ensuring legibility.

## Shapes

The shape language is ultra-rounded, emphasizing comfort and safety. 

- **Primary Cards:** Use a radius between `24px` and `28px`.
- **Secondary Elements:** Inputs and small containers should use `16px`.
- **Interactive Triggers:** Buttons and Tags are strictly **Pill-shaped** (full round) to distinguish them from content containers. 
- **Consistency:** Avoid sharp corners entirely. Even line-art illustrations should feature rounded terminals and soft curves to align with the "warm" brand personality.

## Components

### Buttons
Primary buttons use the soft purple (`#B599FF`) with dark text for maximum contrast. They should have a subtle outer glow of the same color. Secondary buttons use a transparent background with the hairline white border.

### Cards
Cards are the primary content vehicle. They feature the `#10121E` surface color, a `24px` radius, and a `1px` border at `0.06` opacity. For "Featured" content, add a `rgba(181, 153, 255, 0.1)` radial glow behind the card.

### Inputs
Input fields use the darker surface (`#0C0E1A`) with a slightly higher border opacity on focus. The cursor and focus ring should use the primary purple.

### Chips & Tags
Always pill-shaped. Used for categorization (e.g., "Anatomy," "Clinical"). Tags use a subtle purple background (`rgba(181, 153, 255, 0.1)`) with purple text.

### Progress Bars
Crucial for a "survival platform." Use a thick, pill-shaped track. The filled portion should be a gradient of the primary purple to a slightly lighter violet, creating a "liquid light" effect.

### Motivational Notes
A unique component utilizing the **Caveat** font. These appear as floating text next to major milestones or difficult topics, often paired with a small purple line-art icon.