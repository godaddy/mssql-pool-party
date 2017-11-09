// In the event that we use jest.useFakeTimers, it is useful to optionally
// accept a specific implementation of setTimeout.
export default function delay(ms, setTimeoutToUse = setTimeout) {
  return () => new Promise((resolve) => { setTimeoutToUse(resolve, ms); });
}
