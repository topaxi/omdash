const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

function defaultFormatByteNumber(bytes: number): string | number {
  return bytes.toFixed(1);
}

export function formatBytes(
  bytes: number,
  formatNumber = defaultFormatByteNumber,
): string {
  let unitIndex = 0;
  while (bytes > 1024) {
    bytes /= 1024;
    unitIndex++;
  }

  return `${formatNumber(bytes)}${units[unitIndex]}`;
}
