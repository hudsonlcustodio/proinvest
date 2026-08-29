# ADR-015 — Frontend application foundation for ProInvest V1

Status: accepted — 2026-08-29

## Context

The beta frontend was isolated HTML/JavaScript pages. Portfolio needs typed discriminated rendering, one accessible shell, reusable financial states and proportional component tests. The API is separate and SSR is not a product requirement.

## Decision

Adopt one React 19 SPA built with Vite 8, TypeScript 6 and Tailwind CSS 4. Use local open-code primitives following shadcn composition conventions, Phosphor icons and Motion only for route/drawer state transitions. Express serves the production bundle and keeps every financial calculation in existing APIs/domain modules.

## Alternatives

- Preserve plain HTML: smallest migration, but weak component reuse, typing and testability.
- Next.js: useful for SSR/server components, but adds an unnecessary second server/application model.

## Consequences

The build gains a frontend toolchain and client bundle. All screens share one navigation, tokens and state language. API and PostgreSQL contracts remain unchanged. Legacy HTML is no longer served and is retained only as temporary source reference.

## Migration path

Portfolio first, then the six operation workflows, then browser QA and removal of the legacy serving path. Existing operation payloads are adapted at the page boundary without duplicating calculators.

## Review trigger

Reconsider routing/data infrastructure only if authenticated route boundaries, SSR, independent frontend deployment, or materially larger client state becomes necessary.
