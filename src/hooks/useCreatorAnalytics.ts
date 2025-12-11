import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformBreakdown {
  impressions: number;
  completions: number;
  relevant_hits: number;
  clickthrough: number;
}

interface AnalyticsOverview {
  impressions_total: number;
  completions_total: number;
  relevant_hits_total: number;
  clickthrough_total: number;
  platform_breakdown: Record<string, PlatformBreakdown>;
}

interface AnalyticsVideo {
  id: string;
  platform: string;
  video_url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  first_activated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  impressions: number;
  completions: number;
  relevant_hits: number;
  clickthrough: number;
  topics: Array<{ id: number; name: string }>;
  status_badge: 'active' | 'expired' | 'expiring_soon';
}

interface DailyStats {
  date: string;
  impressions: number;
  completions: number;
  relevant_hits: number;
}

interface VideoDetails {
  id: string;
  platform: string;
  video_url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  activated_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  topics: Array<{ id: number; name: string }>;
  stats: {
    impressions: number;
    completions: number;
    relevant_hits: number;
    clickthrough: number;
    daily: Array<{
      date: string;
      impressions: number;
      completions: number;
      relevant_hits: number;
      clickthrough: number;
    }>;
  };
}

export const useCreatorAnalyticsOverview = (platform?: string) => {
  return useQuery({
    queryKey: ['creator-analytics-overview', platform],
    queryFn: async (): Promise<AnalyticsOverview> => {
      const { data, error } = await supabase.functions.invoke('get-creator-analytics-overview', {
        body: { platform },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useCreatorAnalyticsVideos = (
  platform?: string,
  status?: string,
  search?: string,
  sortBy?: string
) => {
  return useQuery({
    queryKey: ['creator-analytics-videos', platform, status, search, sortBy],
    queryFn: async (): Promise<{ videos: AnalyticsVideo[] }> => {
      const params = new URLSearchParams();
      if (platform && platform !== 'all') params.set('platform', platform);
      if (status && status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      if (sortBy) params.set('sortBy', sortBy);

      const { data, error } = await supabase.functions.invoke('get-creator-analytics-videos', {
        body: { platform, status, search, sortBy },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useCreatorAnalyticsWeekly = (platform?: string, days: number = 14) => {
  return useQuery({
    queryKey: ['creator-analytics-weekly', platform, days],
    queryFn: async (): Promise<{ daily: DailyStats[] }> => {
      const { data, error } = await supabase.functions.invoke('get-creator-analytics-weekly', {
        body: { platform, days },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useCreatorAnalyticsHeatmap = (platform?: string) => {
  return useQuery({
    queryKey: ['creator-analytics-heatmap', platform],
    queryFn: async (): Promise<{ heatmap: number[][] }> => {
      const { data, error } = await supabase.functions.invoke('get-creator-analytics-heatmap', {
        body: { platform },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useCreatorAnalyticsVideo = (videoId: string, days: number = 14) => {
  return useQuery({
    queryKey: ['creator-analytics-video', videoId, days],
    queryFn: async (): Promise<{ video: VideoDetails }> => {
      const { data, error } = await supabase.functions.invoke('get-creator-analytics-video', {
        body: { videoId, days },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};
