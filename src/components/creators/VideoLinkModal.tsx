import { useState } from 'react';
import { X, Link, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VideoLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (videoUrl: string) => void;
  lang: 'hu' | 'en';
  maxVideos: number;
  currentVideoCount: number;
}

const texts = {
  title: {
    hu: 'TikTok videó hozzáadása',
    en: 'Add TikTok video',
  },
  subtitle: {
    hu: 'Illeszd be a TikTok videód linkjét',
    en: 'Paste your TikTok video link',
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
    hu: 'Érvénytelen TikTok link. Kérlek ellenőrizd!',
    en: 'Invalid TikTok link. Please check!',
  },
  limitReached: {
    hu: 'Elérted a maximális videók számát. Frissítsd a csomagodat több videóért!',
    en: 'You reached the maximum number of videos. Upgrade your package for more!',
  },
  videosRemaining: {
    hu: 'Még hozzáadhatsz',
    en: 'You can add',
  },
  videos: {
    hu: 'videót',
    en: 'more videos',
  },
  comingSoon: {
    hu: 'Hamarosan: YouTube, Instagram, Facebook',
    en: 'Coming soon: YouTube, Instagram, Facebook',
  },
};

const VideoLinkModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  lang, 
  maxVideos, 
  currentVideoCount 
}: VideoLinkModalProps) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const remainingVideos = maxVideos - currentVideoCount;
  const canAddMore = remainingVideos > 0;

  const validateTikTokUrl = (url: string): boolean => {
    const tiktokPattern = /^https?:\/\/(www\.|vm\.)?tiktok\.com\/.+/i;
    return tiktokPattern.test(url);
  };

  const handleSubmit = async () => {
    if (!videoUrl.trim()) return;

    if (!validateTikTokUrl(videoUrl)) {
      toast.error(texts.invalidUrl[lang]);
      return;
    }

    if (!canAddMore) {
      toast.error(texts.limitReached[lang]);
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Save video to database
      // For now, just show success
      toast.success(
        lang === 'hu'
          ? 'Videó sikeresen hozzáadva!'
          : 'Video added successfully!'
      );
      onSuccess(videoUrl);
      setVideoUrl('');
      onClose();
    } catch (err) {
      console.error('Error adding video:', err);
      toast.error(
        lang === 'hu'
          ? 'Hiba történt. Kérlek próbáld újra!'
          : 'An error occurred. Please try again!'
      );
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
      <div className="relative w-[90vw] max-w-md bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] rounded-2xl overflow-hidden border border-white/10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-6">
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

          {/* Remaining videos indicator */}
          {canAddMore ? (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 text-sm text-center">
                {texts.videosRemaining[lang]} <span className="font-bold">{remainingVideos}</span> {texts.videos[lang]}
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

          {/* Coming soon note */}
          <p className="mt-3 text-white/40 text-xs text-center">
            {texts.comingSoon[lang]}
          </p>

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
              disabled={!videoUrl.trim() || !canAddMore || isLoading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : texts.submit[lang]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLinkModal;
