import { OmUiAction } from '../../action';

export type UiAction = OmUiAction<'hosts/toggleSelectedHost', string>;

export interface UiHostsState {
  readonly selectedHosts: string[];
}

export const initialState: UiHostsState = {
  selectedHosts: [],
};

export function uiHostsReducer(
  state: UiHostsState = initialState,
  action: UiAction,
): UiHostsState {
  switch (action.type) {
    case 'ui/hosts/toggleSelectedHost': {
      const { selectedHosts } = state;
      const { payload: hostname } = action;

      const index = selectedHosts.indexOf(hostname);

      if (index === -1) {
        return {
          ...state,
          selectedHosts: [...selectedHosts, hostname],
        };
      }

      return {
        ...state,
        selectedHosts: [
          ...selectedHosts.slice(0, index),
          ...selectedHosts.slice(index + 1),
        ],
      };
    }
    default: {
      return state;
    }
  }
}
