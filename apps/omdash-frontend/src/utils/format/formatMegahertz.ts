export function formatMegahertz(megahertz: number): string {
  const units = ['MHz', 'GHz'];

  let unitIndex = 0;
  while (megahertz > 1000) {
    megahertz /= 1000;
    unitIndex++;
  }

  return `${megahertz.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}
