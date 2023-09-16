export function setIntervalImmediate(callback: () => void, interval: number) {
  callback();

  return setInterval(callback, interval);
}
