import { WebSocketServer } from 'ws';

export function createWebSocketServer(port: number) {
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
}

export function encode(val: any) {
  return JSON.stringify(val);
}

export function decode(val: any) {
  return JSON.parse(val);
}
