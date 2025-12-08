import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Percent, Filter, Globe, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';
import { COUNTRIES } from '@/data/countries';

interface TopicStatsRow {
  topicId: number;
  topicName: string;
  correctAnswers: number;
  incorrectAnswers: number;
  totalAnswers: number;
  correctPercentage: number;
  countryCode: string | null;
}

type SortField = 'topicName' | 'correctAnswers' | 'incorrectAnswers' | 'correctPercentage';
type SortDirection = 'asc' | 'desc';

const AdminPopularContent = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<TopicStatsRow[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('correctAnswers');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        navigate('/admin/login');
        return;
      }

      fetchPopularityData();
    };

    checkAuth();
  }, [navigate]);

  const fetchPopularityData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired');
        return;
      }
      
      const { data: responseData, error: fetchError } = await supabase.functions.invoke(
        'admin-topic-popularity',
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { country: selectedCountry },
        }
      );

      if (fetchError) throw fetchError;

      setData(responseData.data as TopicStatsRow[]);
      setAvailableCountries(responseData.availableCountries || []);
    } catch (err) {
      console.error('[AdminPopularContent] Error:', err);
      setError(lang === 'hu' ? 'Hiba az adatok betöltésekor' : 'Error loading data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Refetch when country filter changes
  useEffect(() => {
    if (!loading) {
      fetchPopularityData(true);
    }
  }, [selectedCountry]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get country name helper
  const getCountryName = (code: string): string => {
    if (code === 'ALL') return lang === 'hu' ? 'Összes ország' : 'All Countries';
    const country = COUNTRIES.find(c => c.code === code);
    if (!country) return code;
    return t(country.nameKey) || code;
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row => 
        row.topicName.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number | string = a[sortField];
      let bValue: number | string = b[sortField];

      if (sortField === 'topicName') {
        return sortDirection === 'asc' 
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      }

      const diff = (Number(bValue) - Number(aValue));
      return sortDirection === 'asc' ? -diff : diff;
    });

    return filtered;
  }, [data, searchQuery, sortField, sortDirection]);

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {lang === 'hu' ? 'Népszerű Tartalmak' : 'Popular Content'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {lang === 'hu' 
              ? 'Témakörök rangsorolása helyes válaszok alapján'
              : 'Topics ranked by correct answers'}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-primary/20 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Country Filter */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={lang === 'hu' ? 'Ország' : 'Country'} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="ALL">
                    {lang === 'hu' ? 'Összes ország' : 'All Countries'}
                  </SelectItem>
                  {availableCountries.map(code => (
                    <SelectItem key={code} value={code}>
                      {getCountryName(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={lang === 'hu' ? 'Témakör keresése...' : 'Search topic...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPopularityData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {lang === 'hu' ? 'Frissítés' : 'Refresh'}
            </Button>
          </div>

          {/* Active Filters Display */}
          {(selectedCountry !== 'ALL' || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/10">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {lang === 'hu' ? 'Aktív szűrők:' : 'Active filters:'}
              </span>
              {selectedCountry !== 'ALL' && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                  {getCountryName(selectedCountry)}
                </span>
              )}
              {searchQuery && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                  "{searchQuery}"
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCountry('ALL');
                  setSearchQuery('');
                }}
                className="text-xs h-6"
              >
                {lang === 'hu' ? 'Szűrők törlése' : 'Clear filters'}
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/20 border border-destructive rounded-lg p-6 text-center">
            <p className="text-foreground">{error}</p>
            <Button
              onClick={() => fetchPopularityData()}
              className="mt-4"
              variant="outline"
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-primary/20 overflow-hidden">
            {/* Summary Stats */}
            <div className="p-4 border-b border-primary/10 bg-primary/5">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {lang === 'hu' ? 'Témakörök:' : 'Topics:'}
                  </span>
                  <span className="ml-2 font-bold text-foreground">{filteredAndSortedData.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {lang === 'hu' ? 'Összes válasz:' : 'Total Answers:'}
                  </span>
                  <span className="ml-2 font-bold text-foreground">
                    {filteredAndSortedData.reduce((sum, row) => sum + row.totalAnswers, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {lang === 'hu' ? 'Átlagos helyes arány:' : 'Avg Correct Rate:'}
                  </span>
                  <span className="ml-2 font-bold text-success">
                    {filteredAndSortedData.length > 0 
                      ? (filteredAndSortedData.reduce((sum, row) => sum + row.correctPercentage, 0) / filteredAndSortedData.length).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-primary/20">
                  <TableHead className="text-foreground font-bold w-12">#</TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary"
                    onClick={() => handleSort('topicName')}
                  >
                    {lang === 'hu' ? 'Témakör' : 'Topic'} {getSortIndicator('topicName')}
                  </TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary text-center"
                    onClick={() => handleSort('correctAnswers')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      {lang === 'hu' ? 'Helyes' : 'Correct'} {getSortIndicator('correctAnswers')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary text-center"
                    onClick={() => handleSort('incorrectAnswers')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive" />
                      {lang === 'hu' ? 'Helytelen' : 'Incorrect'} {getSortIndicator('incorrectAnswers')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-foreground font-bold cursor-pointer hover:text-primary text-center"
                    onClick={() => handleSort('correctPercentage')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Percent className="w-4 h-4 text-accent" />
                      {lang === 'hu' ? 'Arány' : 'Rate'} {getSortIndicator('correctPercentage')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      {lang === 'hu' ? 'Nincs adat a megadott szűrőkkel' : 'No data with current filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((row, index) => (
                    <TableRow 
                      key={row.topicId}
                      className="border-primary/10 hover:bg-primary/5"
                    >
                      <TableCell className="text-foreground font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {row.topicName}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-success font-bold">
                          {row.correctAnswers.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-destructive font-bold">
                          {row.incorrectAnswers.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-success to-accent rounded-full"
                              style={{ width: `${row.correctPercentage}%` }}
                            />
                          </div>
                          <span className={`font-bold min-w-[50px] ${
                            row.correctPercentage >= 70 
                              ? 'text-success' 
                              : row.correctPercentage >= 50 
                                ? 'text-accent' 
                                : 'text-destructive'
                          }`}>
                            {row.correctPercentage}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPopularContent;
