import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("state", "get");
export const options = resourceOptions("state", "get");
export const args = referenceArgs;
export default resourceCommand("state", "get");
