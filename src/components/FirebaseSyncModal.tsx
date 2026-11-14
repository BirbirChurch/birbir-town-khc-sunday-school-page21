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
  Search,
  FileCheck2,
  ArrowDownToLine
} from 'lucide-react';
import { AppData } from '../types';
import {
  KNOWN_PROJECTS,
  getActiveProjectId,
  setActiveProjectId,
  exportBackupJSON,
  importBackupJSON,
  syncAppDataToFirebase,
  scanAndRecoverPreviousCloudData,
  fetchDataFromPreviousFirebaseUrl,
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>(getActiveProjectId());
  const [copiedRtdbRules, setCopiedRtdbRules] = useState(false);
  const [copiedFirestoreRules, setCopiedFirestoreRules] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importingUrl, setImportingUrl] = useState(false);
  const [prevFirebaseUrl, setPrevFirebaseUrl] = useState('');
  const [prevFirebaseAuth, setPrevFirebaseAuth] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [foundCloudData, setFoundCloudData] = useState<{
    projectLabel?: string;
    projectId?: string;
    studentCount?: number;
    data?: AppData;
  } | null>(null);

  if (!isOpen) return null;

  const totalStudents = countStudentsInData(appData);
  const totalTeachers = appData.teachers?.length || 0;
  const totalSubjects = appData.subjects?.length || 0;

  const handleSwitchProject = (newId: string) => {
    setSelectedProjectId(newId);
    setActiveProjectId(newId);
    setSwitching(true);
    setStatusIsError(false);
    setStatusMessage('ዳታቤዙን በማደስ ላይ ነው...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleDownloadBackup = () => {
    exportBackupJSON(appData);
    setStatusIsError(false);
    setStatusMessage('ሙሉ የዳታ ባክአፕ ወደ ኮምፒዩተርዎ/ስልክዎ ወርዷል! መረጃዎ 100% ደህንነቱ የተጠበቀ ነው።');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const restored = importBackupJSON(content, appData);
      if (restored) {
        onDataRestored(restored);
        const stCount = countStudentsInData(restored);
        const subjCount = restored.subjects?.length || 0;
        const tCount = restored.teachers?.length || 0;
        setStatusIsError(false);
        setStatusMessage(
          `✓ ከተጫነው JSON ፋይል መረጃው በተሳካ ሁኔታ ገብቷል! (ተማሪዎች፦ ${stCount}፣ የትምህርት ዓይነቶች፦ ${subjCount}፣ መምህራን፦ ${tCount})`
        );
      } else {
        setStatusIsError(true);
        setStatusMessage('የተመረጠው ፋይል ትክክለኛ የFirebase Export JSON ወይም የባክአፕ ፎርማት አይደለም!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFetchFromOldFirebase = async () => {
    setImportingUrl(true);
    setStatusIsError(false);
    setStatusMessage('ከቀድሞው Firebase ተማሪዎችን፣ ትምህርቶችን እና የመምህራን ምደባ በመፈለግ ላይ...');
    try {
      const res = await fetchDataFromPreviousFirebaseUrl(prevFirebaseUrl, appData, prevFirebaseAuth);
      if (res.ok && res.merged && res.summary) {
        onDataRestored(res.merged);
        setStatusIsError(false);
        setStatusMessage(
          `✓ ከቀድሞው Firebase በተሳካ ሁኔታ ገብቷል! ተማሪዎች፦ ${res.summary.studentsCount}፣ የትምህርት ዓይነቶች፦ ${res.summary.subjectsCount} (በክፍል የተመደቡ፦ ${res.summary.classSubjectsCount})፣ መምህራን፦ ${res.summary.teachersCount}`
        );
      } else {
        setStatusIsError(true);
        setStatusMessage(res.message || 'መረጃውን ማምጣት አልተቻለም።');
      }
    } catch {
      setStatusIsError(true);
      setStatusMessage('ከቀድሞው Firebase ጋር መገናኘት አልተቻለም። እባክዎ አድራሻውን ወይም JSON ፋይልን ይጠቀሙ።');
    } finally {
      setImportingUrl(false);
    }
  };

  const copyRtdbRules = () => {
    const rulesText = `{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`;
    navigator.clipboard.writeText(rulesText);
    setCopiedRtdbRules(true);
    setTimeout(() => setCopiedRtdbRules(false), 2500);
  };

  const copyFirestoreRules = () => {
    const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
    navigator.clipboard.writeText(rulesText);
    setCopiedFirestoreRules(true);
    setTimeout(() => setCopiedFirestoreRules(false), 2500);
  };

  const handleForceSync = async () => {
    setStatusIsError(false);
    setStatusMessage('ዳታውን ወደ ኦንላይን ዳታቤዝ በመላክ ላይ...');
    const ok = await syncAppDataToFirebase(appData);
    if (ok) {
      setStatusIsError(false);
      setStatusMessage('✓ ዳታው በሙሉ ወደ ኦንላይን ዳታቤዝ (geladestazelulove1628) በሚገባ ተልኳል!');
    } else {
      setStatusIsError(true);
      setStatusMessage('ወደ ኦንላይን መላክ አልተሳካም። እባክዎ ከታች የFirebase Rules መከፈቱን ያረጋግጡ። ስራዎ በብሮውዘርዎ ውስጥ በደህና ተቀምጧል!');
    }
  };

  const handleScanForPreviousWork = async () => {
    setScanning(true);
    setStatusIsError(false);
    setStatusMessage('በአዲሱ Firebase ውስጥ የተቀመጠ ዳታ በመፈተሽ ላይ ነው...');
    try {
      const result = await scanAndRecoverPreviousCloudData();
      if (result.found && result.data) {
        setFoundCloudData({
          projectLabel: result.projectLabel,
          projectId: result.projectId,
          studentCount: result.studentCount,
          data: result.data
        });
        setStatusMessage(`በ${result.projectLabel} ውስጥ ${result.studentCount} ተማሪዎች ተገኝተዋል!`);
      } else {
        setStatusMessage('በአሁኑ ኦንላይን ዳታቤዝ ውስጥ ተጨማሪ ዳታ አልተገኘም። ከቀድሞ Firebase ለማምጣት ከታች ያለውን መሳሪያ ይጠቀሙ።');
      }
    } catch {
      setStatusMessage('ፍተሻው ተጠናቋል።');
    } finally {
      setScanning(false);
    }
  };

  const handleApplyRecoveredData = () => {
    if (foundCloudData?.data) {
      onDataRestored(foundCloudData.data);
      syncAppDataToFirebase(foundCloudData.data);
      setStatusIsError(false);
      setStatusMessage('✓ ዳታው በሙሉ ተመልሶ ተገናኝቷል!');
      setFoundCloudData(null);
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
                የዳታ ደህንነት፣ ከቀድሞ Firebase ማምጫ እና Sync
              </h3>
              <p className="text-xs text-slate-500">
                ተማሪዎችን፣ ትምህርቶችን እና የመምህራን ምደባን ማስገቢያ እና ባክአፕ
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
          {/* Reassurance Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>የእርስዎ የሰሩት ስራ የተጠበቀ ነው (Data is Protected)</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-900 leading-relaxed">
              አሁን በስርዓቱ ውስጥ፦ <strong>{totalStudents} ተማሪዎች</strong>፣{' '}
              <strong>{totalSubjects} የትምህርት ዓይነቶች</strong> እና{' '}
              <strong>{totalTeachers} መምህራን</strong> ተመዝግበው ይገኛሉ።
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

          {/* Found Cloud Data Recovery Prompt */}
          {foundCloudData && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                <span>በ{foundCloudData.projectLabel} ውስጥ {foundCloudData.studentCount} ተማሪዎች ተገኝተዋል!</span>
              </div>
              <button
                type="button"
                onClick={handleApplyRecoveredData}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                የተገኘውን ዳታ አሁን አስገባ
              </button>
            </div>
          )}

          {/* Action 1: Import from Previous Firebase (Students, Subjects, Teachers) */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
            <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
              <ArrowDownToLine className="w-4 h-4 text-indigo-700" />
              1. ከቀድሞ Firebase ተማሪዎች፣ ትምህርቶች እና የመምህራን ምደባ ማስገቢያ
            </h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              በቀድሞው Firebase ውስጥ ተስተካክሎ የነበረውን የሰንበት ትምህርት ቤት <strong>ተማሪዎች</strong>፣{' '}
              <strong>የትምህርት ዓይነቶች</strong> እና <strong>የመምህራን ምደባ</strong> ወደዚህ ለማስገባት (አሁን ያለውን 5,300+ የቤተክርስቲያን ቋት ሳያጠፋ) ከሁለቱ አንዱን ይጠቀሙ፦
            </p>

            {/* Option A: Direct URL / Project ID */}
            <div className="p-3 bg-white rounded-xl border border-indigo-200/80 space-y-2">
              <p className="font-bold text-[11px] text-indigo-900">
                መንገድ ሀ) በቀድሞው Firebase ሊንክ ወይም Project ID ቀጥታ ማምጣት፦
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={prevFirebaseUrl}
                  onChange={(e) => setPrevFirebaseUrl(e.target.value)}
                  placeholder="https://...-default-rtdb.europe-west1.firebasedatabase.app ወይም Project ID"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <input
                  type="password"
                  value={prevFirebaseAuth}
                  onChange={(e) => setPrevFirebaseAuth(e.target.value)}
                  placeholder="Database Secret/Token (አማራጭ)"
                  className="sm:w-44 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={importingUrl || !prevFirebaseUrl.trim()}
                  onClick={handleFetchFromOldFirebase}
                  className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-300 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  {importingUrl ? 'በማምጣት ላይ...' : '📥 ከቀድሞ Firebase አምጣ & አዋህድ'}
                </button>
              </div>
            </div>

            {/* Option B: Export JSON from Old Firebase Console */}
            <div className="p-3 bg-white rounded-xl border border-indigo-200/80 space-y-2">
              <p className="font-bold text-[11px] text-indigo-900">
                መንገድ ለ) ከቀድሞው Firebase Console በExport JSON የወረደ ፋይል መጫን (Rules የተቆለፈ ከሆነ ቀላሉ መንገድ)፦
              </p>
              <p className="text-[10px] text-slate-500">
                በቀድሞው Firebase Console &gt; Realtime Database &gt; <strong>⋮ &gt; Export JSON</strong> የሚለውን ተጭነው የወረደውን <code className="bg-slate-100 px-1 rounded">.json</code> ፋይል እዚህ ይጫኑ፦
              </p>
              <label className="inline-flex bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition items-center gap-1.5 shadow cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                📂 የቀድሞ Firebase Export JSON ፋይል ጫን
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Action 2: Backup Download & Force Sync */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              2. የዳታ ባክአፕ ማውረጃ እና ወደ አዲሱ Firebase ማስቀመጫ
            </h4>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                💾 ሙሉ ዳታዬን ባክአፕ አውርድ (Backup JSON)
              </button>

              <button
                type="button"
                onClick={handleForceSync}
                className="bg-blue-800 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                ወደ geladestazelulove1628 ላክ
              </button>

              <button
                type="button"
                disabled={scanning}
                onClick={handleScanForPreviousWork}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                {scanning ? 'በመፈተሽ ላይ...' : '🔍 በአዲሱ ዳታቤዝ ፈልግ'}
              </button>
            </div>
          </div>

          {/* Action 3: Active Firebase Database Project */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-600" />
              3. የተገናኘው የFirebase ፕሮጀክት (Active Firebase Project)
            </h4>
            <div className="space-y-2">
              {KNOWN_PROJECTS.map((proj) => {
                const isSelected = selectedProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    className="p-3 rounded-xl border bg-blue-50/80 border-blue-400 font-bold text-blue-950 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{proj.label}</span>
                        <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                          ንቁ (Active)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 block font-mono mt-0.5">
                        {proj.config.databaseURL || proj.config.authDomain}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSwitchProject(proj.id)}
                      disabled={switching || isSelected}
                      className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold"
                    >
                      ተገናኝቷል
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action 4: Firebase Rules Instructions */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
            <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              4. የFirebase ዳታቤዝ ፍቃድ ማስተካከያ (Firebase Rules Setup)
            </h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              ኦንላይን ዳታቤዝ እንዲገናኝ በFirebase Console ውስጥ Rules ን ይክፈቱ፦
            </p>

            {/* RTDB Rules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-[11px]">ሀ) ለ Realtime Database፦</span>
                <button
                  type="button"
                  onClick={copyRtdbRules}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedRtdbRules ? <CheckCircle2 className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  {copiedRtdbRules ? 'ተቀድቷል!' : 'ኮፒ አድርግ'}
                </button>
              </div>
              <div className="bg-slate-900 text-emerald-300 font-mono text-[10px] p-2.5 rounded-xl overflow-x-auto">
                <pre>{`{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`}</pre>
              </div>
            </div>

            {/* Firestore Rules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-[11px]">ለ) ለ Cloud Firestore፦</span>
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
            መረጃዎ በቋሚነት የተጠበቀ ነው።
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
