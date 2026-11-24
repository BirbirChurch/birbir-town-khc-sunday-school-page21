import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Download,
  Camera,
  User,
  Link2,
  Unlink,
  Search,
  RefreshCw
} from 'lucide-react';
import {
  ChurchChild,
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
  getHRRoleTitles,
  resolveServantChurchFamily,
  searchChurchMembersForServantLink
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
import { processProfilePhotoFile } from '../utils/hrPhotoHelper';
import { ExportPhotoButton } from './ExportPhotoButton';
import { PersonPhotoField, PersonPhotoValue } from './PersonPhotoField';
import { PersonAvatarBadge } from './PersonAvatarBadge';

interface MinisterProfileModalProps {
  record: ChurchHRRecord;
  resolvedPhone?: string;
  churchMembers?: ChurchMember[];
  churchChildren?: ChurchChild[];
  onUpdateChurchMember?: (member: ChurchMember) => void;
  onUpdateChurchChild?: (child: ChurchChild) => void;
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
  churchChildren = [],
  onUpdateChurchMember,
  onUpdateChurchChild,
  initialEditMode = false,
  onClose,
  onSaveRecord
}) => {
  const { t, lang } = useLanguage();
  const profileExportRef = useRef<HTMLDivElement | null>(null);
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
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(record.photoDataUrl);
  const [photoStorageKey, setPhotoStorageKey] = useState<string | undefined>(record.photoStorageKey);
  const [photoName, setPhotoName] = useState<string | undefined>(record.photoName);
  const [photoUpdatedAt, setPhotoUpdatedAt] = useState<string | undefined>(record.photoUpdatedAt);
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(record.photoDataUrl || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);

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

  const [linkedMemberId, setLinkedMemberId] = useState<number | undefined>(record.linkedMemberId);
  const [linkedMemberCode, setLinkedMemberCode] = useState<string | undefined>(record.linkedMemberCode);
  const [linkedFamilyCode, setLinkedFamilyCode] = useState<string | undefined>(record.linkedFamilyCode);
  const [spousePhoto, setSpousePhoto] = useState<PersonPhotoValue>({
    photoDataUrl: record.spousePhotoDataUrl,
    photoStorageKey: record.spousePhotoStorageKey,
    photoName: record.spousePhotoName,
    photoUpdatedAt: record.spousePhotoUpdatedAt
  });
  const [familyLinkSearch, setFamilyLinkSearch] = useState('');
  const [showFamilyLinkPicker, setShowFamilyLinkPicker] = useState(false);

  const [newChildName, setNewChildName] = useState('');
  const [newChildGender, setNewChildGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildNotes, setNewChildNotes] = useState('');
  const [newChildPhoto, setNewChildPhoto] = useState<PersonPhotoValue>({});

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
    setPhotoDataUrl(record.photoDataUrl);
    setPhotoStorageKey(record.photoStorageKey);
    setPhotoName(record.photoName);
    setPhotoUpdatedAt(record.photoUpdatedAt);
    setLinkedMemberId(record.linkedMemberId);
    setLinkedMemberCode(record.linkedMemberCode);
    setLinkedFamilyCode(record.linkedFamilyCode);
    setSpousePhoto({
      photoDataUrl: record.spousePhotoDataUrl,
      photoStorageKey: record.spousePhotoStorageKey,
      photoName: record.spousePhotoName,
      photoUpdatedAt: record.spousePhotoUpdatedAt
    });
    setConfirmRemovePhoto(false);
  }, [record, resolvedPhone]);

  useEffect(() => {
    let cancelled = false;
    setFullPhotoUrl(record.photoDataUrl || null);
    if (!record.photoStorageKey) return;
    loadAttachmentDataUrl(record.photoStorageKey)
      .then((loaded) => {
        if (!cancelled && loaded) {
          setFullPhotoUrl(loaded);
        }
      })
      .catch(() => {
        // fallback stays thumbnail
      });
    return () => {
      cancelled = true;
    };
  }, [record.id, record.photoStorageKey, record.photoDataUrl]);

  const familyResolution = useMemo(
    () =>
      resolveServantChurchFamily(
        {
          name,
          gender,
          spouseName,
          linkedMemberId,
          linkedMemberCode,
          linkedFamilyCode
        },
        churchMembers,
        churchChildren
      ),
    [name, gender, spouseName, linkedMemberId, linkedMemberCode, linkedFamilyCode, churchMembers, churchChildren]
  );

  const familyLinkCandidates = useMemo(
    () => searchChurchMembersForServantLink(familyLinkSearch, churchMembers),
    [familyLinkSearch, churchMembers]
  );

  const currentRoles = getHRRoleTitles(record, HR_UNASSIGNED_ROLE_PLACEHOLDER);
  const currentDepts = getHRDepartments(record);
  const computedTenure = computeServiceDuration(hireDate, serviceYears, lang);
  const payrollPreview = calculatePayrollBreakdown(monthlySalary, pensionExempt);
  const activePhotoSrc = fullPhotoUrl || photoDataUrl || familyResolution.selfMember?.photoDataUrl || null;

  const buildUpdatedRecord = (
    overrideCreds?: HREducationCredential[],
    overrideChildren?: MinisterChildRecord[],
    overrideHistory?: MinisterServiceHistoryItem[],
    overridePhoto?: {
      photoDataUrl?: string;
      photoStorageKey?: string;
      photoName?: string;
      photoUpdatedAt?: string;
    },
    overrideExtras?: Partial<ChurchHRRecord>
  ): ChurchHRRecord => {
    const cleanPhone =
      phone.trim() ||
      familyResolution.selfMember?.phone ||
      findMatchingChurchMemberForHR(name.trim(), churchMembers).phone ||
      '';
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
      spousePhotoDataUrl: spousePhoto.photoDataUrl,
      spousePhotoStorageKey: spousePhoto.photoStorageKey,
      spousePhotoName: spousePhoto.photoName,
      spousePhotoUpdatedAt: spousePhoto.photoUpdatedAt,
      linkedMemberId,
      linkedMemberCode,
      linkedFamilyCode,
      children: overrideChildren ?? children,
      serviceHistory: overrideHistory ?? serviceHistory,
      photoDataUrl: overridePhoto ? overridePhoto.photoDataUrl : photoDataUrl,
      photoStorageKey: overridePhoto ? overridePhoto.photoStorageKey : photoStorageKey,
      photoName: overridePhoto ? overridePhoto.photoName : photoName,
      photoUpdatedAt: overridePhoto ? overridePhoto.photoUpdatedAt : photoUpdatedAt,
      notes: notes.trim() || undefined,
      ...(overrideExtras || {})
    };
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    setIsUploadingPhoto(true);
    try {
      const result = await processProfilePhotoFile(file);
      if (result.ok === false) {
        if (result.reason === 'invalid_type') {
          setUploadError(
            t('እባክዎ ትክክለኛ የፎቶ ፋይል (JPG, PNG, WEBP) ይምረጡ።', 'Please select a valid image file (JPG, PNG, WEBP).')
          );
        } else if (result.reason === 'too_large') {
          setUploadError(
            t('የፎቶው መጠን ከ12MB መብለጥ የለበትም።', 'Photo size must be 12MB or smaller.')
          );
        } else {
          setUploadError(t('ፎቶውን ማንበብ አልተቻለም።', 'Unable to read selected image.'));
        }
        return;
      }

      const prevKey = photoStorageKey;
      const nextKey = `hr_photo_${record.id}_${Date.now()}`;
      await saveAttachmentFile(nextKey, result.data.fileName, result.data.fullDataUrl);
      if (prevKey && prevKey !== nextKey) {
        await deleteAttachmentFile(prevKey);
      }

      const nowIso = new Date().toISOString();
      const nextPhotoMeta = {
        photoDataUrl: result.data.thumbnailDataUrl,
        photoStorageKey: nextKey,
        photoName: result.data.fileName,
        photoUpdatedAt: nowIso
      };

      setPhotoDataUrl(nextPhotoMeta.photoDataUrl);
      setPhotoStorageKey(nextPhotoMeta.photoStorageKey);
      setPhotoName(nextPhotoMeta.photoName);
      setPhotoUpdatedAt(nextPhotoMeta.photoUpdatedAt);
      setFullPhotoUrl(result.data.fullDataUrl);
      setConfirmRemovePhoto(false);

      onSaveRecord(buildUpdatedRecord(undefined, undefined, undefined, nextPhotoMeta));
      setSaveFeedback(
        t('✓ የአገልጋዩ ፎቶ በተሳካ ሁኔታ ተቀምጧል!', '✓ Profile photo uploaded and saved!')
      );
      setTimeout(() => setSaveFeedback(''), 3500);
    } catch {
      setUploadError(t('ፎቶውን ማስቀመጥ አልተቻለም።', 'Failed to upload photo.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    const keyToDelete = photoStorageKey;
    setPhotoDataUrl(undefined);
    setPhotoStorageKey(undefined);
    setPhotoName(undefined);
    setPhotoUpdatedAt(undefined);
    setFullPhotoUrl(null);
    setIsPhotoLightboxOpen(false);
    setConfirmRemovePhoto(false);
    onSaveRecord(
      buildUpdatedRecord(undefined, undefined, undefined, {
        photoDataUrl: undefined,
        photoStorageKey: undefined,
        photoName: undefined,
        photoUpdatedAt: undefined
      })
    );
    if (keyToDelete) {
      await deleteAttachmentFile(keyToDelete);
    }
    setSaveFeedback(t('✓ የአገልጋዩ ፎቶ ተወግዷል።', '✓ Profile photo removed.'));
    setTimeout(() => setSaveFeedback(''), 3000);
  };

  const handleDownloadPhoto = async () => {
    const url =
      fullPhotoUrl ||
      (photoStorageKey ? await loadAttachmentDataUrl(photoStorageKey) : null) ||
      photoDataUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = photoName || `${name.trim() || 'profile'}-photo.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      notes: newChildNotes.trim() || undefined,
      photoDataUrl: newChildPhoto.photoDataUrl,
      photoStorageKey: newChildPhoto.photoStorageKey,
      photoName: newChildPhoto.photoName,
      photoUpdatedAt: newChildPhoto.photoUpdatedAt
    };
    const nextChildren = [...children, item];
    setChildren(nextChildren);
    onSaveRecord(buildUpdatedRecord(undefined, nextChildren));
    setNewChildName('');
    setNewChildGender('ወ');
    setNewChildAge('');
    setNewChildNotes('');
    setNewChildPhoto({});
  };

  const handleUpdateChildPhoto = (childId: string, nextPhoto: PersonPhotoValue) => {
    const nextChildren = children.map((c) =>
      c.id === childId
        ? {
            ...c,
            photoDataUrl: nextPhoto.photoDataUrl,
            photoStorageKey: nextPhoto.photoStorageKey,
            photoName: nextPhoto.photoName,
            photoUpdatedAt: nextPhoto.photoUpdatedAt
          }
        : c
    );
    setChildren(nextChildren);
    onSaveRecord(buildUpdatedRecord(undefined, nextChildren));
  };

  const handleRemoveChild = (id: string) => {
    const nextChildren = children.filter((c) => c.id !== id);
    setChildren(nextChildren);
    onSaveRecord(buildUpdatedRecord(undefined, nextChildren));
  };

  const handleSpousePhotoChange = (nextPhoto: PersonPhotoValue) => {
    setSpousePhoto(nextPhoto);
    onSaveRecord(
      buildUpdatedRecord(undefined, undefined, undefined, undefined, {
        spousePhotoDataUrl: nextPhoto.photoDataUrl,
        spousePhotoStorageKey: nextPhoto.photoStorageKey,
        spousePhotoName: nextPhoto.photoName,
        spousePhotoUpdatedAt: nextPhoto.photoUpdatedAt
      })
    );
  };

  const handleLinkChurchMember = (member: ChurchMember) => {
    const nextFamilyCode = member.familyCode || member.memberCode || undefined;
    setLinkedMemberId(member.id);
    setLinkedMemberCode(member.memberCode);
    setLinkedFamilyCode(nextFamilyCode);
    setShowFamilyLinkPicker(false);
    setFamilyLinkSearch('');

    const nextExtras: Partial<ChurchHRRecord> = {
      linkedMemberId: member.id,
      linkedMemberCode: member.memberCode,
      linkedFamilyCode: nextFamilyCode
    };
    if (!phone.trim() && member.phone) {
      setPhone(member.phone);
      nextExtras.phone = member.phone;
    }
    if (!educationLevel.trim() && member.educationLevel) {
      setEducationLevel(member.educationLevel);
      nextExtras.educationLevel = member.educationLevel;
    }
    if (!photoDataUrl && member.photoDataUrl) {
      setPhotoDataUrl(member.photoDataUrl);
      setPhotoStorageKey(member.photoStorageKey);
      setPhotoName(member.photoName);
      setPhotoUpdatedAt(member.photoUpdatedAt);
      nextExtras.photoDataUrl = member.photoDataUrl;
      nextExtras.photoStorageKey = member.photoStorageKey;
      nextExtras.photoName = member.photoName;
      nextExtras.photoUpdatedAt = member.photoUpdatedAt;
    }
    onSaveRecord(buildUpdatedRecord(undefined, undefined, undefined, undefined, nextExtras));
    setSaveFeedback(
      t('✓ ከቤተክርስቲያን መረጃ ቋት ጋር በተሳካ ሁኔታ ተገናኝቷል!', '✓ Linked with Church Member Registry!')
    );
    setTimeout(() => setSaveFeedback(''), 3500);
  };

  const handleUnlinkChurchMember = () => {
    setLinkedMemberId(undefined);
    setLinkedMemberCode(undefined);
    setLinkedFamilyCode(undefined);
    onSaveRecord(
      buildUpdatedRecord(undefined, undefined, undefined, undefined, {
        linkedMemberId: undefined,
        linkedMemberCode: undefined,
        linkedFamilyCode: undefined
      })
    );
  };

  const handleSyncFamilyFromChurchDB = () => {
    const { detectedSpouse, detectedChildren, selfMember, familyCode } = familyResolution;
    let nextSpouseName = spouseName;
    let nextSpousePhone = spousePhone;
    let nextMaritalStatus = maritalStatus;
    let nextSpousePhoto = spousePhoto;
    let nextPhone = phone;

    if (selfMember?.phone && !nextPhone.trim()) {
      nextPhone = selfMember.phone;
      setPhone(nextPhone);
    }

    if (detectedSpouse) {
      nextSpouseName = detectedSpouse.name;
      setSpouseName(nextSpouseName);
      if (detectedSpouse.phone) {
        nextSpousePhone = detectedSpouse.phone;
        setSpousePhone(nextSpousePhone);
      }
      if (!nextMaritalStatus || nextMaritalStatus === 'ያላገባ/ች') {
        nextMaritalStatus = 'ያገባ/ች';
        setMaritalStatus(nextMaritalStatus);
      }
      if (detectedSpouse.photoDataUrl && !spousePhoto.photoDataUrl) {
        nextSpousePhoto = {
          photoDataUrl: detectedSpouse.photoDataUrl,
          photoStorageKey: detectedSpouse.photoStorageKey,
          photoName: detectedSpouse.photoName,
          photoUpdatedAt: detectedSpouse.photoUpdatedAt
        };
        setSpousePhoto(nextSpousePhoto);
      }
    }

    const existingNames = new Set(children.map((c) => c.name.trim().toLowerCase()));
    const mergedChildren: MinisterChildRecord[] = [...children];
    detectedChildren.forEach((dc) => {
      const idx = mergedChildren.findIndex((c) => c.name.trim().toLowerCase() === dc.name.trim().toLowerCase());
      if (idx >= 0) {
        const cur = mergedChildren[idx];
        mergedChildren[idx] = {
          ...cur,
          memberCode: cur.memberCode || dc.memberCode,
          linkedMemberId: cur.linkedMemberId ?? dc.linkedMemberId,
          linkedChildId: cur.linkedChildId ?? dc.linkedChildId,
          ageOrBirthDate: cur.ageOrBirthDate || dc.ageOrBirthDate,
          photoDataUrl: cur.photoDataUrl || dc.photoDataUrl,
          photoStorageKey: cur.photoStorageKey || dc.photoStorageKey,
          photoName: cur.photoName || dc.photoName,
          photoUpdatedAt: cur.photoUpdatedAt || dc.photoUpdatedAt
        };
      } else if (!existingNames.has(dc.name.trim().toLowerCase())) {
        existingNames.add(dc.name.trim().toLowerCase());
        mergedChildren.push({
          id: createItemId('child'),
          name: dc.name,
          gender: dc.gender,
          ageOrBirthDate: dc.ageOrBirthDate,
          memberCode: dc.memberCode,
          linkedMemberId: dc.linkedMemberId,
          linkedChildId: dc.linkedChildId,
          photoDataUrl: dc.photoDataUrl,
          photoStorageKey: dc.photoStorageKey,
          photoName: dc.photoName,
          photoUpdatedAt: dc.photoUpdatedAt
        });
      }
    });

    setChildren(mergedChildren);
    onSaveRecord(
      buildUpdatedRecord(undefined, mergedChildren, undefined, undefined, {
        phone: nextPhone.trim() || undefined,
        maritalStatus: nextMaritalStatus,
        spouseName: nextSpouseName.trim() || undefined,
        spousePhone: nextSpousePhone.trim() || undefined,
        spousePhotoDataUrl: nextSpousePhoto.photoDataUrl,
        spousePhotoStorageKey: nextSpousePhoto.photoStorageKey,
        spousePhotoName: nextSpousePhoto.photoName,
        spousePhotoUpdatedAt: nextSpousePhoto.photoUpdatedAt,
        linkedMemberId: linkedMemberId ?? selfMember?.id,
        linkedMemberCode: linkedMemberCode ?? selfMember?.memberCode,
        linkedFamilyCode: linkedFamilyCode ?? familyCode
      })
    );
    setSaveFeedback(
      t(
        '✓ የቤተሰብ አባላት መረጃ ከቤተክርስቲያን ቋት ወደ አገልጋዩ ፕሮፋይል ተመሳስሏል!',
        '✓ Family info synced from Church Database!'
      )
    );
    setTimeout(() => setSaveFeedback(''), 3500);
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
      <div
        ref={profileExportRef}
        className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 max-h-[94dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {activePhotoSrc ? (
              <button
                type="button"
                onClick={() => setIsPhotoLightboxOpen(true)}
                className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-teal-400/60 shrink-0 shadow-md cursor-pointer hover:opacity-95 transition"
                title={t('ፎቶውን በትልቁ እይ', 'View Full Photo')}
              >
                <img
                  src={activePhotoSrc}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-200 flex items-center justify-center shrink-0 font-extrabold text-base">
                {name.trim().slice(0, 2) || 'አገ'}
              </div>
            )}
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
            <ExportPhotoButton
              targetRef={profileExportRef}
              fileName={`የአገልጋይ_ፕሮፋይል_${name || record.id}`}
              labelAm="ፕሮፋይል በፎቶ"
              labelEn="Save Profile PNG"
              variant="compact"
            />
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

          {/* Section 0: Profile Photo Storage & Portrait */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              {/* Portrait Preview Frame */}
              <div className="relative shrink-0 self-start sm:self-center">
                {activePhotoSrc ? (
                  <button
                    type="button"
                    onClick={() => setIsPhotoLightboxOpen(true)}
                    className="group relative w-28 h-32 sm:w-32 sm:h-36 rounded-2xl overflow-hidden border-2 border-teal-200 bg-slate-100 shadow-sm cursor-pointer block"
                    title={t('በትልቁ ለማየት ይጫኑ', 'Click to view full size')}
                  >
                    <img
                      src={activePhotoSrc}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="absolute inset-x-0 bottom-0 py-1 bg-slate-900/65 text-white text-[10px] font-bold flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                      <Eye className="w-3 h-3" />
                      <span>{t('በትልቁ እይ', 'Zoom')}</span>
                    </span>
                  </button>
                ) : (
                  <label className="w-28 h-32 sm:w-32 sm:h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/40 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-teal-800 cursor-pointer transition">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-[11px] font-extrabold text-center px-2">
                      {t('ፎቶ የለም', 'No Photo')}
                    </span>
                    <span className="text-[10px] font-semibold text-teal-700 print:hidden">
                      + {t('ፎቶ አስገባ', 'Add Photo')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/*"
                      onChange={handlePhotoSelect}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Photo Details & Controls */}
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>{t('የአገልጋዩ / የሠራተኛው ፎቶ ማስቀመጫ', 'Servant / Staff Profile Photo')}</span>
                  </h4>
                  {activePhotoSrc && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold">
                      {t('✓ ፎቶ ተቀምጧል', '✓ Photo Saved')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {t(
                    'የአገልጋዩን የመታወቂያ ወይም የፕሮፋይል ፎቶ (JPG, PNG, WEBP) እዚህ ያስገቡ። የተቀመጠው ፎቶ በሰው ኃይል ዝርዝር፣ በፕሮፋይል ራስጌ እና በህትመት ላይ በቀጥታ ይታያል።',
                    'Upload the official portrait or ID photo (JPG, PNG, WEBP). Saved photos appear in the HR directory, profile header, and printed profile.'
                  )}
                </p>

                {(photoName || photoUpdatedAt) && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {photoName && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold truncate max-w-[220px]">
                        {photoName}
                      </span>
                    )}
                    {photoUpdatedAt && (
                      <span>
                        {t('የተቀመጠበት፦', 'Updated:')}{' '}
                        {new Date(photoUpdatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 print:hidden">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-extrabold cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingPhoto
                        ? t('ፎቶ በማስቀመጥ ላይ...', 'Uploading Photo...')
                        : activePhotoSrc
                        ? t('ፎቶ ቀይር', 'Change Photo')
                        : t('ፎቶ አስገባ', 'Upload Photo')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/*"
                      onChange={handlePhotoSelect}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>

                  {activePhotoSrc && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsPhotoLightboxOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('በትልቁ እይ', 'View Full')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('አውርድ', 'Download')}</span>
                      </button>

                      {confirmRemovePhoto ? (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1">
                          <span className="text-[11px] font-bold text-rose-900">
                            {t('ፎቶው ይሰረዝ?', 'Remove photo?')}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold cursor-pointer"
                          >
                            {t('አዎ አስወግድ', 'Yes')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemovePhoto(false)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            {t('ተው', 'Cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemovePhoto(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('ፎቶ አስወግድ', 'Remove')}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

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

          {/* Section 3: Marital Status & Family (Spouse, Children & Linked Church Database Household) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" />
                <span>{t('የጋብቻ ሁኔታ እና የአገልጋዩ ቤተሰብ (ከቤተክርስቲያን መረጃ ቋት ጋር)', 'Marital Status & Family (Linked with Church DB)')}</span>
              </h4>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-extrabold">
                {maritalStatus} · {t('ልጆች፦', 'Children:')} {children.length}
              </span>
            </div>

            {/* Linked Church Database Household Panel */}
            <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>{t('ከቤተክርስቲያን መረጃ ቋት የተገናኘ የቤተሰብ መዝገብ', 'Linked Church Database Household')}</span>
                  </div>
                  <p className="text-[11px] text-teal-900/80 mt-0.5">
                    {familyResolution.selfMember ? (
                      <>
                        {t('ተዛማጅ አባል፦', 'Matched Member:')}{' '}
                        <span className="font-extrabold">{familyResolution.selfMember.name}</span>
                        {familyResolution.selfMember.memberCode ? ` (${familyResolution.selfMember.memberCode})` : ''}
                        {familyResolution.chapel ? ` · ${familyResolution.chapel}` : ''}
                        {familyResolution.familyCode ? ` · ${t('የቤተሰብ ኮድ፦', 'Family Code:')} ${familyResolution.familyCode}` : ''}
                      </>
                    ) : (
                      t(
                        'የአገልጋዩ መዝገብ ከቤተክርስቲያን መረጃ ቋት ጋር ገና አልተገናኘም፤ ከታች ፈልገው ማገናኘት ይችላሉ።',
                        'Not yet linked to a Church Member record; search below to link.'
                      )
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                  {(familyResolution.detectedSpouse || familyResolution.detectedChildren.length > 0 || familyResolution.selfMember) && (
                    <button
                      type="button"
                      onClick={handleSyncFamilyFromChurchDB}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{t('ከመረጃ ቋት ወደ ባል/ሚስት እና ልጆች አመሳስል', 'Sync Spouse & Children')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFamilyLinkPicker((p) => !p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-teal-300 hover:bg-teal-50 text-teal-900 text-[11px] font-bold cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>
                      {familyResolution.selfMember
                        ? t('ከቋት አባል ቀይር', 'Change Link')
                        : t('ከቋት ፈልግና አገናኝ', 'Link Member')}
                    </span>
                  </button>
                  {linkedMemberId !== undefined && (
                    <button
                      type="button"
                      onClick={handleUnlinkChurchMember}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-[11px] font-bold cursor-pointer"
                      title={t('ማገናኘቱን አቋርጥ', 'Unlink')}
                    >
                      <Unlink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {showFamilyLinkPicker && (
                <div className="bg-white border border-teal-200 rounded-xl p-2.5 space-y-2 print:hidden">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={familyLinkSearch}
                      onChange={(e) => setFamilyLinkSearch(e.target.value)}
                      placeholder={t('የአባሉን ስም፣ ኮድ ወይም ስልክ ይጻፉ...', 'Search member name, code or phone...')}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  {familyLinkSearch.trim() && (
                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                      {familyLinkCandidates.length === 0 ? (
                        <div className="py-2 text-center text-[11px] text-slate-500">
                          {t('ተዛማጅ አባል አልተገኘም።', 'No matching church member found.')}
                        </div>
                      ) : (
                        familyLinkCandidates.map(({ member, familyCount }) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleLinkChurchMember(member)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-teal-50 rounded-lg text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <PersonAvatarBadge
                                name={member.name}
                                gender={member.gender}
                                photoDataUrl={member.photoDataUrl}
                                photoStorageKey={member.photoStorageKey}
                                size="xs"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-slate-900 truncate">{member.name}</div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {member.memberCode || '—'} · {member.chapel} · {member.phone || '—'}
                                </div>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 text-[10px] font-bold shrink-0">
                              {t(`ቤተሰብ (${familyCount})`, `Family (${familyCount})`)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {(familyResolution.familyMembers.length > 0 || familyResolution.familyChildren.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {familyResolution.familyMembers.map((fm) => (
                    <div
                      key={`db_m_${fm.id}`}
                      className="flex flex-col gap-2 p-2.5 rounded-xl bg-white border border-teal-200/80 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <PersonAvatarBadge
                          name={fm.name}
                          gender={fm.gender}
                          photoDataUrl={fm.photoDataUrl}
                          photoStorageKey={fm.photoStorageKey}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-extrabold text-slate-900 truncate">{fm.name}</span>
                            {fm.relationToHead && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 text-[10px] font-bold border border-teal-200">
                                {fm.relationToHead}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                            <div>
                              {fm.memberCode || '—'} · {fm.gender === 'ሴ' ? t('ሴት', 'F') : t('ወንድ', 'M')}
                              {fm.age !== undefined && fm.age !== '' ? ` · ${fm.age} ${t('ዓመት', 'yrs')}` : ''}
                            </div>
                            {(fm.educationLevel || fm.occupation) && (
                              <div className="truncate">
                                {[fm.educationLevel, fm.occupation].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {fm.phone && <div className="font-mono text-slate-700">{fm.phone}</div>}
                          </div>
                        </div>
                      </div>
                      {onUpdateChurchMember && (
                        <div className="pt-1 border-t border-slate-100 print:hidden">
                          <PersonPhotoField
                            storagePrefix="member"
                            personId={fm.id}
                            name={fm.name}
                            value={{
                              photoDataUrl: fm.photoDataUrl,
                              photoStorageKey: fm.photoStorageKey,
                              photoName: fm.photoName,
                              photoUpdatedAt: fm.photoUpdatedAt
                            }}
                            onChange={(nextPhoto) =>
                              onUpdateChurchMember({
                                ...fm,
                                photoDataUrl: nextPhoto.photoDataUrl,
                                photoStorageKey: nextPhoto.photoStorageKey,
                                photoName: nextPhoto.photoName,
                                photoUpdatedAt: nextPhoto.photoUpdatedAt
                              })
                            }
                            compact
                            labelAm="የቤተሰብ አባል ፎቶ"
                            labelEn="Member Photo"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {familyResolution.familyChildren.map((fc) => (
                    <div
                      key={`db_c_${fc.id}`}
                      className="flex flex-col gap-2 p-2.5 rounded-xl bg-white border border-rose-200/80 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <PersonAvatarBadge
                          name={fc.name}
                          gender={fc.gender}
                          photoDataUrl={fc.photoDataUrl}
                          photoStorageKey={fc.photoStorageKey}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-extrabold text-slate-900 truncate">{fc.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-900 text-[10px] font-bold border border-rose-200">
                              {t('ልጅ (ቋት)', 'Child (DB)')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                            <div>
                              {fc.memberCode || '—'} · {fc.gender === 'ሴ' ? t('ሴት', 'F') : t('ወንድ', 'M')}
                              {fc.age !== undefined && fc.age !== '' ? ` · ${fc.age} ${t('ዓመት', 'yrs')}` : ''}
                            </div>
                            {fc.educationLevel && <div className="truncate">{fc.educationLevel}</div>}
                          </div>
                        </div>
                      </div>
                      {onUpdateChurchChild && (
                        <div className="pt-1 border-t border-slate-100 print:hidden">
                          <PersonPhotoField
                            storagePrefix="child"
                            personId={fc.id}
                            name={fc.name}
                            value={{
                              photoDataUrl: fc.photoDataUrl,
                              photoStorageKey: fc.photoStorageKey,
                              photoName: fc.photoName,
                              photoUpdatedAt: fc.photoUpdatedAt
                            }}
                            onChange={(nextPhoto) =>
                              onUpdateChurchChild({
                                ...fc,
                                photoDataUrl: nextPhoto.photoDataUrl,
                                photoStorageKey: nextPhoto.photoStorageKey,
                                photoName: nextPhoto.photoName,
                                photoUpdatedAt: nextPhoto.photoUpdatedAt
                              })
                            }
                            compact
                            labelAm="የልጁ ፎቶ (ቋት)"
                            labelEn="Child Photo (DB)"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

            {/* Spouse Photo */}
            <div className="bg-rose-50/40 border border-rose-200/70 rounded-xl p-3">
              <PersonPhotoField
                storagePrefix={`hr_spouse_${record.id}`}
                personId={record.id}
                name={spouseName || t('የትዳር ጓደኛ', 'Spouse')}
                value={
                  spousePhoto.photoDataUrl
                    ? spousePhoto
                    : {
                        photoDataUrl: familyResolution.detectedSpouse?.photoDataUrl,
                        photoStorageKey: familyResolution.detectedSpouse?.photoStorageKey,
                        photoName: familyResolution.detectedSpouse?.photoName,
                        photoUpdatedAt: familyResolution.detectedSpouse?.photoUpdatedAt
                      }
                }
                onChange={handleSpousePhotoChange}
                compact
                labelAm="የትዳር ጓደኛ (ሚስት / ባል) ፎቶ"
                labelEn="Spouse Photo"
              />
            </div>

            {/* Children list & quick add */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-700" />
                <span>{t('የልጆች ዝርዝር', 'Children List')} ({children.length})</span>
              </div>

              <div className="space-y-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <input
                    type="text"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder={t('የልጁ ሙሉ ስም *', 'Child full name *')}
                    className="sm:col-span-4 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-semibold"
                  />
                  <select
                    value={newChildGender}
                    onChange={(e) => setNewChildGender(e.target.value as 'ወ' | 'ሴ')}
                    className="sm:col-span-2 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-bold"
                  >
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                  </select>
                  <input
                    type="text"
                    value={newChildAge}
                    onChange={(e) => setNewChildAge(e.target.value)}
                    placeholder={t('ዕድሜ / የትውልድ ዘመን', 'Age / Birth year')}
                    className="sm:col-span-3 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-white"
                  />
                  <input
                    type="text"
                    value={newChildNotes}
                    onChange={(e) => setNewChildNotes(e.target.value)}
                    placeholder={t('ማስታወሻ', 'Notes')}
                    className="sm:col-span-2 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-white"
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
                <PersonPhotoField
                  storagePrefix={`hr_new_child_${record.id}`}
                  personId={newChildName || 'new'}
                  name={newChildName || t('አዲስ ልጅ', 'New Child')}
                  value={newChildPhoto}
                  onChange={setNewChildPhoto}
                  compact
                  labelAm="የልጁ ፎቶ (አማራጭ)"
                  labelEn="Child Photo (Optional)"
                />
              </div>

              {children.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {children.map((child, idx) => (
                    <div
                      key={child.id}
                      className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <PersonAvatarBadge
                            name={child.name}
                            gender={child.gender}
                            photoDataUrl={child.photoDataUrl}
                            photoStorageKey={child.photoStorageKey}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate">
                              {idx + 1}. {child.name}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {child.gender === 'ሴ' ? t('ሴት', 'Female') : t('ወንድ', 'Male')}
                              {child.ageOrBirthDate ? ` · ${child.ageOrBirthDate}` : ''}
                              {child.memberCode ? ` · ${child.memberCode}` : ''}
                            </div>
                            {child.notes && <div className="text-[10px] text-slate-500 truncate">{child.notes}</div>}
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
                      <div className="pt-1 border-t border-slate-200/70 print:hidden">
                        <PersonPhotoField
                          storagePrefix={`hr_child_${record.id}`}
                          personId={child.id}
                          name={child.name}
                          value={{
                            photoDataUrl: child.photoDataUrl,
                            photoStorageKey: child.photoStorageKey,
                            photoName: child.photoName,
                            photoUpdatedAt: child.photoUpdatedAt
                          }}
                          onChange={(nextPhoto) => handleUpdateChildPhoto(child.id, nextPhoto)}
                          compact
                          labelAm="የልጁ ፎቶ"
                          labelEn="Child Photo"
                        />
                      </div>
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

      {/* Full-Size Photo Lightbox */}
      {isPhotoLightboxOpen && activePhotoSrc && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsPhotoLightboxOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
              <div className="text-xs font-extrabold truncate">
                {name} — {t('የፕሮፋይል ፎቶ', 'Profile Photo')}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadPhoto}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>{t('አውርድ', 'Download')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPhotoLightboxOpen(false)}
                  className="p-1 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                  aria-label={t('ዝጋ', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-slate-100 flex items-center justify-center max-h-[75dvh] overflow-hidden p-3">
              <img
                src={activePhotoSrc}
                alt={name}
                className="max-h-[70dvh] w-auto rounded-xl object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
