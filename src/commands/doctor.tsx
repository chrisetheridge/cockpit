import { commandOptions, doctorCommand } from "../command-helpers.js";

export const description = "Validate configuration and Plane connectivity.";
export const options = commandOptions();
export default doctorCommand;
