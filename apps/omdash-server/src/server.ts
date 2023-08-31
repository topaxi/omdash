import childProcess from 'child_process';
import WebSocket, { WebSocketServer } from 'ws';

const createWebSocketServer = (port: number) => {
  const wss = new WebSocketServer({
    port,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3,
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024,
      },
      clientNoContextTakeover: true, // Defaults to negotiated value.
      serverNoContextTakeover: true, // Defaults to negotiated value.
      serverMaxWindowBits: 10, // Defaults to negotiated value.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024, // Size (in bytes) below which messages
    },
  });

  return wss;
};

const wssClients = createWebSocketServer(3200);
const wssDashboard = createWebSocketServer(3300);

const clientMetadata = new WeakMap<WebSocket, Record<string, any>>();

function encode(val: any) {
  return JSON.stringify(val);
}

function decode(val: any) {
  return JSON.parse(val);
}

wssClients.on('connection', (ws, req) => {
  console.log('Client connected', req.socket.remoteAddress);

  const metadata = { addr: req.socket.remoteAddress } as Record<string, any>;
  clientMetadata.set(ws, metadata);

  ws.on('message', (message) => {
    try {
      const { type, payload } = decode(message);

      if (type === 'register') {
        metadata.name = payload.name;
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

  ws.once('close', () => {
    console.log('Client disconnected');
  });
});

wssDashboard.on('connection', (ws) => {
  console.log('Dashboard connected');

  wssClients.clients.forEach((client) => {
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
    childProcess.exec(
      `swaymsg output HDMI-A-1 dpms ${wssClients.clients.size ? 'on' : 'off'}`,
    );
  }, 1000);
}
