import childProcess from 'node:child_process';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* lines(readableStream: NodeJS.ReadableStream) {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  for await (const chunk of readableStream) {
    buffer += decoder.decode(chunk as any, { stream: true });

    const lines = buffer.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      yield lines[i];
    }

    buffer = lines[lines.length - 1];
  }

  // Yield any remaining data in the buffer
  if (buffer.length > 0) {
    yield buffer;
  }
}

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

      for await (const data of lines(p.stdout)) {
        const line = data.toString();

        // Blank line, nothing to do
        if (line === '') {
          continue;
        }

        // Skip the first line
        if (line.startsWith('PING')) {
          continue;
        }

        // Ping summary, we're done
        if (line.startsWith('---')) {
          break;
        }

        const parsed = parsePingOutput(line);

        if (parsed) {
          yield { host, ...parsed };
        } else {
          console.warn(`Could not parse ping output: "${line}"`);
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
