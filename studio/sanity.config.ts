import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!;
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production';

export default defineConfig({
  name: 'jmpartyteam',
  title: 'JM Party Team',
  projectId,
  dataset,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Съдържание')
          .items([
            S.listItem()
              .title('Настройки на сайта')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
              ),
            S.divider(),
            S.documentTypeListItem('service').title('Услуги'),
            S.documentTypeListItem('pricePackage').title('Пакети'),
            S.documentTypeListItem('addon').title('Допълнения'),
            S.divider(),
            S.documentTypeListItem('galleryItem').title('Галерия'),
            S.documentTypeListItem('mix').title('Миксове'),
            S.documentTypeListItem('testimonial').title('Отзиви'),
            S.documentTypeListItem('faq').title('Въпроси и отговори'),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    // Settings is a singleton; it must not be creatable or deletable from the UI.
    templates: (templates) =>
      templates.filter(({ schemaType }) => schemaType !== 'siteSettings'),
  },
  document: {
    actions: (actions, { schemaType }) =>
      schemaType === 'siteSettings'
        ? actions.filter(
            ({ action }) => action !== 'unpublish' && action !== 'delete'
          )
        : actions,
  },
});
