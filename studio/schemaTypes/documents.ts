import { defineType, defineField } from 'sanity';
import { placeholderField } from './localeTypes';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Настройки на сайта',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'brandName',
      title: 'Име на бранда',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'phonePrimary',
      title: 'Основен телефон',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'phoneSecondary', title: 'Втори телефон', type: 'string' }),
    defineField({
      name: 'viber',
      title: 'Viber номер',
      type: 'string',
      description: 'Международен формат, например +359881234567',
    }),
    defineField({ name: 'whatsapp', title: 'WhatsApp номер', type: 'string' }),
    defineField({
      name: 'email',
      title: 'Имейл',
      type: 'string',
      validation: (rule) => rule.required().email(),
    }),
    defineField({ name: 'instagram', title: 'Instagram URL', type: 'url' }),
    defineField({ name: 'facebook', title: 'Facebook URL', type: 'url' }),
    defineField({ name: 'tiktok', title: 'TikTok URL', type: 'url' }),
    defineField({
      name: 'cities',
      title: 'Градове, в които работим',
      type: 'localeStringList',
    }),
    defineField({
      name: 'addressLocality',
      title: 'Основен град',
      type: 'localeString',
    }),
    defineField({
      name: 'foundingYear',
      title: 'Година на започване',
      type: 'number',
      validation: (rule) => rule.required().min(1990).max(2100),
    }),
    defineField({
      name: 'eventsCompleted',
      title: 'Брой проведени събития',
      type: 'number',
      validation: (rule) => rule.required().min(0),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Настройки на сайта' }),
  },
});

export const service = defineType({
  name: 'service',
  title: 'Услуги',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'key',
      title: 'Ключ',
      type: 'string',
      description:
        'Технически идентификатор, използван за връзка със снимки и отзиви. Не го променяйте след публикуване.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Подредба',
      type: 'number',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL адрес',
      type: 'localeSlug',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'title', title: 'Заглавие', type: 'localeString' }),
    defineField({ name: 'summary', title: 'Кратко описание', type: 'localeText' }),
    defineField({ name: 'body', title: 'Описание', type: 'localeTextList' }),
    defineField({
      name: 'inclusions',
      title: 'Какво включва',
      type: 'localeStringList',
    }),
    defineField({
      name: 'image',
      title: 'Снимка',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title.bg', media: 'image', subtitle: 'key' },
  },
});

export const pricePackage = defineType({
  name: 'pricePackage',
  title: 'Пакети',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'key',
      title: 'Ключ',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'name', title: 'Име', type: 'localeString' }),
    defineField({
      name: 'priceEur',
      title: 'Цена в евро',
      type: 'number',
      description: 'Само число, без символ. Валутата е евро.',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'isFrom',
      title: 'Показвай като „от“',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'features',
      title: 'Какво включва',
      type: 'localeStringList',
    }),
    defineField({
      name: 'highlighted',
      title: 'Най-избиран',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'name.bg', subtitle: 'priceEur' },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: subtitle ? `${subtitle} EUR` : undefined,
    }),
  },
});

export const addon = defineType({
  name: 'addon',
  title: 'Допълнения',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'key',
      title: 'Ключ',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'name', title: 'Име', type: 'localeString' }),
    defineField({
      name: 'priceEur',
      title: 'Цена в евро',
      type: 'number',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'isFrom',
      title: 'Показвай като „от“',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'name.bg', subtitle: 'priceEur' },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: subtitle ? `${subtitle} EUR` : undefined,
    }),
  },
});

export const galleryItem = defineType({
  name: 'galleryItem',
  title: 'Галерия',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'key',
      title: 'Ключ',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Снимка',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Описание на снимката',
      type: 'localeString',
      description:
        'Кратко описание за хора, които използват екранен четец. Задължително.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'service',
      title: 'Вид събитие',
      type: 'reference',
      to: [{ type: 'service' }],
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'venue', title: 'Локация', type: 'string' }),
  ],
  preview: {
    select: { title: 'alt.bg', media: 'image', subtitle: 'service.title.bg' },
  },
});

export const mix = defineType({
  name: 'mix',
  title: 'Миксове',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'key',
      title: 'Ключ',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Заглавие',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'platform',
      title: 'Платформа',
      type: 'string',
      options: {
        list: [
          { title: 'Mixcloud', value: 'mixcloud' },
          { title: 'SoundCloud', value: 'soundcloud' },
          { title: 'YouTube', value: 'youtube' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'embedUrl',
      title: 'Embed адрес',
      type: 'url',
      description: 'Адресът за вграждане, не адресът на страницата.',
    }),
    defineField({
      name: 'durationMinutes',
      title: 'Продължителност в минути',
      type: 'number',
      validation: (rule) => rule.min(0),
    }),
    defineField({ name: 'genres', title: 'Жанрове', type: 'localeStringList' }),
  ],
  preview: { select: { title: 'title', subtitle: 'platform' } },
});

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Отзиви',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'key',
      title: 'Ключ',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Име на клиента',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'service',
      title: 'Вид събитие',
      type: 'reference',
      to: [{ type: 'service' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Дата на събитието',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'quote', title: 'Отзив', type: 'localeText' }),
    defineField({
      name: 'rating',
      title: 'Оценка',
      type: 'number',
      description: 'Само реални оценки от реални клиенти.',
      validation: (rule) => rule.required().min(1).max(5).integer(),
    }),
  ],
  preview: { select: { title: 'author', subtitle: 'service.title.bg' } },
});

export const faq = defineType({
  name: 'faq',
  title: 'Въпроси и отговори',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'key',
      title: 'Ключ',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'question', title: 'Въпрос', type: 'localeString' }),
    defineField({ name: 'answer', title: 'Отговор', type: 'localeText' }),
  ],
  preview: { select: { title: 'question.bg' } },
});
