import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testApp } from './helpers.js';
import { loadEnv } from '../src/schemas/env.js';
import { captureLogs } from './capture-logs.js';

const refused = async (): Promise<void> => {
  await Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

describe('request logging', () => {
  it('writes one summary line per request with method, url, status and duration', async () => {
    const { stream, lines } = captureLogs();
    app = await testApp({
      env: loadEnv({}),
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

  it('logs a known failure as one short error line plus the summary', async () => {
    const { stream, lines } = captureLogs();
    app = await testApp({
      env: loadEnv({}),
      ping: refused,
      logger: { level: 'info', stream },
    });

    await app.inject({ method: 'GET', url: '/health/ready' });

    const requestLines = lines.filter((line) => 'reqId' in line);
    expect(requestLines.map((line) => [line.level, line.msg])).toEqual([
      [
        50,
        'DatabaseUnavailableError: database ping failed (connect ECONNREFUSED 127.0.0.1:5432)',
      ],
      [50, expect.stringMatching(/^GET \/health\/ready 503 \d+ms$/v)],
    ]);
    expect(JSON.stringify(requestLines)).not.toContain('stack');
  });

  it('logs a 4xx summary at warn level', async () => {
    const { stream, lines } = captureLogs();
    app = await testApp({
      env: loadEnv({}),
      logger: { level: 'info', stream },
    });

    await app.inject({ method: 'GET', url: '/api/bears/no-such-bear' });

    const summary = lines.find((line) => line.msg?.startsWith('GET ') === true);
    expect(summary?.level).toBe(40);
  });

  it('does not log health checks at info level', async () => {
    const { stream, lines } = captureLogs();
    app = await testApp({
      env: loadEnv({}),
      logger: { level: 'info', stream },
    });

    await app.inject({ method: 'GET', url: '/health' });

    expect(lines.filter((line) => 'reqId' in line)).toEqual([]);
  });
});
