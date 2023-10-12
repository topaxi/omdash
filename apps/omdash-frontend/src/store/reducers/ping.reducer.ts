const MAX_PING_HISTORY = 50;
const MAX_PING_AGE = Math.floor(MAX_PING_HISTORY * 2 + MAX_PING_HISTORY / 2);

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

function filterOldPings(state: PingState) {
  const newestPing = Math.max(
    ...Object.values(state).map((pings) => pings.at(-1)?.timestamp ?? 0),
  );

  return Object.fromEntries(
    Object.entries(state).map(([host, pings]) => [
      host,
      pings.filter(({ timestamp }) => newestPing - timestamp < MAX_PING_AGE),
    ]),
  );
}

export function pingReducer(
  state = initialState,
  action: PingAction,
): PingState {
  switch (action.type) {
    case 'ping':
      return filterOldPings({
        ...state,
        [action.payload.host]: [
          ...(state[action.payload.host] ?? []),
          action.payload,
        ].slice(-MAX_PING_HISTORY),
      });
    default:
      return state;
  }
}
