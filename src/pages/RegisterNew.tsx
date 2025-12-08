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

const createRegisterSchema = (t: (key: string) => string) => z.object({
  username: z.string()
    .trim()
    .min(3, t('auth.register.validationUsernameMinLength'))
    .max(30, t('auth.register.validationUsernameMaxLength'))
    .regex(/^[a-zA-Z0-9_áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+$/, t('auth.register.validationUsernameNoSpaces')),
  pin: z.string()
    .regex(/^\d{6}$/, t('auth.register.validationPinFormat')),
  pinConfirm: z.string(),
  invitationCode: z.string().optional()
}).refine(data => data.pin === data.pinConfirm, {
  message: t('auth.register.validationPinMismatch'),
  path: ["pinConfirm"],
}).refine(data => {
  const pin = data.pin;
  if (pin.length !== 6) return true;
  
  // 1. Nem kezdődhet 20-szal vagy 19-cel
  if (pin.startsWith('20') || pin.startsWith('19')) {
    return false;
  }
  
  // 2. Nem lehet három egymást követően ugyanaz a szám
  for (let i = 0; i < pin.length - 2; i++) {
    if (pin[i] === pin[i+1] && pin[i+1] === pin[i+2]) {
      return false;
    }
  }
  
  // 3. Nem lehet növekvő vagy csökkenő sorrendben (három egymást követő szám)
  for (let i = 0; i < pin.length - 2; i++) {
    const a = parseInt(pin[i]);
    const b = parseInt(pin[i+1]);
    const c = parseInt(pin[i+2]);
    
    // Növekvő sorrend ellenőrzése (pl. 1-2-3, 2-3-4)
    if (b === a + 1 && c === b + 1) {
      return false;
    }
    
    // Csökkenő sorrend ellenőrzése (pl. 7-6-5, 6-5-4)
    if (b === a - 1 && c === b - 1) {
      return false;
    }
  }
  
  return true;
}, {
  message: "A PIN kód nem felel meg a biztonsági követelményeknek: nem kezdődhet 19-cel vagy 20-szal, nem tartalmazhat három azonos számot egymás után, és nem lehet növekvő vagy csökkenő sorrendben",
  path: ["pin"]
});

const RegisterNew = () => {
  const navigate = useNavigate();
  const { t, setLang, isLoading: i18nLoading } = useI18n();
  
  const registerSchema = createRegisterSchema(t);
  type RegisterForm = z.infer<typeof registerSchema>;
  const [formData, setFormData] = useState<RegisterForm>({
    username: "",
    pin: "",
    pinConfirm: "",
    invitationCode: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
      setIsStandalone(isPWA);
    };
    checkStandalone();

    // Read invitation code from URL (?code=ABC123)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setFormData(prev => ({ ...prev, invitationCode: code }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = registerSchema.parse(formData);

      // Call register edge function with optional invitation code
      const { data: regData, error: regError } = await supabase.functions.invoke('register-with-username-pin', {
        body: {
          username: validated.username,
          pin: validated.pin,
          invitationCode: validated.invitationCode || null,
        },
      });

      if (regError || regData?.error) {
        toast.error(t('auth.register.error_title'), {
          description: regData?.error || t('auth.register.errorRegisterFailed'),
          duration: 4000,
        });
        return;
      }

      if (!regData?.success || !regData?.user) {
        toast.error(t('auth.register.error_title'), {
          description: t('auth.register.errorRegisterUnsuccessful'),
          duration: 4000,
        });
        return;
      }

      // Auto-login after successful registration
      const autoEmail = `${validated.username.toLowerCase()}@dingleup.auto`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: autoEmail,
        password: validated.pin + validated.username,
      });

      if (signInError) {
        console.error('Auto-login error:', signInError);
        toast.success(t('auth.register.success_title'), {
          description: t('auth.register.successPleaseLogin'),
          duration: 2000,
        });
        navigate('/auth/login');
        return;
      }

      toast.success(t('auth.register.success_title'), {
        description: t('auth.register.successMessage'),
        duration: 2000,
      });
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof RegisterForm, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof RegisterForm] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Registration error:', error);
        toast.error(t('auth.register.error_title'), {
          description: t('auth.register.errorUnexpected'),
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
      className="min-h-screen min-h-dvh w-screen fixed inset-0 overflow-hidden bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] flex items-center justify-center animate-fade-in"
      style={{
        paddingTop: isStandalone ? 'env(safe-area-inset-top)' : '0',
        paddingBottom: isStandalone ? 'env(safe-area-inset-bottom)' : '0'
      }}
    >
      {/* Background image with 75% opacity - optimized for mobile performance */}
      <div 
        className="fixed inset-0 z-0 will-change-transform" 
        style={{
          backgroundImage: `url(${gameBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          opacity: 0.75,
          transform: 'translateZ(0)',
        }}
      />

      <div className="w-[90vw] max-w-[500px] relative z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 relative w-full flex flex-col"
          style={{
            padding: 'clamp(1rem, 2vh, 2rem)'
          }}
        >
          <button 
            onClick={() => navigate('/')} 
            className="absolute rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-200 group z-10 flex items-center justify-center" 
            aria-label={t('auth.register.backButton')}
            style={{
              left: 'clamp(0.75rem, 2vh, 1rem)',
              top: 'clamp(0.75rem, 2vh, 1rem)',
              padding: 'clamp(0.5rem, 1.5vh, 0.75rem)',
              minWidth: 'clamp(40px, 5vh, 48px)',
              minHeight: 'clamp(40px, 5vh, 48px)'
            }}
          >
            <ArrowLeft className="text-white/70 group-hover:text-white transition-colors" style={{ width: 'clamp(20px, 3vh, 24px)', height: 'clamp(20px, 3vh, 24px)' }} />
          </button>

          {/* Logo */}
          <div className="flex justify-center" style={{ marginBottom: 'clamp(0.5rem, 1.5vh, 1rem)', marginTop: 'clamp(0.25rem, 1vh, 0.5rem)' }}>
            <img 
              src={loadingLogo} 
              alt="DingleUP! Logo" 
              className="object-contain" 
              style={{
                width: 'clamp(50px, 8vh, 80px)',
                height: 'clamp(50px, 8vh, 80px)'
              }}
            />
          </div>

          <h1 
            className="font-black text-center bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] break-words hyphens-auto"
            style={{
              fontSize: 'clamp(1.5rem, 4vh, 2.5rem)',
              marginBottom: 'clamp(0.25rem, 0.8vh, 0.5rem)',
              lineHeight: '1.2'
            }}
          >
            {t('auth.register.title')}
          </h1>
          <p 
            className="text-center text-white/70 font-medium break-words"
            style={{
              fontSize: 'clamp(0.7rem, 1.6vh, 0.85rem)',
              marginBottom: 'clamp(0.75rem, 1.8vh, 1.25rem)',
              lineHeight: '1.3'
            }}
          >
            {t('auth.register.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col" style={{ gap: 'clamp(0.5rem, 1.5vh, 1rem)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.25rem, 0.6vh, 0.4rem)' }}>
              <Label className="font-medium text-white/80" style={{ fontSize: 'clamp(0.7rem, 1.5vh, 0.8rem)' }}>{t('auth.register.usernameLabel')}</Label>
              <div className="relative group">
                <User className="absolute text-white/40 group-focus-within:text-yellow-400 transition-colors" style={{ left: 'clamp(8px, 1.2vh, 12px)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }} />
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20"
                  style={{ 
                    height: 'clamp(36px, 5vh, 48px)',
                    paddingLeft: 'clamp(32px, 4vh, 40px)',
                    fontSize: 'clamp(0.8rem, 1.7vh, 0.9rem)'
                  }}
                  placeholder={t('auth.register.usernamePlaceholder')}
                  disabled={isLoading}
                  maxLength={30}
                />
              </div>
              {errors.username && <p className="text-red-400" style={{ fontSize: 'clamp(0.65rem, 1.3vh, 0.75rem)' }}>{errors.username}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.25rem, 0.6vh, 0.4rem)' }}>
              <Label className="font-medium text-white/80" style={{ fontSize: 'clamp(0.7rem, 1.5vh, 0.8rem)' }}>{t('auth.register.pinLabel')}</Label>
              <div className="relative group">
                <Lock className="absolute text-white/40 group-focus-within:text-yellow-400 transition-colors" style={{ left: 'clamp(8px, 1.2vh, 12px)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }} />
                <Input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20"
                  style={{ 
                    height: 'clamp(36px, 5vh, 48px)',
                    paddingLeft: 'clamp(32px, 4vh, 40px)',
                    paddingRight: 'clamp(32px, 4vh, 40px)',
                    fontSize: 'clamp(0.8rem, 1.7vh, 0.9rem)'
                  }}
                  placeholder={t('auth.register.pinPlaceholder')}
                  disabled={isLoading}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute text-white/40 hover:text-white/60 transition-colors"
                  style={{ right: 'clamp(8px, 1.2vh, 12px)', top: '50%', transform: 'translateY(-50%)' }}
                  aria-label={showPin ? t('auth.register.hidePin') : t('auth.register.showPin')}
                >
                  {showPin ? <EyeOff style={{ width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }} /> : <Eye style={{ width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }} />}
                </button>
              </div>
              {errors.pin && <p className="text-red-400" style={{ fontSize: 'clamp(0.65rem, 1.3vh, 0.75rem)' }}>{errors.pin}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.25rem, 0.6vh, 0.4rem)' }}>
              <Label className="font-medium text-white/80" style={{ fontSize: 'clamp(0.7rem, 1.5vh, 0.8rem)' }}>{t('auth.register.pinConfirmLabel')}</Label>
              <div className="relative group">
                <Lock className="absolute text-white/40 group-focus-within:text-yellow-400 transition-colors" style={{ left: 'clamp(8px, 1.2vh, 12px)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }} />
                <Input
                  type={showPinConfirm ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.pinConfirm}
                  onChange={(e) => setFormData({ ...formData, pinConfirm: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20"
                  style={{ 
                    height: 'clamp(36px, 5vh, 48px)',
                    paddingLeft: 'clamp(32px, 4vh, 40px)',
                    paddingRight: 'clamp(32px, 4vh, 40px)',
                    fontSize: 'clamp(0.8rem, 1.7vh, 0.9rem)'
                  }}
                  placeholder={t('auth.register.pinPlaceholder')}
                  disabled={isLoading}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPinConfirm(!showPinConfirm)}
                  className="absolute text-white/40 hover:text-white/60 transition-colors"
                  style={{ right: 'clamp(8px, 1.2vh, 12px)', top: '50%', transform: 'translateY(-50%)' }}
                  aria-label={showPinConfirm ? t('auth.register.hidePin') : t('auth.register.showPin')}
                >
                  {showPinConfirm ? <EyeOff style={{ width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }} /> : <Eye style={{ width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }} />}
                </button>
              </div>
              {errors.pinConfirm && <p className="text-red-400" style={{ fontSize: 'clamp(0.65rem, 1.3vh, 0.75rem)' }}>{errors.pinConfirm}</p>}
            </div>

            {/* Invitation Code (Optional) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.25rem, 0.6vh, 0.4rem)' }}>
              <Label className="font-medium text-white/80 flex items-center" style={{ fontSize: 'clamp(0.7rem, 1.5vh, 0.8rem)', gap: 'clamp(0.25rem, 0.8vh, 0.5rem)' }}>
                <span>{t('auth.register.invitationCodeLabel')}</span>
                <span className="text-white/50" style={{ fontSize: 'clamp(0.6rem, 1.3vh, 0.7rem)' }}>({t('auth.register.optional')})</span>
              </Label>
              <div className="relative group">
                <svg className="absolute text-white/40 group-focus-within:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ left: 'clamp(8px, 1.2vh, 12px)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(16px, 2vh, 20px)', height: 'clamp(16px, 2vh, 20px)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <Input
                  type="text"
                  value={formData.invitationCode}
                  onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value.toUpperCase().trim() })}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-yellow-400 focus:ring-yellow-400/20 uppercase"
                  style={{ 
                    height: 'clamp(36px, 5vh, 48px)',
                    paddingLeft: 'clamp(32px, 4vh, 40px)',
                    fontSize: 'clamp(0.8rem, 1.7vh, 0.9rem)'
                  }}
                  placeholder={t('auth.register.invitationCodePlaceholder')}
                  disabled={isLoading}
                  maxLength={8}
                />
              </div>
              <p className="text-white/50" style={{ fontSize: 'clamp(0.6rem, 1.3vh, 0.7rem)' }}>{t('auth.register.invitationCodeHint')}</p>
            </div>

            <p className="text-center text-white/60" style={{ fontSize: 'clamp(0.6rem, 1.4vh, 0.75rem)', marginBottom: 'clamp(0.5rem, 1.2vh, 0.75rem)', lineHeight: '1.3' }}>
              {t('auth.register.termsPrefix')}{' '}
              <a 
                href="/aszf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 underline transition-colors"
              >
                {t('auth.register.termsLink')}
              </a>
              {' '}{t('auth.register.termsAnd')}{' '}
              <a 
                href="/adatkezeles" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 underline transition-colors"
              >
                {t('auth.register.privacyLink')}
              </a>
              .
            </p>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300"
              style={{ 
                height: 'clamp(2.5rem, 5.5vh, 3.5rem)',
                fontSize: 'clamp(0.875rem, 1.8vh, 1rem)'
              }}
              disabled={isLoading}
            >
              {isLoading ? t('auth.register.submittingButton') : t('auth.register.submitButton')}
            </Button>
          </form>

          <div className="mt-[2vh] space-y-[1vh]">
            <p className="text-center text-white/60 break-words" style={{ fontSize: 'clamp(0.625rem, 1.5vh, 0.875rem)' }}>
              {t('auth.register.alreadyHaveAccount')}{' '}
              <button
                onClick={() => navigate('/auth/login')}
                className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
              >
                {t('auth.register.loginLink')}
              </button>
            </p>
            
            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="text-white/60 hover:text-white/90 transition-colors underline"
                style={{ fontSize: 'clamp(0.65rem, 1.4vh, 0.75rem)' }}
              >
                {t('auth.choice.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterNew;
