import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("project", "archive");
export const options = resourceOptions("project", "archive");
export const args = referenceArgs;
export default resourceCommand("project", "archive");
