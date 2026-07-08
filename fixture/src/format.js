export function formatTask(task) {
  return `#${task.id} ${task.title}${task.done ? " ✓" : ""}`;
}

export function formatList(tasks) {
  if (!tasks.length) return "(no tasks)";
  return tasks.map(formatTask).join("\n");
}
