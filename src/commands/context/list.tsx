import { commandOptions, contextListCommand } from "../../command-helpers.js";

export const description = "List saved non-secret contexts.";
export const options = commandOptions();
export default contextListCommand;
