import { Action as ReduxAction } from '@reduxjs/toolkit';

export interface OmServerAction<T extends string, P>
  extends ReduxAction<`server/${T}`> {
  payload: P;
}

export interface OmClientAction<T extends string, P>
  extends ReduxAction<`client/${T}`> {
  client: string;
  payload: P;
}

export interface OmUiAction<T extends string, P>
  extends ReduxAction<`ui/${T}`> {
  payload: P;
}
