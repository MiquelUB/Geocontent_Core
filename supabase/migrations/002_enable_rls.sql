-- 1. Activació RLS
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pois" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_unlocks" ENABLE ROW LEVEL SECURITY;

-- 2. Polítiques de Lectura (Accessibles per al mode Offline de l'App)
-- Nota: En Prisma, els noms de les taules solen ser en plural o coincidir amb el @map de l'esquema.
-- Segons schema.prisma: Poi -> pois, Route -> routes, User -> users, UserUnlock -> user_unlocks

CREATE POLICY "Lectura lliure de rutes" ON "public"."routes" FOR SELECT USING (true);
CREATE POLICY "Lectura lliure de POIs" ON "public"."pois" FOR SELECT USING (true);
CREATE POLICY "Lectura perfil propi" ON "public"."profiles" FOR SELECT USING (auth.uid() = id);

-- 3. Polítiques d'Escriptura (Bloqueig per a clients no autenticats)
CREATE POLICY "Denegar escriptura anònima a Rutes" ON "public"."routes" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Denegar escriptura anònima a POIs" ON "public"."pois" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Escriptura perfil propi" ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);

-- 4. Polítiques específiques per a Gamificació (user_unlocks)
CREATE POLICY "Usuaris llegeixen els seus propis segells" ON "public"."user_unlocks" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Només autenticats poden crear segells" ON "public"."user_unlocks" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
