import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("work-item", "archive");
export const options = resourceOptions("work-item", "archive");
export const args = referenceArgs;
export default resourceCommand("work-item", "archive");
