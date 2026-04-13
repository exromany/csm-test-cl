import type { Hono } from "hono";
import { store } from "./store.js";
import {
  isValidPubkey,
  isValidStatus,
  VALIDATOR_STATUSES,
  type ValidatorStatus,
} from "../types.js";

/** Shutdown callback — set by app.ts when server starts */
export let shutdownFn: (() => void) | null = null;
export function setShutdownFn(fn: () => void): void {
  shutdownFn = fn;
}

export function registerAdminRoutes(app: Hono): void {
  app.get("/admin/validators", (c) => {
    const validators = store.list().map(({ pubkey, entry }) => ({
      pubkey,
      status: entry.status,
    }));
    return c.json(validators);
  });

  app.post("/admin/validators", async (c) => {
    const body = await c.req.json();
    const items = Array.isArray(body) ? body : [body];

    const errors: string[] = [];
    const accepted: Array<{ pubkey: string; status: ValidatorStatus }> = [];

    for (const item of items) {
      const { pubkey, status } = item;
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
      accepted.push({ pubkey, status });
    }

    if (errors.length > 0 && accepted.length === 0) {
      return c.json({ errors }, 400);
    }

    for (const { pubkey, status } of accepted) {
      store.set(pubkey, { status });
    }

    return c.json(
      { accepted: accepted.length, errors },
      errors.length ? 207 : 200,
    );
  });

  app.delete("/admin/validators", (c) => {
    store.clear();
    return c.body(null, 204);
  });

  app.delete("/admin/validators/:pubkey", (c) => {
    store.delete(c.req.param("pubkey"));
    return c.body(null, 204);
  });

  app.post("/admin/shutdown", (c) => {
    if (shutdownFn) {
      setTimeout(shutdownFn, 50);
    }
    return c.json({ message: "shutting down" });
  });
}
