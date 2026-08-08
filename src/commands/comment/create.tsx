import { resourceDescription, commentCommand, resourceOptions, workItemArgs } from "../../command-helpers.js";
export const description = resourceDescription("comment", "create");
export const options = resourceOptions("comment", "create");
export const args = workItemArgs;
export default commentCommand("create");
