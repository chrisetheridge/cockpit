import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("project", "update");
export const options = resourceOptions("project", "update");
export const args = referenceArgs;
export default resourceCommand("project", "update");
