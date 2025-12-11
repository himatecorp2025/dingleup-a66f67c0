import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Film } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';

interface VideoAdPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  context: 'daily_gift' | 'game_end' | 'refill';
  rewardText?: string;
}

export const VideoAdPrompt = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  context,
  rewardText,
}: VideoAdPromptProps) => {
  const { lang } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const texts = {
    hu: {
      daily_gift: {
        title: 'Duplázd meg a jutalmadat!',
        description: 'Nézz meg egy rövid videót és kapd meg duplán a napi ajándékod!',
        accept: 'Megnézem a videót',
        decline: 'Most nem',
      },
      game_end: {
        title: 'Duplázd meg a jutalmadat!',
        description: 'Nézz meg egy rövid videót és kapd meg duplán az aranyérméid!',
        accept: 'Duplázom',
        decline: 'Most nem',
      },
      refill: {
        title: 'Töltsd fel a készleteidet!',
        description: 'Nézz meg 2×15 másodperces videót és kapj 500 aranyat + 5 életet!',
        accept: 'Megnézem a 2 videót',
        decline: 'Mégsem',
      },
    },
    en: {
      daily_gift: {
        title: 'Double your reward!',
        description: 'Watch a short video and get double your daily gift!',
        accept: 'Watch video',
        decline: 'Not now',
      },
      game_end: {
        title: 'Double your reward!',
        description: 'Watch a short video and get double your coins!',
        accept: 'Double it',
        decline: 'Not now',
      },
      refill: {
        title: 'Refill your supplies!',
        description: 'Watch 2×15 second videos and get 500 gold + 5 lives!',
        accept: 'Watch 2 videos',
        decline: 'Cancel',
      },
    },
  };

  const t = texts[lang as 'hu' | 'en']?.[context] || texts.en[context];

  const handleAccept = async () => {
    setIsLoading(true);
    await onAccept();
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-primary/30">
        <div className="flex flex-col items-center text-center p-4">
          {/* Film icon */}
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Film className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-2">{t.title}</h2>

          {/* Description */}
          <p className="text-gray-300 mb-2">{t.description}</p>

          {/* Custom reward text */}
          {rewardText && (
            <p className="text-primary font-semibold mb-4">{rewardText}</p>
          )}

          {/* Buttons */}
          <div className="flex flex-col w-full gap-3 mt-4">
            <Button
              onClick={handleAccept}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
            >
              {isLoading ? '...' : t.accept}
            </Button>
            <Button
              onClick={onDecline}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
            >
              {t.decline}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAdPrompt;
