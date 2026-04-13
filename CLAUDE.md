# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`csm-cl-mock` — standalone npm package providing a Consensus Layer (Beacon API) mock server for CSM integration testing. Runs via `npx cl-mock`, configurable locally or remotely (Docker) through the same CLI.

## Commands

```bash
npm run build           # tsc → dist/
npm run dev             # tsc --watch

# After build, or via npx once published:
node dist/cli/index.js serve [--port 5052] [--host 127.0.0.1]
node dist/cli/index.js config set <pubkey> <status>
node dist/cli/index.js config list|reset|statuses
node dist/cli/index.js config remove <pubkey>
node dist/cli/index.js stop

# Docker
docker compose up       # exposes :5052
```

Remote target: `--url http://host:port` flag OR `CL_MOCK_URL` env var. Applies to `config` and `stop`.

No test framework, no linter configured.

## Architecture

**Two concerns, one binary**: the same entrypoint (`src/cli/index.ts`) dispatches to either `serve` (runs Hono server) or `config`/`stop` (HTTP client talking to a running server). State is **HTTP-only** — server keeps validators in-memory (`src/server/store.ts`, singleton `Map<lowercase_pubkey, ValidatorEntry>`). No file-based state.

**Route registration pattern** (`src/server/app.ts`): beacon and admin modules export `registerBeaconRoutes(app)` / `registerAdminRoutes(app)` functions, **not** Hono sub-apps. Initial attempt used `app.route("/", subApp)` but that didn't reliably match POST routes — registrar pattern is the workaround. Keep it this way when adding routes.

**Shutdown plumbing**: `admin.ts` exports a module-level `shutdownFn` nullable. `app.ts`'s `startServer()` constructs the real shutdown closure (closes server, exits process) and registers it via `setShutdownFn()`. `POST /admin/shutdown` calls it after a 50ms delay so the response flushes first. SIGINT/SIGTERM call the same closure.

**Beacon response format** (`src/server/beacon.ts` → `buildValidator()`): ported verbatim from `community-staking-module/script/cl-mock/server.mjs`. Status-specific epoch defaults live in `EPOCH_DEFAULTS` (`src/types.ts`). `API_STATUS` map collapses internal `*_slashed` statuses to their API equivalents (e.g. `withdrawal_done_slashed` → `withdrawal_done`), while `slashed: true` is inferred from the suffix. Auto-indices start at 900000 per request ordering. Don't change these constants without checking SDK consumers.

**Commander option inheritance**: `--url` is defined on the root program, but `config` subcommands are nested two levels deep (root → config → set). Commander's action handlers receive `cmd` pointing at the leaf — `cmd.parent` is only `config`. Use `findRoot(cmd).opts()` (in `src/cli/config.ts`) to read root-level options. `stop` is one level deep so this doesn't matter there, but prefer `findRoot` for new commands needing root options.

**Pubkey normalization**: always lowercase at the store boundary. Validators stored, retrieved, and deleted case-insensitively. Admin API validates with `PUBKEY_RE = /^0x[0-9a-fA-F]{96}$/` (48-byte key).
