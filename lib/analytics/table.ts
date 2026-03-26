/** Table Supabase pour les vues (voir sql/analytics_page_views.sql). */
export const ANALYTICS_PAGE_VIEWS_TABLE =
  process.env.SUPABASE_ANALYTICS_TABLE?.trim() || "analytics_page_views";
