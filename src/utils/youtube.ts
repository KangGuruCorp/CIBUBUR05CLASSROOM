/**
 * YouTube Utility Functions for Embedding and Playing Videos
 */

/**
 * Extracts YouTube Video ID from various URL formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://youtube.com/shorts/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - dQw4w9WgXcQ (raw ID)
 */
export function getYouTubeVideoId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();

  // If it's already an 11-character alphanumeric ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    // Check standard patterns
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i,
      /^.*(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
  } catch (err) {
    console.error('Error parsing YouTube URL:', err);
  }

  return null;
}

/**
 * Generates an iframe-safe YouTube embed URL.
 */
export function getYouTubeEmbedUrl(urlOrId?: string | null, autoplay = false): string | null {
  const videoId = getYouTubeVideoId(urlOrId);
  if (!videoId) return null;

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1',
  });

  if (autoplay) {
    params.set('autoplay', '1');
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Generates YouTube video thumbnail URL.
 */
export function getYouTubeThumbnailUrl(
  urlOrId?: string | null,
  quality: 'max' | 'hq' | 'mq' | 'default' = 'hq'
): string | null {
  const videoId = getYouTubeVideoId(urlOrId);
  if (!videoId) return null;

  switch (quality) {
    case 'max':
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    case 'mq':
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    case 'default':
      return `https://img.youtube.com/vi/${videoId}/default.jpg`;
    case 'hq':
    default:
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
}

/**
 * Educational YouTube Presets for Easy Teacher Selection
 */
export const SAMPLE_EDUCATIONAL_VIDEOS = [
  {
    title: 'Tata Surya & Planet - Animasi Sains Interaktif',
    subject: 'Ilmu Pengetahuan Alam (IPAS)',
    url: 'https://www.youtube.com/watch?v=libKVRa01L8',
  },
  {
    title: 'Perkalian & Pembagian Pecahan Mudah',
    subject: 'Matematika',
    url: 'https://www.youtube.com/watch?v=4zpBWBvR4Y8',
  },
  {
    title: 'Ciri & Struktur Teks Eksplanasi',
    subject: 'Bahasa Indonesia',
    url: 'https://www.youtube.com/watch?v=J_jZ5_yJ7vA',
  },
  {
    title: 'Siklus Air & Presipitasi Hujan',
    subject: 'Ilmu Pengetahuan Alam (IPAS)',
    url: 'https://www.youtube.com/watch?v=ncORPosDrjI',
  },
];
