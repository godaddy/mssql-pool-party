export default function wrapListeners(request, method) {
  const originalMethod = request[method];
  return (event, handler) => {
    if (event.startsWith('_')) {
      originalMethod.call(request, event.substring(1), handler);
    } else {
      originalMethod.call(request, `poolparty_${event}`, handler);
    }
    return request; // chaining support
  };
}
