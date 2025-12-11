import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Eye, Trophy, ExternalLink, BarChart3, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/useI18n';
import {
  useCreatorAnalyticsOverview,
  useCreatorAnalyticsVideos,
  useCreatorAnalyticsWeekly,
  useCreatorAnalyticsHeatmap,
} from '@/hooks/useCreatorAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PLATFORMS = ['all', 'tiktok', 'instagram', 'youtube', 'facebook'];
const STATUS_FILTERS = ['all', 'active', 'expired'];
const SORT_OPTIONS = ['relevant_hits', 'impressions', 'completions', 'clickthrough', 'activated_at'];

const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = 'w-5 h-5' }) => {
  const iconMap: Record<string, React.ReactNode> = {
    tiktok: (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  };
  return <>{iconMap[platform.toLowerCase()] || null}</>;
};

const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext: string;
  color: string;
}> = ({ icon, label, value, subtext, color }) => (
  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 sm:p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <span className="text-sm text-slate-400 font-medium">{label}</span>
    </div>
    <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
      <AnimatedNumber value={value} />
    </div>
    <p className="text-xs text-slate-500">{subtext}</p>
  </div>
);

const VideoCard: React.FC<{
  video: any;
  onClick: () => void;
  lang: string;
}> = ({ video, onClick, lang }) => {
  const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
    expiring_soon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  const statusLabels = {
    active: lang === 'hu' ? 'Aktív' : 'Active',
    expired: lang === 'hu' ? 'Lejárt' : 'Expired',
    expiring_soon: lang === 'hu' ? 'Hamarosan lejár' : 'Expiring Soon',
  };

  return (
    <div
      onClick={onClick}
      className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/40 transition-all cursor-pointer group"
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PlatformIcon platform={video.platform} className="w-8 h-8 text-slate-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <PlatformIcon platform={video.platform} className="w-4 h-4 text-slate-400" />
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[video.status_badge as keyof typeof statusColors]}`}>
              {statusLabels[video.status_badge as keyof typeof statusLabels]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500">{lang === 'hu' ? 'Megjelenések' : 'Impressions'}</span>
              <p className="text-white font-semibold">{video.impressions.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500">{lang === 'hu' ? 'Megtekintések' : 'Completions'}</span>
              <p className="text-white font-semibold">{video.completions.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {video.topics?.slice(0, 3).map((topic: any) => (
          <span key={topic.id} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
            {topic.name}
          </span>
        ))}
        {video.topics?.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
            +{video.topics.length - 3}
          </span>
        )}
      </div>
    </div>
  );
};

const Heatmap: React.FC<{ data: number[][]; lang: string }> = ({ data, lang }) => {
  const days = lang === 'hu' 
    ? ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const maxValue = Math.max(...data.flat());

  const getColor = (value: number) => {
    if (value === 0) return 'bg-slate-800';
    const intensity = value / maxValue;
    if (intensity > 0.75) return 'bg-cyan-400';
    if (intensity > 0.5) return 'bg-cyan-500';
    if (intensity > 0.25) return 'bg-cyan-600';
    return 'bg-cyan-700';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex gap-1 mb-1 pl-12">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="w-4 text-[10px] text-slate-500 text-center">
              {i}
            </div>
          ))}
        </div>
        {data.map((row, dayIndex) => (
          <div key={dayIndex} className="flex items-center gap-1 mb-1">
            <span className="w-10 text-xs text-slate-400 text-right pr-2">{days[dayIndex]}</span>
            {row.map((value, hourIndex) => (
              <div
                key={hourIndex}
                className={`w-4 h-4 rounded-sm ${getColor(value)} transition-colors`}
                title={`${days[dayIndex]} ${hourIndex}:00 - ${value} ${lang === 'hu' ? 'elérés' : 'views'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const CreatorAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const [platform, setPlatform] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('relevant_hits');

  const { data: overview, isLoading: overviewLoading } = useCreatorAnalyticsOverview(platform);
  const { data: videosData, isLoading: videosLoading } = useCreatorAnalyticsVideos(platform, statusFilter, search, sortBy);
  const { data: weeklyData, isLoading: weeklyLoading } = useCreatorAnalyticsWeekly(platform);
  const { data: heatmapData, isLoading: heatmapLoading } = useCreatorAnalyticsHeatmap(platform);

  const hasData = overview && (overview.impressions_total > 0 || videosData?.videos?.length);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/creators')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              {lang === 'hu' ? 'Analitika' : 'Analytics'}
            </h1>
            <p className="text-sm text-slate-400">
              {lang === 'hu' ? 'Videóid teljesítménye' : 'Your video performance'}
            </p>
          </div>
        </div>

        {/* Platform Tabs */}
        <Tabs value={platform} onValueChange={setPlatform} className="mb-6">
          <TabsList className="bg-slate-800/50 border border-slate-700/50">
            {PLATFORMS.map((p) => (
              <TabsTrigger
                key={p}
                value={p}
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                {p === 'all' ? (lang === 'hu' ? 'Összes' : 'All') : (
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform={p} className="w-4 h-4" />
                    <span className="capitalize hidden sm:inline">{p}</span>
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!hasData && !overviewLoading ? (
          <div className="text-center py-20">
            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-400 mb-2">
              {lang === 'hu' ? 'Még nincs elegendő adat' : 'Not enough data yet'}
            </h2>
            <p className="text-slate-500">
              {lang === 'hu'
                ? 'A videóid statisztikái itt fognak megjelenni.'
                : 'Your video statistics will appear here.'}
            </p>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Film className="w-5 h-5 text-purple-400" />}
                label={lang === 'hu' ? 'Megjelenések' : 'Impressions'}
                value={overview?.impressions_total || 0}
                subtext={lang === 'hu' ? 'Összes alkalommal, amikor a videóid megjelentek.' : 'Total times your videos were shown.'}
                color="bg-purple-500/20"
              />
              <StatCard
                icon={<Eye className="w-5 h-5 text-blue-400" />}
                label={lang === 'hu' ? 'Megtekintések (15mp)' : 'Completions (15s)'}
                value={overview?.completions_total || 0}
                subtext={lang === 'hu' ? 'Teljes hosszban megnézett videók.' : 'Videos watched to completion.'}
                color="bg-blue-500/20"
              />
              <StatCard
                icon={<Trophy className="w-5 h-5 text-yellow-400" />}
                label={lang === 'hu' ? 'Releváns elérés' : 'Relevant Reach'}
                value={overview?.relevant_hits_total || 0}
                subtext={lang === 'hu' ? 'Célközönséghez tartozó megtekintések.' : 'Views from target audience.'}
                color="bg-yellow-500/20"
              />
              <StatCard
                icon={<ExternalLink className="w-5 h-5 text-green-400" />}
                label={lang === 'hu' ? 'Átkattintások' : 'Click-throughs'}
                value={overview?.clickthrough_total || 0}
                subtext={lang === 'hu' ? 'Csatornádra kattintások.' : 'Clicks to your channel.'}
                color="bg-green-500/20"
              />
            </div>

            {/* Weekly Chart */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl p-4 sm:p-6 border border-slate-700/50 mb-8">
              <h2 className="text-lg font-semibold mb-4">
                {lang === 'hu' ? 'Heti aktivitás' : 'Weekly Activity'}
              </h2>
              {weeklyLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyData?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="impressions" name={lang === 'hu' ? 'Megjelenések' : 'Impressions'} stroke="#a855f7" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completions" name={lang === 'hu' ? 'Megtekintések' : 'Completions'} stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="relevant_hits" name={lang === 'hu' ? 'Releváns' : 'Relevant'} stroke="#eab308" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Heatmap */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl p-4 sm:p-6 border border-slate-700/50 mb-8">
              <h2 className="text-lg font-semibold mb-4">
                {lang === 'hu' ? 'Mikor aktív a közönséged?' : 'When Is Your Audience Active?'}
              </h2>
              {heatmapLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <Heatmap data={heatmapData?.heatmap || Array(7).fill(Array(24).fill(0))} lang={lang} />
              )}
            </div>

            {/* Videos Section */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl p-4 sm:p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold mb-4">
                {lang === 'hu' ? 'Videóim analitikája' : 'My Videos Analytics'}
              </h2>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder={lang === 'hu' ? 'Keresés...' : 'Search...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
                >
                  <option value="all">{lang === 'hu' ? 'Minden státusz' : 'All Status'}</option>
                  <option value="active">{lang === 'hu' ? 'Aktív' : 'Active'}</option>
                  <option value="expired">{lang === 'hu' ? 'Lejárt' : 'Expired'}</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
                >
                  <option value="relevant_hits">{lang === 'hu' ? 'Releváns elérés' : 'Relevant Reach'}</option>
                  <option value="impressions">{lang === 'hu' ? 'Megjelenések' : 'Impressions'}</option>
                  <option value="completions">{lang === 'hu' ? 'Megtekintések' : 'Completions'}</option>
                  <option value="clickthrough">{lang === 'hu' ? 'Átkattintások' : 'Click-throughs'}</option>
                  <option value="activated_at">{lang === 'hu' ? 'Aktiválás dátuma' : 'Activation Date'}</option>
                </select>
              </div>

              {/* Video Grid */}
              {videosLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                </div>
              ) : videosData?.videos?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videosData.videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onClick={() => navigate(`/creator/analytics/video/${video.id}`)}
                      lang={lang}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  {lang === 'hu' ? 'Nincs találat' : 'No videos found'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreatorAnalytics;
