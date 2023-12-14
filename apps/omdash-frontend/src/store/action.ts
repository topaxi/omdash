import { Action as ReduxAction } from '@reduxjs/toolkit';

export interface OmClientAction<T extends string, P> extends ReduxAction<T> {
  type: T;
  client: string;
  payload: P;
}
