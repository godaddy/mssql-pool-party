export default function poolPrioritySort(a, b) {
  if (a.dsn.priority > b.dsn.priority) {
    return 1;
  }
  if (a.dsn.priority < b.dsn.priority) {
    return -1;
  }
  return 0;
}
