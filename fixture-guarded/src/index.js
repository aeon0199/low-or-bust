import { addTask, listTasks } from "./store.js";
import { formatList } from "./format.js";
import { parseAddCommand } from "./parse.js";

export function runCommand(input) {
  if (input === "list") return formatList(listTasks());
  const parsed = parseAddCommand(input);
  if (parsed) {
    const task = addTask(parsed.title);
    return `added #${task.id}`;
  }
  return "unknown command";
}
