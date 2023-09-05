import childProcess from 'node:child_process';
import WebSocket from 'ws';
import { createWebSocketServer, decode, encode } from './utils/socket';

interface ClientMetadata {
  name?: string;
  isAlive: boolean;
  addr: string;
}

const wssClients = createWebSocketServer(3200);
const wssDashboard = createWebSocketServer(3300);

const clientMetadata = new WeakMap<WebSocket, ClientMetadata>();

const heartbeat = setInterval(() => {
  wssClients.clients.forEach((ws) => {
    const metadata = clientMetadata.get(ws)!;

    if (metadata.isAlive === false) {
      return ws.terminate();
    }

    metadata.isAlive = false;
    ws.ping();
  });
}, 10_000);

wssClients.on('close', () => {
  clearInterval(heartbeat);
});

wssClients.on('connection', (ws, req) => {
  console.log('Client connected', req.socket.remoteAddress);

  const metadata: ClientMetadata = {
    isAlive: true,
    addr: req.socket.remoteAddress ?? '',
  };
  clientMetadata.set(ws, metadata);

  ws.on('message', (message) => {
    try {
      const { type, payload } = decode(message);

      if (type === 'register') {
        metadata.name = payload.name;
        payload.addr = metadata.addr;
      }

      const enhancedPayload = encode({ type, client: metadata.name, payload });

      wssDashboard.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(enhancedPayload, { binary: false });
        }
      });
    } catch (err) {
      console.error(err);
      console.log(message);
    }
  });

  ws.on('pong', () => {
    metadata.isAlive = true;
  });

  ws.once('close', () => {
    console.log('Client disconnected');
  });
});

wssDashboard.on('connection', (ws) => {
  console.log('Dashboard connected');

  Array.from(wssClients.clients)
    .filter((c) => c.readyState === WebSocket.OPEN)
    .forEach((client) => {
      const metadata = clientMetadata.get(client)!;

      ws.send(
        encode({
          type: 'register',
          payload: {
            name: metadata.name,
            addr: metadata.addr,
          },
        }),
        { binary: false },
      );
    });

  ws.once('close', () => {
    console.log('Dashboard disconnected');
  });
});

function executableExists(cmd: string) {
  try {
    childProcess.execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (err) {
    return false;
  }
}

if (executableExists('swaymsg')) {
  setInterval(() => {
    const hasOpenClients =
      wssClients.clients.size == 0 ||
      Array.from(wssClients.clients).every(
        (c) =>
          c.readyState == WebSocket.CLOSED || c.readyState == WebSocket.CLOSING,
      );

    childProcess.exec(
      `swaymsg output HDMI-A-1 dpms ${hasOpenClients ? 'on' : 'off'}`,
    );
  }, 1000);
}
