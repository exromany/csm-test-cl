#!/usr/bin/env node

import { Command } from "commander";
import { serveCommand } from "./serve.js";
import { configCommand } from "./config.js";
import { stopCommand } from "./stop.js";

const program = new Command()
  .name("cl-mock")
  .description("Consensus Layer mock server for CSM testing")
  .option("--url <url>", "CL mock server URL (for config/stop commands)");

program.addCommand(serveCommand);
program.addCommand(configCommand);
program.addCommand(stopCommand);

program.parse();
