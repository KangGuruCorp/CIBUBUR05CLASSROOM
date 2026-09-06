import React, { useState } from 'react';
import { ExternalLink, Play, Sparkles, Video, Volume2 } from 'lucide-react';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, getYouTubeVideoId } from '../../utils/youtube';

interface YouTubeEmbedProps {
  url?: string;
  title?: string;
  autoPlayOnClick?: boolean;
  className?: string;
  aspectRatio?: 'video' | 'wide';
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  url,
  title,
  autoPlayOnClick = true,
  className = '',
  aspectRatio = 'video',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const videoId = getYouTubeVideoId(url);
  const embedUrl = getYouTubeEmbedUrl(videoId, isPlaying);
  const thumbnailUrl = getYouTubeThumbnailUrl(videoId, 'hq');

  if (!url || !videoId) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900 shadow-md ${className}`}
    >
      {/* Top Header Bar */}
      <div className="bg-slate-900/95 px-4 py-2.5 flex items-center justify-between gap-3 text-white border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Video className="w-3 h-3 fill-current" />
            <span>YouTube Video</span>
          </div>
          {title ? (
            <span className="text-xs font-bold text-slate-200 truncate">{title}</span>
          ) : (
            <span className="text-xs font-medium text-slate-400 truncate">
              Video Pembelajaran Interaktif
            </span>
          )}
        </div>

        <a
          href={url.startsWith('http') ? url : `https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          title="Buka di tab baru YouTube"
        >
          <span>Buka YouTube</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Video Container */}
      <div className={`relative w-full ${aspectRatio === 'video' ? 'aspect-video' : 'aspect-16/9'} bg-black`}>
        {!isPlaying ? (
          <div className="relative w-full h-full group cursor-pointer" onClick={() => setIsPlaying(true)}>
            {/* Thumbnail */}
            {thumbnailUrl && !hasError ? (
              <img
                src={thumbnailUrl}
                alt={title || 'YouTube Thumbnail'}
                onError={() => setHasError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <Video className="w-16 h-16 text-slate-600" />
              </div>
            )}

            {/* Dark overlay & Play Button */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors flex flex-col items-center justify-center gap-3 p-4">
              <button
                type="button"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all duration-200"
                aria-label="Putar Video YouTube"
              >
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
              </button>

              <div className="px-3.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Klik untuk Memutar Video Langsung</span>
              </div>
            </div>
          </div>
        ) : (
          /* Live Iframe */
          <iframe
            src={embedUrl || ''}
            title={title || 'YouTube Video Player'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {/* Helpful caption bottom bar */}
      <div className="px-4 py-2 bg-slate-950 text-slate-400 text-[11px] flex items-center justify-between border-t border-slate-900">
        <span className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Dapat diputar langsung di sini atau mode layar penuh (Full Screen)</span>
        </span>
        {isPlaying && (
          <button
            type="button"
            onClick={() => setIsPlaying(false)}
            className="text-[10px] font-bold text-slate-400 hover:text-white underline"
          >
            Tutup Pemutar
          </button>
        )}
      </div>
    </div>
  );
};
