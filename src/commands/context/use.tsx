import { commandOptions, contextUseCommand, requiredReferenceArgs } from "../../command-helpers.js";

export const description = "Select a saved context.";
export const options = commandOptions();
export const args = requiredReferenceArgs;
export default contextUseCommand;
