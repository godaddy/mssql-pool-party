export default function isStreamingEnabled(pool, request) {
  return (
    pool.connection.config.stream &&
    request.stream !== false
  ) || request.stream;
}
