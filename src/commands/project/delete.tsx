import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("project", "delete");
export const options = resourceOptions("project", "delete");
export const args = referenceArgs;
export default resourceCommand("project", "delete");
