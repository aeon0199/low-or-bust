export function totalCount(tasks) {
  return tasks.length;
}

export function doneCount(tasks) {
  return tasks.filter((t) => t.done).length;
}

export function completionRate(tasks) {
  return doneCount(tasks) / tasks.length;
}
