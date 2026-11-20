import React, { useState, useMemo, useEffect } from 'react';
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
  Search,
  AlertTriangle
} from 'lucide-react';
import { Teacher } from '../types';
import { DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';
import { CHURCH_ORG_UNITS, DEFAULT_ORG_UNIT_PINS } from '../constants/churchStructure';

interface PinManageTabProps {
  adminPin: string;
  leaderPin: string;
  childrenCoordinatorPin?: string;
  youthCoordinatorPin?: string;
  chapelPins?: { [chapelName: string]: string };
  unitPins?: { [unitId: string]: string };
  chapelList?: string[];
  teachers?: Teacher[];
  onSavePins: (
    adminPin: string,
    leaderPin: string,
    chapelPins: { [chapelName: string]: string },
    unitPins?: { [unitId: string]: string },
    childrenCoordinatorPin?: string,
    youthCoordinatorPin?: string
  ) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
}

export const PinManageTab: React.FC<PinManageTabProps> = ({
  adminPin,
  leaderPin,
  childrenCoordinatorPin = '5679',
  youthCoordinatorPin = '3214',
  chapelPins = DEFAULT_CHAPEL_PINS,
  unitPins = DEFAULT_ORG_UNIT_PINS,
  chapelList = DEFAULT_CHAPELS,
  teachers = [],
  onSavePins,
  onUpdateTeacher
}) => {
  const [newAdminPin, setNewAdminPin] = useState(adminPin);
  const [newLeaderPin, setNewLeaderPin] = useState(leaderPin);
  const [newCoordinatorPin, setNewCoordinatorPin] = useState(childrenCoordinatorPin);
  const [newYouthCoordinatorPin, setNewYouthCoordinatorPin] = useState(youthCoordinatorPin);
  const [editedChapelPins, setEditedChapelPins] = useState<{ [chapelName: string]: string }>(() => {
    const initial: { [k: string]: string } = {};
    chapelList.forEach((ch, idx) => {
      initial[ch] = chapelPins?.[ch] || DEFAULT_CHAPEL_PINS[ch] || String(2001 + idx);
    });
    return initial;
  });
  const [editedUnitPins, setEditedUnitPins] = useState<{ [unitId: string]: string }>(() => {
    const initial: { [k: string]: string } = {};
    CHURCH_ORG_UNITS.forEach((u) => {
      if (u.id === 'children_ministry') {
        initial[u.id] = unitPins?.[u.id] || leaderPin || u.defaultPin;
      } else {
        initial[u.id] = unitPins?.[u.id] || u.defaultPin;
      }
    });
    return initial;
  });

  useEffect(() => {
    setNewAdminPin(adminPin);
  }, [adminPin]);

  useEffect(() => {
    setNewLeaderPin(leaderPin);
  }, [leaderPin]);

  useEffect(() => {
    setNewCoordinatorPin(childrenCoordinatorPin);
  }, [childrenCoordinatorPin]);

  useEffect(() => {
    setNewYouthCoordinatorPin(youthCoordinatorPin);
  }, [youthCoordinatorPin]);

  useEffect(() => {
    const next: { [k: string]: string } = {};
    chapelList.forEach((ch, idx) => {
      next[ch] = chapelPins?.[ch] || DEFAULT_CHAPEL_PINS[ch] || String(2001 + idx);
    });
    setEditedChapelPins(next);
  }, [chapelPins, chapelList]);

  useEffect(() => {
    const next: { [k: string]: string } = {};
    CHURCH_ORG_UNITS.forEach((u) => {
      if (u.id === 'children_ministry') {
        next[u.id] = unitPins?.[u.id] || leaderPin || u.defaultPin;
      } else {
        next[u.id] = unitPins?.[u.id] || u.defaultPin;
      }
    });
    setEditedUnitPins(next);
  }, [unitPins, leaderPin]);

  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showLeaderPin, setShowLeaderPin] = useState(false);
  const [showCoordinatorPin, setShowCoordinatorPin] = useState(false);
  const [showYouthCoordinatorPin, setShowYouthCoordinatorPin] = useState(false);
  const [showUnitPins, setShowUnitPins] = useState(true);
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

  const duplicateTeacherPins = useMemo(() => {
    const counts = new Map<string, number>();
    teachers.forEach((t) => {
      const p = String(t.pin || '').trim();
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    });
    const dups = new Set<string>();
    counts.forEach((c, p) => {
      if (c > 1) dups.add(p);
    });
    return dups;
  }, [teachers]);

  const generateUniquePin = (exclude?: Set<string>) => {
    const used = new Set<string>(exclude || []);
    teachers.forEach((t) => {
      const p = String(t.pin || '').trim();
      if (p) used.add(p);
    });
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000));
      if (!used.has(candidate)) return candidate;
    }
    return String(Math.floor(10000 + Math.random() * 90000));
  };

  const handleFixDuplicateTeacherPins = () => {
    if (!onUpdateTeacher) return;
    const seen = new Set<string>();
    let fixedCount = 0;
    teachers.forEach((t) => {
      const p = String(t.pin || '').trim();
      if (!p || seen.has(p)) {
        const fresh = generateUniquePin(seen);
        seen.add(fresh);
        onUpdateTeacher({ ...t, pin: fresh });
        fixedCount++;
      } else {
        seen.add(p);
      }
    });
    if (fixedCount > 0) {
      setSavedSuccess(`✓ ${fixedCount} የተደጋገሙ ወይም ባዶ የመምህራን PINs በልዩ ቁጥር ተስተካክለዋል!`);
      setTimeout(() => setSavedSuccess(''), 4000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedChildrenPin = (editedUnitPins.children_ministry || newLeaderPin || '').trim();
    const resolvedCoordinatorPin = (newCoordinatorPin || '').trim();
    const resolvedYouthCoordinatorPin = (newYouthCoordinatorPin || '').trim();
    if (!newAdminPin.trim() || !resolvedChildrenPin || !resolvedCoordinatorPin || !resolvedYouthCoordinatorPin) {
      setSavedSuccess('እባክዎን የዋና አዲሚን፣ የልጆችና የወጣቶች አስተባባሪ እንዲሁም የአመራር PIN ቁጥሮችን ያስገቡ!');
      return;
    }

    const cleanedChapelPins: { [k: string]: string } = {};
    for (const ch of chapelList) {
      const val = (editedChapelPins[ch] || '').trim();
      if (!val) {
        setSavedSuccess(`እባክዎን የ"${ch}" መግቢያ ቁልፍ (PIN) ባዶ አይተዉ!`);
        return;
      }
      cleanedChapelPins[ch] = val;
    }

    const cleanedUnitPins: { [k: string]: string } = {};
    for (const u of CHURCH_ORG_UNITS) {
      const val =
        u.id === 'children_ministry'
          ? resolvedChildrenPin
          : (editedUnitPins[u.id] || '').trim();
      if (!val) {
        setSavedSuccess(`እባክዎን የ"${u.name}" መግቢያ ቁልፍ (PIN) ባዶ አይተዉ!`);
        return;
      }
      cleanedUnitPins[u.id] = val;
    }

    onSavePins(
      newAdminPin.trim(),
      resolvedChildrenPin,
      cleanedChapelPins,
      cleanedUnitPins,
      resolvedCoordinatorPin,
      resolvedYouthCoordinatorPin
    );
    setSavedSuccess('✓ የዋና አዲሚን፣ የልጆችና የወጣቶች አስተባባሪ፣ የሁሉም መዋቅር ክፍሎች እና የ10ሩም ቻፕሎች መግቢያ ቁልፎች (PINs) ተቀምጠዋል!');
    setTimeout(() => setSavedSuccess(''), 4000);
  };

  const handleRegenerateAllChapelPins = () => {
    const next: { [k: string]: string } = {};
    const used = new Set<string>();
    chapelList.forEach((ch) => {
      const p = generateUniquePin(used);
      used.add(p);
      next[ch] = p;
    });
    setEditedChapelPins(next);
  };

  const handleRegenerateAllUnitPins = () => {
    const next: { [k: string]: string } = {};
    const used = new Set<string>([newAdminPin.trim()]);
    CHURCH_ORG_UNITS.forEach((u) => {
      const p = generateUniquePin(used);
      used.add(p);
      next[u.id] = p;
    });
    setEditedUnitPins(next);
    if (next.children_ministry) {
      setNewLeaderPin(next.children_ministry);
    }
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
            <span>የዋና አስተባባሪና የቤተክርስቲያን መሪዎች መግቢያ ቁልፍ (PIN)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Shield className="w-4 h-4 text-emerald-700" />
                የልጆች አገልግሎት አስተባባሪ PIN፦
              </label>
              <div className="relative">
                <input
                  type={showCoordinatorPin ? 'text' : 'password'}
                  value={newCoordinatorPin}
                  onChange={(e) => setNewCoordinatorPin(e.target.value)}
                  placeholder="የልጆች አስተባባሪ PIN"
                  className="w-full px-3.5 py-2.5 pr-10 border border-emerald-300 bg-emerald-50/40 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCoordinatorPin(!showCoordinatorPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCoordinatorPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-emerald-800 mt-1 font-semibold">
                የልጆች አገልግሎት ገጽን ሙሉ በሙሉ የሚቆጣጠር
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-700" />
                የልጆች አገልግሎት አመራር (Leader) PIN፦
              </label>
              <div className="relative">
                <input
                  type={showLeaderPin ? 'text' : 'password'}
                  value={newLeaderPin}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewLeaderPin(val);
                    setEditedUnitPins((prev) => ({
                      ...prev,
                      children_ministry: val
                    }));
                  }}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-700" />
                የወጣቶች አገልግሎት አስተባባሪ PIN፦
              </label>
              <div className="relative">
                <input
                  type={showYouthCoordinatorPin ? 'text' : 'password'}
                  value={newYouthCoordinatorPin}
                  onChange={(e) => setNewYouthCoordinatorPin(e.target.value)}
                  placeholder="የወጣቶች አስተባባሪ PIN"
                  className="w-full px-3.5 py-2.5 pr-10 border border-purple-300 bg-purple-50/40 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowYouthCoordinatorPin(!showYouthCoordinatorPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showYouthCoordinatorPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-purple-800 mt-1 font-semibold">
                የወጣቶች አስተባባሪ ገጽ (የመሪዎች PIN ከታች ያለው 3204 ነው)
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: All 18 Church Organizational Units PINs (1 - 1.2.7.6) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-800" />
                <span>የቤተክርስቲያን መዋቅር መምሪያዎች እና አገልግሎቶች መግቢያ ቁልፎች</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                እያንዳንዱ መምሪያና አገልግሎት ራሱን ችሎ በራሱ ገጽ እንዲገባ የሚያገለግል ልዩ የመግቢያ ቁልፍ (PIN)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnitPins(!showUnitPins)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {showUnitPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showUnitPins ? 'ቁልፎችን ደብቅ' : 'ቁልፎችን አሳይ'}</span>
              </button>
              <button
                type="button"
                onClick={handleRegenerateAllUnitPins}
                className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ለሁሉም አዲስ ቁልፍ ፍጠር</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHURCH_ORG_UNITS.map((unit) => (
              <div
                key={`pin_unit_${unit.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/90"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center shrink-0">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-slate-900 truncate">{unit.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {unit.id === 'children_ministry'
                        ? 'ከመሪዎች PIN ጋር የተያያዘ'
                        : unit.id === 'youth_ministry'
                        ? 'የወጣቶች አገልግሎት መሪዎች ገጽ PIN'
                        : unit.hasChurchRegistry
                        ? 'የቤተክርስቲያን መረጃ ቋትን ያካትታል'
                        : unit.id === 'chapels_dept'
                        ? '10ሩም ቻፕሎች በዚህ ስር'
                        : 'ራሱን የቻለ መምሪያ ገጽ'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type={showUnitPins ? 'text' : 'password'}
                    value={editedUnitPins[unit.id] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditedUnitPins((prev) => ({
                        ...prev,
                        [unit.id]: val
                      }));
                      if (unit.id === 'children_ministry') {
                        setNewLeaderPin(val);
                      }
                    }}
                    className="w-24 text-center px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = generateUniquePin(
                        new Set([newAdminPin.trim(), ...Object.values(editedUnitPins)])
                      );
                      setEditedUnitPins((prev) => ({
                        ...prev,
                        [unit.id]: fresh
                      }));
                      if (unit.id === 'children_ministry') {
                        setNewLeaderPin(fresh);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                    title="አዲስ ባለ 4-አሃዝ ቁልፍ ፍጠር"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: All 10 Chapels PINs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Church className="w-4 h-4 text-amber-700" />
                <span>የ10ሩም ቻፕሎች መግቢያ ቁልፎች (PINs)</span>
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
            {chapelList.map((chapelName) => (
              <div
                key={`pin_ch_${chapelName}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/90"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    <Church className="w-3.5 h-3.5 text-amber-700" />
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
                        [chapelName]: generateUniquePin(new Set(Object.values(prev)))
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
              <span>የዋና አዲሚን፣ የ18ቱ መዋቅር ክፍሎችና የ10ሩም ቻፕሎች PIN አስቀምጥ</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 4: All Teachers PIN Management (Live Controlled by Admin) */}
      {teachers.length > 0 && onUpdateTeacher && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-700" />
                <span>የልጆች አገልግሎት መምህራን መግቢያ ቁልፎች (Teacher PINs - {teachers.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                መምህራን በምስጥር ቁጥር (PIN) ብቻ ስለሚገቡ የእያንዳንዱ መምህር PIN የተለየ መሆን አለበት
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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

          {duplicateTeacherPins.size > 0 && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  ማስጠንቀቂያ፦ አንድ ዓይነት የተደጋገመ PIN ({Array.from(duplicateTeacherPins).join(', ')}) ተገኝቷል! መምህራን በPIN ብቻ ስለሚገቡ ሁሉም የተለየ ቁጥር ሊኖራቸው ይገባል።
                </span>
              </div>
              <button
                type="button"
                onClick={handleFixDuplicateTeacherPins}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0"
              >
                🔄 የተደጋገሙ PINs በራሱ አስተካክል
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredTeachers.map((t) => {
              const isDup = duplicateTeacherPins.has(String(t.pin || '').trim()) || !String(t.pin || '').trim();
              return (
                <div
                  key={`admin_tpin_${t.id}`}
                  className={`flex items-center justify-between gap-2 p-3 rounded-xl border ${
                    isDup ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">{t.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t.assignedClass}</div>
                    {isDup && (
                      <div className="text-[10px] font-bold text-rose-700">የተደጋገመ/ባዶ PIN!</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type={showTeacherPins ? 'text' : 'password'}
                      value={t.pin}
                      onChange={(e) => onUpdateTeacher({ ...t, pin: e.target.value.trim() })}
                      className={`w-20 text-center px-2 py-1 bg-white border rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 ${
                        isDup ? 'border-rose-400 focus:ring-rose-500 text-rose-800' : 'border-slate-300 focus:ring-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateTeacher({ ...t, pin: generateUniquePin() })}
                      className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded transition cursor-pointer"
                      title="አዲስ ልዩ PIN ፍጠር"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
