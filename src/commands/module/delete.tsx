import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("module", "delete");
export const options = resourceOptions("module", "delete");
export const args = referenceArgs;
export default resourceCommand("module", "delete");
