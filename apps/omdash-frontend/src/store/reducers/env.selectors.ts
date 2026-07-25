import { RootState } from '../index.js';
import { EnvState } from './env.reducer.js';
import type { Version } from './version.js';

export function selectEnvState(state: RootState): EnvState {
  return state.env;
}

export function selectUnsplashClientId(state: RootState): string | undefined {
  return selectEnvState(state).unsplash.client_id;
}

export function selectServerVersion(state: RootState): Version | undefined {
  return selectEnvState(state).version;
}
