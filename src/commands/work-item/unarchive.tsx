import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("work-item", "unarchive");
export const options = resourceOptions("work-item", "unarchive");
export const args = referenceArgs;
export default resourceCommand("work-item", "unarchive");
