import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("work-item", "get");
export const options = resourceOptions("work-item", "get");
export const args = referenceArgs;
export default resourceCommand("work-item", "get");
