import { resourceDescription, resourceCommand, resourceOptions } from "../../command-helpers.js";
export const description = resourceDescription("project", "list");
export const options = resourceOptions("project", "list");
export default resourceCommand("project", "list");
