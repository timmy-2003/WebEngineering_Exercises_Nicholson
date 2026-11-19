// Sends concurrent reports for one new comment and prints the final count.
// Usage: npm run db:storm -- [apiUrl]   (default http://localhost:3000)
import { z } from 'zod';

const REPORTS = 50;
const BEAR_ID = 'ursus-arctos';

const CreatedComment = z.object({ id: z.uuid() });
const ReportedComment = z.object({
  reportCount: z.number(),
  hiddenAt: z.string().nullable(),
});

const API_URL_ARG = 2; // node, script, apiUrl
const apiUrl = process.argv.at(API_URL_ARG) ?? 'http://localhost:3000';

async function request(
  path: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(new URL(path, apiUrl), {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} answered ${res.status}`);
  }
  return await res.json();
}

const { id } = CreatedComment.parse(
  await request(`/api/bears/${BEAR_ID}/comments`, 'POST', {
    author: 'storm',
    text: 'Report me',
  })
);

await Promise.all(
  Array.from(
    { length: REPORTS },
    async () => await request(`/api/comments/${id}/report`, 'POST')
  )
);

const { reportCount, hiddenAt } = ReportedComment.parse(
  await request(`/api/comments/${id}`, 'GET')
);
process.stdout.write(
  `comment ${id}\nfinal count: ${reportCount} (expected ${REPORTS})\nhidden: ${hiddenAt ?? 'no'}\n`
);
