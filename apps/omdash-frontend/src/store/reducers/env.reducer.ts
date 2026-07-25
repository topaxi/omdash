import { Action } from '@reduxjs/toolkit';
import type { Version } from './version.js';

export interface EnvAction extends Action<`server/env`> {
  payload: EnvState;
}

export interface EnvState {
  unsplash: { client_id: string | undefined };
  /** The commit the relay was built from; absent if it could not determine it. */
  version?: Version;
}

const initialEnvState = {
  unsplash: { client_id: undefined },
};

export function envReducer(
  state: EnvState = initialEnvState,
  action: EnvAction,
): EnvState {
  switch (action.type) {
    case 'server/env':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}
