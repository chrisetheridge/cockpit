import { resourceDescription, commentCommand, resourceOptions, workItemArgs } from "../../command-helpers.js";
export const description = resourceDescription("comment", "delete");
export const options = resourceOptions("comment", "delete");
export const args = workItemArgs;
export default commentCommand("delete");
