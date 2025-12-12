import { useEffect, useRef, memo } from "react";

interface PlatformEmbedFullscreenProps {
  platform: "tiktok" | "youtube" | "instagram" | "facebook";
  originalUrl: string;
  embedUrl?: string;
  videoId?: string;
}

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const extractTikTokVideoId = (url: string): string | null => {
  const m = url.match(/\/video\/(\d+)/);
  return m ? m[1] : null;
};

const toInstagramEmbedUrl = (url: string): string => {
  // originalUrl lehet ".../reel/XXXX" vagy ".../p/XXXX"
  // Biztosítsuk a végén a "/"-t, majd tegyük rá az "embed/"
  try {
    const u = new URL(url);
    let pathname = u.pathname;
    if (!pathname.endsWith("/")) pathname += "/";
    u.pathname = pathname + "embed/";
    // Autoplay az Instagramnál nem garantált, de legalább az embed stabil lesz
    u.searchParams.set("autoplay", "1");
    return u.toString();
  } catch {
    // fallback: próbáljuk így
    return url.endsWith("/") ? `${url}embed/` : `${url}/embed/`;
  }
};

const PlatformEmbedFullscreen = memo(({ platform, originalUrl, embedUrl, videoId }: PlatformEmbedFullscreenProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Biztonságosabb, mint innerHTML
    container.replaceChildren();

    const makeIframe = (src: string) => {
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.style.cssText = `
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          border:0;
          display:block;
          background:#000;
        `;
      iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.setAttribute("playsinline", "");
      iframe.setAttribute("webkit-playsinline", "");
      return iframe;
    };

    if (platform === "tiktok") {
      // Use pre-generated embed URL from database first
      let src = embedUrl;
      if (!src) {
        const vid = videoId || extractTikTokVideoId(originalUrl);
        if (vid) {
          src = `https://www.tiktok.com/embed/v2/${vid}?autoplay=1&mute=1`;
        }
      }
      if (src) {
        // Ensure autoplay params are present
        const u = new URL(src);
        u.searchParams.set("autoplay", "1");
        u.searchParams.set("mute", "1");
        container.appendChild(makeIframe(u.toString()));
      }
    }

    if (platform === "instagram") {
      // Use pre-generated embed URL from database first
      const src = embedUrl || toInstagramEmbedUrl(originalUrl);
      container.appendChild(makeIframe(src));
    }

    if (platform === "youtube") {
      let src = embedUrl;
      if (!src) {
        const id = extractYouTubeId(originalUrl);
        if (id) src = `https://www.youtube.com/embed/${id}`;
      }
      if (src) {
        const u = new URL(src);
        u.searchParams.set("autoplay", "1");
        u.searchParams.set("mute", "1");
        u.searchParams.set("playsinline", "1");
        u.searchParams.set("controls", "0");
        u.searchParams.set("rel", "0");
        u.searchParams.set("modestbranding", "1");
        container.appendChild(makeIframe(u.toString()));
      }
    }

    if (platform === "facebook") {
      const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        originalUrl,
      )}&autoplay=1&mute=1&show_text=0`;
      container.appendChild(makeIframe(src));
    }

    return () => {
      container.replaceChildren();
    };
  }, [platform, originalUrl, embedUrl, videoId]);

  // FONTOS: fixed inset-0 => tényleg fullscreen, nem a parenttől függ
  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        minHeight: "100vh",
        backgroundColor: "#000",
        overflow: "hidden",
        zIndex: 9999,
      }}
    />
  );
});

PlatformEmbedFullscreen.displayName = "PlatformEmbedFullscreen";
export default PlatformEmbedFullscreen;
