import { useState, useEffect } from 'react';
import { X, Link, AlertCircle, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  videosRemaining: {
    hu: 'Ma még aktiválhatsz',
    en: 'You can activate',
  },
  videos: {
    hu: 'új videót',
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
    hu: 'Válassz témákat (max 3)',
    en: 'Select topics (max 3)',
  },
  topicsRequired: {
    hu: 'Legalább 1 témát válassz ki!',
    en: 'Select at least 1 topic!',
  },
  maxTopicsReached: {
    hu: 'Maximum 3 témát választhatsz',
    en: 'You can select up to 3 topics',
  },
};

// Validate URL pattern for supported platforms
const validateVideoUrl = (url: string): boolean => {
  const patterns = [
    /tiktok\.com/i,
    /vm\.tiktok\.com/i,
    /youtube\.com\/shorts/i,
    /youtu\.be/i,
    /instagram\.com\/reel/i,
    /instagram\.com\/p\//i,
    /facebook\.com\/reel/i,
    /fb\.watch/i,
  ];
  return patterns.some(pattern => pattern.test(url));
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
        if (prev.length >= 3) {
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
              {texts.subtitle[lang]}
            </p>
          </div>

          {/* Remaining activations indicator */}
          {canAddMore ? (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 text-sm text-center">
                {texts.videosRemaining[lang]} <span className="font-bold">{remainingActivations}</span> {texts.videos[lang]}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">
                {texts.limitReached[lang]}
              </p>
            </div>
          )}

          {/* Input */}
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={texts.placeholder[lang]}
            disabled={!canAddMore || isLoading}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
          />

          {/* Supported platforms note */}
          <p className="mt-3 text-white/40 text-xs text-center">
            {texts.supportedPlatforms[lang]}
          </p>

          {/* Topic Selector */}
          <div className="mt-5">
            <p className="text-white/80 text-sm font-medium mb-3">
              {texts.selectTopics[lang]} ({selectedTopicIds.length}/3)
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
