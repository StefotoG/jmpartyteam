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
      type: 'internationalizedArrayStringList',
    }),
    defineField({
      name: 'addressLocality',
      title: 'Основен град',
      type: 'internationalizedArrayString',
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
        'Технически идентификатор на латиница, например catering. Не го променяйте след публикуване.',
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
      type: 'internationalizedArraySlug',
      description:
        'На латиница. Например svatbi за български и weddings за английски.',
    }),
    defineField({
      name: 'title',
      title: 'Заглавие',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'summary',
      title: 'Кратко описание',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'body',
      title: 'Описание',
      type: 'internationalizedArrayTextList',
    }),
    defineField({
      name: 'inclusions',
      title: 'Какво включва',
      type: 'internationalizedArrayStringList',
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
    select: { title: 'title.0.value', media: 'image', subtitle: 'key' },
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
    defineField({
      name: 'name',
      title: 'Име',
      type: 'internationalizedArrayString',
    }),
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
      type: 'internationalizedArrayStringList',
    }),
    defineField({
      name: 'highlighted',
      title: 'Най-избиран',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: 'name.0.value', subtitle: 'priceEur' },
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
    defineField({
      name: 'name',
      title: 'Име',
      type: 'internationalizedArrayString',
    }),
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
    select: { title: 'name.0.value', subtitle: 'priceEur' },
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
      name: 'image',
      title: 'Снимка',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Описание на снимката',
      type: 'internationalizedArrayString',
      description:
        'Кратко описание за хора, които използват екранен четец. Задължително.',
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
    select: { title: 'alt.0.value', media: 'image', subtitle: 'venue' },
  },
});

export const mix = defineType({
  name: 'mix',
  title: 'Миксове',
  type: 'document',
  fields: [
    placeholderField,
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
    defineField({
      name: 'genres',
      title: 'Жанрове',
      type: 'internationalizedArrayStringList',
    }),
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
    defineField({
      name: 'quote',
      title: 'Отзив',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'rating',
      title: 'Оценка',
      type: 'number',
      description: 'Само реални оценки от реални клиенти.',
      validation: (rule) => rule.required().min(1).max(5).integer(),
    }),
  ],
  preview: { select: { title: 'author', subtitle: 'date' } },
});

export const faq = defineType({
  name: 'faq',
  title: 'Въпроси и отговори',
  type: 'document',
  fields: [
    placeholderField,
    defineField({
      name: 'question',
      title: 'Въпрос',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'answer',
      title: 'Отговор',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'order',
      title: 'Подредба',
      type: 'number',
      initialValue: 1,
    }),
  ],
  preview: { select: { title: 'question.0.value' } },
});
