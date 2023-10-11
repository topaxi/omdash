const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

export function formatBytes(bytes: number): string {
  let unitIndex = 0;
  while (bytes > 1024) {
    bytes /= 1024;
    unitIndex++;
  }

  return `${bytes.toFixed(1)}${units[unitIndex]}`;
}
