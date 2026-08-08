import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("cycle", "get");
export const options = resourceOptions("cycle", "get");
export const args = referenceArgs;
export default resourceCommand("cycle", "get");
