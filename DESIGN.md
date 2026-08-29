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

Navigation is a fixed desktop sidebar, an accessible mobile drawer and a global command opened by Ctrl/Cmd+K. The drawer traps focus, closes with Escape and restores focus. Content has one header and bounded width. Portfolio uses semantic Current/Historical tabs; tables serve holdings and history while pair and LP exposures retain specialized structure. Cards/panels are used only for coherent currency or exposure units.

## Financial metrics

Positive and negative use quiet semantic colors and always retain signs/labels. `AVAILABLE`, `INCOMPLETE`, `STALE` and `UNRECONCILED` each have a textual badge. Aggregate metrics display known value, currency, status, reason and coverage. Gross and net remain separate. Provenance is progressively disclosed.

## States

Loading uses structural skeletons. Empty states name the missing record without fake data. Errors are recoverable and contextual. Incomplete is an expected data condition, not a system failure.

## Motion

Only route entry/exit, command/drawer transitions, the tab indicator and one-pixel currency focus may move. Durations are 120–180ms. `prefers-reduced-motion` collapses every animation. P&L and numbers never roll, bounce or simulate trading activity.

## Responsive and accessibility

Mobile is a single-column information model with a drawer, stacked summary, horizontally scrollable semantic tables and 42px+ controls. Target is WCAG 2.2 AA: landmarks, heading order, native labels, visible focus, keyboard navigation, non-color state labels, reduced motion and touch-sized actions.

## Component sourcing

Prefer reviewed local primitives. Adopt registry code only after license/dependency review and record it in `docs/UI-COMPONENT-PROVENANCE.md`. No chart without real series data.

## Signature Components

- **Global command:** provides navigation from the app shell only. It must retain dialog/listbox semantics, full keyboard operation, Escape close and visible focus. It must not trigger financial writes or become a decorative launcher.
- **Portfolio segmented tabs:** separate Current from Historical only. They must retain tab/tabpanel relationships and arrow-key navigation. Animation is limited to the 180ms active indicator and may never obscure which time perspective is selected.
- **Mobile navigation drawer:** replaces desktop navigation below the responsive breakpoint. It requires touch-sized controls, focus trap, Escape close and trigger-focus restoration. It must not be used as a generic content carousel.
- **Currency focus and coverage:** currency focus may orient attention without converting or hiding buckets; coverage must expose known value, available/total components, status and reason in text. Neither may synthesize totals, FX, progress or data.
- **Provenance disclosure:** keeps source IDs secondary in native progressive disclosure. It is allowed on metrics and records with real source identifiers and forbidden for fabricated attribution.

All signature motion follows intensity 3/10, lasts 120–180ms, serves orientation/feedback/state change and collapses under `prefers-reduced-motion`.

## Intelligence surfaces

Dashboard is the macro home; Portfolio remains drill-down. Executive values are grouped by currency and always say “known value”. Allocation uses structured lists with textual percentages and coverage instead of decorative charts while canonical history is insufficient. Analytics expands the same server-owned metrics. Insights use quiet severity labels, evidence, review destinations and no trading instruction.

## Forbidden patterns

No neon, rainbow gradient, heavy glass, exchange speculation motifs, decorative finance animation, fake totals/data/charts, client-side financial calculation, multiple icon systems, CSS-in-JS, microfrontends, secrets, wallet/order/withdraw/transfer/signing capability, or user content rendered as raw HTML.
