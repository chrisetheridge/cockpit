import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("label", "delete");
export const options = resourceOptions("label", "delete");
export const args = referenceArgs;
export default resourceCommand("label", "delete");
