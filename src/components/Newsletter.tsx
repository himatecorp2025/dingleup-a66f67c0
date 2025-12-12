import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      toast.error(t('landing.newsletter.error_invalid_email'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscribers')
        .insert({ email: email.trim().toLowerCase() });

      if (error) {
        if (error.code === '23505') {
          toast.error(t('landing.newsletter.error_already_subscribed'));
        } else {
          throw error;
        }
      } else {
        toast.success(t('landing.newsletter.success_subscribed'));
        setEmail("");
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error(t('landing.newsletter.error_subscription_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033] relative">
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/20 rounded-full blur-[120px] animate-pulse"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-3xl mx-auto relative animate-fade-in">
          <div className="relative p-12 text-center overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-md border-2 border-white/20 shadow-2xl">
            {/* Decorative sparkles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="relative mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/50">
                <Bell className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
              
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                {t('landing.newsletter.title')}
              </h2>
              <p className="text-base sm:text-lg text-white/90 mb-8 drop-shadow-lg">
                {t('landing.newsletter.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder={t('landing.newsletter.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                  className="flex-1 bg-white/10 border-white/30 focus:border-pink-400 text-white placeholder:text-white/60 backdrop-blur-sm"
                  disabled={loading}
                />
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-8 font-bold whitespace-nowrap shadow-lg shadow-pink-500/50 hover:shadow-pink-500/80 transition-all"
                >
                  {loading ? t('landing.newsletter.button_loading') : t('landing.newsletter.button_subscribe')}
                </Button>
              </div>

              <p className="text-sm text-white/70 mt-4 drop-shadow">
                {t('landing.newsletter.no_spam')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
