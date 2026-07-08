// In-memory task store.
const tasks = new Map();
let nextId = 1;

export function addTask(title) {
  const task = { id: nextId++, title, done: false };
  tasks.set(task.id, task);
  return task;
}

export function completeTask(id) {
  const task = tasks.get(id);
  if (!task) return null;
  task.done = true;
  return task;
}

export function getTask(id) {
  return tasks.get(id) ?? null;
}

export function listTasks() {
  return [...tasks.values()];
}

export function resetStore() {
  tasks.clear();
  nextId = 1;
}
