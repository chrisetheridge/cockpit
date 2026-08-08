import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("cycle", "archive");
export const options = resourceOptions("cycle", "archive");
export const args = referenceArgs;
export default resourceCommand("cycle", "archive");
