import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/i18n';
import BottomNav from '@/components/BottomNav';

const Creators = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#2d1b69] to-[#0f0033]">
      <div className="p-4 pb-24">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>

        <h1 className="text-2xl font-bold text-white text-center">
          {t('nav.creators')}
        </h1>
      </div>
      <BottomNav />
    </div>
  );
};

export default Creators;
