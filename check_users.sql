SELECT u.id, u.email, p.username, p.xp, p.level FROM auth.users u JOIN public.profiles p ON u.id = p.id;
