import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("cycle", "update");
export const options = resourceOptions("cycle", "update");
export const args = referenceArgs;
export default resourceCommand("cycle", "update");
