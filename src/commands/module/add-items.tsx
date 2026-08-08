import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "add-items");
export const options = resourceOptions("module", "add-items");
export const args = referenceArgs;
export default resourceCommand("module", "add-items");
