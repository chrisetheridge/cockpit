import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("label", "update");
export const options = resourceOptions("label", "update");
export const args = referenceArgs;
export default resourceCommand("label", "update");
