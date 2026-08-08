import { commandOptions, skillPathCommand } from "../../command-helpers.js";

export const description = "Print the packaged Plane CLI skill directory.";
export const options = commandOptions();
export default skillPathCommand;
