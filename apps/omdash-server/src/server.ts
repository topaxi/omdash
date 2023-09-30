import childProcess from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import WebSocket from 'ws';
import { createWebSocketServer, decode, encode } from './utils/socket';
import { ping } from './ping';
import { dpms, getSwaySocket } from './utils/sway';

process.title = 'omdash-server';

interface ClientMetadata {
  arch?: string;
  platform?: string;
  release?: string;
  hostname?: string;
  isAlive: boolean;
  addr: string;
}

const hostname = os.hostname();
const server = http.createServer();
const wssClients = createWebSocketServer();
const wssDashboard = createWebSocketServer();

server.on('upgrade', function onupgrade(request, socket, head) {
  const { pathname } = new URL(request.url!, 'http://localhost');

  if (pathname === '/dashboard') {
    wssDashboard.handleUpgrade(request, socket, head, (ws) => {
      wssDashboard.emit('connection', ws, request);
    });
  } else if (pathname === '/' || pathname === '/client') {
    wssClients.handleUpgrade(request, socket, head, (ws) => {
      wssClients.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(process.env.PORT || 3200, () => {
  console.info(`Listening on ${(server.address() as any)?.port}`);
});

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

function broadcastToDashboards(message: string) {
  wssDashboard.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message, { binary: false });
    }
  });
}

const dashboardMessageQueue: string[] = [];

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
        metadata.hostname = payload.hostname;
        metadata.arch = payload.arch;
        metadata.platform = payload.platform;
        metadata.release = payload.release;
        payload.addr = metadata.addr;
      }

      const enhancedPayload = encode({
        type,
        client: metadata.hostname,
        payload,
      });

      dashboardMessageQueue.push(enhancedPayload);
    } catch (err) {
      console.error(err);
      console.log(message);
    }
  });

  ws.on('pong', () => {
    metadata.isAlive = true;
  });

  ws.once('close', () => {
    console.log('Client disconnected', req.socket.remoteAddress);
  });
});

setInterval(() => {
  while (dashboardMessageQueue.length > 0) {
    broadcastToDashboards(dashboardMessageQueue.shift()!);
  }
}, 1000);

wssDashboard.on('connection', (ws, req) => {
  console.log('Dashboard connected', req.socket.remoteAddress);

  Array.from(wssClients.clients)
    .filter((c) => c.readyState === WebSocket.OPEN)
    .forEach((client) => {
      const metadata = clientMetadata.get(client)!;

      ws.send(
        encode({
          type: 'register',
          payload: {
            hostname: metadata.hostname,
            arch: metadata.arch,
            platform: metadata.platform,
            release: metadata.release,
            addr: metadata.addr,
          },
        }),
        { binary: false },
      );
    });

  ws.once('close', () => {
    console.log('Dashboard disconnected', req.socket.remoteAddress);
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

// Hardcoded for now, will be configurable later.
// List of hosts that should always be considered "on".
// Hosts that are always on should not affect DPMS.
const alwaysOn = new Set([hostname]);

function hasOpenClients() {
  const clients = Array.from(wssClients.clients).filter(
    (c) => !alwaysOn.has(clientMetadata.get(c)?.hostname ?? ''),
  );

  return clients.some((c) => c.readyState === WebSocket.OPEN);
}

let hadOpenClients = false;
function setDPMSInterval(
  callback: (hasOpenClients: boolean) => void,
  interval: number,
) {
  return setInterval(async () => {
    const hasCurrentlyOpenClients = hasOpenClients();

    if (hadOpenClients !== hasCurrentlyOpenClients) {
      callback(hasCurrentlyOpenClients);

      hadOpenClients = hasCurrentlyOpenClients;
    }
  }, interval);
}

if (executableExists('swaymsg')) {
  setDPMSInterval(async (hasCurrentlyOpenClients) => {
    childProcess.exec(dpms(hasCurrentlyOpenClients), {
      env: {
        SWAYSOCK: await getSwaySocket(),
      },
    });
  }, 10_000);
} else if (process.env.DEBUG_DPMS) {
  setDPMSInterval((hasOpenClients) => {
    console.log(dpms(hasOpenClients));
  }, 10_000);
}

async function pingHosts() {
  const hosts = ['cerberus', 'topaxi.ch', 'meet.google.com'];

  for (const host of hosts) {
    broadcastPing(host);
  }
}

async function broadcastPing(host: string) {
  for await (const payload of ping(host)) {
    try {
      broadcastToDashboards(
        encode({
          type: 'ping',
          payload: {
            timestamp: Math.floor(Date.now() / 1000),
            ...payload,
          },
        }),
      );
    } catch (error) {
      console.error(error);
    }
  }
}

pingHosts();
