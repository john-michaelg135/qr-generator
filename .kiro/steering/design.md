# Design Signature & Reusable Design System

> A portable design language for minimal, dark, sci-fi/rhythm-driven aesthetics.
> Drop into any project (apps, games, dashboards, portfolio sites).

---

## 1. Core Design Philosophy

The visual identity is built on **restraint + resonance**: a nearly blank
interface that only comes alive in reaction to input and music. Every design
decision serves two goals:

1. **Legibility under time pressure** — the player must parse a huge amount of
   information (note timing, position, type) in milliseconds.
2. **Emotional atmosphere** — the UI should feel like part of a lonely,
   post-apocalyptic, "last transmission from a dying world" sci-fi story, not
   like a generic app chrome.

Distilled principle: **"Say less, glow more."** Remove every non-essential
element; let color, motion, and audio-sync carry the emotional weight that
extra chrome would normally provide.

---

## 2. Color System

This design system doesn't use one static palette — it uses a **neutral dark shell** with a
**single accent hue per song/chapter**, which is the real signature move.

### 2.1 Base (shell) colors
| Token | Hex (approx) | Use |
|---|---|---|
| `--bg-void` | `#0A0A0F` | Primary background, near-black |
| `--bg-panel` | `#14141C` | Cards, menus, secondary surfaces |
| `--ink-primary` | `#F5F5F7` | Primary text, high-contrast white |
| `--ink-secondary` | `#8A8A99` | Secondary/meta text, muted grey |
| `--line-hair` | `#2A2A33` | Dividers, hairline strokes |

### 2.2 Accent (per-context) colors
Each "chapter" gets ONE dominant accent that tints notes, glows, progress
bars, and highlights. Pick one accent per feature/section of your product
rather than mixing many:

| Accent name | Hex (approx) | Mood |
|---|---|---|
| Cyan pulse | `#33E1FF` | Clinical, digital, "TA" chapter |
| Magenta signal | `#FF2E93` | Emotional, human, "Neko" chapter |
| Amber warning | `#FFB020` | Urgent, mechanical |
| Violet static | `#8C5CFF` | Dreamlike, glitch |
| Acid green | `#B4FF39` | Danger, corrupted data |

**Rule of one:** a given screen/state should use exactly one accent color
against the neutral shell. Never combine two accents in the same view — this
is what keeps the minimal interface from feeling busy.

### 2.3 Glow, not fill
Color is applied as **outer glow / stroke**, not flat fill. Elements are dark
with a luminous edge (simulate with `box-shadow`/`filter: drop-shadow` blur,
or SVG `feGaussianBlur`). This reads as "light in the dark" rather than
"colored shape on dark."

```css
.accent-glow {
  color: var(--accent);
  text-shadow: 0 0 8px var(--accent), 0 0 24px color-mix(in srgb, var(--accent) 50%, transparent);
}
.node-glow {
  border: 1px solid var(--accent);
  box-shadow: 0 0 6px var(--accent), 0 0 18px color-mix(in srgb, var(--accent) 40%, transparent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
```

---

## 3. Typography

- **Typeface character:** thin/light-weight geometric sans-serif, wide letter
  spacing, all-caps for labels and UI chrome; mixed case reserved for
  narrative/lyric text. Think Eurostile / Exo / Orbitron-adjacent, but never
  a full "cyberpunk" display font for body copy — body text stays clean and
  quiet so the geometry of the UI (not the font) carries the sci-fi feel.
- **Hierarchy by weight + tracking, not size explosions.** The system rarely jumps
  more than 2 size steps between title and body; it separates hierarchy with
  letter-spacing and weight instead.
- **Numbers are a first-class citizen.** Score, combo count, and accuracy
  percentages use a tabular/monospaced numeral style so digits don't jitter
  as they update in real time.

Suggested scale:
```
--font-display: 28px / 1.1 / tracking 0.08em / weight 300
--font-title:   18px / 1.3 / tracking 0.06em / weight 400
--font-label:   12px / 1.4 / tracking 0.12em / weight 500 / UPPERCASE
--font-body:    14px / 1.6 / tracking 0.01em / weight 400
--font-numeral: tabular-nums, weight 300, tracking 0
```

---

## 4. Layout & Grid

- **Extreme negative space.** Menus often have one focal element (album art,
  a single button, a title) centered in a mostly empty dark field. Emptiness
  is used deliberately, not as unfinished design.
- **Edge-anchored HUD.** During gameplay, all information (score top-left,
  combo center-top, accuracy top-right, pause bottom corner) hugs the
  screen edges, leaving the entire center stage clear for the actual
  interaction surface (the note track). Translate this to apps: keep chrome
  at the perimeter, keep the content/interaction area sacred and empty.
- **Horizontal "scan line" motif.** The core concept is literally a
  moving line sweeping across a track, triggering notes it crosses. As a
  layout metaphor: use a moving/animated divider, progress line, or cursor
  that sweeps through content to indicate active state or reveal progress —
  a strong alternative to a static progress bar.
- **Modular grid of "packs"/tiles.** Song selection screens use a clean tile
  grid (album-art squares) with consistent gutters and minimal captions
  underneath — good reference for any content-library or catalog UI.

---

## 5. Iconography & Shape Language

- **Primary shapes: circle, line, thin ring.** Notes are drawn as circles
  (tap), elongated capsules (hold), and connected line segments (drag/flick
  chains). This "geometric primitives only" rule extends to icons and
  buttons across the whole app — avoid ornate icon sets; stick to
  circle/line/ring/dot combinations at consistent stroke widths.
- **1–2px hairline strokes** on a dark field, occasionally filled solid only
  for the active/focused state.
- **No skeuomorphism, no drop shadows for depth** (only glow for state/
  emphasis). Flatness + glow = the signature, not flatness + shadow.
- **Connective lines communicate relationships** (drag chains link one note
  to the next). Reuse this for step indicators, flow diagrams, or timelines:
  connect states with a visible line rather than implying sequence through
  spacing alone.

---

## 6. Motion & Feedback

Motion in this system is **tight, percussive, and audio-synchronized** — this is
arguably the most transferable part of the signature.

- **Sub-150ms feedback on every input.** A tap must register visually within
  a couple frames: a burst/ring expansion + brief glow flash + particle pop.
  For UI outside a game, this maps to: every click/tap gets an immediate
  micro-animation (scale pulse, ripple, or glow flash) rather than waiting
  for a state change to resolve.
- **Judgement text is terse and disappears fast.** "PERFECT" / "GOOD" /
  "MISS" appear for a beat and vanish — no lingering toasts. Prefer short-
  lived, small-scale feedback over persistent banners.
- **Beat-synced ambient motion.** Background elements (particles, scan line,
  subtle pulsing shapes) move in time with music/rhythm where audio is
  present, or in time with a steady app "heartbeat" interval otherwise —
  gives the interface a living, breathing quality even at rest.
- **Easing:** fast-out, slow-in for appearing elements (snap in, ease out);
  linear motion for the scan line itself (mechanical, not organic).

```css
@keyframes note-hit {
  0%   { transform: scale(1);   opacity: 1;   box-shadow: 0 0 4px var(--accent); }
  40%  { transform: scale(1.6); opacity: 0.6; box-shadow: 0 0 24px var(--accent); }
  100% { transform: scale(2.2); opacity: 0;   box-shadow: 0 0 0 transparent; }
}
.note-hit-fx { animation: note-hit 220ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards; }
```

---

## 7. Sound-Reactive / Rhythmic Design Principle

Even outside of a music game, borrow the underlying idea: **interface state
changes should feel timed, not arbitrary.** Options:
- Quantize animations to a consistent tempo grid (e.g., all transitions are
  multiples of 100ms/150ms) so simultaneous UI changes feel "in sync" rather
  than staggered randomly.
- Tie ambient background motion to a subtle metronomic pulse even without
  music, to preserve the "alive interface" feeling.

---

## 8. Narrative & Content Tone

- **Sci-fi minimalism in copy.** Short, declarative labels. Numbers and
  system-status language ("SIGNAL LOST," "SYNC 98%") over friendly
  copywriting. Silence is acceptable — not every state needs an explanatory
  sentence.
- **Contrast between clean UI chrome and expressive character/key art.** The
  interface itself stays neutral and geometric so that illustrated key art
  (hand-drawn character portraits, chapter art) can be the one "warm,"
  human, emotionally expressive element on screen. Don't let UI chrome
  compete with hero imagery — mirror this by keeping your dashboard/app
  chrome neutral and letting photography/illustration carry personality.
- **One story chapter = one accent + one art style.** The system segments content
  into chapters (TA, Neko, Joe, etc.), each with its own accent color and
  illustrator, unified by the same underlying UI kit. This is a strong
  pattern for multi-tenant or multi-section products: shared component
  system, per-section accent + imagery.

---

## 9. Component Patterns to Reuse

| Design element | Reusable UI pattern |
|---|---|
| Scan line sweeping across track | Animated progress indicator / active-state sweep |
| Tap note (circle) | Primary button / interactive dot marker |
| Hold note (capsule) | Toggle / duration-based control (slider, timer) |
| Drag/flick chain (connected line) | Step indicator, onboarding flow, timeline |
| Combo counter (top-center, tabular numerals) | Live stat counter / streak counter |
| Song/chapter tile grid | Content library grid with minimal captions |
| Judgement flash (Perfect/Good/Miss) | Toast-free inline success/error micro-feedback |
| Per-chapter accent color | Per-section theming within one shared design system |
| Dark void background | Default canvas for any focus-mode / distraction-free UI |

---

## 10. Quick-Start Tokens (CSS Custom Properties)

```css
:root {
  /* Shell */
  --bg-void: #0A0A0F;
  --bg-panel: #14141C;
  --ink-primary: #F5F5F7;
  --ink-secondary: #8A8A99;
  --line-hair: #2A2A33;

  /* Pick ONE accent per screen/section */
  --accent: #33E1FF;

  /* Type */
  --font-display: 300 28px/1.1 "Exo", "Eurostile", sans-serif;
  --font-label: 500 12px/1.4 "Exo", sans-serif;
  --font-body: 400 14px/1.6 "Inter", sans-serif;

  /* Motion */
  --ease-snap: cubic-bezier(0.2, 0.8, 0.3, 1);
  --dur-fast: 150ms;
  --dur-med: 300ms;
}
```

---

## 11. Do / Don't Summary

**Do**
- Use one accent color per view; keep the shell neutral dark.
- Apply color as glow/stroke, not flat fill.
- Give every interaction sub-150ms visual feedback.
- Keep center-stage content areas empty; anchor chrome to edges.
- Use circle/line/ring geometry consistently across icons and controls.
- Let illustrated/hero art be the emotional focal point; keep UI neutral.

**Don't**
- Mix multiple saturated accent colors in one screen.
- Add drop-shadow depth/skeuomorphism — glow only.
- Let toasts/banners linger — feedback should be brief and precise.
- Overload the type scale with many sizes — differentiate via weight/tracking.
- Clutter the center interaction zone with UI chrome.

---

*Use this file as a starting design.md — copy the tokens in §10 into your
project's CSS/theme file and apply the rules in §11 as a design review
checklist.*