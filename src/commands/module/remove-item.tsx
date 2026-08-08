import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "remove-item");
export const options = resourceOptions("module", "remove-item");
export const args = referenceArgs;
export default resourceCommand("module", "remove-item");
