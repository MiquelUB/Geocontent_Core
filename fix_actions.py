import os

path = 'lib/actions.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the Chinese text
text = text.replace('创新创意创新创意;', '')

# Injection strings
trigger_route = """    revalidatePath('/admin');
    revalidatePath('/');

    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('route', id).catch(console.error);
    });"""

trigger_poi = """    revalidatePath('/admin');

    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('poi', id).catch(console.error);
    });"""

# Inject into createRoute if not already present
create_route_anchor = """    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, id };"""

if create_route_anchor in text:
    text = text.replace(create_route_anchor, trigger_route + "\n\n    return { success: true, id };")

# Inject into updateRoute if not already present
update_route_anchor = """    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };"""

if update_route_anchor in text:
    text = text.replace(update_route_anchor, trigger_route + "\n\n    return { success: true };")

# Inject into updatePoi if not already present
update_poi_anchor = """    revalidatePath('/admin');
    return { success: true };"""

if update_poi_anchor in text:
    text = text.replace(update_poi_anchor, trigger_poi + "\n\n    return { success: true };")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Actions updated!")
