import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  Shield,
  Users,
  CheckCircle2,
  Eye,
  EyeOff,
  Church,
  GraduationCap,
  RefreshCw,
  Search
} from 'lucide-react';
import { Teacher } from '../types';
import { DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';

interface PinManageTabProps {
  adminPin: string;
  leaderPin: string;
  chapelPins?: { [chapelName: string]: string };
  chapelList?: string[];
  teachers?: Teacher[];
  onSavePins: (adminPin: string, leaderPin: string, chapelPins: { [chapelName: string]: string }) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
}

export const PinManageTab: React.FC<PinManageTabProps> = ({
  adminPin,
  leaderPin,
  chapelPins = DEFAULT_CHAPEL_PINS,
  chapelList = DEFAULT_CHAPELS,
  teachers = [],
  onSavePins,
  onUpdateTeacher
}) => {
  const [newAdminPin, setNewAdminPin] = useState(adminPin);
  const [newLeaderPin, setNewLeaderPin] = useState(leaderPin);
  const [editedChapelPins, setEditedChapelPins] = useState<{ [chapelName: string]: string }>(() => {
    const initial: { [k: string]: string } = {};
    chapelList.forEach((ch, idx) => {
      initial[ch] = chapelPins?.[ch] || DEFAULT_CHAPEL_PINS[ch] || String(2001 + idx);
    });
    return initial;
  });

  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showLeaderPin, setShowLeaderPin] = useState(false);
  const [showChapelPins, setShowChapelPins] = useState(true);
  const [showTeacherPins, setShowTeacherPins] = useState(true);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [savedSuccess, setSavedSuccess] = useState<string>('');

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return [...teachers]
      .sort((a, b) => a.name.localeCompare(b.name, 'am'))
      .filter((t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.assignedClass.toLowerCase().includes(q) ||
        (t.assignedSubject || '').toLowerCase().includes(q)
      );
  }, [teachers, teacherSearch]);

  const generateRandomPin = () => String(Math.floor(1000 + Math.random() * 9000));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPin.trim() || !newLeaderPin.trim()) {
      alert('እባክዎን የአስተባባሪ እና የመሪዎች PIN ቁጥሮችን ያስገቡ!');
      return;
    }

    const cleanedChapelPins: { [k: string]: string } = {};
    for (const ch of chapelList) {
      const val = (editedChapelPins[ch] || '').trim();
      if (!val) {
        alert(`እባክዎን የ"${ch}" መግቢያ ቁልፍ (PIN) ባዶ አይተዉ!`);
        return;
      }
      cleanedChapelPins[ch] = val;
    }

    onSavePins(newAdminPin.trim(), newLeaderPin.trim(), cleanedChapelPins);
    setSavedSuccess('✓ የዋና አስተባባሪ፣ የመሪዎች እና የ10ሩም ቻፕሎች መግቢያ ቁልፎች (PINs) በተሳካ ሁኔታ ተቀምጠዋል!');
    setTimeout(() => setSavedSuccess(''), 4000);
  };

  const handleRegenerateAllChapelPins = () => {
    const next: { [k: string]: string } = {};
    chapelList.forEach((ch) => {
      next[ch] = generateRandomPin();
    });
    setEditedChapelPins(next);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-blue-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold">
              የሁሉም መግቢያ ቁልፎች (PINs) ማዕከላዊ መቆጣጠሪያ — አስተባባሪ ብቻ
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">
              የዋና አስተባባሪ፣ የቤተክርስቲያን መሪዎች፣ የ10ሩም ቻፕሎች እና የመምህራን መግቢያ ቁልፎችን በሙሉ እዚህ ይቆጣጠሩ።
            </p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Admin & General Leader PINs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h4 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-4 h-4 text-blue-800" />
            <span>1. የዋና አስተባባሪና የቤተክርስቲያን መሪዎች መግቢያ ቁልፍ (PIN)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-700" />
                የዋና አስተባባሪ (Admin) መግቢያ ቁልፍ፦
              </label>
              <div className="relative">
                <input
                  type={showAdminPin ? 'text' : 'password'}
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  placeholder="አስተባባሪ PIN"
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPin(!showAdminPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-700" />
                የቤተክርስቲያን መሪዎች (Leader) መግቢያ ቁልፍ፦
              </label>
              <div className="relative">
                <input
                  type={showLeaderPin ? 'text' : 'password'}
                  value={newLeaderPin}
                  onChange={(e) => setNewLeaderPin(e.target.value)}
                  placeholder="መሪዎች PIN"
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <button
                  type="button"
                  onClick={() => setShowLeaderPin(!showLeaderPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showLeaderPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: All 10 Chapels PINs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Church className="w-4 h-4 text-amber-700" />
                <span>2. የ10ሩም ቻፕሎች (Chapels) መግቢያ ቁልፎች (PINs)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                እያንዳንዱ ቻፕል የራሱን መረጃ ብቻ እንዲያስተዳድር የተመደበለት ልዩ መግቢያ ቁልፍ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChapelPins(!showChapelPins)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {showChapelPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showChapelPins ? 'ቁልፎችን ደብቅ' : 'ቁልፎችን አሳይ'}</span>
              </button>
              <button
                type="button"
                onClick={handleRegenerateAllChapelPins}
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ለሁሉም አዲስ ቁልፍ ፍጠር</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            {chapelList.map((chapelName, idx) => (
              <div
                key={`pin_ch_${chapelName}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/90"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-extrabold text-xs text-slate-900 truncate">{chapelName}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type={showChapelPins ? 'text' : 'password'}
                    value={editedChapelPins[chapelName] || ''}
                    onChange={(e) =>
                      setEditedChapelPins((prev) => ({
                        ...prev,
                        [chapelName]: e.target.value
                      }))
                    }
                    className="w-24 text-center px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditedChapelPins((prev) => ({
                        ...prev,
                        [chapelName]: generateRandomPin()
                      }))
                    }
                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition cursor-pointer"
                    title="አዲስ ባለ 4-አሃዝ ቁልፍ ፍጠር"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition duration-200 text-xs flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>የአስተባባሪ፣ የመሪዎችና የ10ሩም ቻፕሎች PIN አስቀምጥ</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: All Teachers PIN Management (Live Controlled by Admin) */}
      {teachers.length > 0 && onUpdateTeacher && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-700" />
                <span>3. የሁሉም መምህራን መግቢያ ቁልፎች (Teacher PINs - {teachers.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                የመምህራንን የመግቢያ ቁልፍ ሲቀይሩ ወዲያውኑ ይመዘገባል
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="መምህር ወይም ክፍል ፈልግ..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherPins(!showTeacherPins)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {showTeacherPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showTeacherPins ? 'ደብቅ' : 'አሳይ'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredTeachers.map((t) => (
              <div
                key={`admin_tpin_${t.id}`}
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{t.assignedClass}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type={showTeacherPins ? 'text' : 'password'}
                    value={t.pin}
                    onChange={(e) => onUpdateTeacher({ ...t, pin: e.target.value.trim() })}
                    className="w-20 text-center px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateTeacher({ ...t, pin: generateRandomPin() })}
                    className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded transition cursor-pointer"
                    title="አዲስ PIN ፍጠር"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
