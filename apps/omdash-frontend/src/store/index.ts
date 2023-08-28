import { Action, legacy_createStore } from "redux";
import { composeWithDevTools } from "redux-devtools-extension";

export interface RootState {
  clients: Record<string, any>;
}

export const initialState: RootState = {
  clients: {},
};

export function reducer(state: RootState = initialState, action: Action<any>) {
  switch (action.type) {
    case 'register':
      if (state.clients[action.payload.name]) {
        return state;
      }

      return {
        clients: {
          ...state.clients,
          [action.payload.name]: {},
        },
      };

    case 'metric': {
      return {
        clients: {
          ...state.clients,
          [action.client]: {
            ...state.clients[action.client],
            ...action.payload,
          }
        },
      };
    }

    default:
      return state;
  }
}

export const store = legacy_createStore(reducer, composeWithDevTools());
