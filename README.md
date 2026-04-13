# csm-cl-mock

Standalone Consensus Layer (Beacon API) mock server for CSM integration testing.

Runs via `npx cl-mock` locally, or in Docker. The same CLI configures validators on either — set `CL_MOCK_URL` or pass `--url` to target a remote server.

## Quick start

```bash
# Terminal 1 — start server
npx cl-mock serve

# Terminal 2 — configure validators
npx cl-mock config set 0xd00cc285a1859b55b386979035f022d33e1d5c50fb74a940d1f3249609f9cfddf29af0783ba4b5159dd442c93bf0cc86 active_ongoing
npx cl-mock config list

# Query the Beacon API
curl 'http://127.0.0.1:5052/eth/v1/beacon/states/head/validators?id=0xd00c...'
```

## CLI

### `serve`

Start the mock server.

```
cl-mock serve [--port <port>] [--host <host>]
```

Defaults: port `5052`, host `127.0.0.1`. Use `--host 0.0.0.0` to bind externally (the Docker image does this by default). Ctrl+C or `cl-mock stop` to shut down gracefully.

### `config`

Configure a running server over HTTP.

```
cl-mock config set <pubkey> <status>    # set validator status
cl-mock config list                     # list all configured validators
cl-mock config remove <pubkey>          # remove a single validator
cl-mock config reset                    # clear all state
cl-mock config statuses                 # print valid statuses (no HTTP call)
```

`<pubkey>` is a 0x-prefixed 48-byte hex string (96 hex chars).

### `stop`

Gracefully shut down a running server.

```
cl-mock stop
```

### Targeting a remote server

By default, `config` and `stop` talk to `http://127.0.0.1:5052`. Override with:

```bash
cl-mock --url http://host:port config set ...
# or
CL_MOCK_URL=http://host:port cl-mock config set ...
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
GET    /admin/validators               → [{ pubkey, status }]
POST   /admin/validators               ← { pubkey, status } | [{ pubkey, status }]
DELETE /admin/validators                clear all
DELETE /admin/validators/:pubkey        remove one
POST   /admin/shutdown                  graceful shutdown
```

## Docker

```bash
docker compose up
```

Exposes port `5052`. Configure from the host:

```bash
CL_MOCK_URL=http://localhost:5052 npx cl-mock config set 0x... active_ongoing
```

## Development

```bash
npm install
npm run build          # tsc → dist/
npm run dev            # tsc --watch
```

TypeScript, ESM only. Node 18+.
