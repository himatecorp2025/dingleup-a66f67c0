import { create } from 'zustand';
import AudioManager from '@/lib/audioManager';
import { logger } from '@/lib/logger';

interface AudioState {
  musicEnabled: boolean;
  volume: number;
  loaded: boolean;
  setMusicEnabled: (enabled: boolean) => void;
  setVolume: (vol: number) => void;
  loadSettings: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => {
  // Load settings immediately on store creation
  const savedEnabled = typeof window !== 'undefined' ? localStorage.getItem('musicEnabled') : null;
  const savedVolume = typeof window !== 'undefined' ? localStorage.getItem('musicVolume') : null;
  
  const initialEnabled = savedEnabled ? JSON.parse(savedEnabled) : true;
  const parsedVolume = savedVolume ? parseFloat(savedVolume) : 0.03;
  const initialVolume = parsedVolume > 0.03 ? 0.03 : parsedVolume;
  
  // Save corrected volume if needed
  if (typeof window !== 'undefined' && initialVolume === 0.03 && savedVolume !== '0.03') {
    localStorage.setItem('musicVolume', '0.03');
  }
  
  logger.log('[AudioStore] Initialized with settings:', { 
    musicEnabled: initialEnabled, 
    volume: initialVolume 
  });
  
  return {
    musicEnabled: initialEnabled,
    volume: initialVolume,
    loaded: true,
    
    setMusicEnabled: (enabled) => {
      logger.log('[AudioStore] Setting music enabled:', enabled);
      set({ musicEnabled: enabled });
      localStorage.setItem('musicEnabled', JSON.stringify(enabled));
    },
    
    setVolume: (vol) => {
      const v = Math.max(0, Math.min(1, vol));
      logger.log('[AudioStore] Setting volume:', v);
      set({ volume: v });
      localStorage.setItem('musicVolume', v.toString());
    },
    
    loadSettings: () => {
      logger.log('[AudioStore] loadSettings called (settings already loaded on init)');
    },
  };
});
