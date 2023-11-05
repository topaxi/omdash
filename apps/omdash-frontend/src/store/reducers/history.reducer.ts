import { AnyAction, Reducer } from '@reduxjs/toolkit';

export interface HistoryState<T> {
  limit: number;
  history: T[];
}

export interface HistoryReducerOptions {
  /**
   * The maximum number of history states to keep.
   * @default 100
   */
  limit?: number;
}

export const initialHistoryState: HistoryState<any> = {
  limit: 100,
  history: [],
};

export function createHistoryReducer<T, A extends AnyAction>(
  reducer: Reducer<T, A>,
  options: HistoryReducerOptions = {},
): Reducer<HistoryState<T>, A> {
  const { limit = initialHistoryState.limit } = options;
  const initialState = { ...initialHistoryState, limit };

  return (state = initialState, action) => {
    const prevState = state.history.at(-1);
    const nextState = reducer(prevState, action);

    if (prevState === nextState) {
      return state;
    }

    return {
      ...state,
      history: [...state.history, nextState].slice(-state.limit),
    };
  };
}
