import React, { useMemo, useState } from 'react';
import {
  Send,
  FileText,
  ClipboardList,
  Mail,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowUpRight,
  Search,
  Eye,
  Paperclip,
  Download,
  Printer,
  Trash2,
  Edit2,
  X,
  Plus,
  Building2,
  Check,
  Loader2
} from 'lucide-react';
import {
  AnnualPlanItem,
  MinistrySubmission,
  OrgUnitId,
  SubmissionAttachment,
  SubmissionStatus,
  SubmissionType
} from '../types';
import { CHURCH_ORG_UNITS } from '../constants/churchStructure';
import { InlineDocumentViewer } from './InlineDocumentViewer';
import { deleteAttachmentFile, saveAttachmentFile } from '../services/attachmentStorage';

export type SubmissionsPanelMode =
  | 'sender'
  | 'spiritual_council'
  | 'admin_dept'
  | 'elders_overview';

interface MinistrySubmissionsPanelProps {
  mode: SubmissionsPanelMode;
  unitId: OrgUnitId;
  unitName: string;
  currentYear: string;
  submissions: MinistrySubmission[];
  availablePlans?: AnnualPlanItem[];
  activitiesSummaryText?: string;
  lockedChapel?: string | null;
  initialViewFilter?: 'all' | 'pending' | 'approved' | 'forwarded';
  onCreateSubmission?: (
    payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>
  ) => void;
  onResubmitSubmission?: (id: number, updates: Partial<MinistrySubmission>) => void;
  onDeleteSubmission?: (id: number) => void;
  onSpiritualApprove?: (
    id: number,
    note?: string,
    forwardToAdmin?: boolean,
    forwardNote?: string
  ) => void;
  onSpiritualReturn?: (id: number, note: string) => void;
  onForwardToAdmin?: (id: number, note?: string) => void;
  onAdminAcknowledge?: (id: number, note?: string) => void;
}

const TYPE_META: Record<
  SubmissionType,
  { label: string; icon: React.ComponentType<{ className?: string }>; textClass: string }
> = {
  plan: { label: 'ዕቅድ', icon: ClipboardList, textClass: 'text-blue-800' },
  report: { label: 'ሪፖርት', icon: FileText, textClass: 'text-emerald-800' },
  letter: { label: 'ደብዳቤ', icon: Mail, textClass: 'text-amber-800' }
};

const STATUS_META: Record<
  SubmissionStatus,
  { label: string; textClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending_spiritual: {
    label: 'ለመንፈሳዊ ዘርፍ ቀርቧል (በመጠባበቅ ላይ)',
    textClass: 'text-amber-800',
    icon: Clock
  },
  returned_by_spiritual: {
    label: 'ማስተካከያ ተጠይቋል',
    textClass: 'text-rose-700',
    icon: RotateCcw
  },
  approved_spiritual: {
    label: 'በመንፈሳዊ ዘርፍ ጸድቋል',
    textClass: 'text-emerald-800',
    icon: CheckCircle2
  },
  forwarded_to_admin: {
    label: 'ጸድቆ ለአስተዳደር ዘርፍ ተልኳል',
    textClass: 'text-indigo-800',
    icon: ArrowUpRight
  },
  acknowledged_by_admin: {
    label: 'በአስተዳደር ዘርፍ ተቀብሏል',
    textClass: 'text-teal-800',
    icon: Check
  }
};

export const MinistrySubmissionsPanel: React.FC<MinistrySubmissionsPanelProps> = ({
  mode,
  unitId,
  unitName,
  currentYear,
  submissions,
  availablePlans = [],
  activitiesSummaryText = '',
  lockedChapel = null,
  initialViewFilter = 'all',
  onCreateSubmission,
  onResubmitSubmission,
  onDeleteSubmission,
  onSpiritualApprove,
  onSpiritualReturn,
  onForwardToAdmin,
  onAdminAcknowledge
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SubmissionType>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'pending' | 'approved' | 'forwarded'>(
    initialViewFilter
  );

  // Compose / Edit Modal state (for sender mode)
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [cType, setCType] = useState<SubmissionType>('plan');
  const [cTitle, setCTitle] = useState('');
  const [cYear, setCYear] = useState(currentYear);
  const [cPeriod, setCPeriod] = useState('1ኛ ሩብ ዓመት');
  const [cRefNo, setCRefNo] = useState('');
  const [cSenderPerson, setCSenderPerson] = useState('');
  const [cContent, setCContent] = useState('');
  const [cAttachPlans, setCAttachPlans] = useState(false);
  const [cAttachments, setCAttachments] = useState<SubmissionAttachment[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isSubmittingFiles, setIsSubmittingFiles] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Detail / Review / Forward Modal state
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [activeAttachmentIdx, setActiveAttachmentIdx] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [adminActionNote, setAdminActionNote] = useState('');
  const [forwardModalSubId, setForwardModalSubId] = useState<number | null>(null);

  const selectedSub = useMemo(
    () => submissions.find((s) => s.id === selectedSubId) || null,
    [submissions, selectedSubId]
  );

  const getSubmissionAttachments = (sub: MinistrySubmission): SubmissionAttachment[] => {
    if (Array.isArray(sub.attachments) && sub.attachments.length > 0) {
      return sub.attachments;
    }
    if (sub.attachmentName && (sub.attachmentDataUrl || sub.attachmentKey)) {
      return [
        {
          id: `legacy_${sub.id}`,
          name: sub.attachmentName,
          dataUrl: sub.attachmentDataUrl,
          storageKey: sub.attachmentKey
        }
      ];
    }
    return [];
  };

  const selectedAttachments = useMemo(
    () => (selectedSub ? getSubmissionAttachments(selectedSub) : []),
    [selectedSub]
  );

  const forwardModalSub = useMemo(
    () => submissions.find((s) => s.id === forwardModalSubId) || null,
    [submissions, forwardModalSubId]
  );

  // Scope submissions by mode
  const scopedSubmissions = useMemo(() => {
    const sorted = [...submissions].sort((a, b) =>
      (b.submittedAt || '').localeCompare(a.submittedAt || '')
    );

    if (mode === 'sender') {
      return sorted.filter((s) => {
        if (s.senderUnitId !== unitId) return false;
        if (lockedChapel) return s.senderChapel === lockedChapel;
        return true;
      });
    }

    if (mode === 'admin_dept') {
      return sorted.filter(
        (s) =>
          s.forwardedToAdmin ||
          s.status === 'forwarded_to_admin' ||
          s.status === 'acknowledged_by_admin'
      );
    }

    return sorted;
  }, [submissions, mode, unitId, lockedChapel]);

  // KPI metrics
  const kpis = useMemo(() => {
    const pending = scopedSubmissions.filter((s) => s.status === 'pending_spiritual').length;
    const returned = scopedSubmissions.filter((s) => s.status === 'returned_by_spiritual').length;
    const approvedSpiritual = scopedSubmissions.filter(
      (s) =>
        s.status === 'approved_spiritual' ||
        s.status === 'forwarded_to_admin' ||
        s.status === 'acknowledged_by_admin'
    ).length;
    const forwardedAdmin = scopedSubmissions.filter(
      (s) =>
        s.forwardedToAdmin ||
        s.status === 'forwarded_to_admin' ||
        s.status === 'acknowledged_by_admin'
    ).length;
    const adminDone = scopedSubmissions.filter((s) => s.status === 'acknowledged_by_admin').length;
    return {
      total: scopedSubmissions.length,
      pending,
      returned,
      approvedSpiritual,
      forwardedAdmin,
      adminPending: Math.max(0, forwardedAdmin - adminDone),
      adminDone
    };
  }, [scopedSubmissions]);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedSubmissions.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (unitFilter !== 'all' && s.senderUnitId !== unitFilter) return false;

      if (mode === 'spiritual_council') {
        if (viewFilter === 'pending' && s.status !== 'pending_spiritual') return false;
        if (
          viewFilter === 'approved' &&
          s.status !== 'approved_spiritual' &&
          s.status !== 'forwarded_to_admin' &&
          s.status !== 'acknowledged_by_admin'
        ) {
          return false;
        }
        if (viewFilter === 'forwarded' && !s.forwardedToAdmin) return false;
      } else if (mode === 'admin_dept') {
        if (viewFilter === 'pending' && s.status !== 'forwarded_to_admin') return false;
        if (viewFilter === 'approved' && s.status !== 'acknowledged_by_admin') return false;
      }

      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.senderUnitName.toLowerCase().includes(q) ||
        (s.senderChapel || '').toLowerCase().includes(q) ||
        (s.referenceNumber || '').toLowerCase().includes(q) ||
        (s.senderPersonName || '').toLowerCase().includes(q)
      );
    });
  }, [scopedSubmissions, typeFilter, unitFilter, viewFilter, searchQuery, mode]);

  const distinctSenders = useMemo(() => {
    const ids = Array.from(new Set(scopedSubmissions.map((s) => s.senderUnitId)));
    return CHURCH_ORG_UNITS.filter((u) => ids.includes(u.id));
  }, [scopedSubmissions]);

  const showTempFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  const openNewCompose = (defaultType: SubmissionType = 'plan') => {
    setEditingSubId(null);
    setCType(defaultType);
    setCTitle('');
    setCYear(currentYear);
    setCPeriod(defaultType === 'letter' ? 'መደበኛ ደብዳቤ' : '1ኛ ሩብ ዓመት');
    setCRefNo('');
    setCSenderPerson('');
    setCContent('');
    setCAttachPlans(false);
    setCAttachments([]);
    setIsReadingFiles(false);
    setIsSubmittingFiles(false);
    setComposeError('');
    setIsComposeOpen(true);
  };

  const openEditForResubmit = (sub: MinistrySubmission) => {
    setEditingSubId(sub.id);
    setCType(sub.type);
    setCTitle(sub.title);
    setCYear(sub.year);
    setCPeriod(sub.period || 'መደበኛ');
    setCRefNo(sub.referenceNumber || '');
    setCSenderPerson(sub.senderPersonName || '');
    setCContent(sub.content);
    setCAttachPlans(Boolean(sub.attachedPlans && sub.attachedPlans.length > 0));
    setCAttachments(getSubmissionAttachments(sub));
    setIsReadingFiles(false);
    setIsSubmittingFiles(false);
    setComposeError('');
    setIsComposeOpen(true);
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`"${file.name}" ማንበብ አልተቻለም`));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const MAX_PER_FILE = 15 * 1024 * 1024; // 15 MB per file
    const oversized = files.find((f) => f.size > MAX_PER_FILE);
    if (oversized) {
      setComposeError(`"${oversized.name}" ከ15 MB በላይ ስለሆነ መቀነስ አለበት።`);
      e.target.value = '';
      return;
    }

    setComposeError('');
    setIsReadingFiles(true);
    try {
      const loaded: SubmissionAttachment[] = [];
      for (const f of files) {
        const dataUrl = await readFileAsDataUrl(f);
        const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        loaded.push({
          id: uid,
          name: f.name,
          size: f.size,
          mimeType: f.type || undefined,
          storageKey: `att_${uid}`,
          dataUrl
        });
      }
      setCAttachments((prev) => [...prev, ...loaded]);
    } catch (err: any) {
      setComposeError(err?.message || 'ፋይሉን በማንበብ ላይ ችግር አጋጥሟል።');
    } finally {
      setIsReadingFiles(false);
      e.target.value = '';
    }
  };

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstFileName = cAttachments[0]?.name || '';
    const resolvedContent =
      cContent.trim() ||
      (cAttachments.length > 0
        ? `ከዚህ ጋር የተያያዙ ሰነዶችን (${cAttachments.map((a) => a.name).join('፣ ')}) ይመልከቱ።`
        : '');

    if (!cTitle.trim() || !resolvedContent) {
      setComposeError('እባክዎን ርዕስ እና ዝርዝር ይዘት (ወይም ሰነድ) ያስገቡ።');
      return;
    }

    setIsSubmittingFiles(true);
    setComposeError('');

    try {
      const persistedAttachments: SubmissionAttachment[] = [];
      for (const att of cAttachments) {
        const storageKey = att.storageKey || `att_${att.id}`;
        if (att.dataUrl) {
          await saveAttachmentFile(storageKey, att.name, att.dataUrl);
        }
        // Keep dataUrl inline ONLY for small files (<40KB); larger files live intact in IndexedDB + Cloud chunks
        const keepInline = att.dataUrl && att.dataUrl.length <= 40000 ? att.dataUrl : undefined;
        persistedAttachments.push({
          id: att.id,
          name: att.name,
          size: att.size,
          mimeType: att.mimeType,
          storageKey,
          dataUrl: keepInline
        });
      }

      const primaryAtt = persistedAttachments[0];
      const attachedPlansSnapshot = cAttachPlans && availablePlans.length > 0 ? availablePlans : undefined;

      if (editingSubId && onResubmitSubmission) {
        onResubmitSubmission(editingSubId, {
          type: cType,
          title: cTitle.trim(),
          year: cYear,
          period: cPeriod.trim() || undefined,
          referenceNumber: cRefNo.trim() || undefined,
          senderPersonName: cSenderPerson.trim() || undefined,
          content: resolvedContent,
          attachedPlans: attachedPlansSnapshot,
          attachmentName: primaryAtt?.name,
          attachmentKey: primaryAtt?.storageKey,
          attachmentDataUrl: primaryAtt?.dataUrl,
          attachments: persistedAttachments.length > 0 ? persistedAttachments : undefined,
          status: 'pending_spiritual'
        });
        setIsComposeOpen(false);
        showTempFeedback('ተስተካክሎ በድጋሚ ለመንፈሳዊ ዘርፍ ጉባኤ ተልኳል።');
        return;
      }

      if (onCreateSubmission) {
        onCreateSubmission({
          type: cType,
          title: cTitle.trim(),
          year: cYear,
          period: cPeriod.trim() || undefined,
          referenceNumber: cRefNo.trim() || undefined,
          content: resolvedContent,
          senderUnitId: unitId,
          senderUnitName: unitName,
          senderChapel: lockedChapel || undefined,
          senderPersonName: cSenderPerson.trim() || undefined,
          attachedPlans: attachedPlansSnapshot,
          attachmentName: primaryAtt?.name,
          attachmentKey: primaryAtt?.storageKey,
          attachmentDataUrl: primaryAtt?.dataUrl,
          attachments: persistedAttachments.length > 0 ? persistedAttachments : undefined
        });
        setIsComposeOpen(false);
        showTempFeedback(
          `${TYPE_META[cType].label} "${cTitle.trim()}"${firstFileName ? ` (${persistedAttachments.length} ፋይል)` : ''} ለመንፈሳዊ ዘርፍ ጉባኤ በተሳካ ሁኔታ ተልኳል።`
        );
      }
    } catch (err: any) {
      setComposeError(err?.message || 'ፋይሎቹን በመላክ ላይ ችግር አጋጥሟል።');
    } finally {
      setIsSubmittingFiles(false);
    }
  };

  const openDetailModal = (sub: MinistrySubmission) => {
    setSelectedSubId(sub.id);
    setActiveAttachmentIdx(0);
    setReviewNote(sub.spiritualNote || '');
    setForwardNote(sub.forwardedToAdminNote || '');
    setAdminActionNote(sub.adminNote || '');
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {mode === 'sender' && 'ዕቅድ፣ ሪፖርት እና ደብዳቤ ለመንፈሳዊ ዘርፍ መላኪያ'}
              {mode === 'spiritual_council' &&
                'ከዘርፎች የቀረቡ ዕቅዶች፣ ሪፖርቶችና ደብዳቤዎች (ማጽደቂያ እና የጸደቁ ማህደር)'}
              {mode === 'admin_dept' &&
                'ከመንፈሳዊ ዘርፍ ጸድቀው ወደ አስተዳደር ዘርፍ የተላኩ ሰነዶች ማህደር'}
              {mode === 'elders_overview' &&
                'የሁሉም ዘርፎች ዕቅድ፣ ሪፖርት እና ደብዳቤ የማጽደቅና የመላክ ሂደት'}
            </h3>
            <p className="text-xs text-slate-600 max-w-3xl">
              {mode === 'sender' &&
                `${lockedChapel ? `${lockedChapel} (${unitName})` : unitName} ዕቅዱን፣ ሪፖርቱን እና ደብዳቤውን በቀጥታ ለመንፈሳዊ ዘርፍ ጉባኤ የሚልክበትና ውሳኔውን የሚከታተልበት ገጽ።`}
              {mode === 'spiritual_council' &&
                'በመንፈሳዊ ዘርፍ ስር ያሉ ሁሉም አገልግሎቶችና ቻፕሎች የሚልኳቸውን ዕቅዶች፣ ሪፖርቶችና ደብዳቤዎች መርምረው ያጽድቁ፤ የጸደቁት በዚህ ገጽ ላይ በቋሚነት ይቀመጣሉ፤ ለአስተዳደር ዘርፍ መላክ ያለባቸውንም ይላኩ።'}
              {mode === 'admin_dept' &&
                'በመንፈሳዊ ዘርፍ ጸድቀው ወደ አስተዳደር ዘርፍ የተላኩ ዕቅዶች፣ ሪፖርቶችና ደብዳቤዎች በሙሉ እዚህ በቋሚነት ተቀምጠዋል።'}
              {mode === 'elders_overview' &&
                'በአጥቢያ ቤተ ክርስቲያን ውስጥ የተላኩ፣ የጸደቁ እና ወደ አስተዳደር ዘርፍ የተመሩ ሰነዶችን በሙሉ ይመልከቱ።'}
            </p>
          </div>

          {mode === 'sender' && onCreateSubmission && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openNewCompose('plan')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ዕቅድ ላክ</span>
              </button>
              <button
                type="button"
                onClick={() => openNewCompose('report')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ሪፖርት ላክ</span>
              </button>
              <button
                type="button"
                onClick={() => openNewCompose('letter')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-600 text-white transition cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ደብዳቤ ላክ</span>
              </button>
            </div>
          )}
        </div>

        {/* Summary KPIs */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {mode === 'admin_dept' ? (
            <>
              <div>
                <div className="text-xs font-semibold text-slate-500">የደረሱ ጠቅላላ ሰነዶች</div>
                <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {kpis.forwardedAdmin}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">አዲስ የመጡ (ያልተቀበሉ)</div>
                <div className="text-xl font-extrabold text-indigo-800 tabular-nums mt-0.5">
                  {kpis.adminPending}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">ተቀብለው የተመዘገቡ</div>
                <div className="text-xl font-extrabold text-teal-800 tabular-nums mt-0.5">
                  {kpis.adminDone}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">ዕቅድ / ሪፖርት / ደብዳቤ</div>
                <div className="text-sm font-bold text-slate-800 tabular-nums mt-1.5">
                  {scopedSubmissions.filter((s) => s.type === 'plan').length} /{' '}
                  {scopedSubmissions.filter((s) => s.type === 'report').length} /{' '}
                  {scopedSubmissions.filter((s) => s.type === 'letter').length}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-xs font-semibold text-slate-500">ጠቅላላ ሰነዶች</div>
                <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {kpis.total}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">በመጠባበቅ ላይ</div>
                <div className="text-xl font-extrabold text-amber-700 tabular-nums mt-0.5">
                  {kpis.pending}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">በመንፈሳዊ ዘርፍ የጸደቁ</div>
                <div className="text-xl font-extrabold text-emerald-700 tabular-nums mt-0.5">
                  {kpis.approvedSpiritual}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">ለአስተዳደር ዘርፍ የተላኩ</div>
                <div className="text-xl font-extrabold text-indigo-800 tabular-nums mt-0.5">
                  {kpis.forwardedAdmin}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter Toolbar & List */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Segmented View Tabs for Spiritual / Admin */}
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'spiritual_council' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    viewFilter === 'pending'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  በመጠባበቅ ላይ ({kpis.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    viewFilter === 'approved'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  የጸደቁ ማህደር ({kpis.approvedSpiritual})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('forwarded')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    viewFilter === 'forwarded'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ለአስተዳደር የተላኩ ({kpis.forwardedAdmin})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    viewFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ሁሉም ({kpis.total})
                </button>
              </div>
            )}

            {mode === 'admin_dept' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    viewFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ሁሉም የተላኩ ({kpis.forwardedAdmin})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    viewFilter === 'pending'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  አዲስ የደረሱ ({kpis.adminPending})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    viewFilter === 'approved'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ተቀብለው የተመዘገቡ ({kpis.adminDone})
                </button>
              </div>
            )}

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | SubmissionType)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-semibold text-slate-700"
            >
              <option value="all">ሁሉም ዓይነት (ዕቅድ/ሪፖርት/ደብዳቤ)</option>
              <option value="plan">ዕቅድ ብቻ</option>
              <option value="report">ሪፖርት ብቻ</option>
              <option value="letter">ደብዳቤ ብቻ</option>
            </select>

            {mode !== 'sender' && distinctSenders.length > 0 && (
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-semibold text-slate-700"
              >
                <option value="all">ሁሉም ላኪ ዘርፎች</option>
                {distinctSenders.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ርዕስ፣ ዘርፍ ወይም ቁጥር ፈልግ..."
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-60"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4 text-left">ቀን</th>
                <th className="py-3 px-4 text-left">ዓይነት</th>
                {mode !== 'sender' && <th className="py-3 px-4 text-left">ላኪ ዘርፍ / ቻፕል</th>}
                <th className="py-3 px-4 text-left">ርዕስ / ጉዳይ</th>
                <th className="py-3 px-4 text-left">ሁኔታ</th>
                <th className="py-3 px-4 text-right print:hidden">ድርጊት</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={mode !== 'sender' ? 6 : 5} className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-600">
                      {mode === 'sender'
                        ? 'ገና ለመንፈሳዊ ዘርፍ የተላከ ዕቅድ፣ ሪፖርት ወይም ደብዳቤ የለም።'
                        : mode === 'admin_dept'
                        ? 'ከመንፈሳዊ ዘርፍ ወደ አስተዳደር ዘርፍ የተላከ ሰነድ ገና የለም።'
                        : 'በዚህ ምድብ ውስጥ ምንም የተገኘ ሰነድ የለም።'}
                    </p>
                    {mode === 'sender' && onCreateSubmission && (
                      <button
                        type="button"
                        onClick={() => openNewCompose('plan')}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>የመጀመሪያውን ሰነድ ላክ</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const tMeta = TYPE_META[sub.type];
                  const TIcon = tMeta.icon;
                  const sMeta = STATUS_META[sub.status];
                  const SIcon = sMeta.icon;

                  const subAttachments = getSubmissionAttachments(sub);

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => openDetailModal(sub)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                        {sub.submittedAt.slice(0, 10)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-extrabold ${tMeta.textClass}`}>
                          <TIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{tMeta.label}</span>
                        </span>
                      </td>
                      {mode !== 'sender' && (
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{sub.senderUnitName}</div>
                          {(sub.senderChapel || sub.senderPersonName) && (
                            <div className="text-[11px] text-slate-500">
                              {[sub.senderChapel, sub.senderPersonName].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-bold text-slate-900">{sub.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{sub.year} ዓ/ም</span>
                          {sub.period && (
                            <>
                              <span>·</span>
                              <span>{sub.period}</span>
                            </>
                          )}
                          {sub.referenceNumber && (
                            <>
                              <span>·</span>
                              <span className="font-mono">ቁጥር {sub.referenceNumber}</span>
                            </>
                          )}
                          {sub.attachedPlans && sub.attachedPlans.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-blue-700 font-semibold">
                                +{sub.attachedPlans.length} የዕቅድ ዝርዝር
                              </span>
                            </>
                          )}
                          {subAttachments.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 text-blue-800 font-bold">
                                <Paperclip className="w-3 h-3" />
                                {subAttachments.length === 1
                                  ? subAttachments[0].name
                                  : `${subAttachments.length} ፋይሎች (${subAttachments.map((a) => a.name).join('፣ ')})`}
                              </span>
                            </>
                          )}
                        </div>
                        {sub.spiritualNote && (
                          <div className="text-[11px] text-slate-700 mt-1">
                            <span className="font-bold">የመንፈሳዊ ዘርፍ ማስታወሻ፦</span> {sub.spiritualNote}
                          </div>
                        )}
                        {sub.forwardedToAdminNote && (
                          <div className="text-[11px] text-indigo-800 mt-0.5">
                            <span className="font-bold">ወደ አስተዳደር መልዕክት፦</span>{' '}
                            {sub.forwardedToAdminNote}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-bold ${sMeta.textClass}`}>
                          <SIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{sMeta.label}</span>
                        </span>
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap print:hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => openDetailModal(sub)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ክፈትና አንብብ</span>
                          </button>

                          {mode === 'spiritual_council' &&
                            sub.status === 'pending_spiritual' &&
                            onSpiritualApprove && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSpiritualApprove(sub.id, '', false);
                                  showTempFeedback(
                                    `"${sub.title}" በመንፈሳዊ ዘርፍ ጸድቆ በማህደር ተቀምጧል።`
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>አጽድቅ</span>
                              </button>
                            )}

                          {mode === 'spiritual_council' &&
                            sub.status === 'approved_spiritual' &&
                            !sub.forwardedToAdmin &&
                            onForwardToAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setForwardModalSubId(sub.id);
                                  setForwardNote('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>ለአስተዳደር ዘርፍ ላክ</span>
                              </button>
                            )}

                          {mode === 'admin_dept' &&
                            sub.status === 'forwarded_to_admin' &&
                            onAdminAcknowledge && (
                              <button
                                type="button"
                                onClick={() => {
                                  onAdminAcknowledge(sub.id, '');
                                  showTempFeedback(`"${sub.title}" በአስተዳደር ዘርፍ ተቀብሎ ተመዝግቧል።`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>ተቀበል</span>
                              </button>
                            )}

                          {mode === 'sender' &&
                            sub.status === 'returned_by_spiritual' &&
                            onResubmitSubmission && (
                              <button
                                type="button"
                                onClick={() => openEditForResubmit(sub)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>አስተካክለህ ላክ</span>
                              </button>
                            )}

                          {mode === 'sender' &&
                            (sub.status === 'pending_spiritual' ||
                              sub.status === 'returned_by_spiritual') &&
                            onDeleteSubmission && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('ይህን የተላከ ሰነድ መሰረዝ ይፈልጋሉ?')) {
                                    getSubmissionAttachments(sub).forEach((a) => {
                                      if (a.storageKey) deleteAttachmentFile(a.storageKey);
                                    });
                                    onDeleteSubmission(sub.id);
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="ሰርዝ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Compose / Resubmit Modal (Sender Mode) */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingSubId
                  ? 'ተመላሽ የተደረገውን ሰነድ አስተካክሎ መላክ'
                  : 'ለመንፈሳዊ ዘርፍ ጉባኤ አዲስ ሰነድ መላኪያ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {composeError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {composeError}
              </div>
            )}

            <form onSubmit={handleComposeSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                {(['plan', 'report', 'letter'] as SubmissionType[]).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  const active = cType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCType(t)}
                      className={`py-2.5 px-3 rounded-xl border font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ዓመተ ምህረት</label>
                  <input
                    type="text"
                    value={cYear}
                    onChange={(e) => setCYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ጊዜ / ሩብ ዓመት</label>
                  <input
                    type="text"
                    value={cPeriod}
                    onChange={(e) => setCPeriod(e.target.value)}
                    placeholder="1ኛ ሩብ ዓመት / ዓመታዊ..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {cType === 'letter' ? 'የደብዳቤ ቁጥር (አማራጭ)' : 'የሰነድ ቁጥር (አማራጭ)'}
                  </label>
                  <input
                    type="text"
                    value={cRefNo}
                    onChange={(e) => setCRefNo(e.target.value)}
                    placeholder="ምሳሌ፦ ቃሕ/012/19"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ርዕስ / ጉዳይ *</label>
                  <input
                    type="text"
                    required
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    placeholder={
                      cType === 'plan'
                        ? 'የ2019 ዓ/ም የአገልግሎት ዕቅድ'
                        : cType === 'report'
                        ? 'የ1ኛ ሩብ ዓመት የአገልግሎት ሪፖርት'
                        : 'የበጀት / የአገልግሎት ትብብር ደብዳቤ'
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">የላኪ ስም / ኃላፊ</label>
                  <input
                    type="text"
                    value={cSenderPerson}
                    onChange={(e) => setCSenderPerson(e.target.value)}
                    placeholder="የመምሪያው መሪ ወይም ጸሐፊ ስም"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="font-bold text-slate-700">ዝርዝር ይዘት / መልዕክት *</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {activitiesSummaryText && cType === 'report' && (
                      <button
                        type="button"
                        onClick={() =>
                          setCContent((prev) =>
                            prev.trim() ? `${prev}\n\n${activitiesSummaryText}` : activitiesSummaryText
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold hover:bg-emerald-100 cursor-pointer"
                      >
                        + የክፍሉን ሪፖርት ማጠቃለያ ሙላ
                      </button>
                    )}
                    {availablePlans.length > 0 && cType === 'plan' && (
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cAttachPlans}
                          onChange={(e) => setCAttachPlans(e.target.checked)}
                        />
                        <span>የክፍሉን ዓመታዊ ዕቅድ ({availablePlans.length}) አያይዝ</span>
                      </label>
                    )}
                  </div>
                </div>
                <textarea
                  rows={5}
                  required={cAttachments.length === 0}
                  value={cContent}
                  onChange={(e) => setCContent(e.target.value)}
                  placeholder="ዝርዝር ዕቅዱን፣ ሪፖርቱን ወይም የደብዳቤውን መልዕክት እዚህ ይጻፉ (ወይም ከታች PDF/Word/Excel ፋይሎችን ያያይዙ)..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                      <span>ሰነዶችን ያያይዙ (PDF, Word, Excel, CSV, ምስል — እያንዳንዱ እስከ 15 MB፣ ብዙ ፋይሎች ይቻላል)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      የሚጫኑ ፋይሎች በሙሉ ያለመቆራረጥ ይቀመጣሉ፤ መንፈሳዊ ዘርፍ እና አስተዳደርም ሳያወርዱ እዛው ከፍተው ያነቧቸዋል።
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer shrink-0">
                    {isReadingFiles ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>በማንበብ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>ፋይል ምረጥ / ጨምር</span>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {cAttachments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    {cAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 font-bold text-emerald-800">
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{att.name}</span>
                          {typeof att.size === 'number' && (
                            <span className="text-slate-400 font-normal shrink-0 tabular-nums">
                              ({att.size >= 1024 * 1024
                                ? `${(att.size / (1024 * 1024)).toFixed(2)} MB`
                                : `${Math.max(1, Math.round(att.size / 1024))} KB`})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCAttachments((prev) => prev.filter((item) => item.id !== att.id))
                          }
                          className="text-rose-600 font-bold hover:underline cursor-pointer shrink-0"
                        >
                          አንሳ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  disabled={isSubmittingFiles}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  disabled={isReadingFiles || isSubmittingFiles}
                  className="inline-flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-60 rounded-xl cursor-pointer"
                >
                  {isSubmittingFiles ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>በመላክ ላይ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>ለመንፈሳዊ ዘርፍ ላክ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Inspection / Approval / Forward Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 border border-slate-200 max-h-[94vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-500 flex flex-wrap items-center gap-2">
                  <span>{TYPE_META[selectedSub.type].label}</span>
                  <span>·</span>
                  <span>{selectedSub.senderUnitName}</span>
                  {selectedSub.senderChapel && (
                    <>
                      <span>·</span>
                      <span>{selectedSub.senderChapel}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="font-mono">{selectedSub.submittedAt.slice(0, 10)}</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedSub.title}</h3>
                <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>ዘመን፦ {selectedSub.year} ዓ/ም</span>
                  {selectedSub.period && <span>· ጊዜ፦ {selectedSub.period}</span>}
                  {selectedSub.referenceNumber && (
                    <span className="font-mono">· ቁጥር፦ {selectedSub.referenceNumber}</span>
                  )}
                  {selectedSub.senderPersonName && (
                    <span>· ላኪ፦ {selectedSub.senderPersonName}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="አትም"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Current Status Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-slate-800">
                ወቅታዊ ሁኔታ፦{' '}
                <span className={STATUS_META[selectedSub.status].textClass}>
                  {STATUS_META[selectedSub.status].label}
                </span>
              </div>
              {selectedSub.spiritualReviewedAt && (
                <span className="text-slate-500 font-mono">
                  የተገመገመበት፦ {selectedSub.spiritualReviewedAt.slice(0, 10)}
                </span>
              )}
            </div>

            {/* Document Content */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {selectedSub.content}
            </div>

            {/* Attached Annual Plans Snapshot */}
            {selectedSub.attachedPlans && selectedSub.attachedPlans.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-800">
                  የተያያዘ ዓመታዊ ዕቅድ ዝርዝር ({selectedSub.attachedPlans.length})
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-2 px-3 text-left">ተግባር</th>
                        <th className="py-2 px-2 text-right">የዓመቱ ዕቅድ</th>
                        <th className="py-2 px-2 text-right">ክንውን</th>
                        <th className="py-2 px-3 text-left">ኃላፊ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSub.attachedPlans.map((p) => {
                        const done =
                          Number(p.q1Done || 0) +
                          Number(p.q2Done || 0) +
                          Number(p.q3Done || 0) +
                          Number(p.q4Done || 0);
                        return (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-semibold text-slate-900">{p.task}</td>
                            <td className="py-2 px-2 text-right tabular-nums">{p.yearPlan}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-emerald-700 font-bold">
                              {done}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{p.role}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inline File Document Reader (PDF, Excel, Word, Image, Text — readable directly without downloading) */}
            {selectedAttachments.length > 0 && (
              <div className="space-y-2.5">
                {selectedAttachments.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 print:hidden">
                    {selectedAttachments.map((att, idx) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setActiveAttachmentIdx(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          idx === Math.min(activeAttachmentIdx, selectedAttachments.length - 1)
                            ? 'bg-blue-900 text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="max-w-52 truncate">{att.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(() => {
                  const activeAtt =
                    selectedAttachments[Math.min(activeAttachmentIdx, selectedAttachments.length - 1)];
                  if (!activeAtt) return null;
                  return (
                    <InlineDocumentViewer
                      key={`${selectedSub.id}_${activeAtt.id}`}
                      fileName={activeAtt.name}
                      dataUrl={activeAtt.dataUrl}
                      storageKey={activeAtt.storageKey}
                    />
                  );
                })()}
              </div>
            )}

            {/* Notes Trail */}
            {(selectedSub.spiritualNote || selectedSub.forwardedToAdminNote || selectedSub.adminNote) && (
              <div className="space-y-2 text-xs">
                {selectedSub.spiritualNote && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                    <span className="font-extrabold">የመንፈሳዊ ዘርፍ ውሳኔ/ማስታወሻ፦ </span>
                    {selectedSub.spiritualNote}
                  </div>
                )}
                {selectedSub.forwardedToAdminNote && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-950">
                    <span className="font-extrabold">ለአስተዳደር ዘርፍ የተላከ መልዕክት፦ </span>
                    {selectedSub.forwardedToAdminNote}
                  </div>
                )}
                {selectedSub.adminNote && (
                  <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950">
                    <span className="font-extrabold">የአስተዳደር ዘርፍ ምላሽ፦ </span>
                    {selectedSub.adminNote}
                  </div>
                )}
              </div>
            )}

            {/* Spiritual Council Action Controls */}
            {mode === 'spiritual_council' && selectedSub.status === 'pending_spiritual' && (
              <div className="pt-3 border-t border-slate-200 space-y-3 text-xs print:hidden">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    የመንፈሳዊ ዘርፍ አስተያየት / ማስታወሻ (ማስተካከያ ከተጠየቀ የግድ ይጻፉ)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="የጸደቀበት ማስታወሻ ወይም ማስተካከያ..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {onSpiritualReturn && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!reviewNote.trim()) {
                          alert('እባክዎን የማስተካከያ ምክንያቱን ይጻፉ!');
                          return;
                        }
                        onSpiritualReturn(selectedSub.id, reviewNote.trim());
                        setSelectedSubId(null);
                        showTempFeedback('ሰነዱ ከአስተያየት ጋር ለላኪው ክፍል ተመልሷል።');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ማስተካከያ ጠይቅ</span>
                    </button>
                  )}
                  {onSpiritualApprove && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSpiritualApprove(selectedSub.id, reviewNote.trim(), false);
                          setSelectedSubId(null);
                          showTempFeedback('ሰነዱ ጸድቆ በመንፈሳዊ ዘርፍ ማህደር ውስጥ ተቀምጧል።');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>አጽድቅ (በመንፈሳዊ ዘርፍ አስቀምጥ)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSpiritualApprove(
                            selectedSub.id,
                            reviewNote.trim(),
                            true,
                            reviewNote.trim()
                          );
                          setSelectedSubId(null);
                          showTempFeedback(
                            'ሰነዱ ጸድቆ በመንፈሳዊ ዘርፍ ተቀምጧል እንዲሁም ለአስተዳደር ዘርፍ ተልኳል።'
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-indigo-800 hover:bg-indigo-700 text-white cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>አጽድቅና ለአስተዳደር ዘርፍ ላክ</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Spiritual Council Forward-to-Admin Action for already Approved items */}
            {mode === 'spiritual_council' &&
              selectedSub.status === 'approved_spiritual' &&
              !selectedSub.forwardedToAdmin &&
              onForwardToAdmin && (
                <div className="pt-3 border-t border-slate-200 space-y-3 text-xs print:hidden">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ለአስተዳደር ዘርፍ የሚላክ መልዕክት / ማብራሪያ (አማራጭ)
                    </label>
                    <input
                      type="text"
                      value={forwardNote}
                      onChange={(e) => setForwardNote(e.target.value)}
                      placeholder="ለምሳሌ፦ ለበጀት ውሳኔ ወይም ለማህደር የተላከ..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onForwardToAdmin(selectedSub.id, forwardNote.trim());
                        setSelectedSubId(null);
                        showTempFeedback('የጸደቀው ሰነድ ወደ አስተዳደር ዘርፍ ተልኳል።');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-indigo-800 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>ለአስተዳደር ዘርፍ ላክ</span>
                    </button>
                  </div>
                </div>
              )}

            {/* Administration Acknowledge Action */}
            {mode === 'admin_dept' &&
              selectedSub.status === 'forwarded_to_admin' &&
              onAdminAcknowledge && (
                <div className="pt-3 border-t border-slate-200 space-y-3 text-xs print:hidden">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      የአስተዳደር ዘርፍ ማስታወሻ / ውሳኔ (አማራጭ)
                    </label>
                    <input
                      type="text"
                      value={adminActionNote}
                      onChange={(e) => setAdminActionNote(e.target.value)}
                      placeholder="ተቀብለናል / በበጀት ተካቷል / በማህደር ተመዝግቧል..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onAdminAcknowledge(selectedSub.id, adminActionNote.trim());
                        setSelectedSubId(null);
                        showTempFeedback('ሰነዱ በአስተዳደር ዘርፍ ተቀብሎ በቋሚነት ተመዝግቧል።');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-teal-700 hover:bg-teal-600 text-white cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ተቀብያለሁ / በአስተዳደር መዝግብ</span>
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Quick Forward-to-Admin Modal */}
      {forwardModalSub && onForwardToAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                ወደ አስተዳደር ዘርፍ መላኪያ
              </h3>
              <button
                type="button"
                onClick={() => setForwardModalSubId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <div className="font-extrabold text-slate-900">{forwardModalSub.title}</div>
              <div className="text-slate-500">
                ከ{forwardModalSub.senderUnitName} · {TYPE_META[forwardModalSub.type].label}
              </div>
            </div>
            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">
                ለአስተዳደር ዘርፍ መልዕክት / ማብራሪያ (አማራጭ)
              </label>
              <textarea
                rows={3}
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                placeholder="ለምሳሌ፦ በመንፈሳዊ ዘርፍ የጸደቀ ዕቅድ/ደብዳቤ — ለአስተዳደር ውሳኔና ማህደር የተላከ..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForwardModalSubId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ሰርዝ
              </button>
              <button
                type="button"
                onClick={() => {
                  onForwardToAdmin(forwardModalSub.id, forwardNote.trim());
                  setForwardModalSubId(null);
                  showTempFeedback(`"${forwardModalSub.title}" ወደ አስተዳደር ዘርፍ ተልኳል።`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ላክ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
