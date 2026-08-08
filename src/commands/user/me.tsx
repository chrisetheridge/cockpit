import { commandOptions, userMeCommand } from "../../command-helpers.js";

export const description = "Show the authenticated user.";
export const options = commandOptions();
export default userMeCommand;
