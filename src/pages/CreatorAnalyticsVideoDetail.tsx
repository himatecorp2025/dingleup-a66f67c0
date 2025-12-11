import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Film, Eye, Trophy, ExternalLink, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/useI18n';
import { useCreatorAnalyticsVideo } from '@/hooks/useCreatorAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

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

const StatBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
    <div className="flex items-center gap-2 mb-2">
      <div className={`p-1.5 rounded ${color}`}>{icon}</div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
    <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
  </div>
);

const CreatorAnalyticsVideoDetail: React.FC = () => {
  const navigate = useNavigate();
  const { videoId } = useParams<{ videoId: string }>();
  const { lang } = useI18n();
  const [days, setDays] = useState(14);

  const { data, isLoading, error } = useCreatorAnalyticsVideo(videoId || '', days);
  const video = data?.video;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] flex flex-col items-center justify-center text-white">
        <p className="text-slate-400 mb-4">
          {lang === 'hu' ? 'Videó nem található' : 'Video not found'}
        </p>
        <Button onClick={() => navigate('/creator/analytics')}>
          {lang === 'hu' ? 'Vissza' : 'Go Back'}
        </Button>
      </div>
    );
  }

  const isExpired = video.expires_at && new Date(video.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] via-[#16213e] to-[#0f0f3d] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/creator/analytics')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {lang === 'hu' ? 'Videó részletei' : 'Video Details'}
            </h1>
          </div>
        </div>

        {/* Video Preview */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl p-4 sm:p-6 border border-slate-700/50 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-40 h-40 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PlatformIcon platform={video.platform} className="w-12 h-12 text-slate-500" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <PlatformIcon platform={video.platform} className="w-5 h-5 text-slate-300" />
                <span className="text-slate-300 capitalize">{video.platform}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isExpired 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}>
                  {isExpired ? (lang === 'hu' ? 'Lejárt' : 'Expired') : (lang === 'hu' ? 'Aktív' : 'Active')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {lang === 'hu' ? 'Aktiválva: ' : 'Activated: '}
                    {video.activated_at ? format(new Date(video.activated_at), 'yyyy.MM.dd') : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {lang === 'hu' ? 'Lejár: ' : 'Expires: '}
                    {video.expires_at ? format(new Date(video.expires_at), 'yyyy.MM.dd') : '-'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {video.topics?.map((topic: any) => (
                  <span key={topic.id} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                    {topic.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatBox
            icon={<Film className="w-4 h-4 text-purple-400" />}
            label={lang === 'hu' ? 'Megjelenések' : 'Impressions'}
            value={video.stats.impressions}
            color="bg-purple-500/20"
          />
          <StatBox
            icon={<Eye className="w-4 h-4 text-blue-400" />}
            label={lang === 'hu' ? 'Megtekintések' : 'Completions'}
            value={video.stats.completions}
            color="bg-blue-500/20"
          />
          <StatBox
            icon={<Trophy className="w-4 h-4 text-yellow-400" />}
            label={lang === 'hu' ? 'Releváns' : 'Relevant'}
            value={video.stats.relevant_hits}
            color="bg-yellow-500/20"
          />
          <StatBox
            icon={<ExternalLink className="w-4 h-4 text-green-400" />}
            label={lang === 'hu' ? 'Átkattintás' : 'Clicks'}
            value={video.stats.clickthrough}
            color="bg-green-500/20"
          />
        </div>

        {/* Daily Chart */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl p-4 sm:p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {lang === 'hu' ? 'Napi bontás' : 'Daily Breakdown'}
            </h2>
            <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <TabsList className="bg-slate-800/50 border border-slate-700/50">
                <TabsTrigger value="7" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  7 {lang === 'hu' ? 'nap' : 'days'}
                </TabsTrigger>
                <TabsTrigger value="14" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  14 {lang === 'hu' ? 'nap' : 'days'}
                </TabsTrigger>
                <TabsTrigger value="30" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  30 {lang === 'hu' ? 'nap' : 'days'}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={video.stats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
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
        </div>
      </div>
    </div>
  );
};

export default CreatorAnalyticsVideoDetail;
