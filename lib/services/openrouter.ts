import OpenAI from 'openai';

let openRouter: OpenAI | null = null;

function getOpenRouter() {
  if (!openRouter) {
    openRouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || 'sk-placeholder', // Prevent SDK from throwing "Missing credentials"
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://geocontent.app',
        'X-Title': 'Geocontent',
      },
    });
  }
  return openRouter;
}

export async function generateExecutiveSummary(data: any): Promise<string> {
  try {
    const client = getOpenRouter();
    const completion = await client.chat.completions.create({
      model: "meta-llama/llama-3-70b-instruct",
      messages: [
        {
          role: "system",
          content: "Ets un consultor de turisme expert. Analitza aquestes dades JSON (afluència, hores punta) i redacta un resum executiu per a un Alcalde. Sigues breu, directe i propositiu. Utilitza un to institucional però modern."
        },
        {
          role: "user",
          content: JSON.stringify(data)
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || "No s'ha pogut generar el resum.";
  } catch (error) {
    console.error("Error generating executive summary:", error);
    throw new Error("Failed to generate summary via OpenRouter");
  }
}

/**
 * PXX QUIZ GENERATION MOTOR
 */

export async function generatePoiQuiz(title: string, content: string, type: string) {
  try {
    const client = getOpenRouter();

    let tone = "informatiu";
    if (type === 'GUERRA_CIVIL') tone = "respectuós i històric";
    else if (type === 'LLEGENDA') tone = "místic";

    const systemPrompt = `Ets l'expert en patrimoni de PXX. Genera un quiz de 3 opcions basat ÚNICAMENT en el text proporcionat. No inventis dades visuals. La resposta ha de ser deduïble pel text o l'àudio.
Si el punt és 'Guerra Civil', el to ha de ser respectuós i històric.
Si el punt és 'Llegenda', el to ha de ser místic. Actualment el to és: ${tone}.
Format JSON: { "pregunta": "...", "opcions": ["A", "B", "C"], "correcta": 0 }`;

    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL_ID || "qwen/qwen-2.5-72b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Punt: ${title}\nContingut: ${content}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Error generating poi quiz:", error);
    return null;
  }
}

export async function generateFinalRouteQuiz(routeName: string, poisData: { title: string, content: string }[]) {
  try {
    const client = getOpenRouter();

    const context = poisData.map(p => `[Punt: ${p.title}] ${p.content}`).join("\n\n");

    const systemPrompt = `Ets l'expert en patrimoni de PXX. Genera el "Repte Final" que tanca la ruta "${routeName}". Ha de ser un quiz transversal que analitzi o connecti diversos punts de la ruta basant-se ÚNICAMENT en el contingut proporcionat.
Format JSON: { "pregunta": "...", "opcions": ["A", "B", "C"], "correcta": 0 }`;

    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL_ID || "qwen/qwen-2.5-72b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context de la ruta:\n${context}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Error generating final route quiz:", error);
    return null;
  }
}
