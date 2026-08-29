# UX Design V1.1

## Information architecture

Portfolio is the default route. The sidebar separates the consolidated view from operation registration: Equity Holding, Long & Short, Futures, Crypto Spot, Crypto Derivative and DeFi LP. Desktop uses a persistent rail; mobile uses a dismissible drawer.

## Portfolio hierarchy

1. Compact summary strip.
2. Explicit no-FX notice.
3. Currency valuation buckets.
4. Current holding table.
5. Pair exposure structures.
6. DeFi LP positions with snapshot context.
7. Historical closed-result table.

Filters rerun the approved API queries. UI rendering discriminates position kinds and never converts or recalculates values.

## Operation workflows

Every boleta uses one two-column desktop layout: typed form plus sticky canonical API response. Mobile stacks the preview after the form. Preview and save/reload have distinct actions and status feedback. Payload adapters preserve the existing financial contracts.

## Accessibility and state model

The shell has skip navigation, semantic navigation/main regions, native controls, visible focus and text-backed status. Loading, empty, partial and error states are first-class. Motion is short and reduced-motion aware.

## QA passes

- Pass 1: hierarchy/layout.
- Pass 2: typography/spacing.
- Pass 3: states/accessibility.
- Pass 4: responsive/motion.

No chart is present because the current Portfolio read API does not provide a sufficient time series.
