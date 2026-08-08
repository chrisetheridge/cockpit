import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("project", "unarchive");
export const options = resourceOptions("project", "unarchive");
export const args = referenceArgs;
export default resourceCommand("project", "unarchive");
