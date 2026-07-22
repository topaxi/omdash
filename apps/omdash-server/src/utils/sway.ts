import fs from 'node:fs/promises';

// Resolved fresh on each call rather than cached for the process lifetime:
// the socket filename embeds sway's pid, so a cached path goes stale (and
// every subsequent swaymsg silently fails) if sway restarts after the server.
export async function getSwaySocket(): Promise<string | undefined> {
  if (process.env.SWAYSOCK) {
    return process.env.SWAYSOCK;
  }

  const uid = process.getuid?.() ?? 1000;

  try {
    const files = await fs.readdir(`/run/user/${uid}`);
    const socket = files.find((f) => f.startsWith('sway-ipc'));

    return socket ? `/run/user/${uid}/${socket}` : undefined;
  } catch {
    return undefined;
  }
}

export function dpms(toggle: boolean) {
  return `swaymsg output HDMI-A-1 dpms ${toggle ? 'on' : 'off'}`;
}
