import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import WebSocket from 'ws';
import { createWebSocketServer, decode, encode } from './utils/socket';

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

function hasOpenClients() {
  const clients = Array.from(wssClients.clients).filter(
    (c) => clientMetadata.get(c)?.hostname !== hostname,
  );

  return clients.some((c) => c.readyState === WebSocket.OPEN);
}

function dpms(toggle: boolean) {
  return `swaymsg output HDMI-A-1 dpms ${toggle ? 'on' : 'off'}`;
}

let SWAYSOCK = process.env.SWAYSOCK;
async function getSwaySocket() {
  if (SWAYSOCK) {
    return SWAYSOCK;
  }

  const uid = process.getuid?.() || 1000;

  SWAYSOCK = await fs
    .readdir(`/run/user/${uid}`)
    .then((files) => files.find((f) => f.startsWith('sway-ipc')))
    .then((file) => `/run/user/${uid}/${file}`)
    .then((SWAYSOCK) => process.env.SWAYSOCK || SWAYSOCK);

  return SWAYSOCK;
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
    broadcastToDashboards(
      encode({
        type: 'ping',
        payload: {
          timestamp: Math.floor(Date.now() / 1000),
          ...payload,
        },
      }),
    );
  }
}

pingHosts();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parsePingOutput(line: string): { ip: string; time: number } | null {
  const match = /from .*?\((.*?)\).*?time=(.*?) ms/.exec(line);

  if (!match) {
    return null;
  }

  const [, ip, time] = match;

  return { ip, time: Number(time) };
}

async function* ping(
  host: string,
  options = { count: 10, interval: 2 },
): AsyncGenerator<{ host: string; ip: string; time: number }> {
  const p = childProcess.spawn('ping', [
    '-c',
    String(options.count),
    '-i',
    String(options.interval),
    host,
  ]);

  for await (const data of p.stdout) {
    const line = data.toString();
    const parsed = parsePingOutput(line);

    if (parsed) {
      yield { host, ...parsed };
    }
  }

  await sleep(options.interval * 1000);

  yield* ping(host);
}
