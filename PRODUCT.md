# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3, Drizzle ORM + Neon Postgres, NextAuth v5, Google Gemini (multi-provider abstraction: OpenAI-compatible/Anthropic adapters available), ElevenLabs TTS. Managed with Bun. Tests via Vitest; CI via GitHub Actions.

## Users

Primary: Indonesian young adults (18–30) who want a daily AI companion that feels like a visual-novel heroine — someone to talk to, who remembers them, and who keeps them on track with light productivity tools. The relationship with Livia is the draw; tasks, reminders, and focus modes ride alongside it.

## Product Purpose

Teman Kost ("boarding-house friend") pairs a productivity suite (to-do, schedule, reminders, pomodoro, kitchen/shopping list) with a persistent AI companion, Livia, who inhabits a visual-novel interface. Success means users keep returning for the relationship — retention driven by Livia remembering, reacting to the user's day, and participating in their routines — while the productivity features quietly earn their keep.

## Positioning

A companion AI that is *a character with a life*, not a utility chatbot: Livia has affection, memory (core/episodic/semantic), a wardrobe, a story, moods, and voice. The productivity tools are delivered through that relationship rather than beside it. This character-first wrapper is what a generic to-do app cannot truthfully copy.

## Operating Context

Daily use from a laptop/browser (web app). Sessions include chatting (text + voice), scheduling/reminders, focus (pomodoro), cooking/shopping lists, wardrobe customization, story/relationship progression, and a garden. Infrastructure facts: streaming chat (SSE), TTS/STT, memory retrieval, multi-provider LLM routing with BYOK, age gate (18+), safety guardrails, privacy center with export/delete, rate limits, and cost/usage dashboards. Users may bring their own API keys; keys are encrypted at rest and never touch the browser.

## Capabilities and Constraints

Confirmed capabilities: streaming chat with in-world error recovery ("Livia pusing"), structured tool calling (reminders, shopping items), layered memory (core/episodic/semantic with retrieval and consolidation), TTS streaming with cache and mood-based voice settings, speech-to-text input, multi-provider/multi-model selection from a server allowlist, wardrobe/dress-up, date/story/affection progression, gamified quests (server-validated), analytics dashboards (owner-only), feedback loop for evals, privacy export/delete.

Constraints: server-rendered Next.js app; no native mobile app (PWA planned, not built); safety guardrails pattern-based (deterministic); memory retrieval lexical (pgvector deferred); distributed rate limiter and production hardening (M9) still open; multi-character engine abstracted but only Livia wired in; monetization (M8.7) undecided. i18n: Indonesian + English bilingual confirmed as target; current shipping UI/copy is Indonesian only.

## Brand Commitments

Name: Teman Kost (AI-Waifu). Hero character: Livia — an Indonesian visual-novel heroine; her stated personality is tsundere (e.g., "Aku cuma kebetulan lagi luang kok, bukan berarti aku nungguin kamu pulang lho ya!"). Language commitment: ship Indonesian + English bilingual (current UI is Indonesian). Visual genre commitment: visual-novel aesthetic (sprite 16:9 style, dress-up/customization). License: MIT; image assets carry their artists' licensing. Repository/docs/contributing are Indonesian-first.

## Evidence on Hand

- README.md: full product overview, architecture, env vars, commands.
- docs/MILESTONES.md: roadmap M0–M9 with implemented status and DoD notes — the authoritative source of capability and engineering truth.
- docs/AUDIT.md, docs/M0–M8-IMPLEMENTATION.md: security/engineering/feature reports.
- docs/provider.json: multi-provider model allowlist (TripRouter).
- evals/: 50-scenario persona/safety/memory dataset with CI harness.
- tests/: 500+ unit tests (Vitest).
- Content assets: public/ sprites/backgrounds, content/story/chapters/*.json.
- .env.example: env schema.

## Product Principles

1. The relationship is the product — Livia's consistency, memory, and presence outrank feature breadth.
2. Safety and privacy are features, not limits: guardrails, encrypted user keys, transparent memory UI, export/delete, age gate.
3. Engineering rigor gates everything: evals, CI, typechecks, and documented DoDs precede release.
4. The user's own data and keys belong to the user — BYOK, server-side encryption, no PII leaks to providers.
5. Indonesian first, bilingual forward: the voice and heart of the product are Indonesian, with English as a confirmed expansion target.

## Accessibility & Inclusion

No product-specific accessibility standard or user need has been established yet. Known open item: bilingual (ID/EN) support is planned but not yet implemented in the UI.
