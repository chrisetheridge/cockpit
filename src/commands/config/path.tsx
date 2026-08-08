import { commandOptions, configPathCommand } from "../../command-helpers.js";

export const description = "Print the active configuration path.";
export const options = commandOptions();
export default configPathCommand;
