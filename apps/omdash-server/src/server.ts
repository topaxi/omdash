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

setInterval(() => {
  while (dashboardMessageQueue.length > 0) {
    broadcastToDashboards(dashboardMessageQueue.shift()!);
  }
}, 2000);

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

      if (type === 'client/register') {
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

wssDashboard.on('connection', (ws, req) => {
  console.log('Dashboard connected', req.socket.remoteAddress);

  ws.send(
    encode({
      type: 'server/env',
      payload: {
        unsplash: { client_id: process.env.OMDASH_UNSPLASH_CLIENT_ID ?? '' },
      },
    }),
    { binary: false },
  );

  Array.from(wssClients.clients)
    .filter((c) => c.readyState === WebSocket.OPEN)
    .forEach((client) => {
      const metadata = clientMetadata.get(client)!;

      ws.send(
        encode({
          type: 'client/register',
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
  } catch (_err) {
    return false;
  }
}

// Hardcoded for now, will be configurable later.
// List of hosts that should always be considered "on".
// Hosts that are always on should not affect DPMS.
const alwaysOn = [hostname, 'colon'];

function hasOpenClients() {
  const clients = Array.from(wssClients.clients).filter(
    (c) => !alwaysOn.includes(clientMetadata.get(c)?.hostname ?? ''),
  );

  return clients.some((c) => c.readyState === WebSocket.OPEN);
}

// Reassert the desired display power on every tick rather than only when the
// connected-client set flips. Transition-only control cannot recover once the
// display and the server's belief diverge - a failed swaymsg, sway restarting,
// or the output coming back powered off would leave the screen stuck off while
// clients are connected, with no further transition to correct it. `dpms on`
// when already on (and `dpms off` when already off) is a harmless no-op, so
// unconditionally reasserting is self-healing.
function setDPMSInterval(
  callback: (hasOpenClients: boolean) => void,
  interval: number,
) {
  return setInterval(() => callback(hasOpenClients()), interval);
}

if (executableExists('swaymsg')) {
  setDPMSInterval(async (hasCurrentlyOpenClients) => {
    const swaysock = await getSwaySocket();

    if (!swaysock) {
      console.error('DPMS: no sway IPC socket found');
      return;
    }

    childProcess.exec(
      dpms(hasCurrentlyOpenClients),
      { env: { ...process.env, SWAYSOCK: swaysock } },
      (err, _stdout, stderr) => {
        if (err) {
          console.error(`DPMS command failed: ${err.message} ${stderr.trim()}`);
        }
      },
    );
  }, 10_000);
} else if (process.env.DEBUG_DPMS) {
  setDPMSInterval((hasCurrentlyOpenClients) => {
    console.log(dpms(hasCurrentlyOpenClients));
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
          type: 'server/ping',
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
