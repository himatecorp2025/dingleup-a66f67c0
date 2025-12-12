import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

const AdminLogin = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: loginData, error: loginError } = await supabase.functions.invoke(
        'login-with-username-pin',
        { body: { username, pin } }
      );

      if (loginError) {
        const rawMessage = (loginError as any)?.message || '';
        try {
          const match = rawMessage.match(/\{.*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            // Check for rate limiting (429 - too many attempts)
            if (parsed.error?.includes('Too many failed attempts') || rawMessage.includes('429')) {
              toast.error(t('admin.login.error_too_many_attempts'));
            } else {
              toast.error(parsed.error || t('admin.error_invalid_credentials'));
            }
          } else if (rawMessage.includes('429') || rawMessage.includes('Too many')) {
            toast.error(t('admin.login.error_too_many_attempts'));
          } else {
            toast.error(t('admin.error_invalid_credentials'));
          }
        } catch {
          if (rawMessage.includes('429') || rawMessage.includes('Too many')) {
            toast.error(t('admin.login.error_too_many_attempts'));
          } else {
            toast.error(t('admin.error_invalid_credentials'));
          }
        }
        return;
      }

      if (!loginData?.success) {
        toast.error(loginData?.error || t('admin.error_invalid_credentials'));
        return;
      }

      // Try to sign in with Supabase Auth using password variants
      let signInSuccess = false;
      for (const passwordVariant of loginData.passwordVariants) {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginData.user.email,
          password: passwordVariant,
        });

        if (!error) {
          signInSuccess = true;
          break;
        }
      }

      if (!signInSuccess) {
        toast.error(t('admin.error_login_failed'));
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', loginData.user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        await supabase.auth.signOut();
        toast.error(t('admin.error_no_admin_permission'));
        return;
      }

      toast.success(t('admin.success_admin_login'));
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast.error(error.message || t('admin.error_login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh min-h-svh relative overflow-hidden bg-gradient-to-br from-[#1a0b2e] via-[#2d1b4e] to-[#0f0a1f] flex items-center justify-center p-4">
      {/* Animated glowing orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-[clamp(20rem,90vw,28rem)] relative z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[clamp(1.5rem,4vw,3rem)] p-[clamp(1.5rem,4vw,2rem)] shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-50"></div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="96"
                height="96"
                viewBox="0 0 1024 1024"
                className="relative z-10"
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
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black text-center bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {t('admin.login.title')}
          </h1>
          <p className="text-center text-white/60 mb-8 text-sm">
            {t('admin.login.subtitle')}
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t('admin.login.username_label')}</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="DingleUP"
                  autoComplete="off"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">{t('admin.login.pin_label')}</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                <Input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                  autoComplete="off"
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-400/50 focus:ring-purple-400/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-purple-400 transition-colors"
                >
                  {showPin ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-500 hover:via-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t('admin.login.logging_in')}
                </span>
              ) : (
                t('admin.login.login_button')
              )}
            </Button>
          </form>

          {/* Back to Home */}
          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 text-sm text-white/50 hover:text-white/80 transition-colors flex items-center justify-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>{t('admin.login.back_to_home')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
