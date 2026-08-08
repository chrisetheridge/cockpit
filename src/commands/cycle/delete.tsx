import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("cycle", "delete");
export const options = resourceOptions("cycle", "delete");
export const args = referenceArgs;
export default resourceCommand("cycle", "delete");
