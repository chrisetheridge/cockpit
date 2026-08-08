import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "update");
export const options = resourceOptions("module", "update");
export const args = referenceArgs;
export default resourceCommand("module", "update");
