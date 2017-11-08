export default function poolPrioritySort(a, b) {
  if (a.connection.connected && !b.connection.connected) {
    return -1;
  }
  if (!a.connection.connected && b.connection.connected) {
    return 1;
  }
  if (!a.connection.connected && !b.connection.connected) {
    return 0;
  }
  // if both pools are connected, then we sort by priority
  return a.dsn.priority - b.dsn.priority;
}
