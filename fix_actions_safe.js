const fs = require('fs');
const path = 'lib/actions.ts';
let lines = fs.readFileSync(path, 'utf-8').split('\n');

let output = [];
let current_fn = "";

const trigger_route = `    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('route', id).catch(console.error);
    });\n`;

const trigger_poi_with_id = `    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('poi', id).catch(console.error);
    });\n`;

const trigger_poi_with_result = `    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('poi', result.id).catch(console.error);
    });\n`;

function hasTrigger() {
    const lastLines = output.slice(-15).join('\n');
    return lastLines.includes('autoTranslateAction');
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('export async function updateRoute')) {
        current_fn = "updateRoute";
    } else if (line.includes('export async function createRoute')) {
        current_fn = "createRoute";
    } else if (line.includes('export async function createPoi')) {
        current_fn = "createPoi";
    } else if (line.includes('export async function updatePoi')) {
        current_fn = "updatePoi";
    } else if (line.includes('export async function updateLegend')) {
        current_fn = "updateLegend";
    }

    if (current_fn && line.includes('return { success: true')) {
        if (!hasTrigger()) {
            if (current_fn === "createRoute" || current_fn === "updateRoute" || current_fn === "updateLegend") {
                output.push(trigger_route);
            } else if (current_fn === "createPoi") {
                output.push(trigger_poi_with_result);
            } else if (current_fn === "updatePoi") {
                output.push(trigger_poi_with_id);
            }
        }
        current_fn = ""; // Close function tracking
    }

    if (line.includes('创新创意创新创意')) {
        continue; // Skip junk line
    }

    output.push(line);
}

fs.writeFileSync(path, output.join('\n'), 'utf-8');
console.log("Triggers and Cleanup Successful!");
