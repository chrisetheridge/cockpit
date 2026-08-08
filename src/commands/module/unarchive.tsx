import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "unarchive");
export const options = resourceOptions("module", "unarchive");
export const args = referenceArgs;
export default resourceCommand("module", "unarchive");
