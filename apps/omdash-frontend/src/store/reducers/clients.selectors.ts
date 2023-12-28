import { type ClientState, type ClientsState } from './clients.reducer.js';
import { selectHistory } from './history.selectors.js';

export function selectClient(hostname: string) {
  return (state: ClientsState) => state[hostname];
}

export function selectCPUHistory(clientState: ClientState) {
  return selectHistory(clientState.cpus);
}

export function selectMemoryHistory(clientState: ClientState) {
  return selectHistory(clientState.memory);
}
