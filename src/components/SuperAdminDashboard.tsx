import React, { useMemo, useState } from 'react';
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
  Search
} from 'lucide-react';
import { AppData, OrgUnitId } from '../types';
import {
  CHURCH_ORG_UNITS,
  createEmptyDepartmentWorkspaceData,
  DEFAULT_ORG_UNIT_PINS
} from '../constants/churchStructure';
import { countStudentsInData } from '../services/firebase';

interface SuperAdminDashboardProps {
  appData: AppData;
  currentYear: string;
  onOpenUnit: (unitId: OrgUnitId) => void;
  onOpenPinManager: () => void;
  onOpenOverviewStats: () => void;
  onOpenSyncModal: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  appData,
  currentYear,
  onOpenUnit,
  onOpenPinManager,
  onOpenOverviewStats,
  onOpenSyncModal
}) => {
  const [unitSearch, setUnitSearch] = useState('');

  const churchMembers = appData.churchMembers || [];
  const churchChildren = appData.churchChildren || [];
  const totalSundayStudents = useMemo(() => countStudentsInData(appData), [appData]);
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
        u.shortDesc.toLowerCase().includes(q)
    );
  }, [unitSearch]);

  return (
    <div className="space-y-6">
      {/* Super Admin Control Center Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Shield className="w-4 h-4 shrink-0" />
              <span>የዋና አዲሚን መቆጣጠሪያ ማዕከል (Super Admin)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን — ሙሉ የመዋቅር መቆጣጠሪያ
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl">
              ሁሉንም የአጥቢያ ቤተ ክርስቲያን መምሪያዎች፣ 10ሩን ቻፕሎች፣ የሰንበት ትምህርት ቤት ክፍሎችን እና የሁሉንም መግቢያ ቁልፎች (PIN) ከአንድ ቦታ ያስተዳድሩ።
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenPinManager}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>የሁሉም መግቢያ ቁልፎች (PINs)</span>
            </button>
            <button
              type="button"
              onClick={onOpenOverviewStats}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-800" />
              <span>አጠቃላይ ስታቲስቲክስ</span>
            </button>
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition cursor-pointer whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>ዳታቤዝ & JSON</span>
            </button>
          </div>
        </div>
      </section>

      {/* Top 4 KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>የቤተክርስቲያን ዋና ቋት አባላት</span>
            <Users className="w-4 h-4 text-blue-800" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {churchMembers.length.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>በ10 ቻፕሎች የተደራጁ</span>
            <button
              type="button"
              onClick={() => onOpenUnit('office')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              ክፈት →
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>የልጆች ቋት (0–14 ዓመት)</span>
            <Baby className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {churchChildren.length.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>የልጆች አገልግሎት</span>
            <button
              type="button"
              onClick={() => onOpenUnit('children_ministry')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              ክፈት →
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>የሰንበት ት/ቤት ተማሪዎች ({currentYear})</span>
            <GraduationCap className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {totalSundayStudents.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>መምህራን፦ {(appData.teachers || []).length}</span>
            <button
              type="button"
              onClick={() => onOpenUnit('children_ministry')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              ክፈት →
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>የመምሪያዎች ፋይናንስ ቀሪ ሂሳብ</span>
            <Wallet className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {aggregateFinance.balance.toLocaleString()} <span className="text-base font-bold text-slate-500">ብር</span>
          </div>
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between tabular-nums">
            <span>ገቢ {aggregateFinance.income.toLocaleString()} · ወጪ {aggregateFinance.expense.toLocaleString()}</span>
            <button
              type="button"
              onClick={() => onOpenUnit('admin_finance')}
              className="font-bold text-blue-800 hover:underline cursor-pointer"
            >
              ክፈት →
            </button>
          </div>
        </div>
      </section>

      {/* Complete Organizational Hierarchy Control Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              የአጥቢያ ቤተ ክርስቲያን ሙሉ መዋቅር እና የመምሪያዎች መቆጣጠሪያ ({CHURCH_ORG_UNITS.length} ክፍሎች)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              እያንዳንዱ ዘርፍ የራሱ የሆነ ራሱን የቻለ ገጽ እና የመግቢያ ቁልፍ (PIN) አለው፤ ዋና አዲሚን ሁሉንም መክፈትና ማስተዳደር ይችላል።
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              placeholder="የክፍል ወይም የአገልግሎት ስም ፈልግ..."
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4 text-left">የመዋቅር ክፍል / አገልግሎት</th>
                <th className="py-3 px-3 text-right">አባላት / ተማሪዎች</th>
                <th className="py-3 px-3 text-right">ተግባራት</th>
                <th className="py-3 px-3 text-right">ዕቅዶች</th>
                <th className="py-3 px-3 text-right">ቀሪ ሂሳብ (ብር)</th>
                <th className="py-3 px-3 text-center">መግቢያ PIN</th>
                <th className="py-3 px-4 text-right">ገጽ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.map((u) => {
                const ws = deptMap[u.id] || createEmptyDepartmentWorkspaceData();
                const indentPx = (u.level - 1) * 18;

                let primaryCount = ws.members.length;
                let extraNote = '';
                if (u.id === 'office' || u.id === 'spiritual_council') {
                  extraNote = `የቤተክርስቲያን ቋት (${churchMembers.length})`;
                } else if (u.id === 'children_ministry') {
                  primaryCount = churchChildren.length;
                  extraNote = `ሰንበት ተማሪዎች (${totalSundayStudents})`;
                } else if (u.id === 'chapels_dept') {
                  primaryCount = (appData.chapels || []).length;
                  extraNote = `10 ቻፕሎች · ${churchMembers.length} አባላት`;
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
                        <div className="font-bold text-slate-900">{u.name}</div>
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
                        : ws.plans.length.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-800">
                      {u.supportsFinance ? finBal.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 tabular-nums">
                      {pinValue}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenUnit(u.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer"
                      >
                        <span>ገጽ ክፈት</span>
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
