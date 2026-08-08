import { commandOptions, contextDeleteCommand, requiredReferenceArgs } from "../../command-helpers.js";

export const description = "Delete a saved context.";
export const options = commandOptions();
export const args = requiredReferenceArgs;
export default contextDeleteCommand;
