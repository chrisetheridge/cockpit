import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("cycle", "add-items");
export const options = resourceOptions("cycle", "add-items");
export const args = referenceArgs;
export default resourceCommand("cycle", "add-items");
