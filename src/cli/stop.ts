import { Command } from "commander";
import { DEFAULT_PORT } from "../types.js";

export const stopCommand = new Command("stop")
  .description("Stop a running CL mock server")
  .action(async (_opts, cmd: Command) => {
    const opts = cmd.parent?.opts() ?? {};
    const url =
      opts.url ??
      process.env.CL_MOCK_URL ??
      `http://127.0.0.1:${DEFAULT_PORT}`;

    const res = await fetch(`${url}/admin/shutdown`, { method: "POST" }).catch(
      (err) => {
        console.error(`Failed to connect to ${url}: ${err.message}`);
        process.exit(1);
      },
    );

    if (res.ok) {
      console.log("Server shutting down");
    } else {
      console.error(`Unexpected response: ${res.status}`);
      process.exit(1);
    }
  });
