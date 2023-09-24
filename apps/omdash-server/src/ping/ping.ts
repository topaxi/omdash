import childProcess from 'node:child_process';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function* ping(
  host: string,
  options = { count: 10, interval: 2 },
): AsyncGenerator<{ host: string; ip: string; time: number }> {
  // Previously we recursively yielded ping itself which caused a memory leak.
  // We now use a simple while loop instead.
  while (true) {
    try {
      const p = childProcess.spawn('ping', [
        '-n',
        '-c',
        String(options.count),
        '-i',
        String(options.interval),
        host,
      ]);

      console.log(p.spawnargs.join(' '));

      for await (const data of p.stdout) {
        const line = data.toString();
        const parsed = parsePingOutput(line);

        if (parsed) {
          yield { host, ...parsed };
        }
      }

      await new Promise((resolve, reject) => {
        p.once('exit', (exitCode) => {
          if (exitCode === 0) {
            resolve(null);
          } else {
            reject(
              Object.assign(
                new Error(
                  `"${p.spawnargs.join(' ')}" exited with code ${exitCode}`,
                ),
                {
                  exitCode,
                },
              ),
            );
          }
        });
      });
    } catch (err) {
      console.error(err);

      await sleep(options.interval * 1000 * 4);
    } finally {
      await sleep(options.interval * 1000);
    }
  }
}

function parsePingOutput(line: string): { ip: string; time: number } | null {
  const match =
    /from .*?\((.*?)\).*?time=(.*?) ms/.exec(line) ||
    /from (.*?): .*?time=(.*?) ms/.exec(line);

  if (!match) {
    return null;
  }

  const [, ip, time] = match;

  return { ip, time: Number(time) };
}
