import backMusic from '@/assets/backmusic.mp3';
import gameMusic from '@/assets/DingleUP.mp3';
import { logger } from '@/lib/logger';
/**
 * Singleton AudioManager - handles TWO background music tracks
 * - generalBgm: plays on all pages EXCEPT Game (DingleUP.mp3)
 * - gameBgm: plays ONLY on Game (backmusic.mp3)
 * Uses Web Audio API for precise volume control
 */
class AudioManager {
  private static _instance: AudioManager | null = null;
  private generalBgm: HTMLAudioElement;
  private gameBgm: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private generalGain: GainNode | null = null;
  private gameGain: GainNode | null = null;
  private generalSource: MediaElementAudioSourceNode | null = null;
  private gameSource: MediaElementAudioSourceNode | null = null;
  private _enabled: boolean = true;
  private _volume: number = 0.03; // 3% default
  private currentTrack: 'general' | 'game' | null = null;

  private constructor() {
    if ((window as any).__AUDIO_MANAGER_INSTANCES__ >= 1) {
      logger.warn('[AudioManager] Instance already exists');
      return;
    }
    (window as any).__AUDIO_MANAGER_INSTANCES__ = ((window as any).__AUDIO_MANAGER_INSTANCES__ || 0) + 1;

    // Create TWO audio elements - SWAPPED per user request
    this.generalBgm = new Audio(gameMusic); // DingleUP.mp3 for general pages
    this.generalBgm.loop = true;
    this.generalBgm.volume = 0;

    this.gameBgm = new Audio(backMusic); // backmusic.mp3 for Game
    this.gameBgm.loop = true;
    this.gameBgm.volume = 0;

    this.initWebAudio();

    if (typeof window !== 'undefined') {
      (window as any).__generalBgm = this.generalBgm;
      (window as any).__gameBgm = this.gameBgm;
    }

    logger.log('[AudioManager] Initialized with 2 tracks', { 
      volume: this._volume, 
      enabled: this._enabled,
      percentage: `${Math.round(this._volume * 100)}%`
    });
  }

  private initWebAudio(): void {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) {
        logger.warn('[AudioManager] Web Audio API not supported');
        return;
      }

      this.audioCtx = new AC();
      
      // Create gain nodes for BOTH tracks
      this.generalGain = this.audioCtx.createGain();
      this.generalGain.gain.value = this._volume;
      
      this.gameGain = this.audioCtx.createGain();
      this.gameGain.gain.value = this._volume;

      // Connect BOTH audio elements
      this.generalSource = this.audioCtx.createMediaElementSource(this.generalBgm);
      this.generalSource.connect(this.generalGain);
      this.generalGain.connect(this.audioCtx.destination);

      this.gameSource = this.audioCtx.createMediaElementSource(this.gameBgm);
      this.gameSource.connect(this.gameGain);
      this.gameGain.connect(this.audioCtx.destination);

      const unlock = async () => {
        if (this.audioCtx?.state === 'suspended') {
          try {
            await this.audioCtx.resume();
            logger.log('[AudioManager] AudioContext resumed');
          } catch (e) {
            logger.log('[AudioManager] Failed to resume', e);
          }
        }
      };

      document.addEventListener('pointerdown', unlock, { once: true });
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('click', unlock, { once: true });

      logger.log('[AudioManager] WebAudio graph initialized (2 tracks)');
    } catch (err) {
      logger.error('[AudioManager] WebAudio init failed', err);
    }
  }

  static getInstance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  /**
   * Switch to the appropriate track based on route
   */
  switchTrack(track: 'general' | 'game'): void {
    if (this.currentTrack === track) return;

    logger.log('[AudioManager] Switching track:', this.currentTrack, '→', track);

    // Stop current track
    if (this.currentTrack === 'general') {
      this.generalBgm.pause();
      this.generalBgm.currentTime = 0;
    } else if (this.currentTrack === 'game') {
      this.gameBgm.pause();
      this.gameBgm.currentTime = 0;
    }

    this.currentTrack = track;

    // Start new track if enabled
    if (this._enabled && this._volume > 0) {
      if (track === 'general') {
        this.safePlay(this.generalBgm);
      } else {
        this.safePlay(this.gameBgm);
      }
    }
  }

  /**
   * Apply settings from store
   */
  apply(enabled: boolean, volume: number): void {
    this._enabled = enabled;
    this._volume = Math.max(0, Math.min(1, volume));
    
    // Update BOTH gain nodes
    if (this.generalGain) this.generalGain.gain.value = this._volume;
    if (this.gameGain) this.gameGain.gain.value = this._volume;
    
    this.generalBgm.volume = 1;
    this.gameBgm.volume = 1;

    logger.log('[AudioManager] Apply settings', { 
      enabled, 
      volume: this._volume,
      percentage: `${Math.round(this._volume * 100)}%`
    });

    if (enabled && this._volume > 0 && this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume().catch((e) => {
        logger.log('[AudioManager] AudioContext resume blocked', e);
      });
    }

    // Play/pause current track
    if (enabled && this._volume > 0 && this.currentTrack) {
      const audio = this.currentTrack === 'general' ? this.generalBgm : this.gameBgm;
      this.safePlay(audio);
    } else {
      this.generalBgm.pause();
      this.gameBgm.pause();
    }
  }

  /**
   * Safe play with autoplay policy handling
   */
  private async safePlay(audio: HTMLAudioElement): Promise<void> {
    if (audio.paused) {
      try {
        await audio.play();
        logger.log('[AudioManager] Playing:', audio === this.generalBgm ? 'general' : 'game');
      } catch (err) {
        logger.log('[AudioManager] Play blocked', err);
      }
    }
  }

  /**
   * Force play the current track - use after user interaction to bypass autoplay policy
   */
  async forcePlay(): Promise<void> {
    logger.log('[AudioManager] forcePlay called', { 
      enabled: this._enabled, 
      volume: this._volume, 
      track: this.currentTrack 
    });

    if (!this._enabled || this._volume <= 0 || !this.currentTrack) {
      logger.log('[AudioManager] forcePlay SKIPPED - conditions not met');
      return;
    }

    // Resume AudioContext if suspended
    if (this.audioCtx?.state === 'suspended') {
      try {
        await this.audioCtx.resume();
        logger.log('[AudioManager] AudioContext RESUMED via forcePlay');
      } catch (err) {
        logger.error('[AudioManager] Failed to resume AudioContext', err);
      }
    }

    // Play current track
    const audio = this.currentTrack === 'general' ? this.generalBgm : this.gameBgm;
    logger.log('[AudioManager] Attempting to play:', this.currentTrack, 'paused:', audio.paused);
    try {
      if (audio.paused) {
        await audio.play();
        logger.log('[AudioManager] ✅ Force played successfully:', this.currentTrack);
      } else {
        logger.log('[AudioManager] Already playing:', this.currentTrack);
      }
    } catch (err) {
      logger.error('[AudioManager] ❌ Force play FAILED', err);
    }
  }

  /**
   * Pause all music (for background/visibility change)
   */
  pauseAll(): void {
    logger.log('[AudioManager] pauseAll called');
    this.generalBgm.pause();
    this.gameBgm.pause();
  }

  /**
   * Resume current track (for foreground/visibility restore)
   */
  async resumeIfEnabled(): Promise<void> {
    logger.log('[AudioManager] resumeIfEnabled called', {
      enabled: this._enabled,
      volume: this._volume,
      track: this.currentTrack
    });

    if (!this._enabled || this._volume <= 0 || !this.currentTrack) {
      return;
    }

    const audio = this.currentTrack === 'general' ? this.generalBgm : this.gameBgm;
    if (audio.paused) {
      await this.safePlay(audio);
    }
  }

  /**
   * Get current state
   */
  getState(): { enabled: boolean; volume: number; paused: boolean; track: 'general' | 'game' | null } {
    const currentAudio = this.currentTrack === 'general' ? this.generalBgm : 
                         this.currentTrack === 'game' ? this.gameBgm : null;
    return {
      enabled: this._enabled,
      volume: this._volume,
      paused: currentAudio?.paused ?? true,
      track: this.currentTrack
    };
  }
}

export default AudioManager;
