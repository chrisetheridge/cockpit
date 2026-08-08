import { commandOptions, skillInstallCommand } from "../../command-helpers.js";
import { z } from "zod";

export const description = "Install the packaged skill into an explicit directory.";
export const options = commandOptions({
  target: z.string().optional().describe("Target directory"),
  force: z.boolean().optional().describe("Replace an existing skill"),
});
export default skillInstallCommand;
