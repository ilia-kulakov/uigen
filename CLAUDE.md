# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run all tests (vitest)
npm run setup        # Install deps + generate Prisma client + run migrations
npm run db:reset     # Reset SQLite database (destructive)
```

Run a single test file:

```bash
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx
```

## Architecture

UIGen is a Next.js 15 App Router app that lets users generate React components via AI conversation with a live preview.

### Core Data Flow

**Component generation:**

1. User sends message → `POST /api/chat`
2. Vercel AI SDK streams response from Anthropic Claude (or mock provider if no API key)
3. AI calls tools (`str_replace_editor`, `file_manager`) to mutate the virtual filesystem
4. `FileSystemContext` propagates changes → `PreviewFrame` re-renders the live preview

**Live preview pipeline:**

```
FileSystemContext → getAllFiles() → createImportMap() → createPreviewHTML() → Babel JSX transpile → iframe eval()
```

Key behaviors in `createImportMap()`:
- Local files are compiled to Blob URLs; third-party packages resolve via `esm.sh`
- `@/` path aliases are rewritten to root-relative paths
- CSS imports are stripped from transpilation; collected styles are injected as `<style>` tags
- Missing imports generate placeholder React components (empty divs) instead of throwing
- Syntax errors are collected into an array and displayed in the preview UI rather than crashing

**Project persistence:**
`VirtualFileSystem` (in-memory Map) ↔ JSON ↔ Prisma/SQLite. Chat messages are also stored as JSON.

### Key Directories

- `src/app/api/chat/route.ts` — Single API endpoint; handles AI streaming + tool execution
- `src/actions/` — Server Actions for auth and project CRUD
- `src/lib/` — Core logic: `file-system.ts` (VirtualFileSystem class), `provider.ts` (AI model setup), `transform/jsx-transformer.ts` (Babel), `tools/` (AI tool definitions), `prompts/` (system prompt)
- `src/lib/contexts/` — `FileSystemContext` (shared VFS state) and `ChatContext` (message state + useChat)
- `src/components/chat/`, `editor/`, `preview/` — Main UI panels

### State Management

- **File system**: `FileSystemContext` wraps the entire app; all file reads/writes go through this context
- **Chat**: `ChatContext` uses Vercel AI SDK's `useChat` hook
- **Auth**: JWT stored in an HttpOnly cookie; `getUser()` server action reads it
- **Anonymous sessions**: `anon-work-tracker.ts` persists work to sessionStorage (per-tab, cleared on tab close) before sign-in

### AI Provider

`src/lib/provider.ts` returns either the real Anthropic client (model: `claude-haiku-4-5`, maxSteps: 40) or a mock (maxSteps: 4). The mock generates a static component without hitting the API — useful for development without `ANTHROPIC_API_KEY` set.

The system message uses Anthropic's ephemeral prompt caching (`providerOptions.anthropic.cacheControl.type: "ephemeral"`) to reduce token costs on repeated requests.

### Dual Tool Execution

AI tools (`str_replace_editor`, `file_manager`) are executed in two places for the same tool call:

1. **Server-side** (`route.ts`): The tool implementations in `src/lib/tools/` mutate the `VirtualFileSystem` instance so the AI can read back updated file contents in subsequent steps.
2. **Client-side** (`FileSystemContext.handleToolCall`): The client parses tool call events from the Vercel AI SDK stream and mirrors mutations into React state, triggering preview re-renders.

This means any new tool that modifies files must be handled in both locations.

Note: the two tools use different implementation patterns — `str-replace.ts` is a plain object with a Zod `parameters` schema and `execute` function, while `file-manager.ts` uses the `tool()` wrapper from the `ai` SDK. Both patterns work.

### Database

Prisma with SQLite (`prisma/dev.db`). Two models: `User` (email/password) and `Project` (name, userId, messages JSON, data JSON). Run `npx prisma studio` to inspect.

Reference `prisma/schema.prisma` to understand the database data structures.

### Auth & Routing

- `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes only — `/api/chat` is **not** middleware-protected. Auth for chat is checked manually inside `onFinish` solely to gate project saves.
- Routes: `src/app/page.tsx` (new/anonymous session), `src/app/[projectId]/page.tsx` (existing saved project).
- Preview entry point resolution order: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.jsx` → `/src/App.tsx` → first `.jsx`/`.tsx` found.

### Environment

Requires `ANTHROPIC_API_KEY` in `.env` for real AI responses. The app works without it via the mock provider.

## Code Style

- Only comment complex blocks of code. Leave self-explanatory code uncommented.
