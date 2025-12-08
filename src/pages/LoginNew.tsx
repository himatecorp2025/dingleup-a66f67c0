import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Lock, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useI18n } from "@/i18n";
import { getCountryFromTimezone } from "@/lib/utils";
import type { LangCode } from "@/i18n/types";
import loadingLogo from '@/assets/dingleup-loading-logo.png';
import gameBackground from '@/assets/game-background.png';

const createLoginSchema = (t: (key: string) => string) => z.object({
  username: z.string().trim().min(1, t('auth.login.validationUsernameRequired')).regex(/^[^\s]+$/, t('auth.login.validationUsernameNoSpaces')),
  pin: z.string().regex(/^\d{6}$/, t('auth.login.validationPinFormat')),
});

const LoginNew = () => {
  const navigate = useNavigate();
  
  const { t, setLang, isLoading: i18nLoading } = useI18n();
  
  const loginSchema = createLoginSchema(t);
  type LoginForm = z.infer<typeof loginSchema>;
  const [formData, setFormData] = useState<LoginForm>({
    username: "",
    pin: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginForm, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
      setIsStandalone(isPWA);
    };
    checkStandalone();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = loginSchema.parse(formData);

      // Call login edge function
      const { data: loginData, error: loginError } = await supabase.functions.invoke('login-with-username-pin', {
        body: {
          username: validated.username,
          pin: validated.pin,
        },
      });

      if (loginError || loginData?.error) {
        toast.error(t('auth.login.error_title'), {
          description: loginData?.error || t('auth.login.errorLoginFailed'),
          duration: 4000,
        });
        return;
      }

      if (!loginData?.success || !loginData?.user?.email || !loginData?.passwordVariants) {
        toast.error(t('auth.login.error_title'), {
          description: t('auth.login.errorLoginUnsuccessful'),
          duration: 4000,
        });
        return;
      }

      // Try signing in with password variants (handles migration edge cases)
      let signInSuccess = false;
      for (const password of loginData.passwordVariants) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginData.user.email,
          password,
        });

        if (!signInError) {
          signInSuccess = true;
          break;
        }
      }

      if (!signInSuccess) {
        toast.error(t('auth.login.error_title'), {
          description: t('auth.login.errorInvalidCredentials'),
          duration: 4000,
        });
        return;
      }

      toast.success(t('auth.login.success_title'), {
        description: t('auth.login.success_description'),
        duration: 2000,
      });
      
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof LoginForm, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof LoginForm] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Login error:', error);
        toast.error(t('auth.login.error_title'), {
          description: t('auth.login.errorUnexpected'),
          duration: 4000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Removed i18n loading screen - translations load instantly with static import

  return (
    <div 
      className="min-h-screen min-h-dvh w-screen fixed inset-0 overflow-hidden bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: isStandalone ? 'env(safe-area-inset-top)' : '0',
        paddingBottom: isStandalone ? 'env(safe-area-inset-bottom)' : '0'
      }}
    >
      {/* Background image with 75% opacity - optimized for mobile performance */}
      <div 
        className="fixed inset-0 z-0 will-change-transform pointer-events-none" 
        style={{
          backgroundImage: `url(${gameBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          opacity: 0.75,
          transform: 'translateZ(0)',
        }}
      />

      <div className="w-[90vw] max-w-md relative z-10 m-auto">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 relative w-full">
          <button 
            onClick={() => navigate('/')} 
            className="absolute left-4 top-4 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-200 group z-10 min-w-[44px] min-h-[44px] flex items-center justify-center" 
            aria-label={t('auth.login.backButton')}
          >
            <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-4 mt-2">
            <img 
              src={loadingLogo} 
              alt="DingleUP! Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain" 
            />
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black text-center mb-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] break-words hyphens-auto px-2">
            {t('auth.login.title')}
          </h1>
          <p className="text-center text-white/70 mb-6 text-xs xs:text-sm sm:text-base font-medium break-words px-4">
          {t('auth.login.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/80">{t('auth.login.usernameLabel')}</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-yellow-400 transition-colors" />
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="h-12 pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20 text-base"
                  placeholder={t('auth.login.usernamePlaceholder')}
                  disabled={isLoading}
                />
              </div>
              {errors.username && <p className="text-sm text-red-400">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/80">{t('auth.login.pinLabel')}</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-yellow-400 transition-colors" />
                <Input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="h-12 pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20 text-base"
                  placeholder={t('auth.login.pinPlaceholder')}
                  disabled={isLoading}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  aria-label={showPin ? t('auth.login.hidePin') : t('auth.login.showPin')}
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.pin && <p className="text-sm text-red-400">{errors.pin}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300 text-base"
              disabled={isLoading}
            >
              {isLoading ? t('auth.login.submittingButton') : t('auth.login.submitButton')}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-center text-white/60 text-xs xs:text-sm break-words px-2">
              {t('auth.login.noAccountYet')}{' '}
              <button
                onClick={() => navigate('/auth/register')}
                className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
              >
                {t('auth.login.registerLink')}
              </button>
            </p>
            
            <div className="text-center space-y-2">
              <button
                onClick={() => navigate('/auth/forgot-pin')}
                className="text-white/60 hover:text-white/90 text-sm transition-colors underline"
              >
                {t('auth.login.forgotPin')}
              </button>
              
              <div>
                <button
                  onClick={() => navigate('/')}
                  className="text-white/60 hover:text-white/90 text-sm transition-colors underline"
                >
                  {t('auth.choice.back')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginNew;
