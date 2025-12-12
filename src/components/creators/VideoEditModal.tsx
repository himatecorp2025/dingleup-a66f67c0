import { useState, useEffect } from 'react';
import { X, Check, Loader2, Power, PowerOff, Globe, Plus, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { CreatorVideo } from '@/hooks/useCreatorVideos';
import { COUNTRIES } from '@/data/countries';
import PlatformEmbedFullscreen from '@/components/PlatformEmbedFullscreen';

interface Topic {
  id: number;
  name: string;
}

interface VideoCountry {
  country_code: string;
  is_primary: boolean;
  sort_order: number;
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
  countries: {
    hu: 'Megjelenítési országok',
    en: 'Display countries',
  },
  primaryCountry: {
    hu: 'Elsődleges',
    en: 'Primary',
  },
  addCountry: {
    hu: 'Ország hozzáadása',
    en: 'Add country',
  },
  maxCountries: {
    hu: 'Maximum 5 országot adhatsz hozzá',
    en: 'You can add up to 5 countries',
  },
  selectCountry: {
    hu: 'Válassz országot...',
    en: 'Select country...',
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
  minCountries: {
    hu: 'Legalább 1 országot válassz ki!',
    en: 'Select at least 1 country!',
  },
};

// Country name mapping for display
const COUNTRY_NAMES: Record<string, { hu: string; en: string }> = {
  HU: { hu: 'Magyarország', en: 'Hungary' },
  DE: { hu: 'Németország', en: 'Germany' },
  AT: { hu: 'Ausztria', en: 'Austria' },
  SK: { hu: 'Szlovákia', en: 'Slovakia' },
  RO: { hu: 'Románia', en: 'Romania' },
  US: { hu: 'Egyesült Államok', en: 'United States' },
  GB: { hu: 'Egyesült Királyság', en: 'United Kingdom' },
  FR: { hu: 'Franciaország', en: 'France' },
  IT: { hu: 'Olaszország', en: 'Italy' },
  ES: { hu: 'Spanyolország', en: 'Spain' },
  PL: { hu: 'Lengyelország', en: 'Poland' },
  NL: { hu: 'Hollandia', en: 'Netherlands' },
  BE: { hu: 'Belgium', en: 'Belgium' },
  CH: { hu: 'Svájc', en: 'Switzerland' },
  CZ: { hu: 'Csehország', en: 'Czech Republic' },
  UA: { hu: 'Ukrajna', en: 'Ukraine' },
  RS: { hu: 'Szerbia', en: 'Serbia' },
  HR: { hu: 'Horvátország', en: 'Croatia' },
  SI: { hu: 'Szlovénia', en: 'Slovenia' },
  BA: { hu: 'Bosznia-Hercegovina', en: 'Bosnia and Herzegovina' },
};

const getCountryName = (code: string, lang: 'hu' | 'en'): string => {
  if (COUNTRY_NAMES[code]) {
    return COUNTRY_NAMES[code][lang];
  }
  // Fallback to code if not in our map
  const country = COUNTRIES.find(c => c.code === code);
  return country ? code : code;
};

const VideoEditModal = ({ isOpen, onClose, onSuccess, video, lang }: VideoEditModalProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<VideoCountry[]>([]);
  const [isActive, setIsActive] = useState(video.is_active);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  // Fetch topics, countries and current video data on mount
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

      // Fetch current video countries
      const { data: videoCountries } = await supabase
        .from('creator_video_countries')
        .select('country_code, is_primary, sort_order')
        .eq('creator_video_id', video.id)
        .order('sort_order');
      
      if (videoCountries && videoCountries.length > 0) {
        setSelectedCountries(videoCountries);
      }
      
      setIsFetching(false);
    };

    if (isOpen) {
      fetchData();
      setIsActive(video.is_active);
      setShowCountrySelector(false);
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

  const handleAddCountry = (countryCode: string) => {
    if (selectedCountries.length >= 5) {
      toast.error(texts.maxCountries[lang]);
      return;
    }
    if (selectedCountries.some(c => c.country_code === countryCode)) {
      return; // Already added
    }
    
    const newCountry: VideoCountry = {
      country_code: countryCode,
      is_primary: selectedCountries.length === 0, // First one is primary
      sort_order: selectedCountries.length + 1,
    };
    
    setSelectedCountries(prev => [...prev, newCountry]);
    setShowCountrySelector(false);
  };

  const handleRemoveCountry = (countryCode: string) => {
    setSelectedCountries(prev => {
      const filtered = prev.filter(c => c.country_code !== countryCode);
      // If we removed the primary, make the first one primary
      if (filtered.length > 0 && !filtered.some(c => c.is_primary)) {
        filtered[0].is_primary = true;
      }
      // Reorder sort_order
      return filtered.map((c, idx) => ({ ...c, sort_order: idx + 1 }));
    });
  };

  const handleSetPrimary = (countryCode: string) => {
    setSelectedCountries(prev => 
      prev.map(c => ({
        ...c,
        is_primary: c.country_code === countryCode,
      }))
    );
  };

  const handleSave = async () => {
    if (selectedTopicIds.length === 0) {
      toast.error(texts.minTopics[lang]);
      return;
    }
    if (selectedCountries.length === 0) {
      toast.error(texts.minCountries[lang]);
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

      // Update countries - delete old and insert new
      await supabase
        .from('creator_video_countries')
        .delete()
        .eq('creator_video_id', video.id);

      const countryInserts = selectedCountries.map(c => ({
        creator_video_id: video.id,
        country_code: c.country_code,
        is_primary: c.is_primary,
        sort_order: c.sort_order,
      }));

      await supabase
        .from('creator_video_countries')
        .insert(countryInserts);

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

  // Available countries (not yet selected)
  const availableCountries = COUNTRIES.filter(
    c => !selectedCountries.some(sc => sc.country_code === c.code)
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d]">
      {/* Video Preview Overlay */}
      {showVideoPreview && (
        <div className="fixed inset-0 z-[60] bg-black">
          <PlatformEmbedFullscreen
            platform={video.platform as 'tiktok' | 'youtube' | 'instagram' | 'facebook'}
            originalUrl={video.video_url}
            embedUrl={video.embed_url || undefined}
          />
          <button
            onClick={() => setShowVideoPreview(false)}
            className="fixed top-4 right-4 z-[10001] w-12 h-12 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <X className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div 
        className="flex-1 overflow-y-auto px-6 py-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Video Thumbnail with Play Button */}
        <div className="relative w-full max-w-[200px] mx-auto aspect-[9/16] rounded-xl overflow-hidden mb-6">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title || 'Video thumbnail'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Play className="w-12 h-12 text-white/50" />
            </div>
          )}
          {/* Play Button Overlay */}
          <button
            onClick={() => setShowVideoPreview(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
              <Play className="w-7 h-7 text-white fill-white" />
            </div>
          </button>
        </div>
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

              {/* Country Selector */}
              <div className="mb-6">
                <p className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {texts.countries[lang]} ({selectedCountries.length}/5)
                </p>
                
                {/* Selected countries list */}
                <div className="space-y-2 mb-3">
                  {selectedCountries.map((country, idx) => (
                    <div 
                      key={country.country_code}
                      className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2"
                    >
                      <span className="text-lg">{getFlagEmoji(country.country_code)}</span>
                      <span className="flex-1 text-white text-sm">
                        {getCountryName(country.country_code, lang)}
                      </span>
                      {country.is_primary ? (
                        <span className="text-xs px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-full">
                          {texts.primaryCountry[lang]}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetPrimary(country.country_code)}
                          className="text-xs px-2 py-0.5 bg-white/10 text-white/60 rounded-full hover:bg-white/20"
                        >
                          {texts.primaryCountry[lang]}
                        </button>
                      )}
                      {selectedCountries.length > 1 && (
                        <button
                          onClick={() => handleRemoveCountry(country.country_code)}
                          className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add country button/selector */}
                {selectedCountries.length < 5 && (
                  <>
                    {showCountrySelector ? (
                      <div className="bg-white/10 rounded-lg p-2 max-h-[150px] overflow-y-auto">
                        {availableCountries.slice(0, 50).map(country => (
                          <button
                            key={country.code}
                            onClick={() => handleAddCountry(country.code)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
                          >
                            <span className="text-lg">{getFlagEmoji(country.code)}</span>
                            <span className="text-white text-sm">
                              {getCountryName(country.code, lang)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCountrySelector(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 text-sm transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {texts.addCountry[lang]}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Topic Selector */}
              <div className="mb-6">
                <p className="text-white/80 text-sm font-medium mb-3">
                  {texts.topics[lang]} ({selectedTopicIds.length}/5)
                </p>
                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1">
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
        <div className="flex gap-3 mt-6 px-6 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
          >
            {texts.cancel[lang]}
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isFetching || selectedTopicIds.length === 0 || selectedCountries.length === 0}
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
  );
};

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default VideoEditModal;