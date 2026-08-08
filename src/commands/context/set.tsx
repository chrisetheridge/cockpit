import { commandOptions, contextSetCommand } from "../../command-helpers.js";
import { argument } from "pastel";
import { z } from "zod";

export const description = "Persist a named non-secret context.";
export const options = commandOptions();
export const args = z.tuple([z.string().optional().describe(argument({ name: "name" }))]);
export default contextSetCommand;
