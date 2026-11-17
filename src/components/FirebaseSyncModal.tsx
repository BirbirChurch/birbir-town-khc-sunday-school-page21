import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  Download,
  Upload,
  CheckCircle2,
  Copy,
  Save,
  Server,
  FileJson
} from 'lucide-react';
import { AppData } from '../types';
import {
  getActiveProjectProfile,
  exportBackupJSON,
  importBackupJSON,
  syncAppDataToFirebase,
  countStudentsInData
} from '../services/firebase';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onDataRestored: (newData: AppData) => void;
  syncStatus: 'connected' | 'saving' | 'offline' | 'error';
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  appData,
  onDataRestored,
  syncStatus
}) => {
  const activeProfile = getActiveProjectProfile();
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [jsonText, setJsonText] = useState<string>('');
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [copiedFirestoreRules, setCopiedFirestoreRules] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);

  if (!isOpen) return null;

  const totalStudents = countStudentsInData(appData);
  const totalTeachers = appData.teachers?.length || 0;
  const totalSubjects = appData.subjects?.length || 0;
  const totalMembers = appData.churchMembers?.length || 0;
  const totalChildren = appData.churchChildren?.length || 0;

  const applyJsonPayload = (rawJson: string) => {
    const restored = importBackupJSON(rawJson, appData, importMode);
    if (restored) {
      onDataRestored(restored);
      const stCount = countStudentsInData(restored);
      const subjCount = restored.subjects?.length || 0;
      const tCount = restored.teachers?.length || 0;
      const mCount = restored.churchMembers?.length || 0;
      const cCount = restored.churchChildren?.length || 0;
      setStatusIsError(false);
      setStatusMessage(
        `✓ JSON መረጃው በተሳካ ሁኔታ ወደ አዲሱ Firebase (${activeProfile.id}) ገብቷል! (ተማሪዎች፦ ${stCount}፣ የቤተክርስቲያን አባላት፦ ${mCount}፣ የ0-14 ልጆች፦ ${cCount}፣ ትምህርቶች፦ ${subjCount}፣ መምህራን፦ ${tCount})`
      );
      setJsonText('');
      setShowPasteBox(false);
    } else {
      setStatusIsError(true);
      setStatusMessage('የገባው JSON ፋይል/ጽሑፍ ትክክለኛ ፎርማት አይደለም! እባክዎ ትክክለኛ Export JSON ወይም Backup JSON መሆኑን ያረጋግጡ።');
    }
  };

  const handleDownloadBackup = () => {
    exportBackupJSON(appData);
    setStatusIsError(false);
    setStatusMessage('ሙሉ የዳታ ባክአፕ (JSON) ወደ ኮምፒዩተርዎ/ስልክዎ ወርዷል!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      applyJsonPayload(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyPastedJson = () => {
    if (!jsonText.trim()) {
      setStatusIsError(true);
      setStatusMessage('እባክዎ መጀመሪያ የJSON ጽሑፉን ይለጥፉ!');
      return;
    }
    applyJsonPayload(jsonText);
  };

  const copyFirestoreRules = () => {
    const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
    navigator.clipboard.writeText(rulesText);
    setCopiedFirestoreRules(true);
    setTimeout(() => setCopiedFirestoreRules(false), 2500);
  };

  const handleForceSync = async () => {
    setStatusIsError(false);
    setStatusMessage(`ዳታውን ወደ አዲሱ Firebase (${activeProfile.id}) በመላክ ላይ...`);
    const ok = await syncAppDataToFirebase(appData);
    if (ok) {
      setStatusIsError(false);
      setStatusMessage(`✓ ሁሉም መረጃ ወደ አዲሱ Firebase (${activeProfile.id}) በሚገባ ተልኳል!`);
    } else {
      setStatusIsError(true);
      setStatusMessage('ወደ ኦንላይን መላክ አልተሳካም። እባክዎ በአዲሱ Firebase Console ውስጥ Rules መከፈቱን ያረጋግጡ።');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                syncStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                የአዲሱ Firebase ዳታቤዝ & JSON መቀበያ
              </h3>
              <p className="text-xs text-slate-500">
                በቋሚነት ከ <code className="font-mono font-bold text-blue-800">{activeProfile.id}</code> ጋር የተገናኘ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1 text-xs">
          {/* Active Project Status Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>ንቁ ዳታቤዝ፦ {activeProfile.id}</span>
              </div>
              <span className="bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                ብቸኛ ዋና Firebase
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-900 leading-relaxed">
              በስርዓቱ ውስጥ፦ <strong>{totalStudents} ተማሪዎች</strong>፣{' '}
              <strong>{totalMembers} የቤተክርስቲያን አባላት</strong>፣{' '}
              <strong>{totalChildren} ልጆች (0-14)</strong>፣{' '}
              <strong>{totalSubjects} ትምህርቶች</strong> እና{' '}
              <strong>{totalTeachers} መምህራን</strong> ይገኛሉ።
            </p>
          </div>

          {/* Status Notification Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl font-medium flex items-start gap-2 border ${
                statusIsError
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {statusIsError ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage}</span>
            </div>
          )}

          {/* Section 1: JSON Import (Primary) */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
            <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-indigo-700" />
              1. JSON ፋይል ወይም መረጃ መቀበያ (Import JSON to {activeProfile.id})
            </h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              ከቀድሞ Firebase Export የተደረገ <code>.json</code> ፋይል፣ የስርዓቱን ባክአፕ JSON ወይም ማንኛውንም የተማሪዎችና የቤተክርስቲያን መረጃ JSON በቀጥታ ወደ አዲሱ Firebase ያስገቡ፦
            </p>

            {/* Merge vs Replace Mode */}
            <div className="p-3 bg-white rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="font-bold text-[11px] text-slate-800 shrink-0">የማስገቢያ አማራጭ፦</span>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-emerald-900">
                  <input
                    type="radio"
                    name="jsonImportMode"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-emerald-600 cursor-pointer"
                  />
                  <span>ነባሩን ሳያጠፋ አዋህድ (Merge JSON)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-rose-900">
                  <input
                    type="radio"
                    name="jsonImportMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-rose-600 cursor-pointer"
                  />
                  <span>ሙሉ በሙሉ በዚህ JSON ተካ (Replace)</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl transition items-center gap-1.5 shadow cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>📂 የJSON ፋይል ምረጥና ጫን (.json)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileJson className="w-4 h-4" />
                <span>{showPasteBox ? 'ሳጥኑን ደብቅ' : '📋 የJSON ጽሑፍ በቀጥታ ለጥፍ'}</span>
              </button>
            </div>

            {showPasteBox && (
              <div className="space-y-2 pt-1">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={5}
                  placeholder='{ "kaleheywet_data": { ... } } ወይም የJSON መረጃውን እዚህ ይለጥፉ...'
                  className="w-full p-3 border border-indigo-300 rounded-xl font-mono text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleApplyPastedJson}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl transition shadow cursor-pointer"
                >
                  ✓ የተለጠፈውን JSON አስገባ & ወደ Firebase ላክ
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Backup Download & Force Sync */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-600" />
              2. የJSON ባክአፕ ማውረጃ እና ወደ አዲሱ Firebase ማስቀመጫ
            </h4>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                💾 ሙሉ ዳታውን በJSON አውርድ (Export JSON)
              </button>

              <button
                type="button"
                onClick={handleForceSync}
                className="bg-blue-800 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                ወደ {activeProfile.id} አስቀምጥ (Sync)
              </button>
            </div>
          </div>

          {/* Section 3: Cloud Firestore Rules Instructions */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
            <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              3. የCloud Firestore ዳታቤዝ ፍቃድ ማስተካከያ ({activeProfile.id} Rules)
            </h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              በFirebase Console ውስጥ <strong>Firestore Database → Rules</strong> ክፍል መከፈቱን ያረጋግጡ፦
            </p>

            {/* Firestore Rules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-[11px]">ለ Cloud Firestore Rules፦</span>
                <button
                  type="button"
                  onClick={copyFirestoreRules}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedFirestoreRules ? <CheckCircle2 className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  {copiedFirestoreRules ? 'ተቀድቷል!' : 'ኮፒ አድርግ'}
                </button>
              </div>
              <div className="bg-slate-900 text-emerald-300 font-mono text-[10px] p-2.5 rounded-xl overflow-x-auto">
                <pre>{`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            መረጃዎ በአዲሱ Firebase ({activeProfile.id}) በቋሚነት ይቀመጣል።
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow cursor-pointer"
          >
            ዝጋ / ተመለስ
          </button>
        </div>
      </div>
    </div>
  );
};
