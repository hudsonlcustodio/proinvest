# UI Component Provenance — Signature Polish

Review date: 2026-08-29. No third-party component source was copied and no package was added. The implementations are local primitives using the existing Motion and Phosphor dependencies.

| Source evaluated | Pattern | Decision | License / revision | Local adaptation |
| --- | --- | --- | --- | --- |
| Kokonut UI | Command Button | Adopt concept | MIT, `83eec6d982d400a18438001a8efdbac1f159dd43` | Global navigation command with Ctrl/Cmd+K, listbox semantics and keyboard selection |
| Kokonut UI | Smooth Tab | Adopt concept | MIT, same revision | Semantic Portfolio tabs with a restrained Motion layout indicator |
| Kokonut UI | Smooth Drawer | Adopt concept | MIT, same revision | Dedicated mobile dialog with focus trap, Escape close and trigger-focus restoration |
| Magic UI | Number Ticker | Reject | MIT, `2d671cc6c0e0f40e28682c9cbddd16694dcfe627` | Rolling numbers conflict with calm financial semantics; values remain stable |
| React Bits | Reveal/hover patterns | Reject | repository license includes MIT plus Commons Clause restrictions | Unnecessary license surface and decorative motion |
| Bklit | Charts | Reject | not installed | No real time series exists; the product contract forbids synthetic charts |

Upstream projects were used only for pattern evaluation. Local code retains ProInvest tokens, semantics, icon system, motion level 3/10 and reduced-motion behavior.
