import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreatorStats {
  totalViews: number;      // Összes megtekintés
  relevantReach: number;   // Elérés (relevant viewers - 100+ helyes válasz, téma egyezés)
}

export const useCreatorStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['creator-stats', userId],
    queryFn: async (): Promise<CreatorStats> => {
      if (!userId) {
        return { totalViews: 0, relevantReach: 0 };
      }

      // Get all video IDs for this creator
      const { data: videos, error: videosError } = await supabase
        .from('creator_videos')
        .select('id')
        .eq('user_id', userId);

      if (videosError || !videos || videos.length === 0) {
        return { totalViews: 0, relevantReach: 0 };
      }

      const videoIds = videos.map(v => v.id);

      // Get all impressions for these videos
      const { data: impressions, error: impressionsError } = await supabase
        .from('creator_video_impressions')
        .select('id, is_relevant_viewer')
        .in('creator_video_id', videoIds);

      if (impressionsError || !impressions) {
        return { totalViews: 0, relevantReach: 0 };
      }

      // Calculate stats
      const totalViews = impressions.length;
      const relevantReach = impressions.filter(i => i.is_relevant_viewer).length;

      return { totalViews, relevantReach };
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};
