import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("cycle", "list-items");
export const options = resourceOptions("cycle", "list-items");
export const args = referenceArgs;
export default resourceCommand("cycle", "list-items");
