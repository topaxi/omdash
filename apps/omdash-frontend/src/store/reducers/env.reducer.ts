import { Action } from '@reduxjs/toolkit';

export interface EnvAction extends Action<`server/env`> {
  payload: EnvState;
}

export interface EnvState {
  unsplash: { client_id: string | undefined };
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
      console.log(action);
      return { ...state, ...action.payload };
    default:
      return state;
  }
}
