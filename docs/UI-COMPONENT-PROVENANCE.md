# UI Component Provenance

Verified 2026-08-29 against official sites, repositories and npm metadata.

| Source | Component/use | Version | License | Adapted | Local path | Why |
|---|---|---:|---|---|---|---|
| shadcn/ui | open-code primitive composition model | CLI 4.19.0 | MIT | yes, no copied registry file | `apps/web-app/src/components/ui.tsx` | owned Button/Input/Select/Field primitives with data-light composition |
| Motion | route and drawer transitions | 13.1.1 | MIT | no | `AppShell.tsx` | restrained state transitions and reduced-motion API |
| Phosphor Icons | single icon family | 2.1.10 | MIT | no | shell/pages | coherent accessible product iconography |
| class-variance-authority | Button variant composition | 0.7.1 | Apache-2.0 | no | `components/ui.tsx` | small deterministic variants |
| clsx | conditional classes | 2.1.1 | MIT | no | `components/ui.tsx` | class composition |
| tailwind-merge | class conflict resolution | 3.6.0 | MIT | no | `components/ui.tsx` | safe local primitive extension |

Kokonut UI (MIT) was reviewed as visual reference; no registry component was copied or installed. React Bits and Magic UI were not adopted because their accent effects do not improve current financial workflows. Bklit chart components are MIT, while Bklit Studio is proprietary; neither entered the code because no real time series justifies a chart. Impeccable, Taste and OpenDesign are governance references only, not runtime dependencies.
