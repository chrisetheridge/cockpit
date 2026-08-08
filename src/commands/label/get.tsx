import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("label", "get");
export const options = resourceOptions("label", "get");
export const args = referenceArgs;
export default resourceCommand("label", "get");
