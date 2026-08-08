import { resourceDescription, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("state", "list");
export const options = resourceOptions("state", "list");
export default resourceCommand("state", "list");
