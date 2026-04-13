# csm-cl-mock

Standalone Consensus Layer (Beacon API) mock server for CSM integration testing.

Runs via `npx csm-cl-mock` locally, or in Docker. The same CLI configures validators on either — set `CL_MOCK_URL` or pass `--url` to target a remote server. Installed binary is `csm-cl-mock`.

## Quick start

```bash
# Terminal 1 — start server
npx csm-cl-mock serve

# Terminal 2 — configure validators
npx csm-cl-mock config set 0xd00cc285a1859b55b386979035f022d33e1d5c50fb74a940d1f3249609f9cfddf29af0783ba4b5159dd442c93bf0cc86 active_ongoing
npx csm-cl-mock config list

# Query the Beacon API
curl 'http://127.0.0.1:5052/eth/v1/beacon/states/head/validators?id=0xd00c...'
```

## CLI

### `serve`

Start the mock server.

```
csm-cl-mock serve [--port <port>] [--host <host>]
```

Defaults: port `5052`, host `127.0.0.1`. Use `--host 0.0.0.0` to bind externally (the Docker image does this by default). Ctrl+C or `csm-cl-mock stop` to shut down gracefully.

### `config`

Configure a running server over HTTP.

```
csm-cl-mock config set <pubkey> <status> [eth]   # set status (+ optional effective balance in ETH)
csm-cl-mock config list                          # list all configured validators
csm-cl-mock config remove <pubkey>               # remove a single validator
csm-cl-mock config reset                         # clear all state
csm-cl-mock config statuses                      # print valid statuses (no HTTP call)
```

`<pubkey>` is a 0x-prefixed 48-byte hex string (96 hex chars).

The optional `[eth]` argument sets `effective_balance` in the beacon response (and `balance` by default). Accepts decimals down to gwei precision (9 places). Omit for the 32 ETH default.

```bash
csm-cl-mock config set 0xd00c... active_ongoing 16      # 16 ETH effective balance
csm-cl-mock config set 0xd00c... active_ongoing 2048    # post-Pectra consolidated
csm-cl-mock config set 0xd00c... active_ongoing 31.5    # partial (gwei precision)
```

### `query`

Fetch the Beacon API response for one or more validators and pretty-print the JSON. With no pubkeys, queries every configured validator.

```
csm-cl-mock query [pubkey...] [--state <id>]
```

`--state` defaults to `head`.

```bash
csm-cl-mock query                              # all configured validators
csm-cl-mock query 0xd00c... 0xabcd...           # specific pubkeys
csm-cl-mock query --state finalized 0xd00c...   # different state id
```

### `status`

Show status of a running server: version, uptime, validator count, breakdown by status.

```
csm-cl-mock status [--json]
```

Prints `<url>  offline (<reason>)` and exits 1 if the server is unreachable.

### `stop`

Gracefully shut down a running server.

```
csm-cl-mock stop
```

### `help`

Print an agent-oriented cheat sheet: workflow, every command, remote targeting, valid statuses, and the admin + beacon API shapes — all in one place. Intended as the first thing an AI agent runs against an unfamiliar `csm-cl-mock` install.

```
csm-cl-mock help
```

### Targeting a remote server

By default, `config`, `query`, `status`, and `stop` talk to `http://127.0.0.1:5052`. Override with:

```bash
csm-cl-mock --url http://host:port config set ...
# or
CL_MOCK_URL=http://host:port csm-cl-mock config set ...
```

## Valid statuses

```
pending_initialized
pending_queued
active_ongoing
active_exiting
active_slashed
exited_unslashed
exited_slashed
withdrawal_possible
withdrawal_done
withdrawal_possible_slashed
withdrawal_done_slashed
```

Status names ending in `_slashed` imply `slashed: true` in the response. `withdrawal_possible_slashed` and `withdrawal_done_slashed` are collapsed to their non-slashed counterparts in the API status field (matching real Beacon API behavior) but retain the `slashed` flag.

## Beacon API

Single endpoint:

```
GET /eth/v1/beacon/states/{state_id}/validators?id=<pubkey>[,<pubkey>...]
```

Validators not configured via the admin API are omitted from the response. Auto-assigned indices start at `900000`.

## Admin API

For direct programmatic access without the CLI:

```
GET    /admin/validators               → [{ pubkey, status, effective_balance? }]
POST   /admin/validators               ← { pubkey, status, effective_balance? } | [...]
DELETE /admin/validators                clear all
DELETE /admin/validators/:pubkey        remove one
GET    /admin/status                    → { ok, version, startedAt, uptimeSeconds, validators: { total, byStatus } }
POST   /admin/shutdown                  graceful shutdown
```

`effective_balance` is a gwei integer string (e.g. `"32000000000"` for 32 ETH). Optional; omit to get the 32 ETH default in the beacon response.

## Docker

```bash
docker compose up
```

Exposes port `5052`. Configure from the host:

```bash
CL_MOCK_URL=http://localhost:5052 npx csm-cl-mock config set 0x... active_ongoing
```

## Development

```bash
npm install
npm run build          # tsc → dist/
npm run dev            # tsc --watch
```

TypeScript, ESM only. Node 18+.
