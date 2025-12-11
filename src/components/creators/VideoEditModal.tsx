import { useState, useEffect } from 'react';
import { X, Check, Loader2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { CreatorVideo } from '@/hooks/useCreatorVideos';

interface Topic {
  id: number;
  name: string;
}

interface VideoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  video: CreatorVideo;
  lang: 'hu' | 'en';
}

const texts = {
  title: {
    hu: 'Tartalom szerkesztése',
    en: 'Edit content',
  },
  topics: {
    hu: 'Témakörök (max 5)',
    en: 'Topics (max 5)',
  },
  status: {
    hu: 'Státusz',
    en: 'Status',
  },
  active: {
    hu: 'Aktív',
    en: 'Active',
  },
  inactive: {
    hu: 'Inaktív',
    en: 'Inactive',
  },
  activate: {
    hu: 'Aktiválás',
    en: 'Activate',
  },
  deactivate: {
    hu: 'Inaktiválás',
    en: 'Deactivate',
  },
  save: {
    hu: 'Mentés',
    en: 'Save',
  },
  cancel: {
    hu: 'Mégse',
    en: 'Cancel',
  },
  success: {
    hu: 'Változások mentve!',
    en: 'Changes saved!',
  },
  error: {
    hu: 'Hiba történt a mentés során.',
    en: 'Error saving changes.',
  },
  daysRemaining: {
    hu: 'Hátralévő napok',
    en: 'Days remaining',
  },
  expired: {
    hu: 'Lejárt',
    en: 'Expired',
  },
  maxTopics: {
    hu: 'Maximum 5 témát választhatsz',
    en: 'You can select up to 5 topics',
  },
  minTopics: {
    hu: 'Legalább 1 témát válassz ki!',
    en: 'Select at least 1 topic!',
  },
};

const VideoEditModal = ({ isOpen, onClose, onSuccess, video, lang }: VideoEditModalProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(video.is_active);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch topics and current video topics on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      
      // Fetch all topics
      const { data: allTopics } = await supabase
        .from('topics')
        .select('id, name')
        .order('name');
      
      if (allTopics) {
        setTopics(allTopics);
      }

      // Fetch current video topics
      const { data: videoTopics } = await supabase
        .from('creator_video_topics')
        .select('topic_id')
        .eq('creator_video_id', video.id);
      
      if (videoTopics) {
        setSelectedTopicIds(videoTopics.map(vt => vt.topic_id));
      }
      
      setIsFetching(false);
    };

    if (isOpen) {
      fetchData();
      setIsActive(video.is_active);
    }
  }, [isOpen, video.id, video.is_active]);

  if (!isOpen) return null;

  const isExpired = video.days_remaining <= 0 || video.status === 'expired';

  const handleTopicToggle = (topicId: number) => {
    setSelectedTopicIds(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        if (prev.length >= 5) {
          toast.error(texts.maxTopics[lang]);
          return prev;
        }
        return [...prev, topicId];
      }
    });
  };

  const handleSave = async () => {
    if (selectedTopicIds.length === 0) {
      toast.error(texts.minTopics[lang]);
      return;
    }

    setIsLoading(true);

    try {
      // Update topics - delete old and insert new
      await supabase
        .from('creator_video_topics')
        .delete()
        .eq('creator_video_id', video.id);

      const topicInserts = selectedTopicIds.map(topicId => ({
        creator_video_id: video.id,
        topic_id: topicId,
      }));

      await supabase
        .from('creator_video_topics')
        .insert(topicInserts);

      // Update active status if changed and not expired
      if (!isExpired && isActive !== video.is_active) {
        await supabase
          .from('creator_videos')
          .update({ 
            is_active: isActive,
            status: isActive ? 'active' : 'inactive'
          })
          .eq('id', video.id);
      }

      toast.success(texts.success[lang]);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving video changes:', err);
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
            <h2 className="text-xl font-bold text-white mb-2">
              {texts.title[lang]}
            </h2>
            
            {/* Days remaining badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
              isExpired 
                ? 'bg-red-500/20 text-red-400' 
                : video.days_remaining <= 7 
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
            }`}>
              <span className="text-sm font-medium">
                {isExpired 
                  ? texts.expired[lang]
                  : `${video.days_remaining} ${texts.daysRemaining[lang]}`
                }
              </span>
            </div>
          </div>

          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
            </div>
          ) : (
            <>
              {/* Status Toggle - Only show if not expired */}
              {!isExpired && (
                <div className="mb-6">
                  <p className="text-white/80 text-sm font-medium mb-3">
                    {texts.status[lang]}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsActive(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-green-500 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      {texts.active[lang]}
                    </button>
                    <button
                      onClick={() => setIsActive(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                        !isActive
                          ? 'bg-red-500 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      <PowerOff className="w-4 h-4" />
                      {texts.inactive[lang]}
                    </button>
                  </div>
                </div>
              )}

              {/* Topic Selector */}
              <div className="mb-6">
                <p className="text-white/80 text-sm font-medium mb-3">
                  {texts.topics[lang]} ({selectedTopicIds.length}/5)
                </p>
                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                  {topics.map((topic) => {
                    const isSelected = selectedTopicIds.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        onClick={() => handleTopicToggle(topic.id)}
                        disabled={isLoading}
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
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              {texts.cancel[lang]}
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || isFetching || selectedTopicIds.length === 0}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                texts.save[lang]
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditModal;
