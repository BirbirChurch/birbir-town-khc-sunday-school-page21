import React, { useState } from 'react';
import {
  Shield,
  Users,
  GraduationCap,
  ArrowLeft,
  Church,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Lock
} from 'lucide-react';
import { Role, Teacher } from '../types';
import { DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';

interface LoginPortalProps {
  teachers: Teacher[];
  adminPin?: string;
  leaderPin?: string;
  chapelPins?: { [chapelName: string]: string };
  chapelList?: string[];
  onLoginSuccess: (role: Role, teacher?: Teacher, chapel?: string) => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  teachers,
  adminPin = '1234',
  leaderPin = '5678',
  chapelPins = DEFAULT_CHAPEL_PINS,
  chapelList = DEFAULT_CHAPELS,
  onLoginSuccess
}) => {
  const [activeRole, setActiveRole] = useState<Role | 'chapel_leader' | null>(null);
  const [selectedChapel, setSelectedChapel] = useState<string>(chapelList[0] || DEFAULT_CHAPELS[0]);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSelectRole = (role: Role | 'chapel_leader') => {
    setActiveRole(role);
    setPinInput('');
    setShowPin(false);
    setErrorMsg('');

    if (role === 'chapel_leader' && chapelList.length > 0) {
      setSelectedChapel(chapelList[0]);
    }
  };

  const handleBack = () => {
    setActiveRole(null);
    setPinInput('');
    setShowPin(false);
    setErrorMsg('');
  };

  const handleVerifyAndLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim();
    if (!entered) {
      setErrorMsg('እባክዎን የመግቢያ ቁልፍ (PIN) ያስገቡ!');
      return;
    }

    if (activeRole === 'admin') {
      const expected = String(adminPin || '1234').trim();
      if (entered === expected) {
        onLoginSuccess('admin');
      } else {
        setErrorMsg('የዋና አስተባባሪ መግቢያ ቁልፍ (PIN) ትክክል አይደለም!');
      }
      return;
    }

    if (activeRole === 'leader') {
      const expected = String(leaderPin || '5678').trim();
      if (entered === expected) {
        onLoginSuccess('leader');
      } else {
        setErrorMsg('የቤተክርስቲያን መሪ መግቢያ ቁልፍ (PIN) ትክክል አይደለም! እባክዎ አስተባባሪውን ይጠይቁ።');
      }
      return;
    }

    if (activeRole === 'chapel_leader') {
      const expected = String(
        chapelPins?.[selectedChapel] || DEFAULT_CHAPEL_PINS[selectedChapel] || ''
      ).trim();
      if (expected && entered === expected) {
        onLoginSuccess('leader', undefined, selectedChapel);
      } else {
        setErrorMsg(`የ${selectedChapel} መግቢያ ቁልፍ (PIN) ትክክል አይደለም! እባክዎ የዋና አስተባባሪውን ቁልፍ ይጠይቁ።`);
      }
      return;
    }

    if (activeRole === 'teacher') {
      const matchedTeacher = teachers.find(
        (t) => String(t.pin || '').trim() !== '' && String(t.pin || '').trim() === entered
      );
      if (matchedTeacher) {
        onLoginSuccess('teacher', matchedTeacher);
      } else {
        setErrorMsg('ያስገቡት የመምህር የምስጥር ቁጥር (PIN) ትክክል አይደለም! እባክዎ ትክክለኛውን ቁልፍ ያስገቡ ወይም አስተባባሪውን ይጠይቁ።');
      }
    }
  };

  const getRoleHeader = () => {
    if (activeRole === 'admin') {
      return {
        title: 'የዋና ቤተክርስቲያን አስተባባሪ መግቢያ',
        subtitle: 'እባክዎን የአስተባባሪውን የመግቢያ ቁልፍ (PIN) ያስገቡ',
        iconBg: 'bg-blue-50 text-blue-900 border-blue-200',
        btnBg: 'bg-blue-900 hover:bg-blue-800',
        icon: <Shield className="w-6 h-6" />
      };
    }
    if (activeRole === 'leader') {
      return {
        title: 'የቤተክርስቲያን መሪዎች መግቢያ',
        subtitle: 'እባክዎን በዋና አስተባባሪ የተሰጠውን የመሪዎች ቁልፍ (PIN) ያስገቡ',
        iconBg: 'bg-teal-50 text-teal-800 border-teal-200',
        btnBg: 'bg-teal-800 hover:bg-teal-700',
        icon: <Users className="w-6 h-6" />
      };
    }
    if (activeRole === 'chapel_leader') {
      return {
        title: 'የቻፕል መሪዎችና ተወካዮች መግቢያ',
        subtitle: 'ቻፕልዎን ይምረጡና የቻፕልዎን የመግቢያ ቁልፍ (PIN) ያስገቡ',
        iconBg: 'bg-amber-50 text-amber-800 border-amber-200',
        btnBg: 'bg-amber-600 hover:bg-amber-500',
        icon: <Church className="w-6 h-6" />
      };
    }
    return {
      title: 'የመማሪያ ክፍል መምህራን መግቢያ',
      subtitle: 'ስም መምረጥ ሳያስፈልግ በአስተባባሪ የተሰጠዎትን የግል ምስጥር ቁጥር (PIN) ብቻ ያስገቡ',
      iconBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      btnBg: 'bg-indigo-900 hover:bg-indigo-800',
      icon: <GraduationCap className="w-6 h-6" />
    };
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 w-full">
      {!activeRole ? (
        <div>
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-900 text-amber-300 flex items-center justify-center mb-3 shadow-md border border-blue-700">
              <Church className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን - የመግቢያ ፖርታል
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-xl mx-auto font-medium flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ሁሉም መግቢያዎች በአስተባባሪ በተመደበ የመግቢያ ቁልፍ (PIN) የተጠበቁ ናቸው</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Admin Portal Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-600/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-blue-900 group-hover:text-amber-300 transition duration-200 shadow-xs">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">የቤተክርስቲያን አስተባባሪ</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  የዋና አስተባባሪ ገጽ፦ ሙሉ መቆጣጠሪያ፣ ሁሉንም የመግቢያ ቁልፎች (PIN) ማቀናበሪያና የዳታቤዝ ማስተካከያ።
                </p>
              </div>
              <button
                onClick={() => handleSelectRole('admin')}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-3 text-xs rounded-xl shadow transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>በአስተባባሪ ቁልፍ ግባ</span>
              </button>
            </div>

            {/* General Leader Portal Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-teal-600/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-teal-700 group-hover:text-white transition duration-200 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">የቤተክርስቲያን መሪዎች</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  የዋና ቤተክርስቲያን የልጆች አገልግሎት መሪዎች፦ የሰንበት ት/ቤት፣ የልጆች ቋትና ቡድኖች ማስተባበሪያ።
                </p>
              </div>
              <button
                onClick={() => handleSelectRole('leader')}
                className="w-full bg-teal-800 hover:bg-teal-700 text-white font-bold py-2.5 px-3 text-xs rounded-xl shadow transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-200" />
                <span>በመሪዎች ቁልፍ ግባ</span>
              </button>
            </div>

            {/* Chapel Leaders Portal Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-600/50 transition-all duration-200 flex flex-col justify-between group ring-2 ring-amber-400/30">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition duration-200 shadow-xs">
                  <Church className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.2 rounded-full uppercase">10ሩም ቻፕሎች</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">የቻፕሎች መሪዎች / ተወካዮች</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  እያንዳንዱ ቻፕል በራሱ መግቢያ ቁልፍ ገብቶ የራሱን ቻፕል መረጃ ብቻ ያስተዳድራል።
                </p>
              </div>
              <button
                onClick={() => handleSelectRole('chapel_leader')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-3 text-xs rounded-xl shadow transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-100" />
                <span>በቻፕል ቁልፍ ግባ →</span>
              </button>
            </div>

            {/* Teacher Portal Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-600/50 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-indigo-700 group-hover:text-white transition duration-200 shadow-xs">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">የመማሪያ ክፍል መምህራን</h3>
                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                  ስም መምረጥ ሳያስፈልግ የራስዎን የግል ምስጥር ቁጥር (PIN) በማስገባት ብቻ የክፍልዎን መረጃ ያስተዳድሩ።
                </p>
              </div>
              <button
                onClick={() => handleSelectRole('teacher')}
                className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-2.5 px-3 text-xs rounded-xl shadow transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-200" />
                <span>በምስጥር ቁጥር (PIN) ግባ</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Role + PIN Entry Card */
        <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold mb-6 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            ወደ ዋናው መግቢያ ገጽ ተመለስ
          </button>

          {(() => {
            const hdr = getRoleHeader();
            return (
              <div className="text-center mb-6">
                <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 border shadow-xs ${hdr.iconBg}`}>
                  {hdr.icon}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">{hdr.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{hdr.subtitle}</p>
              </div>
            );
          })()}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerifyAndLogin} className="space-y-4">
            {/* Chapel Selector for Chapel Leaders */}
            {activeRole === 'chapel_leader' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  1) የሚመሩትን ቻፕል ይምረጡ፦
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {chapelList.map((ch) => (
                    <button
                      key={`direct_ch_${ch}`}
                      type="button"
                      onClick={() => {
                        setSelectedChapel(ch);
                        setErrorMsg('');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition font-extrabold text-xs flex items-center justify-between cursor-pointer ${
                        selectedChapel === ch
                          ? 'border-amber-500 bg-amber-50 text-slate-900 ring-2 ring-amber-400/40 shadow-xs'
                          : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-slate-700'
                      }`}
                    >
                      <span className="truncate">🏛️ {ch}</span>
                      {selectedChapel === ch && (
                        <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  የተመረጠ ቻፕል፦ <strong>{selectedChapel}</strong> (የራሱን ቻፕል መረጃ ብቻ ያስተዳድራል)
                </p>
              </div>
            )}

            {/* PIN Input (Required for ALL roles; Teachers log in strictly via personal PIN) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-800" />
                <span>
                  {activeRole === 'chapel_leader'
                    ? `የ${selectedChapel} መግቢያ ቁልፍ (PIN) ያስገቡ፦`
                    : activeRole === 'teacher'
                    ? 'የመምህር የግል ምስጥር ቁጥር (PIN) ያስገቡ፦'
                    : 'የመግቢያ ቁልፍ (PIN) ያስገቡ፦'}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={activeRole === 'teacher' ? 'የግል ምስጥር ቁጥር (PIN) ያስገቡ...' : 'የመግቢያ ቁልፍ (PIN) ይጻፉ...'}
                  autoFocus
                  className="w-full px-4 py-3 pr-11 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showPin ? 'ደብቅ' : 'አሳይ'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {activeRole === 'teacher' && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  ምስጥር ቁጥርዎን ሲያስገቡ ወደ ተመደቡበት ክፍል በቀጥታ ይገባሉ።
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`w-full text-white font-bold py-3 px-4 rounded-xl shadow-md transition duration-200 cursor-pointer flex items-center justify-center gap-2 ${getRoleHeader().btnBg}`}
            >
              <span>አረጋግጥና ግባ</span>
              <Check className="w-4 h-4 text-amber-300" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
