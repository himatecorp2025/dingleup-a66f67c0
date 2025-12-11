import { useState } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CreatorVideo } from '@/hooks/useCreatorVideos';

// Platform Icons
const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'tiktok':
      return <TikTokIcon className="w-4 h-4" />;
    case 'youtube':
      return <YouTubeIcon className="w-4 h-4" />;
    case 'instagram':
      return <InstagramIcon className="w-4 h-4" />;
    case 'facebook':
      return <FacebookIcon className="w-4 h-4" />;
    default:
      return null;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform) {
    case 'tiktok':
      return 'bg-black';
    case 'youtube':
      return 'bg-red-600';
    case 'instagram':
      return 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400';
    case 'facebook':
      return 'bg-blue-600';
    default:
      return 'bg-gray-600';
  }
};

interface CreatorVideoCardProps {
  video: CreatorVideo;
  lang: 'hu' | 'en';
  onReactivate: () => void;
  onEdit?: () => void;
  showReactivateButton?: boolean;
  showDaysRemaining?: boolean;
}

export const CreatorVideoCard = ({ 
  video, 
  lang, 
  onReactivate,
  onEdit,
  showReactivateButton = false,
  showDaysRemaining = false
}: CreatorVideoCardProps) => {
  const [isReactivating, setIsReactivating] = useState(false);

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('reactivate-creator-video', {
        body: { video_id: video.id },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        // Redirect to Stripe checkout for payment
        window.open(data.checkout_url, '_blank');
      } else if (data?.success) {
        toast.success(
          lang === 'hu'
            ? 'Videó sikeresen újraaktiválva!'
            : 'Video successfully reactivated!'
        );
        onReactivate();
      }
    } catch (err: any) {
      console.error('Error reactivating video:', err);
      toast.error(
        lang === 'hu'
          ? 'Hiba történt az újraaktiválás során.'
          : 'Error during reactivation.'
      );
    } finally {
      setIsReactivating(false);
    }
  };

  const isExpired = video.days_remaining <= 0 || video.status === 'expired';
  const isNearExpiry = video.days_remaining > 0 && video.days_remaining <= 7;
  const shouldShowReactivate = showReactivateButton || isExpired || isNearExpiry;

  // Generate thumbnail URL based on platform if none exists
  const getThumbnailUrl = () => {
    if (video.thumbnail_url) return video.thumbnail_url;
    
    const videoUrl = video.video_url;
    
    // YouTube thumbnail extraction
    if (video.platform === 'youtube') {
      // Extract video ID from various YouTube URL formats
      let videoId = null;
      if (videoUrl.includes('/shorts/')) {
        videoId = videoUrl.split('/shorts/')[1]?.split('?')[0];
      } else if (videoUrl.includes('watch?v=')) {
        try {
          videoId = new URL(videoUrl).searchParams.get('v');
        } catch {
          // Invalid URL, skip
        }
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    
    // For other platforms, use a gradient placeholder based on platform
    return null;
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <div 
      className="relative overflow-hidden bg-black group cursor-pointer"
      onClick={onEdit}
    >
      {/* Thumbnail - 9:12.8 aspect ratio (20% shorter than 9:16) */}
      <div className="relative aspect-[9/12.8]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={video.title || 'Video thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          // Platform-based gradient placeholder when no thumbnail
          <div className={`w-full h-full flex items-center justify-center ${getPlatformColor(video.platform)}`}>
            <div className="text-white/80 scale-150">
              {getPlatformIcon(video.platform)}
            </div>
          </div>
        )}
        
        {/* Platform Icon Badge - smaller, no rounded corners */}
        <div className={`absolute top-1 left-1 p-1 ${getPlatformColor(video.platform)}`}>
          {getPlatformIcon(video.platform)}
        </div>

        {/* Expired overlay */}
        {isExpired && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white/80 font-semibold text-xs">
              {lang === 'hu' ? 'Lejárt' : 'Expired'}
            </span>
          </div>
        )}
      </div>

      {/* Days Remaining - Only show when showDaysRemaining is true */}
      {showDaysRemaining && (
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isExpired ? 'text-red-400' : isNearExpiry ? 'text-yellow-400' : 'text-white/60'}`} />
              <span className={`text-lg font-bold ${isExpired ? 'text-red-400' : isNearExpiry ? 'text-yellow-400' : 'text-white'}`}>
                {isExpired ? (lang === 'hu' ? 'Lejárt' : 'Expired') : video.days_remaining}
              </span>
              {!isExpired && (
                <span className="text-xs text-white/50">
                  {lang === 'hu' ? 'nap' : 'days'}
                </span>
              )}
            </div>

            {/* Reactivate Button */}
            {shouldShowReactivate && (
              <button
                onClick={handleReactivate}
                disabled={isReactivating}
                className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isReactivating ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-semibold text-white">
                  {lang === 'hu' ? '290 Ft' : '$0.9'}
                </span>
              </button>
            )}
          </div>

          {/* Video title if available */}
          {video.title && (
            <p className="text-xs text-white/70 mt-2 truncate">{video.title}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatorVideoCard;
