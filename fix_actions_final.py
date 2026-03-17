import os

path = 'lib/actions.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

trigger_route = """    revalidatePath('/admin');
    revalidatePath('/');

    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('route', id).catch(console.error);
    });"""

trigger_poi_create = """    revalidatePath('/admin');

    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('poi', result.id).catch(console.error);
    });"""

trigger_poi_update = """    revalidatePath('/admin');

    // Traducció automàtica silenciosa en segon pla
    import('@/lib/ai-actions').then(({ autoTranslateAction }) => {
      autoTranslateAction('poi', id).catch(console.error);
    });"""

# Replace in createRoute
if "autoTranslateAction('route', id)" not in text:
    create_route_old = """    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, id };"""
    text = text.replace(create_route_old, trigger_route + "\n\n    return { success: true, id };")

# Replace in updateRoute
update_route_old = """    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };"""
# Check count to ensure we only replace where necessary
if text.count(update_route_old) > 0:
    text = text.replace(update_route_old, trigger_route + "\n\n    return { success: true };")

# Replace in createPoi
if "autoTranslateAction('poi', result.id)" not in text:
    create_poi_old = """    revalidatePath('/admin');
    return { success: true, id: result.id };"""
    text = text.replace(create_poi_old, trigger_poi_create + "\n\n    return { success: true, id: result.id };")

# Replace in updatePoi
if "autoTranslateAction('poi', id)" not in text:
    update_poi_old = """    revalidatePath('/admin');
    return { success: true };"""
    text = text.replace(update_poi_old, trigger_poi_update + "\n\n    return { success: true };")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Replacement complete")
