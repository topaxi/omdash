import {
  type CpuInfo,
  type ClientState,
  type MemoryInfo,
} from './clients.reducer.js';

export function selectClient(hostname: string) {
  return (state: { [key: string]: ClientState }) => state[hostname];
}

export function selectCPULatest(client: ClientState | undefined): CpuInfo[] {
  return client?.cpus?.latest ?? [];
}

export function selectCPUPrevious(client: ClientState | undefined): CpuInfo[] {
  return client?.cpus?.previous ?? [];
}

export function selectCPUUsageSeries(
  client: ClientState | undefined,
): number[] {
  return client?.cpus?.usage ?? [];
}

export function selectMemoryLatest(
  client: ClientState | undefined,
): MemoryInfo | undefined {
  return client?.memory?.latest;
}

export function selectMemoryUsageSeries(
  client: ClientState | undefined,
): number[] {
  return client?.memory?.usage ?? [];
}
