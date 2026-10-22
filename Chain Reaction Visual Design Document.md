# Chain Reaction: Visual Design Document

*AML Money Mule Detection & Graph Intelligence Platform. Design System v1.0*

---

## 1. Design Intent

Chain Reaction is a cockpit for people who make high-stakes decisions quickly: freezing accounts, filing SARs, and defending model decisions to auditors. The interface should feel **precise, calm, and fast**, like an instrument panel rather than a spreadsheet.

### 1.1 Design Principles

1. **Signal over decoration.** Every pixel of color means something. Lime marks what the analyst can act on; red, orange and amber mark risk. Nothing is colored just to be pretty.
2. **Dark-first, graphite-deep.** Analysts work long shifts. A graphite canvas reduces eye strain and makes lime and risk colors glow with purpose.
3. **Explainability is visible.** The top 3 drivers and top 2 counterparty links are always above the fold. No "black box" moments.
4. **Density with breathing room.** Information-rich, but organized by a strict 4px grid, generous panel padding and clear hierarchy.
5. **Motion explains.** Animation shows flow direction, causality and focus. It is never ornamental, and it respects `prefers-reduced-motion`.

### 1.2 Personality

| Attribute | Expression |
| :-- | :-- |
| Sleek | Thin 1px borders, soft inner glows, minimal chrome, large type for key numbers |
| Modern | Rounded 12px panels, subtle glass layering, crisp mono numerals |
| Authoritative | Restrained palette, consistent iconography, no playful illustration |
| Electric | One high-energy accent (Lime Spark) used sparingly for focus and action |

---

## 2. Color System

### 2.1 Brand Colors

| Token | Hex | Role |
| :-- | :-- | :-- |
| **`lime-spark`** | `#B6FF2E` | Primary brand accent: primary buttons, active tab indicator, focus rings, selection, key data highlights |
| **`graphite`** | `#23262F` | Primary surface: app background in dark mode, text and button label color on lime fills |

**Contrast check.** Lime Spark on Graphite is roughly **12.5:1** (passes WCAG AAA). Graphite text on a Lime Spark fill gives the same ratio, so **primary buttons always use graphite labels**.

**Critical rule.** Lime Spark on white is only about 1.3:1 and fails accessibility. In light mode lime is used **only as a fill** with graphite text or icons, never as text or thin lines on white.

### 2.2 Graphite Neutral Scale

Built around the brand graphite, with a slight cool-blue undertone for a sleek feel.

| Token | Hex | Usage |
| :-- | :-- | :-- |
| `graphite-950` | `#14161B` | App canvas behind panels (deepest layer) |
| `graphite-900` | `#1A1D24` | Sidebar, top navigation |
| `graphite-800` | `#23262F` | **Brand graphite.** Cards and panels |
| `graphite-700` | `#2D313C` | Raised surfaces, table row hover, inputs |
| `graphite-600` | `#3A3F4C` | Borders, dividers |
| `graphite-500` | `#565C6B` | Disabled elements, muted icons |
| `graphite-400` | `#7F8696` | Secondary text, metadata, table headers |
| `graphite-300` | `#A9AEBB` | Body text on dark (secondary emphasis) |
| `graphite-200` | `#D1D4DC` | Body text on dark (primary) |
| `graphite-100` | `#E8EAEF` | Borders in light mode |
| `graphite-50` | `#F5F6F8` | Light-mode canvas |
| `white` | `#FFFFFF` | Headings on dark, light-mode cards |

### 2.3 Lime Spark Scale

| Token | Hex | Usage |
| :-- | :-- | :-- |
| `lime-50` | `#F6FFE0` | Light-mode tinted backgrounds |
| `lime-200` | `#E4FFA6` | Hover highlight text on dark |
| `lime-400` | `#CDFF5E` | Button hover (lighter) |
| **`lime-500`** | **`#B6FF2E`** | **Brand accent** |
| `lime-600` | `#98DB14` | Button pressed state |
| `lime-700` | `#75AB0B` | Lime-tinted text on light backgrounds (AA on white) |
| `lime-glow` | `rgba(182,255,46,0.16)` | Focus halos, selected-row tint, active-tab glow |

### 2.4 Semantic Risk Colors

Risk colors are tuned for luminance on graphite and are **deliberately distinct from lime**, so that the brand accent never reads as "safe" or "dangerous."

| Token | Hex (dark) | Hex (light) | Pill background (dark) | Meaning |
| :-- | :-- | :-- | :-- | :-- |
| `risk-critical` | `#FF4D5E` | `#DC2626` | `rgba(255,77,94,0.14)` | CRITICAL RISK, target mule node |
| `risk-high` | `#FF8A3D` | `#EA580C` | `rgba(255,138,61,0.14)` | HIGH RISK, chain intermediaries |
| `risk-elevated` | `#FFC53D` | `#D97706` | `rgba(255,197,61,0.14)` | ELEVATED REVIEW, borderline score |
| `risk-standard` | `#2DD4BF` | `#0D9488` | `rgba(45,212,191,0.14)` | STANDARD, legitimate account |
| `info` | `#60A5FA` | `#2563EB` | `rgba(96,165,250,0.14)` | Counterparties, informational callouts |

> **Why teal for "Standard" instead of green?** Lime and emerald sit close together on screen. Using teal for "safe" preserves lime as the unambiguous *brand and interaction* color.

### 2.5 Color Usage Rules

- **60 / 30 / 10 balance.** About 60% graphite surfaces, 30% neutral text and borders, 10% accent (lime plus risk colors).
- **One lime moment per region.** A panel should have at most one lime-filled element (a primary button, the active tab, or the selected node ring).
- **Never rely on color alone.** Every risk badge pairs color with an icon and a text label (`ShieldAlert` for Critical, `AlertTriangle` for High, `Eye` for Elevated, `ShieldCheck` for Standard).
- **Gradients are rare.** Permitted only as the subtle top-edge sheen on cards (`graphite-700` to transparent) and the probability gauge arc.

---

## 3. Typography

| Role | Font | Weights | Notes |
| :-- | :-- | :-- | :-- |
| Headings and UI | **Inter** (fallback: system-ui) | 500, 600, 700 | Tight tracking (-0.01em) on headings |
| Numeric and monetary data | **JetBrains Mono** | 400, 500 | Tabular numerals to prevent layout shift on live updates |
| Account IDs | JetBrains Mono | 500 | Always monospace so IDs align and copy cleanly |

### 3.1 Type Scale

| Token | Size / Line height | Weight | Use |
| :-- | :-- | :-- | :-- |
| `display` | 40 / 44 | 700 | Hero KPI values (e.g. 70.0% mule probability) |
| `h1` | 28 / 34 | 600 | Account banner title |
| `h2` | 20 / 28 | 600 | Panel titles |
| `h3` | 16 / 24 | 600 | Section headers within panels |
| `body` | 14 / 22 | 400 | Narrative text, table cells |
| `caption` | 12 / 16 | 500 | Metadata, axis labels, table headers (uppercase, +0.04em tracking) |
| `mono-lg` | 24 / 28 | 500 | Telemetry tile values |
| `mono-sm` | 13 / 20 | 400 | Amounts, timestamps, IDs inline |

---

## 4. Layout, Spacing and Shape

### 4.1 Grid and Spacing

- **Base unit:** 4px. Allowed steps: 4, 8, 12, 16, 24, 32, 48, 64.
- **Page max width:** 1600px, with a fluid layout beyond 1280px.
- **Panel padding:** 20px (24px on desktop 1440+).
- **Gap between panels:** 16px.
- **Main split:** 45% left (insights) and 55% right (graph) on desktop, with a draggable divider (min 35% / max 65%).

### 4.2 Radius and Borders

| Element | Radius | Border |
| :-- | :-- | :-- |
| Panels and cards | 12px | 1px `graphite-600` at 60% opacity |
| Buttons and inputs | 10px | 1px `graphite-600` |
| Pills and badges | 999px | none (tinted bg + colored text) |
| Tooltips | 8px | 1px `graphite-600` |

### 4.3 Elevation

Depth comes from surface color first and shadow second.

| Level | Surface | Shadow (dark mode) | Use |
| :-- | :-- | :-- | :-- |
| 0 | `graphite-950` | none | App canvas |
| 1 | `graphite-800` | `0 1px 0 rgba(255,255,255,0.04) inset` | Panels |
| 2 | `graphite-700` | `0 8px 24px rgba(0,0,0,0.35)` | Dropdowns, autocomplete, tooltips |
| 3 | `graphite-700` | `0 16px 48px rgba(0,0,0,0.5)` | Modals, SAR export dialog |

---

## 5. Screen Designs

### 5.1 App Shell

- **Top bar (64px, `graphite-900`).** Logo mark on the left, the centered global search (max 560px), then the system status chip, theme toggle and user avatar.
  - *Logo:* A lime chain-link glyph (three connected nodes) followed by the wordmark "Chain Reaction" in white, with "AML" in `graphite-400`.
  - *Search:* Pill input in `graphite-700` with a `Search` icon. On focus it gains a 2px lime ring plus `lime-glow` halo, and a keyboard hint `/` appears at the right edge.
  - *Status chip:* Pulsing 8px lime dot with the label "Live · CUDA Model" in mono caption.

### 5.2 Global Telemetry Bar

Four equal tiles in a row (stacking 2x2 on tablet).

| Tile | Value style | Accent |
| :-- | :-- | :-- |
| Monitored Accounts (515k) | `mono-lg`, white | Sparkline in `graphite-400` |
| Transactions (5.08M) | `mono-lg`, white | Sparkline in `graphite-400` |
| Model PR-AUC (0.1884) | `mono-lg`, **lime-500** | Small delta chip vs baseline XGBoost |
| Alert Purity (28.3%) | `mono-lg`, **lime-500** | Mini progress bar in lime |

The two model-quality tiles use lime to signal "our performance" while the dataset-scale tiles stay neutral.

### 5.3 Account Banner (sticky)

A full-width strip at 72px height, `graphite-800`, with a 3px left border colored by risk tier.

- **Left:** "ACCOUNT" caption over the ID in `h1` mono with a copy icon button.
- **Center:** Risk badge pill (icon + label + tinted background). A HIGH RISK pill uses `risk-high` text on its 14% tint.
- **Right:** Recommended action text (body, `graphite-300`) and a **primary lime button**: "Generate SAR". Secondary actions (Freeze, Escalate) are outlined ghost buttons.

### 5.4 Tab Navigation

- Horizontal tabs on `graphite-900`: SAR Risk Card, Chain Stepper, GNNExplainer, Graph View, Benchmarks.
- Inactive: `graphite-400` text. Hover: `graphite-200`. Active: white text with a **3px lime underline** that animates between tabs (200ms ease-out slide) and a faint `lime-glow` fade beneath.
- Each tab has a leading Lucide icon (`FileText`, `GitCommit`, `BarChart3`, `Share2`, `Gauge`).

### 5.5 Left Panel: Insights (45%)

**Risk metrics card.**

- Large semicircular **probability gauge** (display type centered). The arc fills from `risk-standard` through `risk-elevated` and `risk-high` to `risk-critical`. A **lime tick** marks the decision threshold (0.5254) with a floating label "Threshold 0.5254" and a delta chip such as "+0.175 above".
- Beside it, three stat blocks: Hop Count, Chain Role pill, Pass-through Retention % (mono-lg).

**Feature attribution chart.**

- Horizontal bars, height 20px, radius 6px, on a `graphite-700` track.
- Top 3 features are filled with lime to signal the primary drivers, and the remainder in `graphite-500`. Percent labels sit at the bar end in mono. Raw values appear on hover.

**Multi-hop stepper.** Detailed in section 6.

**SAR narrative box.**

- Editable text area on `graphite-700` with body text, 22px line height and a character counter.
- Toolbar: Copy (becomes a green-tinted check for 1.5s), Download dropdown (.txt, .json, .pdf), and "Add investigator note".

### 5.6 Right Panel: Network Canvas (55%)

Covered in section 7. Floating control cluster at the top right; legend at the bottom left, both on frosted glass chips (`graphite-900` at 80% with 12px backdrop blur).

### 5.7 Benchmark Tab

Side-by-side comparison table (XGBoost vs GraphSAGE) with the winning cell in each row highlighted by a lime-tinted background and a small lime `Trophy` icon. The PR curve uses a lime line for GraphSAGE, a `graphite-400` dashed line for XGBoost, and a `graphite-600` baseline.

---

## 6. Chain Stepper Design

A **vertical timeline** by default (horizontal on wide screens, toggleable).

- Each account is a **node chip** (mono ID, 36px tall). Between chips runs a connector line with an amount label.
- **Connector styling:** 2px solid `risk-high`, with a small animated dot traveling along it to show flow direction (1.6s loop, paused when reduced motion is on).
- **Per-hop metadata row** below each connector: time dwell (`+8h 15m`), amount decay (`-$200.07 · 1.3%`) in `risk-critical`, and a monotonicity check icon (lime `Check` if timestamps ascend).
- **Current account** is outlined with a lime ring so the analyst never loses their place.
- **Summary footer:** Initial amount, final amount, retention %, total duration in a four-cell mono strip.
- **Interaction:** Clicking a step pulses the matching edge in the graph with a lime glow and eases the camera to center on it (400ms).

---

## 7. Network Graph Visual Spec

### 7.1 Canvas

- **Background:** `graphite-950` with a faint dot grid (`graphite-700` at 40%, 24px spacing) to give a technical, blueprint feel.
- **Renderer:** Canvas/WebGL, with a target of 60fps at up to 500 visible nodes.

### 7.2 Nodes

| Node type | Radius | Fill | Ring / Effect |
| :-- | :-- | :-- | :-- |
| Target account | 24px | `risk-critical` | Double ring (inner 2px white at 20%, outer 2px critical at 40%), soft red glow |
| Chain nodes | 18px | `risk-high` | Single 2px ring in orange at 50% |
| Counterparties | 12px | `info` at 70% | None |
| Low-signal background | 12px | `graphite-400` | None |
| **Selected node (any)** | unchanged | unchanged | **2px lime ring plus lime-glow halo** |

Labels use mono-sm at 11px, white at 90%, shown for target and chain nodes always and for others on hover or when zoomed in.

### 7.3 Edges

| Edge type | Width | Style | Color |
| :-- | :-- | :-- | :-- |
| Chain flow | 4px | Solid, animated directional pulse | `risk-critical` |
| High attribution (>0.6) | 2.5px | Solid | `risk-high` |
| Background | 1px | Dashed | `graphite-500` at 60% |
| **Focused (from stepper or hover)** | +1px | Solid | **lime-500** with glow |

Edges are curved arcs (rad 0.08) with arrowheads scaled to width.

### 7.4 Interaction Design

- **Hover:** Non-incident edges dim to 15% opacity, 1-hop neighbors stay at 100%, and a tooltip appears after 120ms.
- **Tooltip:** Elevation-2 card with Account ID (mono), Total Flow ($), Holding Time, and GNN Score with a mini gauge bar.
- **Click:** Selects the node, recenters it, and syncs the left panel's counterparty ranking to highlight it.
- **Drag-and-pin:** Pinned nodes show a small lime pin glyph.
- **Controls:** Zoom in, zoom out, fit-to-screen, physics toggle, and a layout switch (force vs. hierarchical left-to-right chain layout).
- **Supernode handling:** Background nodes collapse into a dashed cluster bubble showing the count. The badge reads `Showing top 25 of 1,240 counterparties (Filtered)`, with an "Expand" link in lime.

---

## 8. Components Library

### 8.1 Buttons

| Variant | Default | Hover | Pressed | Disabled |
| :-- | :-- | :-- | :-- | :-- |
| **Primary** | `lime-500` fill, graphite label | `lime-400` | `lime-600` | `graphite-600` fill, `graphite-400` label |
| **Secondary** | `graphite-700` fill, white label, 1px `graphite-600` border | `graphite-600` | `graphite-800` | 50% opacity |
| **Ghost** | transparent, `graphite-200` label | `graphite-700` fill | `graphite-800` | 40% opacity |
| **Destructive** | `risk-critical` at 14% tint, critical label | 22% tint | 30% tint | 50% opacity |

Height is 40px (32px compact). Padding is 16px horizontal. All include a visible **2px lime focus ring with 2px offset**.

### 8.2 Risk Badge

Pill with 8px horizontal padding, 24px height, a leading icon (14px), and uppercase caption text. Background is the tier's 14% tint, text is the tier color. The ELEVATED REVIEW badge adds a hairline amber border to stand out from standard.

### 8.3 Inputs and Search

- 44px height, `graphite-700` fill, 1px `graphite-600` border.
- Focus: border becomes `lime-500`, with a `lime-glow` 4px halo.
- Error: border `risk-critical`, helper text in critical, and the toast fires.
- Autocomplete dropdown (elevation 2) lists **Presets** (with a lime `Zap` icon) above **Matches**, with matched characters in white and the rest in `graphite-400`.

### 8.4 Tables

- Sticky header row in caption style on `graphite-900`.
- Row height 44px, hover `graphite-700`, selected row has a 2px lime left border plus `lime-glow` fill.
- Counterparty ranking uses an inline **importance bar** in the final column (lime for incoming, orange for outgoing) with the numeric score in mono beside it.

### 8.5 Toasts and Callouts

- Toasts slide in from the top right, 320px wide, elevation 3, with a 3px left border in the semantic color.
- Informational callouts (cold start, sub-threshold with chain) use `info` or `risk-elevated` tints with a leading icon and one-line action link.

---

## 9. Motion

| Interaction | Duration | Easing | Notes |
| :-- | :-- | :-- | :-- |
| Hover and focus transitions | 120ms | ease-out | Color and border only |
| Tab underline slide | 200ms | cubic-bezier(0.2, 0, 0, 1) |  |
| Panel content swap | 180ms | ease-out | Fade plus 4px translate |
| Gauge fill on load | 700ms | ease-out | Counts up the number in sync |
| Chain pulse | 1600ms loop | linear | Directional dots on chain edges |
| Camera focus (graph) | 400ms | ease-in-out | Triggered by stepper click |
| SAR copy confirmation | 1500ms | n/a | Icon morphs to check, then reverts |
| Skeleton shimmer | 1400ms loop | linear | Subtle graphite-700 to graphite-600 sweep |

Under `prefers-reduced-motion`, loops stop, count-ups jump to final values, and camera moves become instant.

---

## 10. Light Mode

Dark is the default, but a polished light theme ships with it.

| Role | Light value |
| :-- | :-- |
| Canvas | `graphite-50` `#F5F6F8` |
| Panels | `#FFFFFF` with 1px `graphite-100` border and `0 1px 2px rgba(35,38,47,0.06)` shadow |
| Primary text | `graphite-800` `#23262F` |
| Secondary text | `graphite-400` `#7F8696` |
| Primary button | `lime-500` fill with graphite label (unchanged) |
| Active tab indicator | 3px **graphite** underline with a small lime dot (lime alone would be invisible on white) |
| Focus ring | 2px graphite ring plus 4px lime halo |
| Graph canvas | `graphite-50` with `graphite-100` dot grid |

Risk colors switch to the darker light-mode hex values from section 2.4.

---

## 11. Responsive Behavior

| Breakpoint | Layout |
| :-- | :-- |
| 1440+ | Full split view, 4-tile telemetry row |
| 1024 to 1439 | Split view 50/50, telemetry compresses to icon plus value |
| 768 to 1023 | Single column; graph moves into its own tab, banner collapses actions into a menu |
| Below 768 | Read-only triage view: banner, gauge, drivers, stepper (vertical), SAR text. Graph opens as a full-screen sheet |

Touch targets are a minimum of 44px. The graph supports pinch-zoom and two-finger pan.

---

## 12. Accessibility

- All text meets **WCAG 2.1 AA** (4.5:1); key narrative and data meets AAA on graphite.
- Focus states are always visible with the lime ring (graphite ring in light mode).
- Risk is communicated by **icon + label + color**, never color alone.
- The graph has a **table alternative**: a keyboard-navigable list of nodes and edges, toggled from the canvas controls.
- Full keyboard support: `/` focuses search, `1` to `5` switch tabs, `G` toggles graph focus, `Esc` clears selection.
- Charts expose `aria-label` summaries (e.g. "has\_outflow\_after\_inflow contributes 38%").
- Live telemetry updates use `aria-live="polite"`.

---

## 13. Iconography

Lucide React, 1.75px stroke, 16px inline and 20px in buttons and tabs. Icons are monochrome and inherit text color, except risk icons which take their tier color.

Key icons: `ShieldAlert`, `AlertTriangle`, `Eye`, `ShieldCheck`, `GitCommit`, `TrendingDown`, `FileText`, `Share2`, `Search`, `Copy`, `Check`, `Zap`, `Pin`, `Maximize2`.

---

## 14. Design Tokens (Implementation Reference)

```css
:root {
  /* Brand */
  --lime-500: #B6FF2E;
  --lime-400: #CDFF5E;
  --lime-600: #98DB14;
  --lime-700: #75AB0B;
  --lime-glow: rgba(182, 255, 46, 0.16);

  /* Graphite */
  --graphite-950: #14161B;
  --graphite-900: #1A1D24;
  --graphite-800: #23262F;
  --graphite-700: #2D313C;
  --graphite-600: #3A3F4C;
  --graphite-500: #565C6B;
  --graphite-400: #7F8696;
  --graphite-300: #A9AEBB;
  --graphite-200: #D1D4DC;

  /* Risk (dark) */
  --risk-critical: #FF4D5E;
  --risk-high: #FF8A3D;
  --risk-elevated: #FFC53D;
  --risk-standard: #2DD4BF;
  --info: #60A5FA;

  /* Semantic */
  --bg: var(--graphite-950);
  --surface: var(--graphite-800);
  --surface-raised: var(--graphite-700);
  --border: var(--graphite-600);
  --text: #F8FAFC;
  --text-muted: var(--graphite-400);
  --accent: var(--lime-500);
  --on-accent: var(--graphite-800);

  /* Shape */
  --radius-panel: 12px;
  --radius-control: 10px;

  /* Type */
  --font-ui: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

:root[data-theme='light'] {
  --bg: #F5F6F8;
  --surface: #FFFFFF;
  --surface-raised: #F5F6F8;
  --border: #E8EAEF;
  --text: #23262F;
  --text-muted: #7F8696;
  --risk-critical: #DC2626;
  --risk-high: #EA580C;
  --risk-elevated: #D97706;
  --risk-standard: #0D9488;
  --info: #2563EB;
}
```

For Tailwind, map these variables in `theme.extend.colors` (e.g. `lime: { spark: 'var(--lime-500)' }`, `graphite: { 800: 'var(--graphite-800)' }`) so components stay theme-aware.

---

## 15. Empty, Loading and Error States

| State | Design |
| :-- | :-- |
| **Initial load** | Skeleton tiles and panels with graphite shimmer. Gauge shows an empty arc. Target is under 1.5s to first meaningful paint. |
| **No account selected** | Centered illustration (three linked nodes, line-art in `graphite-500` with one lime node), headline "Search an account to begin," and preset chips below. |
| **Cold start account** | Info callout above the graph: `Limited Subgraph Connectivity: GNN falls back to 1-hop degree stats. Multi-hop chains: None.` The graph shows the sparse neighborhood with a faded dashed ring where hop 2 would be. |
| **Invalid ID** | Input turns critical-red, toast shows `Account ID not found in 515,080 index. Suggested: 811C2F680, 100428660.` Suggestions are clickable lime-underlined chips. |
| **Sub-threshold with chain** | Banner shows ELEVATED REVIEW (amber) plus an explanatory callout: `Model assigned borderline score, but account participates in an active layering chain.` The gauge needle sits just under the lime threshold tick. |
| **API failure** | Panel-level error card with retry button (secondary style) and request ID in mono for support. |

---

## 16. Deliverables and Rollout

| Phase | Scope | Output |
| :-- | :-- | :-- |
| 1. Foundations | Tokens, type, color, icons, base components | Component library in Storybook |
| 2. Core screens | App shell, telemetry bar, account banner, SAR Risk Card | Clickable prototype |
| 3. Graph and chain | Network canvas, stepper, explainer tab | Interactive demo on sample accounts |
| 4. Polish | Light mode, responsive, motion, accessibility audit | Release candidate |

### 16.1 Design QA Checklist

- [ ] Lime appears at most once per region as a filled element
- [ ] Lime is never used as text on a light background
- [ ] Every risk indicator has icon, label and color
- [ ] Top 3 drivers and top 2 counterparty links visible without scrolling at 1440x900
- [ ] All interactive elements show hover, focus, pressed and disabled states
- [ ] Reduced-motion mode verified
- [ ] Supernode, cold-start and invalid-ID states reviewed
- [ ] SAR export reachable in 2 clicks or fewer
