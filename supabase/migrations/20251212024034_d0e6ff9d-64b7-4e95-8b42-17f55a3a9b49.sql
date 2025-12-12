
-- =====================================================
-- CTO-LEVEL DB OPTIMIZATION: Unused Index Cleanup
-- Ez NEM változtat semmilyen működésen, csak tárhely/írási teljesítmény optimalizáció
-- =====================================================

-- Drop unused indexes (0 scans) - saves ~4.5 MB and improves write performance
DROP INDEX IF EXISTS idx_question_pools_questions_en;
DROP INDEX IF EXISTS idx_performance_metrics_route_created;
DROP INDEX IF EXISTS idx_performance_metrics_user_created;
DROP INDEX IF EXISTS idx_performance_metrics_page_created;
DROP INDEX IF EXISTS idx_app_session_events_session;
DROP INDEX IF EXISTS idx_navigation_events_session;
DROP INDEX IF EXISTS idx_navigation_user_time;
DROP INDEX IF EXISTS idx_game_question_analytics_session;
DROP INDEX IF EXISTS idx_game_sessions_user_active;
DROP INDEX IF EXISTS idx_game_exit_user_time;
DROP INDEX IF EXISTS idx_app_session_id;
DROP INDEX IF EXISTS idx_game_sessions_user_category;
DROP INDEX IF EXISTS idx_profiles_username_lower_trgm;
DROP INDEX IF EXISTS idx_game_sessions_user_expires;
DROP INDEX IF EXISTS idx_performance_load_time;
DROP INDEX IF EXISTS idx_feature_user_time;
DROP INDEX IF EXISTS idx_bonus_user_time;
DROP INDEX IF EXISTS idx_game_sessions_session_id;
DROP INDEX IF EXISTS idx_game_sessions_session_id_active;
DROP INDEX IF EXISTS idx_game_sessions_expires_completed;
DROP INDEX IF EXISTS idx_performance_device;
DROP INDEX IF EXISTS idx_feature_usage_feature_created;
DROP INDEX IF EXISTS idx_session_events_browser;
DROP INDEX IF EXISTS idx_game_sessions_expires_at;
DROP INDEX IF EXISTS idx_game_results_user_completed_date;
DROP INDEX IF EXISTS idx_game_results_user_completed_created;
DROP INDEX IF EXISTS idx_navigation_route;
DROP INDEX IF EXISTS idx_session_events_device;
DROP INDEX IF EXISTS idx_game_results_user_completed;
DROP INDEX IF EXISTS idx_game_results_correct_answers;
DROP INDEX IF EXISTS idx_game_results_completed_created;
DROP INDEX IF EXISTS idx_data_collection_metadata_feature;
DROP INDEX IF EXISTS idx_conversion_events_type;
DROP INDEX IF EXISTS idx_conversion_events_product;
DROP INDEX IF EXISTS idx_conversion_events_created;
DROP INDEX IF EXISTS idx_user_roles_role;
DROP INDEX IF EXISTS idx_mv_daily_rankings_country_rank;
DROP INDEX IF EXISTS idx_mv_daily_rankings_user_lookup;

-- Analyze tables to update statistics after index removal
ANALYZE public.question_pools;
ANALYZE public.performance_metrics;
ANALYZE public.app_session_events;
ANALYZE public.navigation_events;
ANALYZE public.game_question_analytics;
ANALYZE public.game_sessions;
ANALYZE public.game_exit_events;
ANALYZE public.profiles;
ANALYZE public.feature_usage_events;
ANALYZE public.bonus_claim_events;
ANALYZE public.game_results;
ANALYZE public.data_collection_metadata;
ANALYZE public.conversion_events;
ANALYZE public.user_roles;
