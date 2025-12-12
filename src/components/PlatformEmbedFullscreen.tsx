import { useEffect, useRef, memo } from 'react';

interface PlatformEmbedFullscreenProps {
  platform: 'tiktok' | 'youtube' | 'instagram' | 'facebook';
  originalUrl: string;
  embedUrl?: string;
  videoId?: string;
}

declare global {
  interface Window {
    tiktokEmbed?: { load?: () => void };
    instgrm?: { Embeds?: { process?: () => void } };
  }
}

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const extractTikTokVideoId = (url: string): string | null => {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
};

const PlatformEmbedFullscreen = memo(({ platform, originalUrl, embedUrl, videoId }: PlatformEmbedFullscreenProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const loadScript = (src: string, onLoad?: () => void) => {
      if (scriptLoadedRef.current[src]) {
        onLoad?.();
        return;
      }
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        scriptLoadedRef.current[src] = true;
        onLoad?.();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current[src] = true;
        onLoad?.();
      };
      document.body.appendChild(script);
    };

    // Clear container
    container.innerHTML = '';

    if (platform === 'tiktok') {
      const vid = videoId || extractTikTokVideoId(originalUrl);
      const blockquote = document.createElement('blockquote');
      blockquote.className = 'tiktok-embed';
      blockquote.setAttribute('cite', originalUrl);
      if (vid) blockquote.setAttribute('data-video-id', vid);
      blockquote.setAttribute('data-embed-from', 'embed_page');
      blockquote.style.cssText = 'width:100%!important;height:100%!important;max-width:none!important;min-width:0!important;margin:0!important;';
      blockquote.innerHTML = '<section></section>';
      container.appendChild(blockquote);

      loadScript('https://www.tiktok.com/embed.js', () => {
        if (window.tiktokEmbed?.load) {
          window.tiktokEmbed.load();
        }
      });
    } else if (platform === 'instagram') {
      const blockquote = document.createElement('blockquote');
      blockquote.className = 'instagram-media';
      blockquote.setAttribute('data-instgrm-permalink', originalUrl);
      blockquote.setAttribute('data-instgrm-version', '14');
      blockquote.style.cssText = 'width:100%!important;height:100%!important;max-width:none!important;min-width:0!important;margin:0!important;background:black!important;';
      container.appendChild(blockquote);

      loadScript('https://www.instagram.com/embed.js', () => {
        setTimeout(() => {
          if (window.instgrm?.Embeds?.process) {
            window.instgrm.Embeds.process();
          }
        }, 100);
      });
    } else if (platform === 'youtube') {
      let src = embedUrl;
      if (!src) {
        const ytId = extractYouTubeId(originalUrl);
        if (ytId) {
          src = `https://www.youtube.com/embed/${ytId}`;
        }
      }
      if (src) {
        const url = new URL(src);
        url.searchParams.set('autoplay', '1');
        url.searchParams.set('mute', '1');
        url.searchParams.set('playsinline', '1');
        url.searchParams.set('controls', '0');
        url.searchParams.set('rel', '0');
        url.searchParams.set('modestbranding', '1');

        const iframe = document.createElement('iframe');
        iframe.src = url.toString();
        iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;';
        iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.setAttribute('playsinline', '');
        container.appendChild(iframe);
      }
    } else if (platform === 'facebook') {
      const fbSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(originalUrl)}&autoplay=1&mute=1&show_text=0`;
      const iframe = document.createElement('iframe');
      iframe.src = fbSrc;
      iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
    }

    return () => {
      container.innerHTML = '';
    };
  }, [platform, originalUrl, embedUrl, videoId]);

  return (
    <div 
      ref={containerRef} 
      className="platform-embed-root"
      style={{
        width: '100dvw',
        height: '100dvh',
        backgroundColor: '#000',
      }}
    />
  );
});

PlatformEmbedFullscreen.displayName = 'PlatformEmbedFullscreen';

export default PlatformEmbedFullscreen;
