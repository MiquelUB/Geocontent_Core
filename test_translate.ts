import { autoTranslateAction } from './lib/ai-actions';
import { prisma } from './lib/database/prisma';

async function main() {
  const poi = await prisma.poi.findFirst({
    where: {
      titleTranslations: {
        equals: {}
      }
    },
    select: { id: true, title: true }
  });

  if (!poi) {
    console.log("No POIs without translations found.");
    const anyPoi = await prisma.poi.findFirst({ select: { id: true, title: true } });
    if (anyPoi) {
       console.log("Running translate on first available POI:", anyPoi);
       await autoTranslateAction('poi', anyPoi.id);
    } else {
       console.log("No POIs found at all in DB.");
    }
  } else {
    console.log("Found POI to translate:", poi);
    await autoTranslateAction('poi', poi.id);
  }
}

main().catch(console.error);
