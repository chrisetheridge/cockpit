import { commandOptions, memberListCommand } from "../../command-helpers.js";
import { z } from "zod";

export const description = "List workspace or project members.";
export const options = commandOptions({ project: z.string().optional().describe("Project ID or identifier") });
export default memberListCommand;
