import { useState, useEffect, useMemo } from 'react';
import { X, Link, AlertCircle, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Platform icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface Topic {
  id: number;
  name: string;
}

interface VideoLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (videoUrl: string) => void;
  lang: 'hu' | 'en';
  remainingActivations: number;
}

type DetectedPlatform = 'tiktok' | 'youtube' | 'instagram' | 'facebook' | null;

const texts = {
  title: {
    hu: 'Videó hozzáadása',
    en: 'Add video',
  },
  subtitle: {
    hu: 'Illeszd be a videód linkjét',
    en: 'Paste your video link',
  },
  placeholder: {
    hu: 'https://www.tiktok.com/@felhasznalo/video/...',
    en: 'https://www.tiktok.com/@username/video/...',
  },
  submit: {
    hu: 'Videó hozzáadása',
    en: 'Add video',
  },
  cancel: {
    hu: 'Mégse',
    en: 'Cancel',
  },
  invalidUrl: {
    hu: 'Érvénytelen link. Támogatott: TikTok, YouTube Shorts, Instagram Reels, Facebook Reels',
    en: 'Invalid link. Supported: TikTok, YouTube Shorts, Instagram Reels, Facebook Reels',
  },
  limitReached: {
    hu: 'Elérted a napi 3 új videós limitet. Holnap újra aktiválhatsz videókat.',
    en: 'You reached the daily limit of 3 new videos. You can activate more tomorrow.',
  },
  activatedCount: {
    hu: '',
    en: '',
  },
  videos: {
    hu: '',
    en: 'more videos today',
  },
  supportedPlatforms: {
    hu: 'Támogatott: TikTok, YouTube Shorts, Instagram Reels, Facebook Reels',
    en: 'Supported: TikTok, YouTube Shorts, Instagram Reels, Facebook Reels',
  },
  processing: {
    hu: 'Feldolgozás...',
    en: 'Processing...',
  },
  success: {
    hu: 'Videó sikeresen hozzáadva!',
    en: 'Video added successfully!',
  },
  error: {
    hu: 'Hiba történt. Kérlek próbáld újra!',
    en: 'An error occurred. Please try again!',
  },
  alreadyExists: {
    hu: 'Ezt a videót már korábban hozzáadtad.',
    en: 'You already added this video before.',
  },
  noSubscription: {
    hu: 'Nincs aktív Creator előfizetésed.',
    en: 'You don\'t have an active Creator subscription.',
  },
  selectTopics: {
    hu: 'Válassz témákat (max 5)',
    en: 'Select topics (max 5)',
  },
  topicsRequired: {
    hu: 'Legalább 1 témát válassz ki!',
    en: 'Select at least 1 topic!',
  },
  maxTopicsReached: {
    hu: 'Maximum 5 témát választhatsz',
    en: 'You can select up to 5 topics',
  },
  detected: {
    hu: 'Felismert platform:',
    en: 'Detected platform:',
  },
  platformNames: {
    tiktok: 'TikTok',
    youtube: 'YouTube Shorts',
    instagram: 'Instagram Reels',
    facebook: 'Facebook Reels',
  },
};

// Detect platform from URL
const detectPlatform = (url: string): DetectedPlatform => {
  if (!url.trim()) return null;
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok.com')) {
    return 'tiktok';
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('instagram.com')) {
    return 'instagram';
  }
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
    return 'facebook';
  }
  
  return null;
};

// Validate URL pattern for supported platforms
const validateVideoUrl = (url: string): boolean => {
  const patterns = [
    /tiktok\.com/i,
    /vm\.tiktok\.com/i,
    /youtube\.com\/shorts/i,
    /youtu\.be/i,
    /youtube\.com\/watch/i,
    /instagram\.com\/reel/i,
    /instagram\.com\/p\//i,
    /facebook\.com\/reel/i,
    /facebook\.com\/watch/i,
    /fb\.watch/i,
  ];
  return patterns.some(pattern => pattern.test(url));
};

// Get platform icon component
const getPlatformIcon = (platform: DetectedPlatform) => {
  switch (platform) {
    case 'tiktok':
      return <TikTokIcon className="w-5 h-5" />;
    case 'youtube':
      return <YouTubeIcon className="w-5 h-5" />;
    case 'instagram':
      return <InstagramIcon className="w-5 h-5" />;
    case 'facebook':
      return <FacebookIcon className="w-5 h-5" />;
    default:
      return null;
  }
};

// Get platform color
const getPlatformColor = (platform: DetectedPlatform): string => {
  switch (platform) {
    case 'tiktok':
      return 'from-[#00f2ea] to-[#ff0050]';
    case 'youtube':
      return 'from-[#ff0000] to-[#cc0000]';
    case 'instagram':
      return 'from-[#f09433] via-[#e6683c] to-[#bc1888]';
    case 'facebook':
      return 'from-[#1877f2] to-[#0d5ac1]';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const VideoLinkModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  lang, 
  remainingActivations 
}: VideoLinkModalProps) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);

  // Detect platform in real-time
  const detectedPlatform = useMemo(() => detectPlatform(videoUrl), [videoUrl]);

  // Fetch topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setTopics(data);
      }
    };
    
    if (isOpen) {
      fetchTopics();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVideoUrl('');
      setSelectedTopicIds([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canAddMore = remainingActivations > 0;

  const handleTopicToggle = (topicId: number) => {
    setSelectedTopicIds(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        if (prev.length >= 5) {
          toast.error(texts.maxTopicsReached[lang]);
          return prev;
        }
        return [...prev, topicId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!videoUrl.trim()) return;

    if (!validateVideoUrl(videoUrl)) {
      toast.error(texts.invalidUrl[lang]);
      return;
    }

    if (selectedTopicIds.length === 0) {
      toast.error(texts.topicsRequired[lang]);
      return;
    }

    if (!canAddMore) {
      toast.error(texts.limitReached[lang]);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-creator-video', {
        body: {
          video_url: videoUrl.trim(),
          activate_now: true,
          topic_ids: selectedTopicIds,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(texts.success[lang]);
        onSuccess(videoUrl);
        setVideoUrl('');
        setSelectedTopicIds([]);
        onClose();
      } else {
        const errorCode = data?.error;
        if (errorCode === 'VIDEO_ALREADY_EXISTS') {
          toast.error(texts.alreadyExists[lang]);
        } else if (errorCode === 'DAILY_LIMIT_REACHED') {
          toast.error(texts.limitReached[lang]);
        } else if (errorCode === 'NO_ACTIVE_SUBSCRIPTION') {
          toast.error(texts.noSubscription[lang]);
        } else if (errorCode === 'UNSUPPORTED_PLATFORM') {
          toast.error(texts.invalidUrl[lang]);
        } else {
          throw new Error(errorCode || 'Unknown error');
        }
      }
    } catch (err) {
      console.error('Error adding video:', err);
      toast.error(texts.error[lang]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-[90vw] max-w-md max-h-[85vh] bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] rounded-2xl overflow-hidden border border-white/10 flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
              <Link className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {texts.title[lang]}
            </h2>
            <p className="text-white/70 text-sm">
              {texts.subtitle[lang]} <span className="text-white font-medium">({3 - remainingActivations + 1}/3)</span>
            </p>
          </div>

          {/* Limit reached warning - only when no activations left */}
          {!canAddMore && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">
                {texts.limitReached[lang]}
              </p>
            </div>
          )}

          {/* Input with clear button */}
          <div className="relative">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={texts.placeholder[lang]}
              disabled={!canAddMore || isLoading}
              className="w-full px-4 py-3 pr-10 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
            />
            {videoUrl && !isLoading && (
              <button
                type="button"
                onClick={() => setVideoUrl('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>

          {/* Detected Platform Badge */}
          {detectedPlatform && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-white/60 text-xs">{texts.detected[lang]}</span>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getPlatformColor(detectedPlatform)} text-white text-sm font-medium`}>
                {getPlatformIcon(detectedPlatform)}
                <span>{texts.platformNames[detectedPlatform]}</span>
              </div>
            </div>
          )}

          {/* Supported platforms note - only show if no platform detected */}
          {!detectedPlatform && (
            <p className="mt-3 text-white/40 text-xs text-center">
              {texts.supportedPlatforms[lang]}
            </p>
          )}

          {/* Topic Selector */}
          <div className="mt-5">
            <p className="text-white/80 text-sm font-medium mb-3">
              {texts.selectTopics[lang]} ({selectedTopicIds.length}/5)
            </p>
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1">
              {topics.map((topic) => {
                const isSelected = selectedTopicIds.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicToggle(topic.id)}
                    disabled={!canAddMore || isLoading}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    } disabled:opacity-50`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {topic.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              {texts.cancel[lang]}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!videoUrl.trim() || selectedTopicIds.length === 0 || !canAddMore || isLoading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {texts.processing[lang]}
                </>
              ) : (
                texts.submit[lang]
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLinkModal;
