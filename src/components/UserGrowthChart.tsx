import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useI18n } from '@/i18n';

interface ChartDataPoint {
  date: string;
  users: number;
}

export const UserGrowthChart = () => {
  const { t } = useI18n();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
    
    // Refresh every 15 seconds for faster updates
    const interval = setInterval(fetchChartData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchChartData = async () => {
    try {
      // Fetch user registrations by day (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch total user count so the chart always matches the valós összes felhasználó értéket
      const { count: totalUsersCount, error: totalUsersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (totalUsersError) throw totalUsersError;

      const totalUsers = totalUsersCount ?? 0;
      const recentUsersCount = profiles?.length ?? 0;
      const baselineUsers = Math.max(0, totalUsers - recentUsersCount);

      // Group by date
      const dataMap = new Map<string, { users: number }>();

      // Initialize last 30 nap and start from users who already léteztek a periódus előtt
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dataMap.set(dateStr, { users: baselineUsers });
      }

      // Count cumulative users (always cumulative from teljes user bázis)
      let cumulativeUsers = baselineUsers;
      profiles?.forEach((profile) => {
        const date = new Date(profile.created_at).toISOString().split('T')[0];
        cumulativeUsers++;
        
        // Update all dates from this point forward
        for (const [key, value] of dataMap.entries()) {
          if (key >= date) {
            value.users = Math.max(value.users, cumulativeUsers);
          }
        }
      });

      // Convert to chart data
      const chartArray: ChartDataPoint[] = [];
      dataMap.forEach((value, date) => {
        chartArray.push({
          date: new Date(date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }),
          users: value.users,
        });
      });

      setChartData(chartArray);
      setLoading(false);
    } catch (error) {
      console.error('Chart data fetch error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-primary-darker/50 border border-primary/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-primary-glow" />
          <h3 className="text-lg lg:text-xl font-bold text-foreground">{t('admin.chart.users_spending_trend')}</h3>
        </div>
        <div className="h-64 lg:h-80 flex items-center justify-center">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-darker/50 border border-primary/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4 lg:mb-6">
        <TrendingUp className="w-6 h-6 lg:w-7 lg:h-7 text-primary-glow" />
        <h3 className="text-lg lg:text-xl font-bold text-foreground">{t('admin.chart.users_30days')}</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="hsl(var(--primary-glow))"
            tick={{ fill: 'hsl(var(--primary-glow))', fontSize: 12 }}
            label={{ value: t('admin.chart.users_axis'), angle: -90, position: 'insideLeft', fill: 'hsl(var(--primary-glow))' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          />
          <Legend 
            wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="users" 
            stroke="hsl(var(--primary-glow))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary-glow))', r: 4 }}
            activeDot={{ r: 6 }}
            name={t('admin.chart.all_users_label')}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6">
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <p className="text-primary-glow text-xs font-semibold mb-1">{t('admin.chart.current_users')}</p>
          <p className="text-foreground text-xl font-bold">
            {chartData.length > 0 ? chartData[chartData.length - 1].users : 0}
          </p>
        </div>
      </div>
    </div>
  );
};
