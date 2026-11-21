import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  X,
  Edit2,
  Save,
  Printer,
  GraduationCap,
  Upload,
  FileText,
  Eye,
  Trash2,
  Plus,
  Heart,
  Users,
  Briefcase,
  Calendar,
  Wallet,
  Building2,
  Phone,
  CheckCircle2,
  Download
} from 'lucide-react';
import {
  ChurchHRRecord,
  ChurchMember,
  HREducationCredential,
  MinisterChildRecord,
  MinisterServiceHistoryItem
} from '../types';
import { DualDateBadge, DualDateInput } from './DualDate';
import { InlineDocumentViewer } from './InlineDocumentViewer';
import { useLanguage } from '../context/LanguageContext';
import {
  HR_UNASSIGNED_ROLE_PLACEHOLDER
} from '../constants/churchStructure';
import {
  findMatchingChurchMemberForHR,
  getHRDepartments,
  getHRRoleTitles
} from '../utils/hrMemberMatcher';
import {
  calculatePayrollBreakdown,
  computeServiceDuration,
  formatBirr,
  HR_EDUCATION_LEVEL_OPTIONS,
  HR_MARITAL_STATUS_OPTIONS
} from '../utils/hrProfileAndPayroll';
import {
  deleteAttachmentFile,
  loadAttachmentDataUrl,
  saveAttachmentFile
} from '../services/attachmentStorage';

interface MinisterProfileModalProps {
  record: ChurchHRRecord;
  resolvedPhone?: string;
  churchMembers?: ChurchMember[];
  initialEditMode?: boolean;
  onClose: () => void;
  onSaveRecord: (updated: ChurchHRRecord) => void;
}

const createItemId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const MinisterProfileModal: React.FC<MinisterProfileModalProps> = ({
  record,
  resolvedPhone,
  churchMembers = [],
  initialEditMode = false,
  onClose,
  onSaveRecord
}) => {
  const { t, lang } = useLanguage();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [previewCredential, setPreviewCredential] = useState<HREducationCredential | null>(null);
  const [uploadingCredId, setUploadingCredId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  // Form state
  const [name, setName] = useState(record.name);
  const [gender, setGender] = useState<'ወ' | 'ሴ'>(record.gender === 'ሴ' ? 'ሴ' : 'ወ');
  const [phone, setPhone] = useState(resolvedPhone || record.phone || '');
  const [status, setStatus] = useState(record.status || 'በስራ ላይ');
  const [hireDate, setHireDate] = useState(record.hireDate || '');
  const [serviceYears, setServiceYears] = useState(record.serviceYears || '');
  const [startingSalary, setStartingSalary] = useState(
    record.startingSalary !== undefined ? String(record.startingSalary) : ''
  );
  const [monthlySalary, setMonthlySalary] = useState(
    record.monthlySalary !== undefined ? String(record.monthlySalary) : ''
  );
  const [pensionStartDate, setPensionStartDate] = useState(record.pensionStartDate || '');
  const [pensionExempt, setPensionExempt] = useState(Boolean(record.pensionExempt));
  const [bankName, setBankName] = useState(record.bankName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(record.bankAccountNumber || '');
  const [educationLevel, setEducationLevel] = useState(record.educationLevel || '');
  const [educationCredentials, setEducationCredentials] = useState<HREducationCredential[]>(
    () => (Array.isArray(record.educationCredentials) ? record.educationCredentials : [])
  );
  const [maritalStatus, setMaritalStatus] = useState(record.maritalStatus || 'ያላገባ/ች');
  const [spouseName, setSpouseName] = useState(record.spouseName || '');
  const [spousePhone, setSpousePhone] = useState(record.spousePhone || '');
  const [children, setChildren] = useState<MinisterChildRecord[]>(
    () => (Array.isArray(record.children) ? record.children : [])
  );
  const [serviceHistory, setServiceHistory] = useState<MinisterServiceHistoryItem[]>(
    () => (Array.isArray(record.serviceHistory) ? record.serviceHistory : [])
  );
  const [notes, setNotes] = useState(record.notes || '');

  // Quick-add form states inside modal
  const [newCredTitle, setNewCredTitle] = useState('');
  const [newCredInstitution, setNewCredInstitution] = useState('');
  const [newCredField, setNewCredField] = useState('');
  const [newCredYear, setNewCredYear] = useState('');
  const [newCredNotes, setNewCredNotes] = useState('');
  const [newCredFile, setNewCredFile] = useState<{
    name: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  } | null>(null);

  const [newChildName, setNewChildName] = useState('');
  const [newChildGender, setNewChildGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildNotes, setNewChildNotes] = useState('');

  const [newHistRole, setNewHistRole] = useState('');
  const [newHistPlace, setNewHistPlace] = useState('');
  const [newHistStart, setNewHistStart] = useState('');
  const [newHistEnd, setNewHistEnd] = useState('');
  const [newHistNotes, setNewHistNotes] = useState('');

  useEffect(() => {
    setName(record.name);
    setGender(record.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setPhone(resolvedPhone || record.phone || '');
    setStatus(record.status || 'በስራ ላይ');
    setHireDate(record.hireDate || '');
    setServiceYears(record.serviceYears || '');
    setStartingSalary(record.startingSalary !== undefined ? String(record.startingSalary) : '');
    setMonthlySalary(record.monthlySalary !== undefined ? String(record.monthlySalary) : '');
    setPensionStartDate(record.pensionStartDate || '');
    setPensionExempt(Boolean(record.pensionExempt));
    setBankName(record.bankName || '');
    setBankAccountNumber(record.bankAccountNumber || '');
    setEducationLevel(record.educationLevel || '');
    setEducationCredentials(
      Array.isArray(record.educationCredentials) ? record.educationCredentials : []
    );
    setMaritalStatus(record.maritalStatus || 'ያላገባ/ች');
    setSpouseName(record.spouseName || '');
    setSpousePhone(record.spousePhone || '');
    setChildren(Array.isArray(record.children) ? record.children : []);
    setServiceHistory(Array.isArray(record.serviceHistory) ? record.serviceHistory : []);
    setNotes(record.notes || '');
  }, [record, resolvedPhone]);

  const currentRoles = getHRRoleTitles(record, HR_UNASSIGNED_ROLE_PLACEHOLDER);
  const currentDepts = getHRDepartments(record);
  const computedTenure = computeServiceDuration(hireDate, serviceYears, lang);
  const payrollPreview = calculatePayrollBreakdown(monthlySalary, pensionExempt);

  const buildUpdatedRecord = (
    overrideCreds?: HREducationCredential[],
    overrideChildren?: MinisterChildRecord[],
    overrideHistory?: MinisterServiceHistoryItem[]
  ): ChurchHRRecord => {
    const cleanPhone =
      phone.trim() || findMatchingChurchMemberForHR(name.trim(), churchMembers).phone || '';
    const parsedStarting = startingSalary.trim() ? Number(startingSalary) : undefined;
    const parsedMonthly = monthlySalary.trim() ? Number(monthlySalary) : undefined;
    return {
      ...record,
      name: name.trim() || record.name,
      gender,
      phone: cleanPhone || undefined,
      status,
      hireDate: hireDate.trim() || undefined,
      serviceYears: serviceYears.trim() || undefined,
      startingSalary:
        parsedStarting !== undefined && Number.isFinite(parsedStarting)
          ? parsedStarting
          : undefined,
      monthlySalary:
        parsedMonthly !== undefined && Number.isFinite(parsedMonthly)
          ? parsedMonthly
          : undefined,
      pensionStartDate: pensionStartDate.trim() || undefined,
      pensionExempt,
      bankName: bankName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      educationLevel: educationLevel.trim() || undefined,
      educationCredentials: overrideCreds ?? educationCredentials,
      maritalStatus: maritalStatus.trim() || undefined,
      spouseName: spouseName.trim() || undefined,
      spousePhone: spousePhone.trim() || undefined,
      children: overrideChildren ?? children,
      serviceHistory: overrideHistory ?? serviceHistory,
      notes: notes.trim() || undefined
    };
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = buildUpdatedRecord();
    onSaveRecord(updated);
    setIsEditing(false);
    setSaveFeedback(
      t('✓ የአገልጋዩ ሙሉ ፕሮፋይል በተሳካ ሁኔታ ተቀምጧል!', '✓ Personnel profile saved successfully!')
    );
    setTimeout(() => setSaveFeedback(''), 3500);
  };

  const handleReadFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });

  const handleNewCredFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > 8 * 1024 * 1024) {
      setUploadError(
        t('የፋይሉ መጠን ከ8MB መብለጥ የለበትም።', 'File size must be 8MB or smaller.')
      );
      return;
    }
    try {
      const dataUrl = await handleReadFileAsDataUrl(file);
      setNewCredFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl
      });
      if (!newCredTitle.trim()) {
        setNewCredTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch {
      setUploadError(t('ፋይሉን ማንበብ አልተቻለም።', 'Unable to read selected file.'));
    }
  };

  const handleAddCredential = async () => {
    const title = newCredTitle.trim();
    if (!title && !newCredFile) return;

    const credId = createItemId('cred');
    let storageKey: string | undefined;

    if (newCredFile) {
      setUploadingCredId(credId);
      storageKey = `hr_cred_${record.id}_${credId}`;
      try {
        await saveAttachmentFile(storageKey, newCredFile.name, newCredFile.dataUrl);
      } finally {
        setUploadingCredId(null);
      }
    }

    const entry: HREducationCredential = {
      id: credId,
      title: title || newCredFile?.name || t('የትምህርት ማስረጃ', 'Education Credential'),
      institution: newCredInstitution.trim() || undefined,
      fieldOfStudy: newCredField.trim() || undefined,
      yearCompleted: newCredYear.trim() || undefined,
      notes: newCredNotes.trim() || undefined,
      attachmentName: newCredFile?.name,
      attachmentMimeType: newCredFile?.mimeType,
      attachmentSize: newCredFile?.size,
      attachmentStorageKey: storageKey,
      uploadedAt: new Date().toISOString()
    };

    const nextCreds = [entry, ...educationCredentials];
    setEducationCredentials(nextCreds);
    if (!educationLevel.trim() && entry.title) {
      setEducationLevel(entry.title);
    }

    // Persist immediately so uploaded document metadata isn't lost even if user closes modal
    onSaveRecord({
      ...buildUpdatedRecord(nextCreds),
      educationLevel: (!educationLevel.trim() && entry.title ? entry.title : educationLevel.trim()) || undefined
    });

    setNewCredTitle('');
    setNewCredInstitution('');
    setNewCredField('');
    setNewCredYear('');
    setNewCredNotes('');
    setNewCredFile(null);
    setSaveFeedback(
      t('✓ የትምህርት ማስረጃው ተመዝግቦ ተቀምጧል!', '✓ Education credential added and saved!')
    );
    setTimeout(() => setSaveFeedback(''), 3500);
  };

  const handleAttachFileToExistingCred = async (
    credId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > 8 * 1024 * 1024) {
      setUploadError(
        t('የፋይሉ መጠን ከ8MB መብለጥ የለበትም።', 'File size must be 8MB or smaller.')
      );
      return;
    }
    setUploadingCredId(credId);
    try {
      const dataUrl = await handleReadFileAsDataUrl(file);
      const storageKey = `hr_cred_${record.id}_${credId}`;
      await saveAttachmentFile(storageKey, file.name, dataUrl);
      const nextCreds = educationCredentials.map((c) =>
        c.id === credId
          ? {
              ...c,
              attachmentName: file.name,
              attachmentMimeType: file.type || 'application/octet-stream',
              attachmentSize: file.size,
              attachmentStorageKey: storageKey,
              uploadedAt: new Date().toISOString()
            }
          : c
      );
      setEducationCredentials(nextCreds);
      onSaveRecord(buildUpdatedRecord(nextCreds));
      setSaveFeedback(t('✓ የትምህርት ማስረጃ ሰነዱ ተያይዟል!', '✓ Credential document attached!'));
      setTimeout(() => setSaveFeedback(''), 3500);
    } catch {
      setUploadError(t('ሰነዱን መጫን አልተቻለም።', 'Failed to upload document.'));
    } finally {
      setUploadingCredId(null);
    }
  };

  const handleDeleteCredential = async (cred: HREducationCredential) => {
    if (cred.attachmentStorageKey) {
      await deleteAttachmentFile(cred.attachmentStorageKey);
    }
    if (previewCredential?.id === cred.id) {
      setPreviewCredential(null);
    }
    const nextCreds = educationCredentials.filter((c) => c.id !== cred.id);
    setEducationCredentials(nextCreds);
    onSaveRecord(buildUpdatedRecord(nextCreds));
  };

  const handleDownloadCredential = async (cred: HREducationCredential) => {
    const dataUrl = await loadAttachmentDataUrl(cred.attachmentStorageKey, cred.attachmentDataUrl);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = cred.attachmentName || `${cred.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddChild = () => {
    const cName = newChildName.trim();
    if (!cName) return;
    const item: MinisterChildRecord = {
      id: createItemId('child'),
      name: cName,
      gender: newChildGender,
      ageOrBirthDate: newChildAge.trim() || undefined,
      notes: newChildNotes.trim() || undefined
    };
    const nextChildren = [...children, item];
    setChildren(nextChildren);
    onSaveRecord(buildUpdatedRecord(undefined, nextChildren));
    setNewChildName('');
    setNewChildGender('ወ');
    setNewChildAge('');
    setNewChildNotes('');
  };

  const handleRemoveChild = (id: string) => {
    const nextChildren = children.filter((c) => c.id !== id);
    setChildren(nextChildren);
    onSaveRecord(buildUpdatedRecord(undefined, nextChildren));
  };

  const handleAddServiceHistory = () => {
    const resp = newHistRole.trim();
    if (!resp) return;
    const item: MinisterServiceHistoryItem = {
      id: createItemId('hist'),
      responsibility: resp,
      sectorOrPlace: newHistPlace.trim() || undefined,
      startPeriod: newHistStart.trim() || undefined,
      endPeriod: newHistEnd.trim() || undefined,
      notes: newHistNotes.trim() || undefined
    };
    const nextHistory = [item, ...serviceHistory];
    setServiceHistory(nextHistory);
    onSaveRecord(buildUpdatedRecord(undefined, undefined, nextHistory));
    setNewHistRole('');
    setNewHistPlace('');
    setNewHistStart('');
    setNewHistEnd('');
    setNewHistNotes('');
  };

  const handleRemoveServiceHistory = (id: string) => {
    const nextHistory = serviceHistory.filter((h) => h.id !== id);
    setServiceHistory(nextHistory);
    onSaveRecord(buildUpdatedRecord(undefined, undefined, nextHistory));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 max-h-[94dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-200 flex items-center justify-center shrink-0 font-extrabold text-base">
              {name.trim().slice(0, 2) || 'አገ'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  {record.category === 'full_time_minister'
                    ? t('የሙሉ ጊዜ አገልጋይ ፕሮፋይል', 'Full-Time Minister Profile')
                    : t('የአስተዳደር ሠራተኛ ፕሮፋይል', 'Administrative Staff Profile')}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-teal-100">
                  {status}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold truncate mt-0.5">{name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('ፕሮፋይል አትም', 'Print')}</span>
            </button>
            <button
              type="button"
              onClick={() => (isEditing ? handleSaveAll() : setIsEditing(true))}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                isEditing
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              <span>
                {isEditing ? t('ለውጦችን አስቀምጥ', 'Save Profile') : t('ፕሮፋይል አስተካክል', 'Edit Profile')}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label={t('ዝጋ', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/70">
          {saveFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveFeedback}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold">
              {uploadError}
            </div>
          )}

          {/* Section 1: Employment, Salary, Pension, Bank & Tenure */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-700" />
                <span>{t('የቅጥር ዘመን፣ ደመወዝ፣ ጡሬታ እና የባንክ መረጃ', 'Employment, Salary, Pension & Banking')}</span>
              </h4>
              {computedTenure && (
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-extrabold">
                  {t('የአገልግሎት ዘመን፦', 'Service Tenure:')} {computedTenure}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('የቅጥር ዘመን / ቀን', 'Hire Date / Year')}</label>
                  <DualDateInput value={hireDate} onChange={setHireDate} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የአገልግሎት ዘመን (በራሱ ወይም በጽሁፍ)', 'Service Years (Optional Override)')}
                  </label>
                  <input
                    type="text"
                    value={serviceYears}
                    onChange={(e) => setServiceYears(e.target.value)}
                    placeholder={t('ምሳሌ፦ 8 ዓመት (ባዶ ከሆነ ከቅጥር ቀን ይሰላል)', 'e.g., 8 yrs (auto if blank)')}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የመጀመሪያ ደሞዝ (ብር)', 'Starting Salary (ETB)')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={startingSalary}
                    onChange={(e) => setStartingSalary(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl tabular-nums font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የአሁን ወርሃዊ ደመወዝ (ብር)', 'Current Monthly Salary (ETB)')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl tabular-nums font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="በስራ ላይ">{t('በስራ ላይ', 'Active')}</option>
                    <option value="በእረፍት">{t('በእረፍት', 'On Leave')}</option>
                    <option value="ለቋል">{t('ለቋል', 'Departed')}</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('ጡሬታ የተጀመረበት ጊዜ', 'Pension Start Date')}</label>
                  <DualDateInput value={pensionStartDate} onChange={setPensionStartDate} />
                </div>
                <div className="flex items-end">
                  <label className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={!pensionExempt}
                      onChange={(e) => setPensionExempt(!e.target.checked)}
                      className="w-4 h-4 accent-teal-700"
                    />
                    <span>{t('18% ጡሬታ (7% + 11%) ተፈጻሚ ይሁን', 'Apply 18% Pension (7% + 11%)')}</span>
                  </label>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የባንክ ስም', 'Bank Name')}</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder={t('ምሳሌ፦ ንግድ ባንክ (CBE) / አቢሲኒያ', 'e.g., CBE / Abyssinia')}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('የባንክ አካውንት ቁጥር', 'Bank Account Number')}</label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="1000..."
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-teal-700" />
                    <span>{t('ስልክ እና ጾታ', 'Phone & Gender')}</span>
                  </div>
                  <div className="font-extrabold text-slate-900 mt-1 font-mono">
                    {phone || '—'} · <span className="font-sans">{gender === 'ሴ' ? t('ሴት', 'Female') : t('ወንድ', 'Male')}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-700" />
                    <span>{t('የቅጥር ዘመን', 'Hire Date')}</span>
                  </div>
                  <div className="font-extrabold text-slate-900 mt-1">
                    {hireDate ? <DualDateBadge value={hireDate} mode="inline" /> : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-indigo-700" />
                    <span>{t('የመጀመሪያ ደሞዝ', 'Starting Salary')}</span>
                  </div>
                  <div className="font-extrabold text-slate-900 mt-1 tabular-nums">
                    {record.startingSalary !== undefined ? `${formatBirr(record.startingSalary)} ${t('ብር', 'ETB')}` : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-emerald-700" />
                    <span>{t('የአሁን ደመወዝ / የተጣራ (93%)', 'Current Salary / Net')}</span>
                  </div>
                  <div className="font-extrabold text-slate-900 mt-1 tabular-nums">
                    {payrollPreview.grossSalary > 0
                      ? `${formatBirr(payrollPreview.grossSalary)} / ${formatBirr(payrollPreview.netSalary)}`
                      : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {t('ጡሬታ የተጀመረበት ጊዜ', 'Pension Start Date')}
                  </div>
                  <div className="font-extrabold text-slate-900 mt-1">
                    {pensionStartDate ? <DualDateBadge value={pensionStartDate} mode="inline" /> : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {t('የጡሬታ ስሌት (18%)', 'Pension (18%)')}
                  </div>
                  <div className="font-extrabold text-slate-900 mt-1 tabular-nums">
                    {pensionExempt
                      ? t('ከጡሬታ ነጻ', 'Exempt')
                      : payrollPreview.grossSalary > 0
                      ? `7%: ${formatBirr(payrollPreview.employeePension7)} · 11%: ${formatBirr(payrollPreview.churchPension11)}`
                      : t('7% አገልጋይ + 11% ቤ/ክ', '7% Employee + 11% Church')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {t('የባንክ ስምና አካውንት ቁጥር', 'Bank Account')}
                  </div>
                  <div className="font-extrabold text-slate-900 mt-1 font-mono">
                    {bankName ? `${bankName} — ` : ''}
                    {bankAccountNumber || '—'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Education Level & Uploadable Education Credentials */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-800" />
                  <span>{t('የትምህርት ደረጃ እና የትምህርት ማስረጃዎች', 'Education Level & Credentials')}</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t(
                    'የትምህርት ማስረጃዎችን ይመዝግቡ እንዲሁም ዋናውን ሰነድ (PDF / ፎቶ / Word) በቀጥታ ያስገቡ።',
                    'Register education qualifications and attach official credential documents (PDF / Image / Word).'
                  )}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-extrabold self-start">
                {t('የተመዘገቡ ማስረጃዎች፦', 'Credentials:')} {educationCredentials.length}
              </span>
            </div>

            {/* Education Level Summary */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                {t('ጠቅላላ የትምህርት ደረጃ (በፔሮል ላይ የሚታይ)', 'Highest Education Level (Shown on Payroll)')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {HR_EDUCATION_LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setEducationLevel(opt);
                      if (!isEditing) {
                        onSaveRecord({ ...buildUpdatedRecord(), educationLevel: opt });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      educationLevel === opt
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                onBlur={() => {
                  if (!isEditing && educationLevel.trim() !== (record.educationLevel || '')) {
                    onSaveRecord(buildUpdatedRecord());
                  }
                }}
                placeholder={t('ወይም የትምህርት ደረጃ ይጻፉ...', 'Or enter custom education level...')}
                className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-semibold"
              />
            </div>

            {/* Add New Credential Form */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 space-y-3 print:hidden">
              <div className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-700" />
                <span>{t('አዲስ የትምህርት ማስረጃ መመዝገቢያ እና ሰነድ ማስገቢያ', 'Register & Upload New Education Credential')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <input
                  type="text"
                  value={newCredTitle}
                  onChange={(e) => setNewCredTitle(e.target.value)}
                  placeholder={t('የማስረጃው ስም / ደረጃ * (ምሳሌ፦ BA በቲዎሎጂ)', 'Credential Title * (e.g., BTh)')}
                  className="px-3 py-2 text-base sm:text-xs border border-blue-200 rounded-xl bg-white font-bold"
                />
                <input
                  type="text"
                  value={newCredInstitution}
                  onChange={(e) => setNewCredInstitution(e.target.value)}
                  placeholder={t('ተቋም / ኮሌጅ / ት/ቤት', 'Institution / College')}
                  className="px-3 py-2 text-base sm:text-xs border border-blue-200 rounded-xl bg-white"
                />
                <input
                  type="text"
                  value={newCredField}
                  onChange={(e) => setNewCredField(e.target.value)}
                  placeholder={t('የትምህርት ዘርፍ', 'Field of Study')}
                  className="px-3 py-2 text-base sm:text-xs border border-blue-200 rounded-xl bg-white"
                />
                <input
                  type="text"
                  value={newCredYear}
                  onChange={(e) => setNewCredYear(e.target.value)}
                  placeholder={t('የተመረቀበት ዓ/ም', 'Year Completed')}
                  className="px-3 py-2 text-base sm:text-xs border border-blue-200 rounded-xl bg-white"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs">
                <input
                  type="text"
                  value={newCredNotes}
                  onChange={(e) => setNewCredNotes(e.target.value)}
                  placeholder={t('ተጨማሪ ማስታወሻ (አማራጭ)', 'Optional notes...')}
                  className="flex-1 px-3 py-2 text-base sm:text-xs border border-blue-200 rounded-xl bg-white"
                />
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-300 text-blue-900 font-bold hover:bg-blue-50 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {newCredFile
                      ? `${newCredFile.name.slice(0, 22)}${newCredFile.name.length > 22 ? '…' : ''}`
                      : t('ሰነድ አያይዝ (PDF/ፎቶ/Word)', 'Attach File')}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                    onChange={handleNewCredFileSelect}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddCredential}
                  disabled={!newCredTitle.trim() && !newCredFile}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-extrabold cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('ማስረጃ አስገባ', 'Add Credential')}</span>
                </button>
              </div>
            </div>

            {/* Registered Credentials List */}
            {educationCredentials.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                {t('እስካሁን የተመዘገበ የትምህርት ማስረጃ የለም።', 'No education credentials registered yet.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {educationCredentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span className="truncate">{cred.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                          {cred.institution && (
                            <div>
                              <span className="font-semibold">{t('ተቋም፦', 'Institution:')}</span> {cred.institution}
                            </div>
                          )}
                          {(cred.fieldOfStudy || cred.yearCompleted) && (
                            <div>
                              {cred.fieldOfStudy ? `${cred.fieldOfStudy}` : ''}
                              {cred.fieldOfStudy && cred.yearCompleted ? ' · ' : ''}
                              {cred.yearCompleted ? `${t('ዘመን፦', 'Year:')} ${cred.yearCompleted}` : ''}
                            </div>
                          )}
                          {cred.notes && <div className="text-slate-500">{cred.notes}</div>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCredential(cred)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer print:hidden shrink-0"
                        title={t('አስወግድ', 'Remove')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 print:hidden">
                      {cred.attachmentName ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewCredential(previewCredential?.id === cred.id ? null : cred)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>
                              {previewCredential?.id === cred.id
                                ? t('ዝጋ', 'Hide')
                                : t('ሰነዱን ክፈት', 'View File')}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCredential(cred)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>{t('አውርድ', 'Download')}</span>
                          </button>
                          <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                            {cred.attachmentName}
                          </span>
                        </>
                      ) : (
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 hover:bg-blue-50 text-blue-800 text-[11px] font-bold cursor-pointer">
                          <Upload className="w-3 h-3" />
                          <span>
                            {uploadingCredId === cred.id
                              ? t('በመጫን ላይ...', 'Uploading...')
                              : t('ፋይል አያይዝ', 'Attach Document')}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                            onChange={(ev) => handleAttachFileToExistingCred(cred.id, ev)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previewCredential && (
              <div className="border border-blue-200 rounded-2xl overflow-hidden bg-white p-3 space-y-2 print:hidden">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-900">
                  <span>
                    {previewCredential.title} — {previewCredential.attachmentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewCredential(null)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {t('ዝጋ', 'Close')}
                  </button>
                </div>
                <InlineDocumentViewer
                  fileName={previewCredential.attachmentName || previewCredential.title}
                  dataUrl={previewCredential.attachmentDataUrl}
                  storageKey={previewCredential.attachmentStorageKey}
                />
              </div>
            )}
          </section>

          {/* Section 3: Marital Status & Family (Spouse & Children) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" />
                <span>{t('የጋብቻ ሁኔታ እና የአገልጋዩ ቤተሰብ (ሚስት/ባል እና ልጆች)', 'Marital Status & Family (Spouse & Children)')}</span>
              </h4>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-extrabold">
                {maritalStatus} · {t('ልጆች፦', 'Children:')} {children.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('የጋብቻ ሁኔታ', 'Marital Status')}</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    setMaritalStatus(nextStatus);
                    if (!isEditing) {
                      onSaveRecord({ ...buildUpdatedRecord(), maritalStatus: nextStatus });
                    }
                  }}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold bg-white"
                >
                  {HR_MARITAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የትዳር ጓደኛ ስም (ሚስት / ባል)', 'Spouse Name (Wife / Husband)')}
                </label>
                <input
                  type="text"
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                  onBlur={() => {
                    if (!isEditing && spouseName.trim() !== (record.spouseName || '')) {
                      onSaveRecord(buildUpdatedRecord());
                    }
                  }}
                  placeholder={t('የሚስት / የባል ሙሉ ስም', 'Full name of spouse')}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የትዳር ጓደኛ ስልክ', 'Spouse Phone')}
                </label>
                <input
                  type="text"
                  value={spousePhone}
                  onChange={(e) => setSpousePhone(e.target.value)}
                  onBlur={() => {
                    if (!isEditing && spousePhone.trim() !== (record.spousePhone || '')) {
                      onSaveRecord(buildUpdatedRecord());
                    }
                  }}
                  placeholder="09..."
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Children list & quick add */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-700" />
                <span>{t('የልጆች ዝርዝር', 'Children List')} ({children.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs print:hidden">
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder={t('የልጁ ሙሉ ስም *', 'Child full name *')}
                  className="sm:col-span-4 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                />
                <select
                  value={newChildGender}
                  onChange={(e) => setNewChildGender(e.target.value as 'ወ' | 'ሴ')}
                  className="sm:col-span-2 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold"
                >
                  <option value="ወ">{t('ወንድ', 'Male')}</option>
                  <option value="ሴ">{t('ሴት', 'Female')}</option>
                </select>
                <input
                  type="text"
                  value={newChildAge}
                  onChange={(e) => setNewChildAge(e.target.value)}
                  placeholder={t('ዕድሜ / የትውልድ ዘመን', 'Age / Birth year')}
                  className="sm:col-span-3 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50"
                />
                <input
                  type="text"
                  value={newChildNotes}
                  onChange={(e) => setNewChildNotes(e.target.value)}
                  placeholder={t('ማስታወሻ', 'Notes')}
                  className="sm:col-span-2 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleAddChild}
                  disabled={!newChildName.trim()}
                  className="sm:col-span-1 px-3 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 disabled:opacity-50 text-white font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="sm:hidden">{t('ልጅ ጨምር', 'Add Child')}</span>
                </button>
              </div>

              {children.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {children.map((child, idx) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">
                          {idx + 1}. {child.name}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {child.gender === 'ሴ' ? t('ሴት', 'Female') : t('ወንድ', 'Male')}
                          {child.ageOrBirthDate ? ` · ${child.ageOrBirthDate}` : ''}
                          {child.notes ? ` · ${child.notes}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveChild(child.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer print:hidden shrink-0"
                        title={t('አስወግድ', 'Remove')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Career Responsibilities Served During Tenure */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-700" />
                  <span>{t('በቆይታው ያገለገለበት ኃላፊነቶች እና የአሁኑ ዘርፎች', 'Responsibilities Served During Tenure & Current Roles')}</span>
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold self-start">
                {t('የቆይታ ታሪክ፦', 'History Entries:')} {serviceHistory.length}
              </span>
            </div>

            {/* Current Assigned Roles & Sectors */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="font-bold text-slate-700">{t('በአሁኑ ጊዜ የተመደበበት ኃላፊነትና ዘርፍ፦', 'Current Assigned Roles & Sectors:')}</div>
              <div className="flex flex-wrap gap-1.5">
                {currentRoles.map((r) => (
                  <span
                    key={r}
                    className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-950 border border-indigo-200 font-bold"
                  >
                    {r}
                  </span>
                ))}
                {currentDepts.map((d) => (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-950 border border-teal-200 font-bold"
                  >
                    {d}
                  </span>
                ))}
                {currentRoles.length === 0 && currentDepts.length === 0 && (
                  <span className="text-slate-400">{t('ገና አልተመደበም', 'Not assigned yet')}</span>
                )}
              </div>
            </div>

            {/* Add historical service responsibility */}
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 space-y-2.5 text-xs print:hidden">
              <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-700" />
                <span>{t('በቆይታው ያገለገለበትን ኃላፊነት ጨምር', 'Add Responsibility Served During Tenure')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <input
                  type="text"
                  value={newHistRole}
                  onChange={(e) => setNewHistRole(e.target.value)}
                  placeholder={t('የአገልግሎት ኃላፊነት *', 'Responsibility *')}
                  className="px-3 py-2 text-base sm:text-xs border border-indigo-200 rounded-xl bg-white font-bold"
                />
                <input
                  type="text"
                  value={newHistPlace}
                  onChange={(e) => setNewHistPlace(e.target.value)}
                  placeholder={t('ዘርፍ / አጥቢያ / ቻፕል', 'Sector / Chapel / Place')}
                  className="px-3 py-2 text-base sm:text-xs border border-indigo-200 rounded-xl bg-white"
                />
                <input
                  type="text"
                  value={newHistStart}
                  onChange={(e) => setNewHistStart(e.target.value)}
                  placeholder={t('ከ (ዓ/ም)', 'From (Year)')}
                  className="px-3 py-2 text-base sm:text-xs border border-indigo-200 rounded-xl bg-white"
                />
                <input
                  type="text"
                  value={newHistEnd}
                  onChange={(e) => setNewHistEnd(e.target.value)}
                  placeholder={t('እስከ (ዓ/ም ወይም አሁን)', 'To (Year / Present)')}
                  className="px-3 py-2 text-base sm:text-xs border border-indigo-200 rounded-xl bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddServiceHistory}
                  disabled={!newHistRole.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white font-extrabold cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('ጨምር', 'Add')}</span>
                </button>
              </div>
              <input
                type="text"
                value={newHistNotes}
                onChange={(e) => setNewHistNotes(e.target.value)}
                placeholder={t('ተጨማሪ ማስታወሻ (አማራጭ)', 'Optional notes...')}
                className="w-full px-3 py-2 text-base sm:text-xs border border-indigo-200 rounded-xl bg-white"
              />
            </div>

            {serviceHistory.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                {t('እስካሁን የቆይታ ኃላፊነት ታሪክ አልተመዘገበም።', 'No tenure service history entries yet.')}
              </div>
            ) : (
              <div className="space-y-2">
                {serviceHistory.map((h, idx) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900">
                        {idx + 1}. {h.responsibility}
                        {h.sectorOrPlace ? (
                          <span className="ml-2 font-bold text-indigo-800">— {h.sectorOrPlace}</span>
                        ) : null}
                      </div>
                      {(h.startPeriod || h.endPeriod) && (
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          {t('የቆይታ ጊዜ፦', 'Period:')} {h.startPeriod || '—'} — {h.endPeriod || t('አሁን', 'Present')}
                        </div>
                      )}
                      {h.notes && <div className="text-[11px] text-slate-500 mt-0.5">{h.notes}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceHistory(h.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer print:hidden shrink-0"
                      title={t('አስወግድ', 'Remove')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Profile Notes */}
            <div className="pt-2 border-t border-slate-100 text-xs">
              <label className="block font-bold text-slate-700 mb-1">{t('ጠቅላላ ማስታወሻ', 'General Profile Notes')}</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  if (!isEditing && notes.trim() !== (record.notes || '')) {
                    onSaveRecord(buildUpdatedRecord());
                  }
                }}
                placeholder={t('ተጨማሪ የፕሮፋይል ማስታወሻ...', 'Additional notes...')}
                className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
              />
            </div>
          </section>
        </div>

        {/* Bottom Sticky Footer */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-[11px] text-slate-500">
            {t(
              'ማንኛውም ለውጥ በቀጥታ ከደመወዝ ፔሮል እና ከሰው ኃይል መዝገብ ጋር ይመሳሰላል።',
              'All changes sync directly with Human Resources and Payroll.'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              {t('ዝጋ', 'Close')}
            </button>
            <button
              type="button"
              onClick={() => handleSaveAll()}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-teal-800 hover:bg-teal-700 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('ሙሉ ፕሮፋይል አስቀምጥ', 'Save Full Profile')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
