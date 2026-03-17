const fs = require('fs');
const content = fs.readFileSync('lib/ai-actions.ts', 'utf-8');
const index = content.indexOf('export async function autoTranslateAction');
const cleanContent = index !== -1 ? content.substring(0, index).trim() : content.trim();

const extraCode = `

export async function autoTranslateAction(type: 'route' | 'poi', id: string) {
  try {
    const { prisma } = await import('./database/prisma');
    const OpenAI = (await import('openai')).default;

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "sk-placeholder",
    });

    let payload: Record<string, string | null> = {};

    if (type === 'poi') {
      const poi = await prisma.poi.findUnique({ where: { id } });
      if (!poi) return;
      payload = { title: poi.title, description: poi.description };
    } else {
      const route = await prisma.route.findUnique({ where: { id } });
      if (!route) return;
      payload = { name: route.name, description: route.description };
    }

    const systemPrompt = \`
      Ets un expert en traducció de continguts turístics. Tradueix les claus d'aquest contingut al Castellà (es), Anglès (en) i Francès (fr).
      ESTRICTES NORMES:
      1. Mantén el to narratiu del territori.
      2. Noms propis de municipis, rius i muntanyes NO es tradueixen jamai (ex: Gerri de la Sal).
      3. Mantén EXACTAMENT el mateix format JSON de claus que el d'entrada, i a dins un diccionari amb les ISO 'es', 'en', 'fr'.
      Exemple sortida: { "title": { "es": "...", "en": "...", "fr": "..." } }
    \`;

    const completion = await openai.chat.completions.create({
      model: "qwen/qwen-turbo",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: JSON.stringify(payload) }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const res = JSON.parse(completion.choices[0].message.content || '{}');

    if (type === 'poi') {
      await prisma.poi.update({
        where: { id },
        data: { titleTranslations: res.title || {}, descriptionTranslations: res.description || {} }
      });
    } else {
      await prisma.route.update({
        where: { id },
        data: { nameTranslations: res.name || {}, descriptionTranslations: res.description || {} }
      });
    }
    console.log(\`[autoTranslateAction] Success for \${type} (\${id})\`);
  } catch (err) {
    console.error(\`[autoTranslateAction] Error en \${type} \${id}:\`, err);
  }
}
\`;

fs.writeFileSync('lib/ai-actions.ts', cleanContent + extraCode);
console.log("Fixed!");
