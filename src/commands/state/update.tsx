import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("state", "update");
export const options = resourceOptions("state", "update");
export const args = referenceArgs;
export default resourceCommand("state", "update");
