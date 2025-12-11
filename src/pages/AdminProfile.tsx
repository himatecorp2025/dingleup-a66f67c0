import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Lock, Shield, Eye, EyeOff, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useI18n } from '@/i18n';

interface AdminUser {
  user_id: string;
  username: string;
  is_creator: boolean;
  creator_subscription_status: string | null;
}

const AdminProfile = () => {
  const { t } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [lastUsernameChange, setLastUsernameChange] = useState<string | null>(null);
  
  // PIN changing
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  
  // Grant admin role
  const [targetUsername, setTargetUsername] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  
  // Admin list
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      setLoadingAdmins(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = data.map(r => r.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, is_creator, creator_subscription_status')
          .in('id', userIds);
        
        if (profilesError) throw profilesError;
        
        const admins: AdminUser[] = (profiles || []).map(p => ({
          user_id: p.id,
          username: p.username,
          is_creator: p.is_creator || false,
          creator_subscription_status: p.creator_subscription_status
        }));
        setAdminUsers(admins);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('admin.error_not_logged_in'));
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, last_username_change')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserId(profile.id);
        setUsername(profile.username);
        setLastUsernameChange(profile.last_username_change);
      }
    } catch (error: any) {
      toast.error(t('admin.error_loading_profile'));
    } finally {
      setLoading(false);
    }
  };


  const validatePin = (pin: string): string | null => {
    if (!/^\d{6}$/.test(pin)) {
      return t('admin.profile.pin_validation_error');
    }
    return null;
  };

  const handlePinSave = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error(t('admin.error_all_fields_required'));
      return;
    }

    if (newPin !== confirmPin) {
      toast.error(t('admin.error_pins_not_match'));
      return;
    }

    const validationError = validatePin(newPin);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('admin.error_not_logged_in'));
        return;
      }

      const response = await supabase.functions.invoke('update-pin', {
        body: { currentPin, newPin },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || t('admin.profile.pin_update_error'));
      }

      const responseData = response.data;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      toast.success(t('admin.success_pin_updated'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleGrantAdmin = async () => {
    if (!targetUsername.trim()) {
      toast.error(t('admin.error_enter_username'));
      return;
    }

    setIsGranting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('admin.error_not_logged_in'));
        return;
      }

      const { data, error } = await supabase.functions.invoke('grant-admin-role', {
        body: { targetUsername: targetUsername.trim() },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        if (data.error === 'User is already admin') {
          toast.error(t('admin.already_admin').replace('{username}', data.username || targetUsername));
        } else if (data.error === 'User not found') {
          toast.error(t('admin.error_user_not_found'));
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success(t('admin.grant_success').replace('{username}', data.username));
      setTargetUsername('');
      
      // Refresh admin list
      fetchAdminUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('admin.grant_error');
      toast.error(message);
    } finally {
      setIsGranting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('admin.profile.loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-[clamp(1rem,3vw,1.5rem)] pb-[clamp(3rem,6vw,4rem)]">
        <div>
          <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-bold">{t('admin.profile.title')}</h1>
          <p className="text-muted-foreground mt-[clamp(0.375rem,1vw,0.5rem)] text-[clamp(0.875rem,2vw,1rem)]">
            {t('admin.profile.description')}
          </p>
        </div>

        {/* Username Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('admin.profile.username_section_title')}
            </CardTitle>
            <CardDescription>
              {t('admin.profile.username_section_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.profile.current_username')}</Label>
              <p className="text-sm font-medium">{username}</p>
            </div>
          </CardContent>
        </Card>

        {/* PIN Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t('admin.profile.pin_section_title')}
            </CardTitle>
            <CardDescription>
              {t('admin.profile.pin_section_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.profile.current_pin')}</Label>
              <div className="relative">
                <Input
                  type={showCurrentPin ? "text" : "password"}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder={t('admin.profile.pin_placeholder')}
                  maxLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.profile.new_pin')}</Label>
              <div className="relative">
                <Input
                  type={showNewPin ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder={t('admin.profile.pin_placeholder')}
                  maxLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.profile.confirm_pin')}</Label>
              <div className="relative">
                <Input
                  type={showConfirmPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder={t('admin.profile.pin_placeholder')}
                  maxLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button onClick={handlePinSave} className="w-full">
              {t('admin.profile.save_pin_button')}
            </Button>
          </CardContent>
        </Card>

        {/* Grant Admin Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('admin.profile.grant_admin_section_title')}
            </CardTitle>
            <CardDescription>
              {t('admin.profile.grant_admin_section_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.profile.username_label')}</Label>
              <Input
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder={t('admin.profile.username_placeholder')}
              />
            </div>

            <Button 
              onClick={handleGrantAdmin} 
              disabled={isGranting}
              className="w-full"
            >
              {isGranting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t('admin.profile.processing')}
                </span>
              ) : (
                t('admin.profile.grant_admin_button')
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Admins List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('admin.profile.current_admins_title') || 'Jelenlegi adminok'}
            </CardTitle>
            <CardDescription>
              {t('admin.profile.current_admins_description') || 'Admin jogosultsággal rendelkező felhasználók listája'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : adminUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('admin.profile.no_admins') || 'Nincsenek adminok'}</p>
            ) : (
              <div className="space-y-3">
                {adminUsers.map((admin) => (
                  <div 
                    key={admin.user_id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{admin.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {admin.is_creator ? (
                            <span className="text-green-500">✓ Creator (örök ingyenes)</span>
                          ) : (
                            <span className="text-yellow-500">Creator státusz nincs beállítva</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
