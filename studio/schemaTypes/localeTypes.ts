import { defineType, defineField, defineArrayMember } from 'sanity';

export const LANGUAGES = [
  { id: 'bg', title: 'Български' },
  { id: 'en', title: 'English' },
];

/**
 * Wrapper types registered with sanity-plugin-internationalized-array. The plugin only
 * localizes registered types and ships no list type, so bullet lists and multi-paragraph
 * bodies need these.
 */

export const stringList = defineType({
  name: 'stringList',
  title: 'Списък',
  type: 'array',
  of: [defineArrayMember({ type: 'string' })],
});

export const textList = defineType({
  name: 'textList',
  title: 'Абзаци',
  type: 'array',
  of: [defineArrayMember({ type: 'text', rows: 4 })],
});

/** Flags seeded content. The production build refuses to deploy while any remain. */
export const placeholderField = defineField({
  name: 'isPlaceholder',
  title: 'Примерно съдържание / Placeholder',
  type: 'boolean',
  initialValue: false,
  description:
    'Изключете, когато съдържанието е реално. Сайтът не може да бъде публикуван, докато има отметнати записи.',
});
