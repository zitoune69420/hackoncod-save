-- Autoriser la lecture publique sur la table video (comme game et cheat)
-- À exécuter dans Supabase > SQL Editor

ALTER TABLE video ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON video;
CREATE POLICY "Allow public read" ON video
  FOR SELECT
  USING (true);
