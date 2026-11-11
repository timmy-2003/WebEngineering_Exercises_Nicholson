import { Writable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/schemas/env.js';
import { z } from 'zod';
import { fakeWikipedia } from './fake-wikipedia.js';

const LogLine = z.looseObject({
  reqId: z.string().optional(),
  msg: z.string().optional(),
  level: z.number().optional(),
});
type LogLine = z.infer<typeof LogLine>;

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

function captureLogs(): {
  stream: Writable;
  lines: LogLine[];
} {
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

describe('request logging', () => {
  it('writes one summary line per request with method, url, status and duration', async () => {
    const { stream, lines } = captureLogs();
    app = await buildApp({
      env: loadEnv({}),
      fetch: fakeWikipedia().fetch,
      logger: { level: 'info', stream },
    });

    const res = await app.inject({ method: 'GET', url: '/api/bears' });

    const requestLines = lines.filter((line) => 'reqId' in line);
    expect(requestLines).toHaveLength(1);
    const [line] = requestLines;
    expect(res.statusCode).toBe(200);
    expect(line).toMatchObject({
      method: 'GET',
      url: '/api/bears',
      statusCode: 200,
    });
    expect(typeof line?.reqId).toBe('string');
    expect(line?.msg).toMatch(/^GET \/api\/bears 200 \d+ms$/v);
  });

  it('logs a known upstream failure as one short error line plus the summary', async () => {
    const { stream, lines } = captureLogs();
    app = await buildApp({
      env: loadEnv({}),
      fetch: fakeWikipedia({ parse: new TypeError('fetch failed') }).fetch,
      logger: { level: 'info', stream },
    });

    await app.inject({ method: 'GET', url: '/api/bears' });

    const requestLines = lines.filter((line) => 'reqId' in line);
    expect(requestLines.map((line) => [line.level, line.msg])).toEqual([
      [50, 'UpstreamError: Wikipedia could not be reached (fetch failed)'],
      [50, expect.stringMatching(/^GET \/api\/bears 502 \d+ms$/v)],
    ]);
    expect(JSON.stringify(requestLines)).not.toContain('stack');
  });

  it('logs a 4xx summary at warn level', async () => {
    const { stream, lines } = captureLogs();
    app = await buildApp({
      env: loadEnv({}),
      fetch: fakeWikipedia().fetch,
      logger: { level: 'info', stream },
    });

    await app.inject({ method: 'GET', url: '/api/bears/no-such-bear' });

    const summary = lines.find((line) => line.msg?.startsWith('GET ') === true);
    expect(summary?.level).toBe(40);
  });

  it('does not log health checks at info level', async () => {
    const { stream, lines } = captureLogs();
    app = await buildApp({
      env: loadEnv({}),
      fetch: fakeWikipedia().fetch,
      logger: { level: 'info', stream },
    });

    await app.inject({ method: 'GET', url: '/health' });

    expect(lines.filter((line) => 'reqId' in line)).toEqual([]);
  });
});
