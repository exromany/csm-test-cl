import { Command } from "commander";
import { DEFAULT_PORT } from "../types.js";

function findRoot(cmd: Command): Command {
  let c = cmd;
  while (c.parent) c = c.parent;
  return c;
}

function resolveUrl(cmd: Command): string {
  const opts = findRoot(cmd).opts();
  return (
    opts.url ??
    process.env.CL_MOCK_URL ??
    `http://127.0.0.1:${DEFAULT_PORT}`
  );
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

interface StatusResponse {
  ok: boolean;
  version: string;
  startedAt: string;
  uptimeSeconds: number;
  validators: { total: number; byStatus: Record<string, number> };
}

export const statusCommand = new Command("status")
  .description("Show status of a running CL mock server")
  .option("--json", "output raw JSON")
  .action(async (opts: { json?: boolean }, cmd: Command) => {
    const url = resolveUrl(cmd);

    const res = await fetch(`${url}/admin/status`).catch((err) => {
      console.log(`${url}  offline (${err.message})`);
      process.exit(1);
    });

    if (!res.ok) {
      console.error(`Unexpected response: ${res.status}`);
      process.exit(1);
    }

    const data = (await res.json()) as StatusResponse;

    if (opts.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(`URL:        ${url}`);
    console.log(`Status:     ok`);
    console.log(`Version:    ${data.version}`);
    console.log(`Started:    ${data.startedAt}`);
    console.log(`Uptime:     ${formatUptime(data.uptimeSeconds)}`);
    console.log(`Validators: ${data.validators.total}`);
    const entries = Object.entries(data.validators.byStatus);
    if (entries.length) {
      for (const [status, count] of entries.sort()) {
        console.log(`  ${status.padEnd(30)} ${count}`);
      }
    }
  });
