import { Command } from "commander";
import { VALIDATOR_STATUSES, DEFAULT_PORT } from "../types.js";

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

async function request(
  url: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`${url}${path}`, init).catch((err) => {
    console.error(`Failed to connect to ${url}: ${err.message}`);
    process.exit(1);
  });
  return res;
}

export const configCommand = new Command("config")
  .description("Configure validators on a running CL mock server");

configCommand
  .command("set")
  .description("Set a validator status")
  .argument("<pubkey>", "validator public key (0x-prefixed, 96 hex chars)")
  .argument("<status>", `validator status`)
  .action(async (pubkey: string, status: string, _opts, cmd: Command) => {
    const url = resolveUrl(cmd);
    const res = await request(url, "/admin/validators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubkey, status }),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 207) {
      console.error("Error:", JSON.stringify(data.errors ?? data, null, 2));
      process.exit(1);
    }
    if (data.errors?.length) {
      console.warn("Warnings:", data.errors.join(", "));
    }
    console.log(`Set ${pubkey.slice(0, 18)}...${pubkey.slice(-6)} → ${status}`);
  });

configCommand
  .command("list")
  .description("List all configured validators")
  .action(async (_opts, cmd: Command) => {
    const url = resolveUrl(cmd);
    const res = await request(url, "/admin/validators");
    const data: Array<{ pubkey: string; status: string }> = await res.json();
    if (data.length === 0) {
      console.log("(empty)");
      return;
    }
    for (const { pubkey, status } of data) {
      console.log(
        `${pubkey.slice(0, 18)}...${pubkey.slice(-6)}  ${status}`,
      );
    }
  });

configCommand
  .command("reset")
  .description("Clear all validator state")
  .action(async (_opts, cmd: Command) => {
    const url = resolveUrl(cmd);
    await request(url, "/admin/validators", { method: "DELETE" });
    console.log("State cleared");
  });

configCommand
  .command("remove")
  .description("Remove a single validator")
  .argument("<pubkey>", "validator public key")
  .action(async (pubkey: string, _opts, cmd: Command) => {
    const url = resolveUrl(cmd);
    await request(url, `/admin/validators/${encodeURIComponent(pubkey)}`, {
      method: "DELETE",
    });
    console.log(`Removed ${pubkey.slice(0, 18)}...${pubkey.slice(-6)}`);
  });

configCommand
  .command("statuses")
  .description("Print valid validator statuses")
  .action(() => {
    for (const s of VALIDATOR_STATUSES) {
      console.log(s);
    }
  });
