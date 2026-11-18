import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const bears = pgTable('bears', {
  id: text().primaryKey(),
  name: text().notNull(),
  binomial: text().notNull().unique(),
  imageUrl: text('image_url'),
  range: text().notNull().default(''),
  intro: text().notNull().default(''),
  fetchedAt: timestamp('fetched_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const comments = pgTable(
  'comments',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    bearId: text('bear_id')
      .notNull()
      .references(() => bears.id, { onDelete: 'cascade' }),
    author: text().notNull(),
    text: text().notNull(),
    // Precision 3 matches JS Date, so a createdAt cursor round-trips exactly.
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'comments_author_length',
      sql`char_length(${table.author}) BETWEEN 1 AND 80`
    ),
    check(
      'comments_text_length',
      sql`char_length(${table.text}) BETWEEN 1 AND 2000`
    ),
  ]
);
