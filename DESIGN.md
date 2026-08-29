# ProInvest Design Contract

## Brand and direction

ProInvest is calm private banking with the precision of a modern financial terminal. It is dark-first, dense, restrained and explicit. Design variance 5/10, motion 3/10, information density 7/10.

## Principles

1. Financial meaning precedes decoration.
2. Dense does not mean cramped: hierarchy comes from alignment, spacing and type.
3. Unknown is never zero; known subtotal is never labeled total.
4. BRL and USD remain separate without explicit FX.
5. State is communicated by text, shape and color together.

## Tokens

Canonical semantic tokens live in `apps/web-app/src/styles.css`: background, surface, raised/muted surfaces, border levels, text levels, accent/foreground, positive, negative, warning, incomplete, stale, unreconciled and focus. Spacing uses a 4px base. Radius is 6px for controls, 10px for panels and 14px only for large containers. Shadows are reserved for overlays. Z-index: content 0, sticky utility 20, navigation 30, overlay 50.

## Typography and numbers

UI uses Segoe UI Variable with system fallbacks, requiring no bundled binary. Financial values use Cascadia Mono/monospace fallbacks, `tabular-nums`, right alignment and explicit currency. 0/O and 1/l remain distinguishable in the chosen Windows-first stack.

## Components

Navigation is a fixed desktop sidebar and mobile drawer. Content has one header and bounded width. Forms use label, optional support text, explicit error, unit in the label and 42px minimum control height. Tables serve holdings and history; pair and LP exposures retain specialized structure. Cards/panels are used only for coherent currency or exposure units.

## Financial metrics

Positive and negative use quiet semantic colors and always retain signs/labels. `AVAILABLE`, `INCOMPLETE`, `STALE` and `UNRECONCILED` each have a textual badge. Aggregate metrics display known value, currency, status, reason and coverage. Gross and net remain separate. Provenance is progressively disclosed.

## States

Loading uses structural skeletons. Empty states name the missing record without fake data. Errors are recoverable and contextual. Incomplete is an expected data condition, not a system failure.

## Motion

Only route entry/exit and mobile navigation transition may move. Durations are 120–180ms. `prefers-reduced-motion` collapses every animation. P&L and numbers never roll, bounce or simulate trading activity.

## Responsive and accessibility

Mobile is a single-column information model with a drawer, stacked summary, horizontally scrollable semantic tables and 42px+ controls. Target is WCAG 2.2 AA: landmarks, heading order, native labels, visible focus, keyboard navigation, non-color state labels, reduced motion and touch-sized actions.

## Component sourcing

Prefer reviewed local primitives. Adopt registry code only after license/dependency review and record it in `docs/UI-COMPONENT-PROVENANCE.md`. No chart without real series data.

## Forbidden patterns

No neon, rainbow gradient, heavy glass, exchange speculation motifs, decorative finance animation, fake totals/data/charts, client-side financial calculation, multiple icon systems, CSS-in-JS, microfrontends, secrets, wallet/order/withdraw/transfer/signing capability, or user content rendered as raw HTML.
