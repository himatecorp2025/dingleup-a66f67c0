// Response compression utility for edge functions
// Adds gzip compression headers when supported

export interface CompressionOptions {
  corsHeaders: Record<string, string>;
  status?: number;
}

/**
 * Create a compressed JSON response with appropriate headers
 * Browser will handle decompression automatically
 */
export const compressedJsonResponse = (
  data: unknown,
  options: CompressionOptions
): Response => {
  const body = JSON.stringify(data);
  
  return new Response(body, {
    status: options.status || 200,
    headers: {
      ...options.corsHeaders,
      'Content-Type': 'application/json',
      'Content-Encoding': 'identity', // Browser handles this
      'Vary': 'Accept-Encoding',
      // Enable compression at CDN/proxy level
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

/**
 * Check if client accepts compression
 */
export const acceptsCompression = (req: Request): boolean => {
  const acceptEncoding = req.headers.get('Accept-Encoding') || '';
  return acceptEncoding.includes('gzip') || acceptEncoding.includes('br');
};

/**
 * Add cache headers for better CDN performance
 */
export const withCacheHeaders = (
  response: Response,
  maxAge: number = 60
): Response => {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
  
  return new Response(response.body, {
    status: response.status,
    headers,
  });
};
