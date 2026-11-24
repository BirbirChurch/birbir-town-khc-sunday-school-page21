import React, { useState } from 'react';
import { X } from 'lucide-react';
import { loadAttachmentDataUrl } from '../services/attachmentStorage';

interface PersonAvatarBadgeProps {
  name?: string;
  gender?: string;
  photoDataUrl?: string;
  photoStorageKey?: string;
  fallbackPhotoDataUrl?: string;
  fallbackPhotoStorageKey?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-12 h-12 text-sm'
};

export const PersonAvatarBadge: React.FC<PersonAvatarBadgeProps> = ({
  name = '',
  gender,
  photoDataUrl,
  photoStorageKey,
  fallbackPhotoDataUrl,
  fallbackPhotoStorageKey,
  size = 'sm'
}) => {
  const thumbSrc = photoDataUrl || fallbackPhotoDataUrl || '';
  const storageKey = photoDataUrl ? photoStorageKey : photoStorageKey || fallbackPhotoStorageKey;
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const initials =
    String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || '?';

  const toneClass =
    gender === 'ሴ'
      ? 'bg-rose-50 border-rose-200 text-rose-800'
      : gender === 'ወ'
      ? 'bg-blue-50 border-blue-200 text-blue-900'
      : 'bg-slate-100 border-slate-200 text-slate-700';

  const handleOpenZoom = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!thumbSrc) return;
    setLightboxSrc(thumbSrc);
    if (storageKey) {
      try {
        const hiRes = await loadAttachmentDataUrl(storageKey);
        if (hiRes) setLightboxSrc(hiRes);
      } catch {
        // Keep thumbnail
      }
    }
  };

  if (thumbSrc) {
    return (
      <>
        <button
          type="button"
          onClick={handleOpenZoom}
          className={`${SIZE_CLASSES[size]} rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 cursor-pointer hover:ring-2 hover:ring-teal-500 transition block`}
          title={name}
        >
          <img src={thumbSrc} alt={name} className="w-full h-full object-cover" />
        </button>

        {lightboxSrc && (
          <div
            className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(ev) => {
              ev.stopPropagation();
              setLightboxSrc(null);
            }}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-200 shadow-2xl"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <span className="text-xs font-extrabold text-slate-900 truncate">{name}</span>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[75vh]">
                <img
                  src={lightboxSrc}
                  alt={name}
                  className="max-h-[65vh] w-auto object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <span
      className={`${SIZE_CLASSES[size]} rounded-xl border font-extrabold inline-flex items-center justify-center shrink-0 select-none ${toneClass}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
};
