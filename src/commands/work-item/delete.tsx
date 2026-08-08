import { resourceDescription, referenceArgs, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("work-item", "delete");
export const options = resourceOptions("work-item", "delete");
export const args = referenceArgs;
export default resourceCommand("work-item", "delete");
