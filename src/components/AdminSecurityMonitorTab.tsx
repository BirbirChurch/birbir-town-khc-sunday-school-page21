import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Fingerprint,
  AlertTriangle
} from 'lucide-react';
import { BlockedBrowserRule, BrowserClientInfo, BrowserDeviceType, FailedLoginAttemptRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface AdminSecurityMonitorTabProps {
  failedAttempts: FailedLoginAttemptRecord[];
  blockedBrowsers: BlockedBrowserRule[];
  currentBrowserInfo: BrowserClientInfo;
  onBlockBrowser: (
    browserInfo: {
      browserId: string;
      browserFingerprint?: string;
      browserName: string;
      osName: string;
      deviceType: BrowserDeviceType;
      screenResolution?: string;
      timezone?: string;
      userAgent?: string;
      lastTargetAttempted?: string;
    },
    reason?: string,
    matchFingerprintToo?: boolean
  ) => void;
  onAllowBrowser: (browserId: string) => void;
  onToggleFingerprintMatch: (ruleId: number) => void;
  onDeleteBrowserRule: (ruleId: number) => void;
  onClearFailedAttempts: () => void;
}

export const AdminSecurityMonitorTab: React.FC<AdminSecurityMonitorTabProps> = ({
  failedAttempts,
  blockedBrowsers,
  currentBrowserInfo,
  onBlockBrowser,
  onAllowBrowser,
  onToggleFingerprintMatch,
  onDeleteBrowserRule,
  onClearFailedAttempts
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'blocked' | 'allowed'>('all');
  const [showPins, setShowPins] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const ruleByBrowserId = useMemo(() => {
    const map = new Map<string, BlockedBrowserRule>();
    blockedBrowsers.forEach((r) => {
      if (r && r.browserId) map.set(r.browserId, r);
    });
    return map;
  }, [blockedBrowsers]);

  const isAttemptBlocked = (att: FailedLoginAttemptRecord): boolean => {
    const exact = ruleByBrowserId.get(att.browserId);
    if (exact) return exact.isBlocked;
    return blockedBrowsers.some(
      (r) => r.isBlocked && r.matchFingerprintToo && r.browserFingerprint && r.browserFingerprint === att.browserFingerprint
    );
  };

  const stats = useMemo(() => {
    const blockedCount = blockedBrowsers.filter((r) => r.isBlocked).length;
    const allowedCount = blockedBrowsers.filter((r) => !r.isBlocked).length;
    const uniqueBrowsers = new Set(failedAttempts.map((a) => a.browserId)).size;
    return {
      totalAttempts: failedAttempts.length,
      blockedCount,
      allowedCount,
      uniqueBrowsers
    };
  }, [failedAttempts, blockedBrowsers]);

  const sortedAttempts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...failedAttempts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((att) => {
        const blocked = isAttemptBlocked(att);
        if (filterMode === 'blocked' && !blocked) return false;
        if (filterMode === 'allowed' && blocked) return false;
        if (!q) return true;
        return (
          att.attemptedTarget.toLowerCase().includes(q) ||
          att.browserName.toLowerCase().includes(q) ||
          att.osName.toLowerCase().includes(q) ||
          att.browserId.toLowerCase().includes(q) ||
          att.browserFingerprint.toLowerCase().includes(q)
        );
      });
  }, [failedAttempts, searchQuery, filterMode, blockedBrowsers]);

  const sortedRules = useMemo(() => {
    return [...blockedBrowsers].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [blockedBrowsers]);

  const getDeviceIcon = (type: BrowserDeviceType) => {
    if (type === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-cyan-700 shrink-0" />;
    if (type === 'tablet') return <Tablet className="w-3.5 h-3.5 text-indigo-700 shrink-0" />;
    return <Monitor className="w-3.5 h-3.5 text-slate-700 shrink-0" />;
  };

  const getDeviceLabel = (type: BrowserDeviceType) => {
    if (type === 'mobile') return t('ስልክ (Mobile)', 'Mobile');
    if (type === 'tablet') return t('ታብሌት (Tablet)', 'Tablet');
    return t('ኮምፒውተር (Desktop)', 'Desktop');
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('am-ET', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const handleQuickBlock = (att: FailedLoginAttemptRecord) => {
    if (att.browserId === currentBrowserInfo.browserId) {
      setFeedbackMsg(t('አሁን እየተጠቀሙበት ያለውን የራስዎን አዲሚን ብራውዘር ማገድ አይችሉም።', 'You cannot block your own active Admin browser.'));
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }
    onBlockBrowser(
      {
        browserId: att.browserId,
        browserFingerprint: att.browserFingerprint,
        browserName: att.browserName,
        osName: att.osName,
        deviceType: att.deviceType,
        screenResolution: att.screenResolution,
        timezone: att.timezone,
        userAgent: att.userAgent,
        lastTargetAttempted: att.attemptedTarget
      },
      blockReasonInput.trim() || t('በተደጋጋሚ የተሳሳተ PIN ሙከራ በማድረጉ ታግዷል', 'Blocked due to unauthorized or failed login attempts'),
      true
    );
    setFeedbackMsg(t(`✓ ${att.browserName} (${att.browserId}) እንዳይገባ ታግዷል!`, `✓ ${att.browserName} (${att.browserId}) has been blocked!`));
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{t('የደህንነት ቁጥጥር እና የብራውዘር እገዳ', 'Security Monitor & Browser Access Control')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('የተሳሳተ የመግቢያ ሙከራዎች እና የብራውዘር ፈቃድ መቆጣጠሪያ', 'Failed Login Audit & Browser Block/Allow Control')}
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl">
              {t(
                'የተሳሳተ ቁልፍ (PIN) ያስገባ ማን እንደሆነ፣ የትኛውን ክፍል/አገልግሎት ለመግባት እንደሞከረ፣ ከየትኛው ብራውዘርና ስልክ/ኮምፒውተር እንደሆነ ይመልከቱ፤ እንዳይገባ ማገድ (Block) ወይም መልሶ መፍቀድ (Allow) ይችላሉ።',
                'See every failed login attempt, the target role/department, browser & device type, and block or allow specific browsers from accessing the system.'
              )}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs space-y-1 shrink-0">
            <div className="font-bold text-slate-500">{t('አሁን የእርስዎ ብራውዘር፦', 'Your Current Admin Browser:')}</div>
            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
              {getDeviceIcon(currentBrowserInfo.deviceType)}
              <span>{currentBrowserInfo.browserName}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-700">{currentBrowserInfo.osName}</span>
            </div>
            <div className="font-mono text-[11px] text-blue-900 font-bold">ID: {currentBrowserInfo.browserId}</div>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
            {feedbackMsg}
          </div>
        )}
      </section>

      {/* Top 4 KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('ጠቅላላ የተሳሳቱ ሙከራዎች', 'Total Failed Attempts')}</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats.totalAttempts}</div>
          <div className="text-[11px] text-slate-500">{t('የተመዘገቡ የተሳሳተ PIN ሙከራዎች', 'Logged wrong PIN attempts')}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የታገዱ ብራውዘሮች', 'Blocked Browsers')}</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-700 tabular-nums">{stats.blockedCount}</div>
          <div className="text-[11px] text-slate-500">{t('መግባት የማይችሉ ብራውዘሮች', 'Currently denied login access')}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የተፈቀዱ ብራውዘሮች', 'Explicitly Allowed')}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 tabular-nums">{stats.allowedCount}</div>
          <div className="text-[11px] text-slate-500">{t('ከእገዳ በኋላ የተፈቀዱ', 'Unblocked / allowed browsers')}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የተለዩ ብራውዘሮች ብዛት', 'Unique Browsers Seen')}</span>
            <Globe className="w-4 h-4 text-blue-800" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats.uniqueBrowsers}</div>
          <div className="text-[11px] text-slate-500">{t('ስልክ እና ኮምፒውተር ብራውዘሮች', 'Distinct mobile & desktop browsers')}</div>
        </div>
      </section>

      {/* Blocked & Allowed Browsers Control List */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-700" />
              <span>{t('የታገዱና የተፈቀዱ ብራውዘሮች ዝርዝር', 'Blocked & Allowed Browsers Access Rules')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'የታገደ ብራውዘር ወደ ሲስተሙ መግባት አይችልም። አስፈላጊ ሲሆን «ፍቀድ» በመጫን መልሰው መፍቀድ ይችላሉ።',
                'Blocked browsers cannot sign in. Click Allow to restore access anytime.'
              )}
            </p>
          </div>
        </div>

        {sortedRules.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {t(
              'እስካሁን የታገደ ብራውዘር የለም። ከታች ከተሳሳተ ሙከራ ዝርዝር ላይ «ብራውዘሩን አግድ» በመጫን ማገድ ይችላሉ።',
              'No browser block rules yet. Use the Block button in the Failed Login Attempts table below.'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left">{t('ብራውዘር እና መሣሪያ', 'Browser & Device')}</th>
                  <th className="py-3 px-3 text-left">{t('የብራውዘር መለያ / አሻራ', 'Browser ID / Signature')}</th>
                  <th className="py-3 px-3 text-left">{t('ምክንያት / የሞከረው ክፍል', 'Reason / Last Target')}</th>
                  <th className="py-3 px-3 text-center">{t('ተመሳሳይ መሣሪያ እገዳ', 'Match Fingerprint')}</th>
                  <th className="py-3 px-3 text-center">{t('ሁኔታ', 'Status')}</th>
                  <th className="py-3 px-4 text-right">{t('እርምጃ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {getDeviceIcon(rule.deviceType)}
                        <span>{rule.browserName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {rule.osName} · {getDeviceLabel(rule.deviceType)}
                        {rule.screenResolution ? ` · ${rule.screenResolution}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      <div className="font-bold text-slate-800">{rule.browserId}</div>
                      {rule.browserFingerprint && (
                        <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                          <Fingerprint className="w-3 h-3" />
                          <span>{rule.browserFingerprint}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-semibold">{rule.reason || '—'}</div>
                      {rule.lastTargetAttempted && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t('የሞከረው፦', 'Attempted:')} {rule.lastTargetAttempted}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatTimestamp(rule.updatedAt)}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleFingerprintMatch(rule.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition ${
                          rule.matchFingerprintToo
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {rule.matchFingerprintToo ? t('አዎ (ጥብቅ)', 'Yes (Strict)') : t('ID ብቻ', 'ID Only')}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rule.isBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-[11px]">
                          <Ban className="w-3 h-3" />
                          <span>{t('ታግዷል', 'Blocked')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('ተፈቅዷል', 'Allowed')}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {rule.isBlocked ? (
                          <button
                            type="button"
                            onClick={() => onAllowBrowser(rule.browserId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('ፍቀድ', 'Allow')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onBlockBrowser(
                                {
                                  browserId: rule.browserId,
                                  browserFingerprint: rule.browserFingerprint,
                                  browserName: rule.browserName,
                                  osName: rule.osName,
                                  deviceType: rule.deviceType,
                                  screenResolution: rule.screenResolution,
                                  timezone: rule.timezone,
                                  userAgent: rule.userAgent,
                                  lastTargetAttempted: rule.lastTargetAttempted
                                },
                                rule.reason,
                                rule.matchFingerprintToo
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-600 text-white transition cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{t('አግድ', 'Block')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteBrowserRule(rule.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
                          title={t('ህጉን ሰርዝ', 'Delete rule')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Failed Login Attempts Log */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {t('የተሳሳቱ የመግቢያ ሙከራዎች መዝገብ', 'Failed Login Attempts Log')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'ማን የትኛውን አገልግሎት/ክፍል በተሳሳተ PIN ለመግባት እንደሞከረ እና ከየት ብራውዘር እንደሆነ',
                  'Who/which unit someone tried to open with a wrong PIN, plus exact browser & device details'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPins((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPins ? t('PIN ደብቅ', 'Hide Entered PIN') : t('የገባውን PIN አሳይ', 'Show Entered PIN')}</span>
              </button>

              {failedAttempts.length > 0 && !confirmClearLogs && (
                <button
                  type="button"
                  onClick={() => setConfirmClearLogs(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('መዝገቡን አጽዳ', 'Clear Log')}</span>
                </button>
              )}
              {confirmClearLogs && (
                <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-bold text-rose-900">{t('እርግጠኛ ነዎት?', 'Clear all?')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearFailedAttempts();
                      setConfirmClearLogs(false);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {t('አዎ አጽዳ', 'Yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearLogs(false)}
                    className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    {t('ተው', 'Cancel')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('በክፍል፣ በብራውዘር፣ በስልክ ዓይነት ወይም በID ፈልግ...', 'Search target, browser, OS, or Browser ID...')}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <input
              type="text"
              value={blockReasonInput}
              onChange={(e) => setBlockReasonInput(e.target.value)}
              placeholder={t('የእገዳ ምክንያት (አማራጭ)...', 'Optional block reason...')}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 min-w-[200px]"
            />

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'blocked', 'allowed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    filterMode === mode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'all'
                    ? t('ሁሉም', 'All')
                    : mode === 'blocked'
                    ? t('የታገዱ', 'Blocked')
                    : t('ያልታገዱ', 'Unblocked')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sortedAttempts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {t('ምንም የተሳሳተ የመግቢያ ሙከራ አልተመዘገበም።', 'No failed login attempts recorded.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left">{t('ቀንና ሰዓት', 'Time')}</th>
                  <th className="py-3 px-3 text-left">{t('የሞከረው አካል / ክፍል', 'Target Attempted')}</th>
                  <th className="py-3 px-3 text-center">{t('የገባው የተሳሳተ PIN', 'Wrong PIN')}</th>
                  <th className="py-3 px-3 text-left">{t('ብራውዘር እና መሣሪያ', 'Browser & Device')}</th>
                  <th className="py-3 px-3 text-left">{t('ብራውዘር ID / አካባቢ', 'Browser ID / Details')}</th>
                  <th className="py-3 px-3 text-center">{t('ሁኔታ', 'Status')}</th>
                  <th className="py-3 px-4 text-right">{t('እገዳ / ፈቃድ', 'Block / Allow')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAttempts.map((att) => {
                  const blocked = isAttemptBlocked(att);
                  const isSelf = att.browserId === currentBrowserInfo.browserId;
                  return (
                    <tr key={att.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 tabular-nums">
                        <div className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatTimestamp(att.timestamp)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{att.attemptedTarget}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{att.attemptedRoleOrUnit}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-rose-700">
                          {showPins ? att.enteredPinPreview : '••••'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {getDeviceIcon(att.deviceType)}
                          <span>{att.browserName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {att.osName} · {getDeviceLabel(att.deviceType)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-mono font-bold text-blue-900">
                          {att.browserId}
                          {isSelf && (
                            <span className="ml-1.5 text-[10px] font-sans text-emerald-700">
                              ({t('የእርስዎ', 'Yours')})
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 font-mono">
                          {att.browserFingerprint} · {att.screenResolution}
                        </div>
                        <div className="text-slate-400">
                          {att.timezone} ({att.language})
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {blocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-[11px]">
                            <Ban className="w-3 h-3" />
                            <span>{t('ታግዷል', 'Blocked')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                            <span>{t('ያልታገደ', 'Open')}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {blocked ? (
                          <button
                            type="button"
                            onClick={() => onAllowBrowser(att.browserId)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('ፍቀድ', 'Allow')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickBlock(att)}
                            disabled={isSelf}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white transition cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{t('ብራውዘሩን አግድ', 'Block Browser')}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
