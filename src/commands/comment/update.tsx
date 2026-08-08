import { resourceDescription, commentCommand, resourceOptions, workItemArgs } from "../../command-helpers.js";
export const description = resourceDescription("comment", "update");
export const options = resourceOptions("comment", "update");
export const args = workItemArgs;
export default commentCommand("update");
