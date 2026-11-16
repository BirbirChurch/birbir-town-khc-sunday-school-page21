import React, { useState, useMemo } from 'react';
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
  Lock,
  UserPlus,
  Hash,
  CheckCircle2,
  X,
  Copy
} from 'lucide-react';
import { ChurchMember, Role, Teacher } from '../types';
import { DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';
import {
  findMemberByEnteredCode,
  getNextFamilySubCode,
  getRootFamilyBaseCode,
  resolveOfficialChapel
} from '../utils/memberCodeGenerator';

interface LoginPortalProps {
  teachers: Teacher[];
  adminPin?: string;
  leaderPin?: string;
  chapelPins?: { [chapelName: string]: string };
  chapelList?: string[];
  churchMembers?: ChurchMember[];
  onAddChurchMember?: (member: Omit<ChurchMember, 'id'>) => ChurchMember | void;
  onLoginSuccess: (role: Role, teacher?: Teacher, chapel?: string) => void;
}

const maskPhoneForPortal = (phone?: string): string => {
  const clean = String(phone || '').trim();
  if (!clean) return '';
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 4)}****${clean.slice(-2)}`;
};

export const LoginPortal: React.FC<LoginPortalProps> = ({
  teachers,
  adminPin = '1234',
  leaderPin = '5678',
  chapelPins = DEFAULT_CHAPEL_PINS,
  chapelList = DEFAULT_CHAPELS,
  churchMembers = [],
  onAddChurchMember,
  onLoginSuccess
}) => {
  const [activeRole, setActiveRole] = useState<Role | 'chapel_leader' | null>(null);
  const [selectedChapel, setSelectedChapel] = useState<string>(chapelList[0] || DEFAULT_CHAPELS[0]);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Self-service Family Member Addition by Member Code modal state
  const [isFamilyCodeModalOpen, setIsFamilyCodeModalOpen] = useState<boolean>(false);
  const [portalCodeInput, setPortalCodeInput] = useState<string>('');
  const [portalChapelHint, setPortalChapelHint] = useState<string>('');
  const [portalMemberName, setPortalMemberName] = useState<string>('');
  const [portalGender, setPortalGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [portalAge, setPortalAge] = useState<string>('');
  const [portalRelation, setPortalRelation] = useState<string>('የቤተሰብ አባል');
  const [portalEducation, setPortalEducation] = useState<string>('');
  const [portalOccupation, setPortalOccupation] = useState<string>('');
  const [portalPhone, setPortalPhone] = useState<string>('');
  const [createdFeedback, setCreatedFeedback] = useState<{
    name: string;
    memberCode: string;
    familyCode: string;
    chapel: string;
  } | null>(null);
  const [copiedNewCode, setCopiedNewCode] = useState<boolean>(false);

  const matchedPortalMember = useMemo(() => {
    if (!portalCodeInput.trim()) return null;
    return findMemberByEnteredCode(
      churchMembers,
      portalCodeInput,
      portalChapelHint || undefined
    );
  }, [churchMembers, portalCodeInput, portalChapelHint]);

  const portalTargetChapel = useMemo(() => {
    if (!matchedPortalMember) return DEFAULT_CHAPELS[0];
    return resolveOfficialChapel(matchedPortalMember.chapel || '');
  }, [matchedPortalMember]);

  const portalNextCodePreview = useMemo(() => {
    if (!matchedPortalMember) return '';
    return getNextFamilySubCode(
      churchMembers,
      matchedPortalMember.familyCode || matchedPortalMember.memberCode || '',
      portalTargetChapel
    );
  }, [churchMembers, matchedPortalMember, portalTargetChapel]);

  const handleOpenFamilyCodeModal = () => {
    setPortalCodeInput('');
    setPortalChapelHint('');
    setPortalMemberName('');
    setPortalGender('ወ');
    setPortalAge('');
    setPortalRelation('የቤተሰብ አባል');
    setPortalEducation('');
    setPortalOccupation('');
    setPortalPhone('');
    setCreatedFeedback(null);
    setCopiedNewCode(false);
    setIsFamilyCodeModalOpen(true);
  };

  const handlePortalFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddChurchMember || !matchedPortalMember) return;
    if (!portalMemberName.trim()) {
      alert('እባክዎን የአዲሱን የቤተሰብ አባል ሙሉ ስም ያስገቡ!');
      return;
    }

    const parsedAge = parseInt(portalAge, 10);
    const officialCh = resolveOfficialChapel(matchedPortalMember.chapel || '');
    const familyRefCode = getRootFamilyBaseCode(
      matchedPortalMember.familyCode || matchedPortalMember.memberCode || '',
      officialCh
    );

    const payload: Omit<ChurchMember, 'id'> = {
      name: portalMemberName.trim(),
      gender: portalGender,
      age: isNaN(parsedAge) ? 20 : Math.max(0, parsedAge),
      educationLevel: portalEducation.trim() || undefined,
      occupation: portalOccupation.trim() || undefined,
      chapel: officialCh,
      parentName: matchedPortalMember.parentName || matchedPortalMember.name,
      phone: portalPhone.trim() || matchedPortalMember.phone || undefined,
      residence: matchedPortalMember.residence || undefined,
      relationToHead: portalRelation.trim() || undefined,
      familyCode: familyRefCode || undefined,
      registeredDate: new Date().toISOString().split('T')[0]
    };

    const created = onAddChurchMember(payload);
    const assignedCode =
      (created && 'memberCode' in created && created.memberCode) ||
      portalNextCodePreview;

    setCreatedFeedback({
      name: payload.name,
      memberCode: assignedCode,
      familyCode: familyRefCode,
      chapel: officialCh
    });
    setPortalMemberName('');
    setPortalAge('');
    setPortalEducation('');
    setPortalOccupation('');
    setPortalPhone('');
  };

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

          {/* Family Addition by Member Code Banner */}
          {onAddChurchMember && (
            <div className="mt-7 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 border border-cyan-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    የቤተክርስቲያን አባል/ቤተሰብ ኮድ አለዎት?
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    የነባር አባል ኮድዎን (ምሳሌ፦ <span className="font-mono font-bold text-indigo-900">ብከቃሕቤክኤልሻዳይ 0513</span>) በማስገባት አዲስ የቤተሰብ አባል ሲጨምሩ በቅደም ተከተል (<span className="font-mono font-bold text-indigo-900">0513/1</span>፣ <span className="font-mono font-bold text-indigo-900">0513/2</span> ...) መለያ ኮድ ይሰጠዋል።
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenFamilyCodeModal}
                className="bg-cyan-700 hover:bg-cyan-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-cyan-100" />
                <span>🔑 በኮድ የቤተሰብ አባል ጨምር</span>
              </button>
            </div>
          )}
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

      {/* Isolated Family Member Addition by Code Modal */}
      {isFamilyCodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-700" />
                <span>በቤተሰብ/አባል ኮድ አዲስ የቤተሰብ አባል መጨመሪያ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFamilyCodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdFeedback && (
              <div className="mt-4 bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>"{createdFeedback.name}" ወደ {createdFeedback.chapel} የቤተሰብ መዝገብ ተጨምሯል!</span>
                </div>
                <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">የተሰጠው አዲስ መለያ ኮድ፦</div>
                    <div className="font-mono text-sm font-black text-indigo-950">{createdFeedback.memberCode}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdFeedback.memberCode);
                      setCopiedNewCode(true);
                      setTimeout(() => setCopiedNewCode(false), 1800);
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-900 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedNewCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNewCode ? 'ተቀድቷል' : 'ቅዳ'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-800 font-semibold">
                  የተያያዘ የቤተሰብ ኮድ፦ <span className="font-mono font-bold">{createdFeedback.familyCode}</span>
                </p>
              </div>
            )}

            <form onSubmit={handlePortalFamilySubmit} className="space-y-3.5 mt-4">
              <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-cyan-950 mb-1">
                      ቻፕል (አማራጭ - አጭር ቁጥር ሲጠቀሙ)
                    </label>
                    <select
                      value={portalChapelHint}
                      onChange={(e) => setPortalChapelHint(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-cyan-300 rounded-xl bg-white font-bold"
                    >
                      <option value="">ሁሉም ቻፕሎች (ሙሉ ኮድ)</option>
                      {chapelList.map((ch) => (
                        <option key={`p_ch_${ch}`} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-950 mb-1">
                      የነባር አባል ኮድ ያስገቡ *
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 text-cyan-700 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ብከቃሕቤክኤልሻዳይ 0513"
                        value={portalCodeInput}
                        onChange={(e) => setPortalCodeInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs border border-cyan-300 rounded-xl font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      />
                    </div>
                  </div>
                </div>

                {matchedPortalMember ? (
                  <div className="bg-white border border-emerald-300 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ኮዱ ተረጋግጧል!
                      </span>
                      <span className="font-mono text-[11px] font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {matchedPortalMember.memberCode}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      ነባር አባል/መሪ፦ {matchedPortalMember.name}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      ቻፕል፦ <strong>{portalTargetChapel}</strong>
                      {matchedPortalMember.phone
                        ? ` | ስልክ፦ ${maskPhoneForPortal(matchedPortalMember.phone)}`
                        : ''}
                    </p>
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-indigo-900 font-bold">ለአዲሱ አባል የሚሰጠው ቀጣይ ኮድ፦</span>
                      <span className="font-mono font-black text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded">
                        {portalNextCodePreview}
                      </span>
                    </div>
                  </div>
                ) : portalCodeInput.trim() ? (
                  <p className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>ያስገቡት ኮድ አልተገኘም! እባክዎ ትክክለኛውን ኮድ (ምሳሌ፦ ብከቃሕቤክኤልሮኢ 0001) ያስገቡ።</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-cyan-900">
                    ነባሩን የቤተሰብ ኮድ ሲያስገቡ የአዲሱን የቤተሰብ አባል ስም፣ ጾታና ዕድሜ አስገብተው መመዝገብ ይችላሉ።
                  </p>
                )}
              </div>

              {matchedPortalMember && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">የአዲሱ የቤተሰብ አባል ሙሉ ስም *</label>
                    <input
                      type="text"
                      required
                      placeholder="ሙሉ ስም ያስገቡ..."
                      value={portalMemberName}
                      onChange={(e) => setPortalMemberName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ጾታ *</label>
                      <select
                        value={portalGender}
                        onChange={(e) => setPortalGender(e.target.value as 'ወ' | 'ሴ')}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="ወ">ወንድ</option>
                        <option value="ሴ">ሴት</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ዕድሜ *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        placeholder="ዕድሜ"
                        value={portalAge}
                        onChange={(e) => setPortalAge(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ዝምድና</label>
                      <select
                        value={portalRelation}
                        onChange={(e) => setPortalRelation(e.target.value)}
                        className="w-full px-2 py-2 text-xs border border-slate-200 rounded-xl font-bold bg-white"
                      >
                        <option value="ባለቤት / ሚስት">ባለቤት / ሚስት</option>
                        <option value="ልጅ">ልጅ</option>
                        <option value="እናት / አባት">እናት / አባት</option>
                        <option value="ወንድም / እህት">ወንድም / እህት</option>
                        <option value="የቤተሰብ አባል">የቤተሰብ አባል</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ስልክ (አማራጭ)</label>
                      <input
                        type="text"
                        placeholder="09..."
                        value={portalPhone}
                        onChange={(e) => setPortalPhone(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ትምህርት ደረጃ</label>
                      <input
                        type="text"
                        placeholder="ክፍል/ዲግሪ..."
                        value={portalEducation}
                        onChange={(e) => setPortalEducation(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">የስራ ዓይነት</label>
                      <input
                        type="text"
                        placeholder="ተማሪ/ሠራተኛ..."
                        value={portalOccupation}
                        onChange={(e) => setPortalOccupation(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFamilyCodeModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ዝጋ
                </button>
                <button
                  type="submit"
                  disabled={!matchedPortalMember}
                  className="px-5 py-2 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md cursor-pointer"
                >
                  አባል ጨምርና ኮድ ስጥ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

