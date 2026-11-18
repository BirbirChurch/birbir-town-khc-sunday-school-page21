import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react';
import { loadAttachmentDataUrl } from '../services/attachmentStorage';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface InlineDocumentViewerProps {
  fileName: string;
  dataUrl?: string;
  storageKey?: string;
}

type DocKind = 'pdf' | 'excel' | 'word_docx' | 'word_doc' | 'rtf' | 'image' | 'text' | 'unknown';

interface ParsedSheet {
  name: string;
  rows: string[][];
}

const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return new TextEncoder().encode(dataUrl);
  }
  const meta = dataUrl.slice(0, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);

  if (meta.includes(';base64')) {
    const binary = atob(payload);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return new TextEncoder().encode(decodeURIComponent(payload));
};

const detectDocKind = (fileName: string, dataUrl: string): DocKind => {
  const lower = (fileName || '').toLowerCase();
  const mime = (dataUrl || '').slice(0, 90).toLowerCase();

  if (lower.endsWith('.pdf') || mime.includes('application/pdf')) return 'pdf';
  if (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsm') ||
    lower.endsWith('.xlsb') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.ods') ||
    mime.includes('spreadsheetml') ||
    mime.includes('ms-excel') ||
    mime.includes('text/csv')
  ) {
    return 'excel';
  }
  if (lower.endsWith('.docx') || mime.includes('wordprocessingml')) return 'word_docx';
  if (lower.endsWith('.doc') || mime.includes('application/msword')) return 'word_doc';
  if (lower.endsWith('.rtf') || mime.includes('application/rtf') || mime.includes('text/rtf')) {
    return 'rtf';
  }
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.bmp') ||
    lower.endsWith('.svg') ||
    mime.startsWith('data:image/')
  ) {
    return 'image';
  }
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.json') ||
    lower.endsWith('.xml') ||
    lower.endsWith('.log') ||
    mime.startsWith('data:text/')
  ) {
    return 'text';
  }
  return 'unknown';
};

const decodeRtfToPlainText = (rtfStr: string): string => {
  // Decode RTF \uN Unicode sequences (important for Ethiopic script!) and strip control words
  let s = rtfStr.replace(/\{\\\*\\[^}]*\}/g, '');
  s = s.replace(/\\u(-?\d+)\??/g, (_, codeStr) => {
    let code = parseInt(codeStr, 10);
    if (code < 0) code += 65536;
    return String.fromCharCode(code);
  });
  s = s.replace(/\\par\b|\\line\b/g, '\n');
  s = s.replace(/\\tab\b/g, '\t');
  s = s.replace(/\\'[0-9a-fA-F]{2}/g, '');
  s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
  s = s.replace(/[{}]/g, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
};

const extractReadableStringsFromLegacyDoc = (bytes: Uint8Array): string => {
  const chunks: string[] = [];
  let current = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    const isReadable =
      code === 10 ||
      code === 13 ||
      code === 9 ||
      (code >= 32 && code <= 126) ||
      (code >= 0x1200 && code <= 0x137f);
    if (isReadable) {
      current += String.fromCharCode(code);
    } else {
      if (current.trim().length >= 5) {
        chunks.push(current.trim());
      }
      current = '';
    }
  }
  if (current.trim().length >= 5) chunks.push(current.trim());

  const combined = chunks.join('\n').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (combined.trim().length > 15) return combined.trim();

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const asciiMatches = utf8.match(/[\u1200-\u137F\w\s.,:;!?()\-"'/%]{5,}/g) || [];
  return asciiMatches.join('\n').trim();
};

export const InlineDocumentViewer: React.FC<InlineDocumentViewerProps> = ({
  fileName,
  dataUrl: inlineDataUrl,
  storageKey
}) => {
  const [resolvedDataUrl, setResolvedDataUrl] = useState<string>(inlineDataUrl || '');
  const docKind = useMemo(
    () => detectDocKind(fileName, resolvedDataUrl || inlineDataUrl || ''),
    [fileName, resolvedDataUrl, inlineDataUrl]
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1.15);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Excel state
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);

  // Word state
  const [wordHtml, setWordHtml] = useState('');
  const [wordPlainFallback, setWordPlainFallback] = useState('');

  // Text state
  const [textContent, setTextContent] = useState('');

  // PDF state
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [pdfUseIframeFallback, setPdfUseIframeFallback] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Step 1: Resolve full Data URL from inline fallback, Memory, IndexedDB, or Cloud Firestore chunks
  useEffect(() => {
    let active = true;
    const fetchContent = async () => {
      if (inlineDataUrl) {
        setResolvedDataUrl(inlineDataUrl);
        return;
      }
      if (!storageKey) {
        setResolvedDataUrl('');
        return;
      }
      setLoading(true);
      setErrorMsg('');
      const fetched = await loadAttachmentDataUrl(storageKey, inlineDataUrl);
      if (!active) return;
      if (fetched) {
        setResolvedDataUrl(fetched);
      } else {
        setErrorMsg('የተያያዘውን ፋይል ከዳታቤዝ ማምጣት አልተቻለም። እባክዎ ኢንተርኔትዎን ወይም ዋና አዲሚንን ያረጋግጡ።');
        setLoading(false);
      }
    };
    fetchContent();
    return () => {
      active = false;
    };
  }, [inlineDataUrl, storageKey]);

  // Step 2: Parse & render the resolved file directly inline
  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl = '';

    const loadDocument = async () => {
      setErrorMsg('');
      setSheets([]);
      setActiveSheetIdx(0);
      setWordHtml('');
      setWordPlainFallback('');
      setTextContent('');
      setPdfNumPages(0);
      setPdfBlobUrl('');

      if (!resolvedDataUrl) return;
      setLoading(true);

      try {
        const bytes = dataUrlToBytes(resolvedDataUrl);

        if (docKind === 'excel') {
          const wb = XLSX.read(bytes, { type: 'array', cellDates: true });
          const parsed: ParsedSheet[] = wb.SheetNames.map((name) => {
            const ws = wb.Sheets[name];
            const aoa = XLSX.utils.sheet_to_json<any[]>(ws, {
              header: 1,
              defval: '',
              raw: false
            });
            const maxCols = aoa.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 1);
            const normalizedRows = aoa.map((r) => {
              const arr = Array.isArray(r) ? r : [];
              const padded: string[] = [];
              for (let c = 0; c < maxCols; c++) {
                const v = arr[c];
                padded.push(v === undefined || v === null ? '' : String(v));
              }
              return padded;
            });
            return { name, rows: normalizedRows };
          });
          if (!cancelled) {
            setSheets(parsed);
            setActiveSheetIdx(0);
          }
        } else if (docKind === 'word_docx' || docKind === 'word_doc' || docKind === 'rtf') {
          const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK zip header
          const headStr = new TextDecoder('utf-8', { fatal: false })
            .decode(bytes.slice(0, 400))
            .toLowerCase();

          if (docKind === 'word_docx' || isZip) {
            const copy = new Uint8Array(bytes.byteLength);
            copy.set(bytes);
            const result = await mammoth.convertToHtml(
              { arrayBuffer: copy.buffer },
              { convertImage: mammoth.images.dataUri }
            );
            if (!cancelled) {
              setWordHtml(result.value || '<p>(ባዶ ሰነድ)</p>');
            }
          } else if (headStr.includes('{\\rtf') || docKind === 'rtf') {
            const fullRtf = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            if (!cancelled) setWordPlainFallback(decodeRtfToPlainText(fullRtf));
          } else if (headStr.includes('<html') || headStr.includes('<body')) {
            const fullStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            if (!cancelled) setWordHtml(fullStr);
          } else {
            const extracted = extractReadableStringsFromLegacyDoc(bytes);
            if (!cancelled) {
              setWordPlainFallback(
                extracted ||
                  'ይህ የድሮ Word (.doc) ፋይል በቀጥታ ለመተርጎም አልተቻለም። እባክዎን በ .docx ወይም .pdf ይላኩ።'
              );
            }
          }
        } else if (docKind === 'text') {
          const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          if (!cancelled) setTextContent(decoded);
        } else if (docKind === 'pdf') {
          const pdfCopy = new Uint8Array(bytes.byteLength);
          pdfCopy.set(bytes);
          const blob = new Blob([pdfCopy.buffer], {
            type: 'application/pdf'
          });
          createdBlobUrl = URL.createObjectURL(blob);
          if (!cancelled) setPdfBlobUrl(createdBlobUrl);

          if (!pdfUseIframeFallback) {
            try {
              const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
              const pdf = await loadingTask.promise;
              if (cancelled) return;
              setPdfNumPages(pdf.numPages);

              const container = pdfContainerRef.current;
              if (container) {
                container.innerHTML = '';
                const dpr = Math.min(window.devicePixelRatio || 1, 2);

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                  if (cancelled) return;
                  const page = await pdf.getPage(pageNum);
                  const viewport = page.getViewport({ scale: zoom });

                  const wrapper = document.createElement('div');
                  wrapper.className = 'mb-4 flex flex-col items-center';

                  const label = document.createElement('div');
                  label.className = 'text-[11px] font-bold text-slate-500 mb-1.5';
                  label.textContent = `ገጽ ${pageNum} / ${pdf.numPages}`;
                  wrapper.appendChild(label);

                  const canvas = document.createElement('canvas');
                  canvas.width = Math.floor(viewport.width * dpr);
                  canvas.height = Math.floor(viewport.height * dpr);
                  canvas.style.width = `${Math.floor(viewport.width)}px`;
                  canvas.style.maxWidth = '100%';
                  canvas.style.height = 'auto';
                  canvas.className = 'bg-white border border-slate-200 rounded-lg shadow-sm';

                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
                  }

                  wrapper.appendChild(canvas);
                  container.appendChild(wrapper);
                }
              }
            } catch (pdfErr) {
              console.warn('PDF.js canvas fallback triggered:', pdfErr);
              if (!cancelled) setPdfUseIframeFallback(true);
            }
          }
        }
      } catch (err: any) {
        console.error('InlineDocumentViewer error:', err);
        if (!cancelled) {
          setErrorMsg(
            err?.message
              ? `ሰነዱን በቀጥታ ለመክፈት ችግር አጋጥሟል፦ ${err.message}`
              : 'ሰነዱን በቀጥታ ለመክፈት ችግር አጋጥሟል።'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [fileName, resolvedDataUrl, docKind, zoom, pdfUseIframeFallback]);

  const activeSheet = sheets[activeSheetIdx];

  const getKindBadge = () => {
    switch (docKind) {
      case 'pdf':
        return { label: 'PDF ሰነድ', icon: FileText, cls: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'excel':
        return { label: 'Excel ሰንጠረዥ', icon: FileSpreadsheet, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'word_docx':
      case 'word_doc':
      case 'rtf':
        return { label: 'Word ሰነድ', icon: FileText, cls: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'image':
        return { label: 'ምስል', icon: ImageIcon, cls: 'text-purple-700 bg-purple-50 border-purple-200' };
      default:
        return { label: 'ሰነድ', icon: FileText, cls: 'text-slate-700 bg-slate-100 border-slate-200' };
    }
  };

  const badge = getKindBadge();
  const BadgeIcon = badge.icon;

  return (
    <div
      className={
        isExpanded
          ? 'fixed inset-3 z-[60] bg-white rounded-2xl border border-slate-300 shadow-2xl flex flex-col overflow-hidden'
          : 'border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden'
      }
    >
      {/* Document Reader Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold shrink-0 ${badge.cls}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </span>
          <span className="text-xs font-extrabold text-slate-900 truncate">{fileName}</span>
          {docKind === 'pdf' && pdfNumPages > 0 && (
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
              ({pdfNumPages} ገጽ)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {docKind === 'pdf' && pdfBlobUrl && (
            <button
              type="button"
              onClick={() => setPdfUseIframeFallback((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
              title="የPDF ማሳያ ዘዴ ቀይር"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{pdfUseIframeFallback ? 'የገጽ ካንቫስ እይታ' : 'የብራውዘር PDF እይታ'}</span>
            </button>
          )}

          {(docKind === 'pdf' || docKind === 'image') && !pdfUseIframeFallback && (
            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg px-1.5 py-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.2).toFixed(2))))}
                className="p-1 rounded hover:bg-white text-slate-700 cursor-pointer"
                title="አሳንስ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-slate-700 tabular-nums px-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.2).toFixed(2))))}
                className="p-1 rounded hover:bg-white text-slate-700 cursor-pointer"
                title="አጉላ"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer"
            title={isExpanded ? 'መደበኛ መጠን' : 'ሙሉ ስክሪን'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isExpanded ? 'አሳንስ' : 'በሙሉ ስክሪን አንብብ'}</span>
          </button>

          {resolvedDataUrl && (
            <a
              href={resolvedDataUrl}
              download={fileName}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white"
              title="ቅጂ አውርድ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>አውርድ</span>
            </a>
          )}
        </div>
      </div>

      {/* Excel Multi-Sheet Switcher */}
      {docKind === 'excel' && sheets.length > 1 && (
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
          {sheets.map((s, idx) => (
            <button
              key={`${s.name}_${idx}`}
              type="button"
              onClick={() => setActiveSheetIdx(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                idx === activeSheetIdx
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.name} ({s.rows.length})
            </button>
          ))}
        </div>
      )}

      {/* Main Inline Reader Canvas / Viewport */}
      <div
        className={`overflow-auto p-4 ${
          isExpanded ? 'flex-1 bg-slate-100' : 'max-h-[62vh] bg-slate-100/70'
        }`}
      >
        {loading && (
          <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-blue-800" />
            <span>ሰነዱን በመክፈት ላይ ነው...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PDF Inline Reader */}
        {docKind === 'pdf' && !pdfUseIframeFallback && (
          <div ref={pdfContainerRef} className="w-full" />
        )}
        {docKind === 'pdf' && pdfUseIframeFallback && pdfBlobUrl && (
          <iframe
            src={pdfBlobUrl}
            title={fileName}
            className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white"
          />
        )}

        {/* Excel Inline Table */}
        {docKind === 'excel' && activeSheet && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
            {activeSheet.rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">ይህ ሉህ (Sheet) ባዶ ነው።</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-900 text-white sticky top-0 z-10">
                    <th className="py-2 px-2.5 text-center border-r border-emerald-800 w-10 tabular-nums">
                      #
                    </th>
                    {activeSheet.rows[0].map((cell, cIdx) => (
                      <th
                        key={cIdx}
                        className="py-2 px-3 text-left font-bold border-r border-emerald-800 whitespace-nowrap"
                      >
                        {cell || `ዓምድ ${cIdx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeSheet.rows.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="py-2 px-2.5 text-center text-slate-400 border-r border-slate-200 tabular-nums">
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="py-2 px-3 text-slate-800 border-r border-slate-200 whitespace-pre-wrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Word (.docx) Rich HTML Reader */}
        {(docKind === 'word_docx' || docKind === 'word_doc') && wordHtml && (
          <div
            className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto text-sm text-slate-900 leading-relaxed shadow-xs [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-3 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:my-2"
            dangerouslySetInnerHTML={{ __html: wordHtml }}
          />
        )}

        {/* Legacy .doc / .rtf Text Fallback */}
        {(docKind === 'word_doc' || docKind === 'rtf') && !wordHtml && wordPlainFallback && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-3xl mx-auto space-y-3">
            {docKind === 'word_doc' && (
              <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ማሳሰቢያ፦ ይህ የድሮ Word (.doc) ፎርማት ስለሆነ ጽሑፉ ተለይቶ ቀርቧል። ሙሉ ሰንጠረዥና ቅርጽ እንዲታይ በ .docx ወይም .pdf መላክ ይመከራል።
              </div>
            )}
            <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {wordPlainFallback}
            </div>
          </div>
        )}

        {/* Image Viewer */}
        {docKind === 'image' && resolvedDataUrl && (
          <div className="flex justify-center">
            <img
              src={resolvedDataUrl}
              alt={fileName}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              className="max-w-full rounded-xl border border-slate-200 bg-white shadow-sm transition-transform"
            />
          </div>
        )}

        {/* Plain Text Viewer */}
        {docKind === 'text' && (
          <pre className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-w-3xl mx-auto">
            {textContent}
          </pre>
        )}

        {/* Fallback for unsupported binary formats */}
        {docKind === 'unknown' && !loading && !errorMsg && resolvedDataUrl && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-600 space-y-3">
            <p className="font-bold text-slate-800">
              ይህ የፋይል ዓይነት ({fileName}) በቀጥታ ለማንበብ አልተደገፈም።
            </p>
            <a
              href={resolvedDataUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white font-bold hover:bg-blue-800"
            >
              <Download className="w-4 h-4" />
              <span>ፋይሉን አውርደው ይክፈቱ</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
