import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Mail,
  AlertTriangle,
  Gamepad2,
  Target,
  Database,
  TrendingUp,
  Languages,
  Heart,
  Zap,
  ShoppingBag,
  BarChart3,
  Calendar,
  Settings,
  ChevronRight,
  Coins,
  FileText,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useI18n } from '@/i18n';

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const { t, lang } = useI18n();
  
  const isCollapsed = state === 'collapsed';

  // Helper to check if path is active
  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [basePath, query] = path.split('?');
      return location.pathname === basePath && location.search.includes(query);
    }
    return location.pathname === path;
  };

  // Check if any analytics route is active
  const isAnalyticsActive = () => {
    return [
      '/admin/advanced-analytics',
      '/admin/retention',
      '/admin/monetization',
      '/admin/performance',
      '/admin/engagement',
      '/admin/user-journey',
    ].some(path => location.pathname === path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#0f0a1f] backdrop-blur-xl border-r border-white/10">
        {/* Logo */}
        {!isCollapsed && (
          <div className="p-[clamp(1rem,3vw,1.5rem)] pb-[clamp(0.75rem,2vw,1rem)]">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-lg opacity-30"></div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 1024 1024"
                className="w-[clamp(2.5rem,5vw,3rem)] h-[clamp(2.5rem,5vw,3rem)] relative z-10"
              >
                <image
                  href="/logo.png"
                  x="0"
                  y="0"
                  width="1024"
                  height="1024"
                  preserveAspectRatio="xMidYMid meet"
                />
              </svg>
            </div>
            <h2 className="text-white font-bold text-[clamp(0.625rem,1.5vw,0.75rem)] mt-[clamp(0.25rem,1vw,0.5rem)]">{t('admin.layout.admin_panel')}</h2>
          </div>
        )}

        {/* DASHBOARD & USERS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 text-xs font-bold uppercase tracking-wider">
            {!isCollapsed && t('admin.sidebar.dashboard_users')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/dashboard')}
                  isActive={isActive('/admin/dashboard') && !location.search}
                  className={isActive('/admin/dashboard') && !location.search ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <LayoutDashboard className="text-purple-400" />
                  <span>{t('common.dashboard')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/dashboard?tab=users')}
                  isActive={isActive('/admin/dashboard?tab=users')}
                  className={isActive('/admin/dashboard?tab=users') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Users className="text-purple-400" />
                  <span>{t('admin.sidebar.users')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/dashboard?tab=invitations')}
                  isActive={isActive('/admin/dashboard?tab=invitations')}
                  className={isActive('/admin/dashboard?tab=invitations') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Mail className="text-purple-400" />
                  <span>{t('admin.sidebar.invitations')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/dashboard?tab=reports')}
                  isActive={isActive('/admin/dashboard?tab=reports')}
                  className={isActive('/admin/dashboard?tab=reports') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <AlertTriangle className="text-purple-400" />
                  <span>{t('admin.sidebar.reports')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PLAYER & TARGETING */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 text-xs font-bold uppercase tracking-wider">
            {!isCollapsed && t('admin.sidebar.player_targeting')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/game-profiles')}
                  isActive={isActive('/admin/game-profiles')}
                  className={isActive('/admin/game-profiles') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Gamepad2 className="text-purple-400" />
                  <span>{t('admin.sidebar.game_profiles')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/ad-interests')}
                  isActive={isActive('/admin/ad-interests')}
                  className={isActive('/admin/ad-interests') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Target className="text-purple-400" />
                  <span>{t('admin.sidebar.ad_interests')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CONTENT CENTER */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 text-xs font-bold uppercase tracking-wider">
            {!isCollapsed && t('admin.sidebar.content_center')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/question-pools')}
                  isActive={isActive('/admin/question-pools')}
                  className={isActive('/admin/question-pools') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Database className="text-purple-400" />
                  <span>{t('admin.sidebar.question_pools')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/popular-content')}
                  isActive={isActive('/admin/popular-content')}
                  className={isActive('/admin/popular-content') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <TrendingUp className="text-purple-400" />
                  <span>{t('admin.sidebar.popular_content')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/translations')}
                  isActive={isActive('/admin/translations')}
                  className={isActive('/admin/translations') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Languages className="text-purple-400" />
                  <span>{t('admin.sidebar.translations')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ECONOMY CENTER */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 text-xs font-bold uppercase tracking-wider">
            {!isCollapsed && t('admin.sidebar.economy_center')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/booster-types')}
                  isActive={isActive('/admin/booster-types')}
                  className={isActive('/admin/booster-types') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Zap className="text-purple-400" />
                  <span>{t('admin.sidebar.booster_types')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/booster-purchases')}
                  isActive={isActive('/admin/booster-purchases')}
                  className={isActive('/admin/booster-purchases') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <ShoppingBag className="text-purple-400" />
                  <span>{t('admin.sidebar.booster_purchases')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/manual-credit')}
                  isActive={isActive('/admin/manual-credit')}
                  className={isActive('/admin/manual-credit') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Coins className="text-purple-400" />
                  <span>Manual Credit</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ADVANCED ANALYTICS HUB with submenu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 text-xs font-bold uppercase tracking-wider">
            {!isCollapsed && t('admin.sidebar.analytics_hub')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/advanced-analytics')}
                  isActive={isActive('/admin/advanced-analytics')}
                  className={isActive('/admin/advanced-analytics') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <BarChart3 className="text-purple-400" />
                  <span>{t('admin.sidebar.overview')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Submenu always visible when any analytics page is active */}
              <Collapsible open={isAnalyticsActive()} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate('/admin/retention')}
                          isActive={isActive('/admin/retention')}
                          className={isActive('/admin/retention') ? 'bg-white/10 text-white' : 'text-white/60'}
                        >
                          <span>{t('admin.sidebar.retention')}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate('/admin/monetization')}
                          isActive={isActive('/admin/monetization')}
                          className={isActive('/admin/monetization') ? 'bg-white/10 text-white' : 'text-white/60'}
                        >
                          <span>{t('admin.sidebar.monetization')}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate('/admin/performance')}
                          isActive={isActive('/admin/performance')}
                          className={isActive('/admin/performance') ? 'bg-white/10 text-white' : 'text-white/60'}
                        >
                          <span>{t('admin.sidebar.performance')}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate('/admin/engagement')}
                          isActive={isActive('/admin/engagement')}
                          className={isActive('/admin/engagement') ? 'bg-white/10 text-white' : 'text-white/60'}
                        >
                          <span>{t('admin.sidebar.engagement')}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => navigate('/admin/user-journey')}
                          isActive={isActive('/admin/user-journey')}
                          className={isActive('/admin/user-journey') ? 'bg-white/10 text-white' : 'text-white/60'}
                        >
                          <span>{t('admin.sidebar.user_journey')}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* OTHER */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 text-xs font-bold uppercase tracking-wider">
            {!isCollapsed && t('admin.sidebar.other')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/age-statistics')}
                  isActive={isActive('/admin/age-statistics')}
                  className={isActive('/admin/age-statistics') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Calendar className="text-purple-400" />
                  <span>{t('admin.sidebar.age_statistics')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/legal-documents')}
                  isActive={isActive('/admin/legal-documents')}
                  className={isActive('/admin/legal-documents') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <FileText className="text-purple-400" />
                  <span>{lang === 'hu' ? 'Jogi Dokumentumok' : 'Legal Documents'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/admin/profile')}
                  isActive={isActive('/admin/profile')}
                  className={isActive('/admin/profile') ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white' : 'text-white/60'}
                >
                  <Settings className="text-purple-400" />
                  <span>{t('admin.sidebar.admin_profile')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
