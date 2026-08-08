import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "list-items");
export const options = resourceOptions("module", "list-items");
export const args = referenceArgs;
export default resourceCommand("module", "list-items");
