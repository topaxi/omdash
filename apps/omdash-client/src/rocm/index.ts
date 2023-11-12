import { exec } from 'node:child_process';

export interface AMDGPUInfo {
  'GPU ID': string;
  'GPU use (%)': string;
  'PCI Bus': string;
  'VRAM Total Memory (B)': string;
  'VRAM Total Used Memory (B)': string;
  'Temperature (Sensor edge) (C)'?: string;
  'Temperature (Sensor junction) (C)'?: string;
  'Temperature (Sensor memory) (C)'?: string;
}

let rocsmiExists: boolean | undefined;

export function rocmSmiPath(): string {
  return '/opt/rocm/bin/rocm-smi';
}

export function execRocmSmi(args: string[]): Promise<Record<string, any>> {
  if (rocsmiExists == null) {
    try {
      exec(`${rocmSmiPath()} --version`);
      rocsmiExists = true;
    } catch (error) {
      rocsmiExists = false;
    }
  }

  if (!rocsmiExists) {
    return Promise.resolve({});
  }

  return new Promise((resolve, reject) => {
    exec(`${rocmSmiPath()} ${args.join(' ')}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr) {
        reject(new Error(stderr));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

export async function getAMDGPUInfo(): Promise<AMDGPUInfo[]> {
  return Object.values(
    await execRocmSmi([
      '--showbus',
      '-i',
      '-u',
      '-t',
      '--showmeminfo vram',
      '--json',
    ]),
  );
}
