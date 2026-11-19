import { describe, expect, it } from 'vitest';
import { InvalidCursorError, NotFoundError } from '../src/errors.js';
import type { CommentPage, Repos } from '../src/repositories/types.js';
import { Comment } from '../src/schemas/comment.js';
import { testBears } from './helpers.js';

const UNKNOWN_ID = '01900000-0000-7000-8000-000000000000';
const SAME_INSTANT = new Date('2026-01-01T00:00:00.000Z');
const PAGE = { limit: 20 };

export type MakeRepos = (options?: { now?: () => Date }) => Promise<Repos>;

function nextCursor(page: CommentPage): string {
  if (page.nextCursor === null) {
    throw new Error('expected another page');
  }
  return page.nextCursor;
}

// Runs the same cases against every Repos implementation, so the in-memory
// version used by the route tests behaves like the database one.
export function describeRepos(name: string, make: MakeRepos): void {
  describe(`${name}: bears`, () => {
    it('lists bears without intro and gets one with intro', async () => {
      const { bears } = await make();

      expect((await bears.list()).map((bear) => bear.id)).toEqual(
        testBears.map((bear) => bear.id)
      );
      expect((await bears.list())[0]).not.toHaveProperty('intro');
      expect(await bears.get('ursus-arctos')).toEqual(testBears[1]);
      expect(await bears.get('no-such-bear')).toBeNull();
    });

    it('upserts on id', async () => {
      const { bears } = await make();
      const [panda] = testBears;
      if (panda === undefined) {
        throw new Error('missing fixture');
      }

      await bears.upsertMany([{ ...panda, intro: 'Updated.' }]);

      expect((await bears.list()).length).toBe(testBears.length);
      expect((await bears.get(panda.id))?.intro).toBe('Updated.');
    });

    it('filters by name, case-insensitive, with LIKE wildcards as text', async () => {
      const { bears } = await make();

      expect((await bears.list('BEAR')).map((bear) => bear.id)).toEqual([
        'ursus-arctos',
      ]);
      expect(await bears.list('%')).toEqual([]);
      expect(await bears.list('_')).toEqual([]);
    });
  });

  describe(`${name}: comments`, () => {
    it('creates a comment and finds it by id', async () => {
      const { comments } = await make();

      const created = await comments.create({
        bearId: 'ursus-arctos',
        author: 'Ada',
        text: 'Hi',
      });

      expect(Comment.parse(created)).toMatchObject({
        bearId: 'ursus-arctos',
        author: 'Ada',
        text: 'Hi',
      });
      expect(await comments.findById(created.id)).toEqual(created);
    });

    it('returns null for an unknown id', async () => {
      const { comments } = await make();

      expect(await comments.findById(UNKNOWN_ID)).toBeNull();
    });

    it('refuses a comment for an unknown bear', async () => {
      const { comments } = await make();

      await expect(
        comments.create({ bearId: 'no-such-bear', author: 'Ada', text: 'x' })
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lists only the comments of one bear, newest first', async () => {
      const { comments } = await make();
      await comments.create({
        bearId: 'ursus-arctos',
        author: 'Ada',
        text: 'first',
      });
      await comments.create({
        bearId: 'ailuropoda-melanoleuca',
        author: 'Bob',
        text: 'panda',
      });
      await comments.create({
        bearId: 'ursus-arctos',
        author: 'Cy',
        text: 'second',
      });

      const page = await comments.listByBear('ursus-arctos', PAGE);

      expect(page.items.map((comment) => comment.text)).toEqual([
        'second',
        'first',
      ]);
      expect(page.nextCursor).toBeNull();
    });

    it('pages through comments with the same createdAt without gaps or repeats', async () => {
      const { comments } = await make({ now: () => SAME_INSTANT });
      const created = await Promise.all(
        Array.from(
          { length: 45 },
          async (_unused, n) =>
            await comments.create({
              bearId: 'ursus-arctos',
              author: 'Ada',
              text: `comment ${n}`,
            })
        )
      );

      const first = await comments.listByBear('ursus-arctos', PAGE);
      const second = await comments.listByBear('ursus-arctos', {
        ...PAGE,
        cursor: nextCursor(first),
      });
      const third = await comments.listByBear('ursus-arctos', {
        ...PAGE,
        cursor: nextCursor(second),
      });

      expect([first, second, third].map((page) => page.items.length)).toEqual([
        20, 20, 5,
      ]);
      expect(third.nextCursor).toBeNull();
      const seen = [...first.items, ...second.items, ...third.items].map(
        (comment) => comment.id
      );
      expect(new Set(seen).size).toBe(45);
      expect(new Set(seen)).toEqual(new Set(created.map((c) => c.id)));
    });

    it('rejects a cursor it did not issue', async () => {
      const { comments } = await make();
      const wrongShape = Buffer.from('{"x":1}').toString('base64url');

      await expect(
        comments.listByBear('ursus-arctos', { ...PAGE, cursor: 'abc' })
      ).rejects.toBeInstanceOf(InvalidCursorError);
      await expect(
        comments.listByBear('ursus-arctos', { ...PAGE, cursor: wrongShape })
      ).rejects.toBeInstanceOf(InvalidCursorError);
    });

    it('deletes once: true, then false', async () => {
      const { comments } = await make();
      const { id } = await comments.create({
        bearId: 'ursus-arctos',
        author: 'Ada',
        text: 'Hi',
      });

      expect(await comments.delete(id)).toBe(true);
      expect(await comments.delete(id)).toBe(false);
      expect(await comments.findById(id)).toBeNull();
    });
  });
}
