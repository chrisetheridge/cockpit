import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("project", "get");
export const options = resourceOptions("project", "get");
export const args = referenceArgs;
export default resourceCommand("project", "get");
