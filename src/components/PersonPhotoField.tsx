import React, { useEffect, useState } from 'react';
import { Camera, Eye, Trash2, Upload, User, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  deleteAttachmentFile,
  loadAttachmentDataUrl,
  saveAttachmentFile
} from '../services/attachmentStorage';
import { processProfilePhotoFile } from '../utils/hrPhotoHelper';

export interface PersonPhotoValue {
  photoDataUrl?: string;
  photoStorageKey?: string;
  photoName?: string;
  photoUpdatedAt?: string;
}

interface PersonPhotoFieldProps {
  storagePrefix: string;
  personId?: string | number;
  name?: string;
  value: PersonPhotoValue;
  onChange: (next: PersonPhotoValue) => void;
  compact?: boolean;
  labelAm?: string;
  labelEn?: string;
}

export const PersonPhotoField: React.FC<PersonPhotoFieldProps> = ({
  storagePrefix,
  personId,
  name,
  value,
  onChange,
  compact = false,
  labelAm = 'የግለሰቡ ፎቶ (Profile Photo)',
  labelEn = 'Profile Photo'
}) => {
  const { t } = useLanguage();
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(value.photoDataUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFullPhotoUrl(value.photoDataUrl || null);
    if (!value.photoStorageKey) return;
    loadAttachmentDataUrl(value.photoStorageKey)
      .then((loaded) => {
        if (!cancelled && loaded) {
          setFullPhotoUrl(loaded);
        }
      })
      .catch(() => {
        // Keep thumbnail fallback
      });
    return () => {
      cancelled = true;
    };
  }, [value.photoStorageKey, value.photoDataUrl]);

  const activePhotoSrc = fullPhotoUrl || value.photoDataUrl || null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg('');
    setIsUploading(true);
    try {
      const processed = await processProfilePhotoFile(file);
      if (processed.ok === false) {
        if (processed.reason === 'invalid_type') {
          setErrorMsg(t('እባክዎ ትክክለኛ የፎቶ ፋይል (JPG, PNG, WEBP) ይምረጡ።', 'Please choose a valid image file (JPG, PNG, WEBP).'));
        } else if (processed.reason === 'too_large') {
          setErrorMsg(t('የፎቶው መጠን ከ12MB መብለጥ የለበትም።', 'Photo size must be 12MB or smaller.'));
        } else {
          setErrorMsg(t('ፎቶውን ማንበብ አልተሳካም።', 'Failed to read photo file.'));
        }
        return;
      }

      const idToken = personId !== undefined && personId !== null ? String(personId) : String(Date.now());
      const newStorageKey = `photo_${storagePrefix}_${idToken}_${Date.now()}`;
      await saveAttachmentFile(newStorageKey, processed.data.fileName, processed.data.fullDataUrl);

      if (value.photoStorageKey && value.photoStorageKey !== newStorageKey) {
        await deleteAttachmentFile(value.photoStorageKey).catch(() => {});
      }

      setFullPhotoUrl(processed.data.fullDataUrl);
      onChange({
        photoDataUrl: processed.data.thumbnailDataUrl,
        photoStorageKey: newStorageKey,
        photoName: processed.data.fileName,
        photoUpdatedAt: new Date().toISOString()
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value.photoStorageKey) {
      await deleteAttachmentFile(value.photoStorageKey).catch(() => {});
    }
    setFullPhotoUrl(null);
    onChange({
      photoDataUrl: undefined,
      photoStorageKey: undefined,
      photoName: undefined,
      photoUpdatedAt: undefined
    });
  };

  return (
    <div className={compact ? 'space-y-1.5' : 'bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2'}>
      <div className="flex items-center gap-3">
        {activePhotoSrc ? (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className={`group relative shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-white cursor-pointer ${
              compact ? 'w-12 h-12' : 'w-16 h-16'
            }`}
            title={t('በትልቁ ለማየት ይጫኑ', 'Click to view full size')}
          >
            <img
              src={activePhotoSrc}
              alt={name || 'Photo'}
              className="w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-slate-900/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3.5 h-3.5" />
            </span>
          </button>
        ) : (
          <div
            className={`shrink-0 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 ${
              compact ? 'w-12 h-12' : 'w-16 h-16'
            }`}
          >
            <User className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
            <Camera className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="truncate">{t(labelAm, labelEn)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white text-[11px] font-bold cursor-pointer transition">
              <Upload className="w-3 h-3" />
              <span>
                {isUploading
                  ? t('በመጫን ላይ...', 'Uploading...')
                  : activePhotoSrc
                  ? t('ፎቶ ቀይር', 'Change')
                  : t('ፎቶ አስገባ', 'Upload Photo')}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {activePhotoSrc && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold cursor-pointer"
                title={t('ፎቶ አስወግድ', 'Remove photo')}
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('አስወግድ', 'Remove')}</span>
              </button>
            )}
          </div>
          {!compact && value.photoName && (
            <div className="text-[10px] text-slate-500 truncate">{value.photoName}</div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
          {errorMsg}
        </div>
      )}

      {isLightboxOpen && activePhotoSrc && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-200 shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-xs font-extrabold text-slate-900 truncate">
                {name || t(labelAm, labelEn)}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[75vh]">
              <img
                src={activePhotoSrc}
                alt={name || 'Photo'}
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
