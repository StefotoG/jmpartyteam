import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  deployment: {
    appId: 'cathnc3brr8y7ngiby71sof4',
    autoUpdates: false,
  },
});
