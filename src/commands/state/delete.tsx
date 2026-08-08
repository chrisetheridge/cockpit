import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("state", "delete");
export const options = resourceOptions("state", "delete");
export const args = referenceArgs;
export default resourceCommand("state", "delete");
