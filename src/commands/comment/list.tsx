import { resourceDescription, commentCommand, resourceOptions, workItemArgs } from "../../command-helpers.js";
export const description = resourceDescription("comment", "list");
export const options = resourceOptions("comment", "list");
export const args = workItemArgs;
export default commentCommand("list");
