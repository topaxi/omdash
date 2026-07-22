import { type CpuInfo } from './clients.reducer.js';

function getTotalCPUTimes(cpus: readonly CpuInfo[]) {
  return cpus
    .map((cpu) => cpu.times)
    .reduce(
      (acc, times) => {
        acc.idle += times.idle;
        acc.total +=
          times.user + times.nice + times.sys + times.idle + times.irq;

        return acc;
      },
      { idle: 0, total: 0 },
    );
}

/**
 * Average CPU usage in percent between two per-core snapshots, derived from the
 * idle/total time deltas. Returns 0 when there is no previous sample yet.
 */
export function getAverageCPUUsage(
  prev: readonly CpuInfo[],
  current: readonly CpuInfo[],
): number {
  const prevCpuTimes = getTotalCPUTimes(prev);
  const cpuTimes = getTotalCPUTimes(current);

  if (prevCpuTimes.idle === 0) {
    return 0;
  }

  const idleDifference = cpuTimes.idle - prevCpuTimes.idle;
  const totalDifference = cpuTimes.total - prevCpuTimes.total;

  if (totalDifference === 0) {
    return 0;
  }

  return 100 - (100 * idleDifference) / totalDifference;
}

/**
 * Average CPU usage between the previous and latest snapshot, optionally
 * projecting each snapshot first (e.g. to a subset of cores).
 */
export function getAverageCPUUsageBetween(
  previous: readonly CpuInfo[],
  latest: readonly CpuInfo[],
  projectCpuInfo: (cpuInfo: readonly CpuInfo[]) => readonly CpuInfo[] = (c) =>
    c,
): number {
  return getAverageCPUUsage(projectCpuInfo(previous), projectCpuInfo(latest));
}
