import { type HistoryState, initialHistoryState } from './history.reducer.js';

export function selectHistory<T>(state: HistoryState<T> | undefined): T[] {
  return state?.history ?? initialHistoryState.history;
}
