import fs from 'node:fs/promises';

let SWAYSOCK = process.env.SWAYSOCK;
export async function getSwaySocket() {
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

export function dpms(toggle: boolean) {
  return `swaymsg output HDMI-A-1 dpms ${toggle ? 'on' : 'off'}`;
}
