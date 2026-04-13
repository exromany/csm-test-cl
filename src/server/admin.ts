import { readFileSync } from "node:fs";
import type { Hono } from "hono";
import { store } from "./store.js";
import {
  isValidPubkey,
  isValidStatus,
  VALIDATOR_STATUSES,
  type ValidatorEntry,
  type ValidatorStatus,
} from "../types.js";

/** Shutdown callback — set by app.ts when server starts */
export let shutdownFn: (() => void) | null = null;
export function setShutdownFn(fn: () => void): void {
  shutdownFn = fn;
}

function logChange(line: string): void {
  console.log(`[${new Date().toISOString()}] ${line}`);
}

const START_TIME = Date.now();
const VERSION: string = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    );
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

export function registerAdminRoutes(app: Hono): void {
  app.get("/admin/validators", (c) => {
    const validators = store.list().map(({ pubkey, entry }) => ({
      pubkey,
      status: entry.status,
      ...(entry.effective_balance !== undefined
        ? { effective_balance: entry.effective_balance }
        : {}),
    }));
    return c.json(validators);
  });

  app.post("/admin/validators", async (c) => {
    const body = await c.req.json();
    const items = Array.isArray(body) ? body : [body];

    const errors: string[] = [];
    const accepted: Array<{
      pubkey: string;
      status: ValidatorStatus;
      effective_balance?: string;
    }> = [];

    for (const item of items) {
      const { pubkey, status, effective_balance } = item;
      if (!pubkey || !isValidPubkey(pubkey)) {
        errors.push(
          `invalid pubkey '${pubkey}': expected 0x-prefixed 96-hex-char string`,
        );
        continue;
      }
      if (!status || !isValidStatus(status)) {
        errors.push(
          `invalid status '${status}': must be one of ${VALIDATOR_STATUSES.join(", ")}`,
        );
        continue;
      }
      if (
        effective_balance !== undefined &&
        (typeof effective_balance !== "string" ||
          !/^\d+$/.test(effective_balance))
      ) {
        errors.push(
          `invalid effective_balance '${effective_balance}': expected a gwei integer string`,
        );
        continue;
      }
      accepted.push({ pubkey, status, effective_balance });
    }

    if (errors.length > 0 && accepted.length === 0) {
      return c.json({ errors }, 400);
    }

    for (const { pubkey, status, effective_balance } of accepted) {
      const entry: ValidatorEntry = { status };
      if (effective_balance !== undefined) {
        entry.effective_balance = effective_balance;
      }
      const { prior } = store.set(pubkey, entry);
      const key = pubkey.toLowerCase();
      const ebSuffix =
        effective_balance !== undefined ? ` eb=${effective_balance}` : "";
      if (!prior) {
        logChange(`+ ${key} ${status}${ebSuffix}`);
      } else if (
        prior.status !== status ||
        prior.effective_balance !== effective_balance
      ) {
        const priorEb = prior.effective_balance ?? "-";
        const nextEb = effective_balance ?? "-";
        logChange(
          `~ ${key} ${prior.status} → ${status} eb=${priorEb} → ${nextEb}`,
        );
      }
    }

    return c.json(
      { accepted: accepted.length, errors },
      errors.length ? 207 : 200,
    );
  });

  app.delete("/admin/validators", (c) => {
    const count = store.clear();
    if (count > 0) logChange(`cleared ${count} validators`);
    return c.body(null, 204);
  });

  app.delete("/admin/validators/:pubkey", (c) => {
    const pubkey = c.req.param("pubkey");
    if (store.delete(pubkey)) logChange(`- ${pubkey.toLowerCase()}`);
    return c.body(null, 204);
  });

  app.get("/admin/status", (c) => {
    const byStatus: Record<string, number> = {};
    for (const { entry } of store.list()) {
      byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    }
    return c.json({
      ok: true,
      version: VERSION,
      startedAt: new Date(START_TIME).toISOString(),
      uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
      validators: {
        total: store.size,
        byStatus,
      },
    });
  });

  app.post("/admin/shutdown", (c) => {
    if (shutdownFn) {
      setTimeout(shutdownFn, 50);
    }
    return c.json({ message: "shutting down" });
  });
}
