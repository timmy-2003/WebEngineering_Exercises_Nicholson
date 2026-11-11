import { describe, expect, it } from 'vitest';
import { parseBearEntries } from '../src/services/parse-bears.js';
import { ursidsFixture } from './fake-wikipedia.js';

const {
  parse: { wikitext },
} = ursidsFixture;

describe('parseBearEntries', () => {
  it('parses 8 bears in page order', () => {
    expect(parseBearEntries(wikitext).map((entry) => entry.id)).toEqual([
      'ailuropoda-melanoleuca',
      'tremarctos-ornatus',
      'helarctos-malayanus',
      'melursus-ursinus',
      'ursus-americanus',
      'ursus-thibetanus',
      'ursus-arctos',
      'ursus-maritimus',
    ]);
  });

  it('expands the binomial with the genus and extracts the range', () => {
    expect(parseBearEntries(wikitext)[0]).toEqual({
      id: 'ailuropoda-melanoleuca',
      name: 'Giant panda',
      binomial: 'Ailuropoda melanoleuca',
      range: 'Central China, usually in bamboo forests',
      fileName: 'Grosser Panda.JPG',
    });
  });

  it('uses the label of a piped genus link', () => {
    const brownBear = parseBearEntries(wikitext).find(
      (entry) => entry.name === 'Brown bear'
    );
    expect(brownBear?.binomial).toBe('Ursus arctos');
  });

  it('dedupes repeated rows', () => {
    expect(parseBearEntries(wikitext + wikitext)).toHaveLength(8);
  });

  it('returns no entries for unrelated wikitext', () => {
    expect(parseBearEntries('just some text')).toEqual([]);
  });
});
