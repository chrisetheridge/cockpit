import { commandOptions, contextShowCommand } from "../../command-helpers.js";

export const description = "Show the selected non-secret context.";
export const options = commandOptions();
export default contextShowCommand;
