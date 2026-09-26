import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

interface RichQuestionPromptProps {
  text: string;
  fallbackImageUrl?: string;
  theme?: 'dark' | 'light';
  className?: string;
  onImageClick?: (src: string) => void;
}

export interface ContentPart {
  type: 'html' | 'text' | 'image';
  content: string;
  alt?: string;
  style?: React.CSSProperties;
  rawImgTag?: string;
}

/**
 * Parses a prompt string into clean text chunks and inline image chunks.
 * Handles both Markdown `![alt](url)` and HTML `<img ... />` and HTML text.
 */
export function parsePromptContent(text: string): ContentPart[] {
  if (!text) return [];

  // Match markdown images: ![alt](url)
  // or HTML images: <img ... />
  const regex = /!\[(.*?)\]\((.*?)\)|<img\s+([^>]*)\/?>/gi;

  const parts: ContentPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;

    // Push preceding text/HTML if any
    if (matchIndex > lastIndex) {
      const chunk = text.substring(lastIndex, matchIndex);
      if (chunk) {
        parts.push({ type: 'html', content: chunk });
      }
    }

    if (match[0].startsWith('![')) {
      // Markdown: ![alt](src)
      const alt = match[1] || 'Gambar Soal';
      const src = match[2] || '';
      if (src) {
        parts.push({
          type: 'image',
          content: src.trim(),
          alt: alt.trim() || 'Gambar Soal',
        });
      }
    } else {
      // HTML <img>
      const attrsStr = match[3] || '';
      const srcMatch = /src=["']([^"']+)["']/i.exec(attrsStr);
      const altMatch = /alt=["']([^"']*)["']/i.exec(attrsStr);
      const styleMatch = /style=["']([^"']*)["']/i.exec(attrsStr);
      const widthMatch = /width=["']([^"']*)["']/i.exec(attrsStr);

      const src = srcMatch ? srcMatch[1] : '';
      const alt = altMatch ? altMatch[1] : 'Gambar Soal';
      const styleStr = styleMatch ? styleMatch[1] : '';
      const widthAttr = widthMatch ? widthMatch[1] : '';

      // Parse inline style string to React style object
      const parsedStyle: React.CSSProperties = {};
      if (styleStr) {
        styleStr.split(';').forEach((rule) => {
          const [prop, val] = rule.split(':').map((s) => s?.trim());
          if (prop && val) {
            const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            (parsedStyle as any)[camelProp] = val;
          }
        });
      }

      if (widthAttr && !parsedStyle.width) {
        parsedStyle.width = widthAttr.endsWith('%') || widthAttr.endsWith('px') ? widthAttr : `${widthAttr}px`;
      }

      if (src) {
        parts.push({
          type: 'image',
          content: src.trim(),
          alt: alt.trim() || 'Gambar Soal',
          style: parsedStyle,
          rawImgTag: match[0],
        });
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Push trailing text/HTML if any
  if (lastIndex < text.length) {
    const trailing = text.substring(lastIndex);
    if (trailing) {
      parts.push({ type: 'html', content: trailing });
    }
  }

  return parts;
}

/**
 * Strips HTML tags to render clean text with line breaks
 */
function cleanHtmlText(htmlStr: string): string {
  // Convert <br>, <div>, <p> to newlines
  return htmlStr
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export const RichQuestionPrompt: React.FC<RichQuestionPromptProps> = ({
  text,
  fallbackImageUrl,
  theme = 'light',
  className = '',
  onImageClick,
}) => {
  const [internalZoomUrl, setInternalZoomUrl] = useState<string | null>(null);

  const parts = parsePromptContent(text || '');

  // If there's a fallbackImageUrl that wasn't included inline in text, we can show it at the end
  const shouldShowFallback =
    Boolean(fallbackImageUrl) &&
    !parts.some((p) => p.type === 'image' && p.content === fallbackImageUrl);

  const handleImageZoom = (src: string) => {
    if (onImageClick) {
      onImageClick(src);
    } else {
      setInternalZoomUrl(src);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`space-y-2.5 ${className}`}>
      {parts.length === 0 && !fallbackImageUrl && (
        <span className="text-slate-400 italic">
          (Teks soal belum ditulis)
        </span>
      )}

      {parts.map((part, idx) => {
        if (part.type === 'html' || part.type === 'text') {
          const cleaned = cleanHtmlText(part.content);
          if (!cleaned.trim() && !cleaned.includes('\n')) return null;

          return (
            <p
              key={idx}
              className={`leading-relaxed whitespace-pre-wrap ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {cleaned}
            </p>
          );
        }

        if (part.type === 'image') {
          const userStyle = part.style || {};
          const isCentered =
            (typeof userStyle.margin === 'string' && userStyle.margin.includes('auto')) ||
            userStyle.display === 'block';

          return (
            <div
              key={idx}
              className={`my-2.5 flex ${isCentered ? 'justify-center' : 'justify-start'}`}
            >
              <div
                onClick={() => handleImageZoom(part.content)}
                style={{
                  width: userStyle.width || 'auto',
                  maxWidth: '100%',
                }}
                className="group relative cursor-zoom-in inline-block rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs transition-all hover:shadow-md hover:border-[#364FFF]/40"
                title="Klik untuk memperbesar gambar"
              >
                <img
                  src={part.content}
                  alt={part.alt || 'Gambar Soal'}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: userStyle.borderRadius || '12px',
                    display: 'block',
                  }}
                  className="max-h-80 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="14" font-family="sans-serif">Gambar tidak dapat dimuat</text></svg>';
                  }}
                />
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  <span>Perbesar</span>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}

      {/* Fallback separate imageUrl if provided and not yet embedded in text */}
      {shouldShowFallback && fallbackImageUrl && (
        <div className="my-2.5 flex justify-center">
          <div
            onClick={() => handleImageZoom(fallbackImageUrl)}
            className="group relative cursor-zoom-in inline-block max-w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs"
            title="Klik untuk memperbesar gambar"
          >
            <img
              src={fallbackImageUrl}
              alt="Lampiran Soal"
              className="max-h-72 w-auto object-contain rounded-xl shadow-xs transition-transform group-hover:scale-[1.01]"
            />
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              <span>Perbesar</span>
            </div>
          </div>
        </div>
      )}

      {/* Internal Zoom Modal if parent didn't provide onImageClick */}
      {internalZoomUrl && (
        <div
          className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setInternalZoomUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setInternalZoomUrl(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={internalZoomUrl}
              alt="Enlarged Diagram"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
