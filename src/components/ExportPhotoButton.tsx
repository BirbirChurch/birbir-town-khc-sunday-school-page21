import React, { useState } from 'react';
import { Camera, Check, Loader2 } from 'lucide-react';
import { exportElementAsPng } from '../utils/exportToImage';
import { useLanguage } from '../context/LanguageContext';

interface ExportPhotoButtonProps {
  targetRef?: React.RefObject<HTMLElement | null>;
  targetSelector?: string;
  fileName: string;
  labelAm?: string;
  labelEn?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'dark' | 'indigo' | 'secondary' | 'subtle';
  compact?: boolean;
  hidePrintHidden?: boolean;
  padding?: number;
}

export const ExportPhotoButton: React.FC<ExportPhotoButtonProps> = ({
  targetRef,
  targetSelector,
  fileName,
  labelAm = 'በፎቶ አውርድ (PNG)',
  labelEn = 'Save Photo (PNG)',
  className,
  variant = 'default',
  compact = false,
  hidePrintHidden = true,
  padding = 16
}) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (status === 'capturing') return;
    let targetEl: HTMLElement | null = targetRef?.current || null;
    if (!targetEl && targetSelector) {
      targetEl = document.querySelector<HTMLElement>(targetSelector);
    }
    if (!targetEl) {
      // Fallback: nearest exportable card/section or workspace container
      targetEl =
        (e.currentTarget.closest('[data-photo-export-container]') as HTMLElement | null) ||
        (e.currentTarget.closest('section') as HTMLElement | null) ||
        document.querySelector<HTMLElement>('[data-photo-export-root]') ||
        document.querySelector<HTMLElement>('main');
    }
    if (!targetEl) return;

    setStatus('capturing');
    try {
      await exportElementAsPng({
        element: targetEl,
        fileName,
        hidePrintHidden,
        padding
      });
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2200);
    } catch (err) {
      console.error('Failed to export photo PNG:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  const baseStyles =
    compact || variant === 'compact'
      ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 print:hidden'
      : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 print:hidden';

  const themeStyles =
    status === 'done'
      ? 'bg-emerald-700 text-white border border-emerald-700'
      : status === 'error'
      ? 'bg-rose-600 text-white border border-rose-600'
      : variant === 'dark'
      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
      : variant === 'indigo'
      ? 'bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-700'
      : variant === 'secondary'
      ? 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs'
      : variant === 'subtle'
      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
      : 'bg-sky-700 hover:bg-sky-600 text-white border border-sky-700';

  return (
    <button
      type="button"
      data-photo-hide="true"
      onClick={handleClick}
      disabled={status === 'capturing'}
      className={className || `${baseStyles} ${themeStyles}`}
      title={t(
        'ይህን መረጃ በፎቶ (PNG) አውርደው በስልክዎ ያስቀምጡ ወይም ያጋሩ',
        'Download this report as a PNG photo for easy saving and sharing'
      )}
    >
      {status === 'capturing' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : status === 'done' ? (
        <Check className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Camera className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>
        {status === 'capturing'
          ? t('በማዘጋጀት ላይ...', 'Saving...')
          : status === 'done'
          ? t('ፎቶ ወርዷል ✓', 'Saved PNG ✓')
          : status === 'error'
          ? t('እንደገና ይሞክሩ', 'Retry Photo')
          : t(labelAm, labelEn)}
      </span>
    </button>
  );
};
