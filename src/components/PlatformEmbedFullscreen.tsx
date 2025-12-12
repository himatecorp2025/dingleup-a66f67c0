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
      // Use direct iframe embed instead of blockquote (blockquote has fixed size)
      const vid = videoId || extractTikTokVideoId(originalUrl);
      if (vid) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.tiktok.com/embed/v2/${vid}?autoplay=1`;
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;display:block;background:#000;';
        iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        container.appendChild(iframe);
      }
    } else if (platform === 'instagram') {
      // Instagram also use iframe approach for fullscreen
      // Extract post ID from URL and use embed iframe
      const iframe = document.createElement('iframe');
      iframe.src = `${originalUrl}embed/`;
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;display:block;background:#000;';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
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
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;display:block;';
        iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.setAttribute('playsinline', '');
        container.appendChild(iframe);
      }
    } else if (platform === 'facebook') {
      const fbSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(originalUrl)}&autoplay=1&mute=1&show_text=0`;
      const iframe = document.createElement('iframe');
      iframe.src = fbSrc;
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;display:block;';
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
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
      }}
    />
  );
});

PlatformEmbedFullscreen.displayName = 'PlatformEmbedFullscreen';

export default PlatformEmbedFullscreen;
