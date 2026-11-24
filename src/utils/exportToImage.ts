import { toPng } from 'html-to-image';

export interface ExportElementAsPngOptions {
  element: HTMLElement;
  fileName: string;
  backgroundColor?: string;
  hidePrintHidden?: boolean;
  padding?: number;
}

const sanitizeFileName = (raw: string): string => {
  const cleaned = String(raw || 'report')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_');
  return cleaned.endsWith('.png') ? cleaned : `${cleaned}.png`;
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

const triggerDownload = (url: string, fileName: string) => {
  const link = document.createElement('a');
  link.download = sanitizeFileName(fileName);
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 150);
};

/**
 * Captures any DOM section, report, table, chart, or card as a high-resolution PNG photo
 * cleanly handling Tailwind v4 colors, Recharts SVGs, Ethiopian Amharic typography,
 * horizontally scrollable tables, and live input/select values.
 */
export const exportElementAsPng = async ({
  element,
  fileName,
  backgroundColor = '#ffffff',
  hidePrintHidden = true,
  padding = 16
}: ExportElementAsPngOptions): Promise<void> => {
  if (!element) {
    throw new Error('Export target element not found.');
  }

  // Save & restore live DOM mutations around overflow expansion & form control attributes
  const restoredStyles: {
    el: HTMLElement;
    overflow: string;
    overflowX: string;
    overflowY: string;
    maxWidth: string;
    maxHeight: string;
    width: string;
    padding: string;
    backgroundColor: string;
  }[] = [];

  const restoredAttributes: {
    el: Element;
    attr: string;
    prev: string | null;
  }[] = [];

  const restoredTextContent: {
    el: HTMLTextAreaElement;
    prev: string;
  }[] = [];

  const saveStyle = (el: HTMLElement) => {
    restoredStyles.push({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      maxWidth: el.style.maxWidth,
      maxHeight: el.style.maxHeight,
      width: el.style.width,
      padding: el.style.padding,
      backgroundColor: el.style.backgroundColor
    });
  };

  try {
    // 1. Sync current form control values into DOM attributes so cloneNode preserves them
    element.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
      if (inp.type === 'checkbox' || inp.type === 'radio') {
        restoredAttributes.push({
          el: inp,
          attr: 'checked',
          prev: inp.getAttribute('checked')
        });
        if (inp.checked) inp.setAttribute('checked', '');
        else inp.removeAttribute('checked');
      } else {
        restoredAttributes.push({
          el: inp,
          attr: 'value',
          prev: inp.getAttribute('value')
        });
        inp.setAttribute('value', inp.value);
      }
    });

    element.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((ta) => {
      restoredTextContent.push({ el: ta, prev: ta.textContent || '' });
      ta.textContent = ta.value;
    });

    element.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
      Array.from(sel.options).forEach((opt) => {
        restoredAttributes.push({
          el: opt,
          attr: 'selected',
          prev: opt.getAttribute('selected')
        });
        if (opt.selected) opt.setAttribute('selected', 'selected');
        else opt.removeAttribute('selected');
      });
    });

    // 2. Temporarily expand scrollable containers so wide/tall tables & modals aren't clipped
    const scrollContainers = Array.from(
      element.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-auto, .overflow-y-auto')
    );

    let maxScrollW = element.scrollWidth;
    scrollContainers.forEach((sc) => {
      if (sc.scrollWidth > maxScrollW) {
        maxScrollW = sc.scrollWidth;
      }
      saveStyle(sc);
      sc.style.overflow = 'visible';
      sc.style.overflowX = 'visible';
      sc.style.overflowY = 'visible';
      sc.style.maxWidth = 'none';
      sc.style.maxHeight = 'none';
    });

    saveStyle(element);
    const currentW = element.getBoundingClientRect().width || element.offsetWidth;
    const needsExpand = maxScrollW > currentW + 8;
    const captureWidth = Math.min(
      3400,
      Math.max(Math.ceil(needsExpand ? maxScrollW : currentW), 320)
    );

    if (needsExpand) {
      element.style.width = `${captureWidth}px`;
      element.style.maxWidth = 'none';
    }
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.overflowX = 'visible';
    element.style.overflowY = 'visible';
    if (!element.style.backgroundColor) {
      element.style.backgroundColor = backgroundColor;
    }
    if (padding > 0 && !element.style.padding) {
      element.style.padding = `${padding}px`;
    }

    // Give browser one paint frame if expanded so layout settles cleanly
    if (needsExpand) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    const rect = element.getBoundingClientRect();
    const finalW = Math.ceil(Math.max(rect.width, element.scrollWidth, captureWidth));
    const finalH = Math.ceil(Math.max(rect.height, element.scrollHeight));

    // Stay safely within mobile Safari / Chrome canvas backing-store limits
    const maxDim = Math.max(finalW, finalH);
    const pixelRatio =
      maxDim * 2 > 4200 || finalW * finalH * 4 > 14_000_000 ? 1.25 : 2;

    const filterFn = (node: HTMLElement): boolean => {
      if (!node || node.nodeType !== 1) return true;
      if (node.getAttribute?.('data-photo-hide') === 'true') return false;
      if (hidePrintHidden && node.classList?.contains('print:hidden')) return false;
      return true;
    };

    const options = {
      backgroundColor,
      pixelRatio,
      width: finalW,
      height: finalH,
      cacheBust: true,
      filter: filterFn,
      style: {
        margin: '0'
      }
    };

    let dataUrl: string;
    try {
      dataUrl = await toPng(element, options);
    } catch {
      // Fallback if external Google Font stylesheets block cssRules inspection in strict sandboxes
      dataUrl = await toPng(element, { ...options, skipFonts: true });
    }

    const blob = await dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);
    triggerDownload(blobUrl, fileName);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } finally {
    // 3. Always restore original DOM state cleanly
    for (let i = restoredStyles.length - 1; i >= 0; i--) {
      const s = restoredStyles[i];
      s.el.style.overflow = s.overflow;
      s.el.style.overflowX = s.overflowX;
      s.el.style.overflowY = s.overflowY;
      s.el.style.maxWidth = s.maxWidth;
      s.el.style.maxHeight = s.maxHeight;
      s.el.style.width = s.width;
      s.el.style.padding = s.padding;
      s.el.style.backgroundColor = s.backgroundColor;
    }
    restoredTextContent.forEach(({ el, prev }) => {
      el.textContent = prev;
    });
    restoredAttributes.forEach(({ el, attr, prev }) => {
      if (prev === null) el.removeAttribute(attr);
      else el.setAttribute(attr, prev);
    });
  }
};
