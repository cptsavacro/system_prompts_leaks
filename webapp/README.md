# System Prompts Leaks — Offline Reader

A standalone, fully-offline web app and Android app for browsing, searching,
comparing, and exporting the system prompts in this repository. Built for
prompt engineering and local LLM training/fine-tuning workflows.

- **Browse & search** — indexed by vendor/product/variant, full-text search over every prompt, no network required.
- **Compare** — pin prompts while browsing and view them side by side, with a line diff for any two.
- **Drafts** — compose new local prompts, using pinned prompts as a reference panel, saved to your device.
- **Export** — turn any filtered or pinned set of prompts into a `.jsonl` dataset (flat or fine-tuning "chat" schema).

Everything is pre-indexed at build time from the sibling vendor folders and
`../README.md`, then bundled into the app — no server, no network access
needed after the first load.

## Quick start

```
npm install
npm run dev
```

## Building

```
npm run build            # web: production build → dist/
npm run cap:sync          # android: build + sync into the Capacitor project
```

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, the indexing
pipeline, and Android build/verification details (including what does and
doesn't require an Android SDK).
