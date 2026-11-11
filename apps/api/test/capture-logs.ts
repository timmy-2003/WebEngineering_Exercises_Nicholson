import { Writable } from 'node:stream';
import { z } from 'zod';

export const LogLine = z.looseObject({
  reqId: z.string().optional(),
  msg: z.string().optional(),
  level: z.number().optional(),
});
export type LogLine = z.infer<typeof LogLine>;

export function captureLogs(): { stream: Writable; lines: LogLine[] } {
  const lines: LogLine[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim() !== '') {
          lines.push(LogLine.parse(JSON.parse(line)));
        }
      }
      callback();
    },
  });
  return { stream, lines };
}
