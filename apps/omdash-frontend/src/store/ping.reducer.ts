const MAX_PING_HISTORY = 50;

export interface PingAction {
  type: 'ping';
  payload: {
    timestamp: number;
    ip: string;
    time: number;
    host: string;
  };
}

export interface PingState {
  [key: string]: Array<{
    timestamp: number;
    ip: string;
    time: number;
    host: string;
  }>;
}

export const initialState: PingState = {};

export function pingReducer(
  state = initialState,
  action: PingAction,
): PingState {
  switch (action.type) {
    case 'ping':
      return {
        ...state,
        [action.payload.host]: [
          ...(state[action.payload.host] ?? []),
          action.payload,
        ].slice(-MAX_PING_HISTORY),
      };
    default:
      return state;
  }
}
