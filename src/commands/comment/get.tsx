import { resourceDescription, commentCommand, resourceOptions, workItemArgs } from "../../command-helpers.js";
export const description = resourceDescription("comment", "get");
export const options = resourceOptions("comment", "get");
export const args = workItemArgs;
export default commentCommand("get");
