import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "get");
export const options = resourceOptions("module", "get");
export const args = referenceArgs;
export default resourceCommand("module", "get");
