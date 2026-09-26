import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImageIcon,
  Loader2,
  Maximize2,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import { uploadFileToServer } from '../../lib/fileUploadService';

interface RichQuestionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Converts legacy markdown `![alt](url)` or plain text into HTML for the contenteditable div
 */
function normalizeToHtml(val: string): string {
  if (!val) return '';
  // If already contains HTML tags like <img or <p or <div, return as is
  if (val.includes('<img') || val.includes('<p') || val.includes('<div') || val.includes('<br')) {
    return val;
  }

  // Convert markdown images: ![alt](url) -> <img src="url" alt="alt" style="max-width: 100%; height: auto; border-radius: 12px; margin: 8px 0; display: block;" />
  let html = val.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, url) => {
    return `<img src="${url}" alt="${alt || 'Gambar Soal'}" style="max-width: 100%; width: 400px; height: auto; border-radius: 12px; margin: 8px 0; display: block;" />`;
  });

  // Convert newlines to <br /> if no HTML paragraphs
  html = html.replace(/\n/g, '<br />');
  return html;
}

export const RichQuestionEditor: React.FC<RichQuestionEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tuliskan teks pertanyaan di sini... Anda bisa langsung paste (Ctrl+V) gambar di tengah teks...',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; handle: string } | null>(null);
  const isUpdatingFromProps = useRef(false);

  // Sync value from props to editor innerHTML
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const normalized = normalizeToHtml(value || '');

    // Avoid overwriting if same
    if (currentHtml !== normalized && !isUpdatingFromProps.current) {
      editorRef.current.innerHTML = normalized;
    }
  }, [value]);

  // Update DOMRect of selected image for overlay
  const updateSelectedImgRect = useCallback(() => {
    if (!selectedImg || !editorRef.current) {
      setImgRect(null);
      return;
    }
    const rect = selectedImg.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    setImgRect(rect);
  }, [selectedImg]);

  useEffect(() => {
    updateSelectedImgRect();
    const handleScrollOrResize = () => updateSelectedImgRect();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [updateSelectedImgRect]);

  const emitChange = () => {
    if (!editorRef.current) return;
    isUpdatingFromProps.current = true;
    const html = editorRef.current.innerHTML;
    onChange(html);
    setTimeout(() => {
      isUpdatingFromProps.current = false;
    }, 50);
  };

  // Insert image element at current selection
  const insertImageAtCursor = (url: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Gambar Soal';
    img.style.width = '380px';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '12px';
    img.style.margin = '10px 0';
    img.style.display = 'block';
    img.className = 'quiz-embedded-img cursor-pointer transition-shadow hover:ring-2 hover:ring-[#364FFF]';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);

      // Insert a paragraph or br after the image so user can type after it
      const br = document.createElement('br');
      range.setStartAfter(img);
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      // Append to editor
      editorRef.current.appendChild(img);
      const br = document.createElement('br');
      editorRef.current.appendChild(br);
    }

    emitChange();
    setSelectedImg(img);
  };

  // Handle Clipboard Paste
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setIsUploading(true);
          try {
            const url = await uploadFileToServer(file, 'quiz');
            if (url) {
              insertImageAtCursor(url);
            }
          } catch (err) {
            console.error('Failed to upload pasted image:', err);
          } finally {
            setIsUploading(false);
          }
          return;
        }
      }
    }
  };

  // Handle File Upload from Button
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadFileToServer(file, 'quiz');
      if (url) {
        insertImageAtCursor(url);
      }
    } catch (err) {
      console.error('Failed to upload image file:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Click handler to select image for resizing
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.stopPropagation();
      const img = target as HTMLImageElement;
      setSelectedImg(img);
      setImgRect(img.getBoundingClientRect());
    } else if (!isResizing) {
      setSelectedImg(null);
      setImgRect(null);
    }
  };

  // Resize mouse down
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;

    setIsResizing(true);
    const rect = selectedImg.getBoundingClientRect();
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      handle,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current || !selectedImg) return;
      const { x, width, handle } = resizeStartRef.current;
      const deltaX = moveEvent.clientX - x;

      let newWidth = width;
      if (handle.includes('r')) {
        newWidth = Math.max(100, Math.min(800, width + deltaX));
      } else if (handle.includes('l')) {
        newWidth = Math.max(100, Math.min(800, width - deltaX));
      }

      selectedImg.style.width = `${Math.round(newWidth)}px`;
      selectedImg.style.maxWidth = '100%';
      selectedImg.style.height = 'auto';
      updateSelectedImgRect();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      emitChange();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Quick preset width
  const setPresetWidth = (widthStr: string) => {
    if (!selectedImg) return;
    selectedImg.style.width = widthStr;
    selectedImg.style.maxWidth = '100%';
    selectedImg.style.height = 'auto';
    updateSelectedImgRect();
    emitChange();
  };

  // Quick alignment
  const setImgAlignment = (align: 'left' | 'center' | 'right') => {
    if (!selectedImg) return;
    if (align === 'center') {
      selectedImg.style.display = 'block';
      selectedImg.style.margin = '10px auto';
    } else if (align === 'left') {
      selectedImg.style.display = 'block';
      selectedImg.style.margin = '10px auto 10px 0';
    } else if (align === 'right') {
      selectedImg.style.display = 'block';
      selectedImg.style.margin = '10px 0 10px auto';
    }
    updateSelectedImgRect();
    emitChange();
  };

  // Delete image
  const deleteSelectedImg = () => {
    if (!selectedImg) return;
    selectedImg.remove();
    setSelectedImg(null);
    setImgRect(null);
    emitChange();
  };

  return (
    <div className={`relative space-y-2 ${className}`}>
      {/* Top action toolbar */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          Teks Pertanyaan / Soal <span className="text-rose-500">*</span>
        </label>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-bold text-[#364FFF] hover:text-[#2539cc] flex items-center gap-1 cursor-pointer bg-[#364FFF]/10 hover:bg-[#364FFF]/15 px-2.5 py-1 rounded-xl transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>+ Sisipkan Gambar</span>
          </button>
        </div>
      </div>

      {/* Uploading progress bar */}
      {isUploading && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-[#364FFF]" />
          <span>Mengunggah gambar langsung ke dalam teks...</span>
        </div>
      )}

      {/* WYSIWYG ContentEditable Box */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={handlePaste}
          onInput={emitChange}
          onClick={handleEditorClick}
          onBlur={emitChange}
          data-placeholder={placeholder}
          className="min-h-[140px] max-h-[500px] overflow-y-auto px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF] leading-relaxed shadow-2xs whitespace-pre-wrap"
          style={{ wordBreak: 'break-word' }}
        />

        {/* Selected Image Resize Handles & Floating Toolbar Overlay */}
        {selectedImg && imgRect && editorRef.current && (
          <div
            className="fixed pointer-events-none z-50 transition-none"
            style={{
              top: `${imgRect.top}px`,
              left: `${imgRect.left}px`,
              width: `${imgRect.width}px`,
              height: `${imgRect.height}px`,
            }}
          >
            {/* Outline Box */}
            <div className="absolute inset-0 border-2 border-[#364FFF] rounded-xl pointer-events-none shadow-sm" />

            {/* Floating Toolbar above image */}
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl shadow-xl px-2.5 py-1 flex items-center gap-1.5 pointer-events-auto z-60 text-xs whitespace-nowrap animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] text-slate-400 font-bold px-1 border-r border-slate-700">
                {Math.round(imgRect.width)}px
              </span>

              {/* Preset buttons */}
              <button
                type="button"
                onClick={() => setPresetWidth('200px')}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                Kecil
              </button>
              <button
                type="button"
                onClick={() => setPresetWidth('380px')}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                Sedang
              </button>
              <button
                type="button"
                onClick={() => setPresetWidth('100%')}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-slate-800 text-slate-200 cursor-pointer"
              >
                Penuh
              </button>

              <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

              {/* Alignment */}
              <button
                type="button"
                onClick={() => setImgAlignment('left')}
                title="Rata Kiri"
                className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setImgAlignment('center')}
                title="Rata Tengah"
                className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setImgAlignment('right')}
                title="Rata Kanan"
                className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

              {/* Delete */}
              <button
                type="button"
                onClick={deleteSelectedImg}
                title="Hapus Gambar"
                className="p-1 rounded hover:bg-rose-900/60 text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Corner Resize Handles */}
            <div
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#364FFF] rounded-full cursor-nwse-resize pointer-events-auto shadow-md"
              title="Tarik untuk mengubah ukuran"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#364FFF] rounded-full cursor-nesw-resize pointer-events-auto shadow-md"
              title="Tarik untuk mengubah ukuran"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
              className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#364FFF] rounded-full cursor-nesw-resize pointer-events-auto shadow-md"
              title="Tarik untuk mengubah ukuran"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, 'se')}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#364FFF] rounded-full cursor-nwse-resize pointer-events-auto shadow-md"
              title="Tarik untuk mengubah ukuran"
            />
          </div>
        )}
      </div>

      {/* User Guide Hint */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>
          💡 <b>Info:</b> Paste gambar langsung dengan <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-800 font-bold">Ctrl + V</kbd>. Klik gambar untuk <b>mengubah ukuran (free transform)</b> atau mengatur posisi.
        </span>
      </div>
    </div>
  );
};
