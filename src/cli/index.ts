#!/usr/bin/env node

import { Command } from "commander";
import { serveCommand } from "./serve.js";
import { configCommand } from "./config.js";
import { queryCommand } from "./query.js";
import { statusCommand } from "./status.js";
import { stopCommand } from "./stop.js";
import { helpCommand } from "./help.js";

const program = new Command()
  .name("csm-cl-mock")
  .description("Consensus Layer mock server for CSM testing")
  .option("--url <url>", "CL mock server URL (for config/stop commands)")
  .addHelpCommand(false);

program.addCommand(serveCommand);
program.addCommand(configCommand);
program.addCommand(queryCommand);
program.addCommand(statusCommand);
program.addCommand(stopCommand);
program.addCommand(helpCommand);

program.parse();
