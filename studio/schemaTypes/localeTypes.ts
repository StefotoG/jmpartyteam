import { defineType, defineField } from 'sanity';

/**
 * Localized field primitives. Bulgarian is the source language — the EN variant of a
 * document is a translation of it, so BG is the field that carries validation.
 */

export const localeString = defineType({
  name: 'localeString',
  title: 'Text',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({
      name: 'bg',
      title: 'Български',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'en', title: 'English', type: 'string' }),
  ],
});

export const localeText = defineType({
  name: 'localeText',
  title: 'Paragraph',
  type: 'object',
  fields: [
    defineField({
      name: 'bg',
      title: 'Български',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'en', title: 'English', type: 'text', rows: 3 }),
  ],
});

export const localeStringList = defineType({
  name: 'localeStringList',
  title: 'List',
  type: 'object',
  fields: [
    defineField({
      name: 'bg',
      title: 'Български',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'en',
      title: 'English',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
});

export const localeTextList = defineType({
  name: 'localeTextList',
  title: 'Paragraphs',
  type: 'object',
  fields: [
    defineField({
      name: 'bg',
      title: 'Български',
      type: 'array',
      of: [{ type: 'text', rows: 4 }],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'en',
      title: 'English',
      type: 'array',
      of: [{ type: 'text', rows: 4 }],
    }),
  ],
});

export const localeSlug = defineType({
  name: 'localeSlug',
  title: 'URL slug',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({
      name: 'bg',
      title: 'Български (латиница)',
      type: 'slug',
      description: 'Например: svatbi',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'en',
      title: 'English',
      type: 'slug',
      validation: (rule) => rule.required(),
    }),
  ],
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
