import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("cycle", "transfer-items");
export const options = resourceOptions("cycle", "transfer-items");
export const args = referenceArgs;
export default resourceCommand("cycle", "transfer-items");
