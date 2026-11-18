import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../src/errors.js';
import type { Repos } from '../src/repositories/types.js';
import { Comment } from '../src/schemas/comment.js';
import { testBears } from './helpers.js';

const UNKNOWN_ID = '01900000-0000-7000-8000-000000000000';

// Runs the same cases against every Repos implementation, so the in-memory
// version used by the route tests behaves like the database one.
export function describeRepos(name: string, make: () => Promise<Repos>): void {
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

    it('lists only the comments of one bear, oldest first', async () => {
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

      const listed = await comments.listByBear('ursus-arctos');

      expect(listed.map((comment) => comment.text)).toEqual([
        'first',
        'second',
      ]);
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
