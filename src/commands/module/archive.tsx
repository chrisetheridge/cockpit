import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "archive");
export const options = resourceOptions("module", "archive");
export const args = referenceArgs;
export default resourceCommand("module", "archive");
