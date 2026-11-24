import React, { useMemo, useRef, useState } from 'react';
import {
  Shield,
  KeyRound,
  Database,
  BarChart3,
  Users,
  Baby,
  GraduationCap,
  Wallet,
  ArrowUpRight,
  Search,
  Send,
  ShieldAlert
} from 'lucide-react';
import { AppData, OrgUnitId } from '../types';
import {
  CHURCH_ORG_UNITS,
  createEmptyDepartmentWorkspaceData,
  DEFAULT_ORG_UNIT_PINS
} from '../constants/churchStructure';
import { countStudentsInData } from '../services/firebase';
import { computeMemberAgeCohorts } from '../utils/chapelDemographics';
import { useLanguage } from '../context/LanguageContext';
import { ExportPhotoButton } from './ExportPhotoButton';

interface SuperAdminDashboardProps {
  appData: AppData;
  currentYear: string;
  onOpenUnit: (unitId: OrgUnitId) => void;
  onOpenPinManager: () => void;
  onOpenOverviewStats: () => void;
  onOpenSyncModal: () => void;
  onOpenPlanDispatcher?: () => void;
  onOpenSecurityMonitor?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  appData,
  currentYear,
  onOpenUnit,
  onOpenPinManager,
  onOpenOverviewStats,
  onOpenSyncModal,
  onOpenPlanDispatcher,
  onOpenSecurityMonitor
}) => {
  const { t, unitName, unitDesc } = useLanguage();
  const kpiSummaryRef = useRef<HTMLElement | null>(null);
  const orgTableRef = useRef<HTMLElement | null>(null);
  const [unitSearch, setUnitSearch] = useState('');

  const churchMembers = appData.churchMembers || [];
  const churchChildren = appData.churchChildren || [];
  const totalSundayStudents = useMemo(() => countStudentsInData(appData), [appData]);
  const memberAgeCohorts = useMemo(
    () => computeMemberAgeCohorts(churchMembers, parseInt(currentYear, 10) || 2019),
    [churchMembers, currentYear]
  );
  const deptMap = appData.departmentData || {};
  const unitPins = appData.pins?.units || DEFAULT_ORG_UNIT_PINS;

  const aggregateFinance = useMemo(() => {
    let income = 0;
    let expense = 0;
    Object.values(deptMap).forEach((ws) => {
      (ws.finances || []).forEach((f) => {
        const amt = Number(f.amount) || 0;
        if (f.type === 'ገቢ') income += amt;
        else expense += amt;
      });
    });
    return { income, expense, balance: income - expense };
  }, [deptMap]);

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return CHURCH_ORG_UNITS;
    return CHURCH_ORG_UNITS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        unitName(u.id, u.name).toLowerCase().includes(q) ||
        u.shortDesc.toLowerCase().includes(q) ||
        unitDesc(u.id, u.shortDesc).toLowerCase().includes(q)
    );
  }, [unitSearch, unitName, unitDesc]);

  return (
    <div className="space-y-6">
      {/* Super Admin Control Center Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Shield className="w-4 h-4 shrink-0" />
              <span>{t('የዋና አዲሚን መቆጣጠሪያ ማዕከል (Super Admin)', 'Super Admin Control Center')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t(
                'የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን — ሙሉ የመዋቅር መቆጣጠሪያ',
                'Birbir Town Kale Heywet Church — Complete Structure Control'
              )}
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl">
              {t(
                'ሁሉንም የአጥቢያ ቤተ ክርስቲያን መምሪያዎች፣ 10ሩን ቻፕሎች፣ የሰንበት ትምህርት ቤት ክፍሎችን እና የሁሉንም መግቢያ ቁልፎች (PIN) ከአንድ ቦታ ያስተዳድሩ።',
                'Manage all church ministries, all 10 chapels, Sunday school classes, and all access PINs from one unified portal.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenPlanDispatcher && (
              <button
                type="button"
                onClick={onOpenPlanDispatcher}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-800 text-white transition cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>{t(`የ${currentYear} ዕቅድ መላኪያ`, `${currentYear} Plan Sender`)}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenPinManager}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('የሁሉም መግቢያ ቁልፎች (PINs)', 'All Access PINs')}</span>
            </button>
            <button
              type="button"
              onClick={onOpenOverviewStats}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-950 transition cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-800" />
              <span>{t('የቤተክርስቲያን አጠቃላይ ማጠቃለያ ሠንጠረዥ', 'Full Church Summary Table')}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition cursor-pointer whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('ዳታቤዝ & JSON', 'Database & JSON')}</span>
            </button>
            {onOpenSecurityMonitor && (
            <button
              type="button"
              onClick={onOpenSecurityMonitor}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 transition cursor-pointer whitespace-nowrap"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
              <span>
                {t('የብራውዘር እገዳና ደህንነት', 'Browser Security')}
                {(appData.failedLoginAttempts?.length || 0) > 0
                  ? ` (${appData.failedLoginAttempts?.length})`
                  : ''}
              </span>
            </button>
            )}
          </div>
        </div>
      </section>

      {/* Top 4 KPIs */}
      <section ref={kpiSummaryRef} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
            {t(`ዋና የቤተክርስቲያን አሃዞች ማጠቃለያ (${currentYear} ዓ/ም)`, `Church Key Figures Summary (${currentYear})`)}
          </h3>
          <ExportPhotoButton
            targetRef={kpiSummaryRef}
            fileName={`ዋና_የቤተክርስቲያን_አሃዞች_${currentYear}`}
            labelAm="በፎቶ (PNG)"
            labelEn="Photo (PNG)"
            variant="secondary"
            compact
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የቤተክርስቲያን ዋና ቋት አባላት', 'Church Master Members')}</span>
            <Users className="w-4 h-4 text-blue-800" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {churchMembers.length.toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-slate-600 tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{t('ወጣቶች (15-29)', 'Youth 15-29')}: <strong className="text-blue-900">{memberAgeCohorts.youth15to29.toLocaleString()}</strong></span>
            <span className="text-slate-300">·</span>
            <span>{t('ጎልማሶች (30-59)', 'Adults 30-59')}: <strong className="text-emerald-800">{memberAgeCohorts.adults30to59.toLocaleString()}</strong></span>
            <span className="text-slate-300">·</span>
            <span>{t('አዛውንቶች (60+)', 'Seniors 60+')}: <strong className="text-purple-800">{memberAgeCohorts.seniors60Plus.toLocaleString()}</strong></span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>{t('በ10 ቻፕሎች የተደራጁ', 'Organized in 10 chapels')}</span>
            <button
              type="button"
              onClick={() => onOpenUnit('office')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              {t('ክፈት →', 'Open →')}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የልጆች ቋት (0–14 ዓመት)', 'Children Registry (0–14)')}</span>
            <Baby className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {churchChildren.length.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>{unitName('children_ministry')}</span>
            <button
              type="button"
              onClick={() => onOpenUnit('children_ministry')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              {t('ክፈት →', 'Open →')}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t(`የሰንበት ት/ቤት ተማሪዎች (${currentYear})`, `Sunday School Students (${currentYear})`)}</span>
            <GraduationCap className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {totalSundayStudents.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>{t('መምህራን፦', 'Teachers:')} {(appData.teachers || []).length}</span>
            <button
              type="button"
              onClick={() => onOpenUnit('children_ministry')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              {t('ክፈት →', 'Open →')}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የመምሪያዎች ፋይናንስ ቀሪ ሂሳብ', 'Departments Net Balance')}</span>
            <Wallet className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {aggregateFinance.balance.toLocaleString()} <span className="text-base font-bold text-slate-500">{t('ብር', 'ETB')}</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between tabular-nums">
            <span>{t('ገቢ', 'In')} {aggregateFinance.income.toLocaleString()} · {t('ወጪ', 'Out')} {aggregateFinance.expense.toLocaleString()}</span>
            <button
              type="button"
              onClick={() => onOpenUnit('admin_finance')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              {t('ክፈት →', 'Open →')}
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* Complete Organizational Hierarchy Control Table */}
      <section ref={orgTableRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              {t(
                `የአጥቢያ ቤተ ክርስቲያን ሙሉ መዋቅር እና የመምሪያዎች መቆጣጠሪያ (${CHURCH_ORG_UNITS.length} ክፍሎች)`,
                `Full Church Structure & Departments Control (${CHURCH_ORG_UNITS.length} Units)`
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'እያንዳንዱ ዘርፍ የራሱ የሆነ ራሱን የቻለ ገጽ እና የመግቢያ ቁልፍ (PIN) አለው፤ ዋና አዲሚን ሁሉንም መክፈትና ማስተዳደር ይችላል።',
                'Each department has its own independent page and PIN login; Super Admin can open and manage all units.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative print:hidden">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder={t('የክፍል ወይም የአገልግሎት ስም ፈልግ...', 'Search unit or ministry...')}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-64"
              />
            </div>
            <ExportPhotoButton
              targetRef={orgTableRef}
              fileName={`የቤተክርስቲያን_መዋቅር_መቆጣጠሪያ_${currentYear}`}
              labelAm="በፎቶ (PNG)"
              labelEn="Photo (PNG)"
              variant="secondary"
              compact
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4 text-left">{t('የመዋቅር ክፍል / አገልግሎት', 'Organizational Unit')}</th>
                <th className="py-3 px-3 text-right">{t('አባላት / ተማሪዎች', 'Members / Students')}</th>
                <th className="py-3 px-3 text-right">{t('ተግባራት', 'Activities')}</th>
                <th className="py-3 px-3 text-right">{t('ዕቅዶች', 'Plans')}</th>
                <th className="py-3 px-3 text-right">{t('ቀሪ ሂሳብ (ብር)', 'Balance (ETB)')}</th>
                <th className="py-3 px-3 text-center">{t('መግቢያ PIN', 'Access PIN')}</th>
                <th className="py-3 px-4 text-right">{t('ገጽ', 'Page')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.map((u) => {
                const ws = deptMap[u.id] || createEmptyDepartmentWorkspaceData();
                const indentPx = (u.level - 1) * 18;

                let primaryCount = ws.members.length;
                let extraNote = '';
                if (u.id === 'office' || u.id === 'spiritual_council') {
                  extraNote = `${t('የቤተክርስቲያን ቋት', 'Church Registry')} (${churchMembers.length})`;
                } else if (u.id === 'children_ministry') {
                  primaryCount = churchChildren.length;
                  extraNote = `${t('ሰንበት ተማሪዎች', 'Sunday Students')} (${totalSundayStudents})`;
                } else if (u.id === 'youth_ministry') {
                  const subCount =
                    (ws.youthChoirMembers?.length || 0) +
                    (ws.youthWorshipLeaders?.length || 0) +
                    (ws.youthDiscipleshipMembers?.length || 0);
                  extraNote = `${t('ህብረቶችና ትምህርት', 'Choirs, Leaders & Discipleship')} (${subCount})`;
                } else if (u.id === 'love_compassion') {
                  const benList = ws.beneficiaryRecords || [];
                  const permCnt = benList.filter((b) => b.supportType === 'permanent').length;
                  const tempCnt = benList.filter((b) => b.supportType === 'temporary').length;
                  extraNote = `${t('ቋሚ ተረጂ', 'Permanent')} (${permCnt}) · ${t('ጊዜያዊ', 'Temporary')} (${tempCnt})`;
                } else if (u.id === 'evangelism') {
                  const misCnt = (ws.missionaryRecords || []).length;
                  extraNote = `${t('ሚሽነሪዎች', 'Missionaries')} (${misCnt})`;
                } else if (u.id === 'chapels_dept') {
                  primaryCount = (appData.chapels || []).length;
                  extraNote = `${t('10 ቻፕሎች', '10 Chapels')} · ${churchMembers.length} ${t('አባላት', 'members')}`;
                }

                const finBal = ws.finances.reduce(
                  (acc, f) =>
                    acc + (f.type === 'ገቢ' ? Number(f.amount) || 0 : -(Number(f.amount) || 0)),
                  0
                );

                const pinValue =
                  u.id === 'children_ministry'
                    ? unitPins.children_ministry || appData.pins?.leader || u.defaultPin
                    : unitPins[u.id] || u.defaultPin;

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/80 ${
                      u.level === 1 ? 'bg-slate-50/60' : u.level === 2 ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div style={{ paddingLeft: `${indentPx}px` }}>
                        <div className="font-bold text-slate-900">{unitName(u.id, u.name)}</div>
                        {extraNote && (
                          <div className="text-[11px] font-semibold text-blue-800">{extraNote}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {primaryCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                      {ws.activities.length.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                      {u.id === 'children_ministry'
                        ? (appData.plans || []).length.toLocaleString()
                        : u.id === 'chapels_dept'
                        ? (
                            ws.plans.length +
                            Object.values(ws.chapelPlans || {}).reduce(
                              (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
                              0
                            )
                          ).toLocaleString()
                        : ws.plans.length.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-800">
                      {u.supportsFinance ? finBal.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 tabular-nums">
                      <div>{pinValue}</div>
                      {u.id === 'children_ministry' && (
                        <div className="text-[10px] font-sans font-bold text-emerald-700">
                          {t('አስተባባሪ:', 'Coordinator:')} <span className="font-mono">{appData.pins?.childrenCoordinator || '5679'}</span>
                        </div>
                      )}
                      {u.id === 'youth_ministry' && (
                        <div className="text-[10px] font-sans font-bold text-purple-700">
                          {t('አስተባባሪ:', 'Coordinator:')} <span className="font-mono">{appData.pins?.youthCoordinator || '3214'}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenUnit(u.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer"
                      >
                        <span>{t('ገጽ ክፈት', 'Open Page')}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
