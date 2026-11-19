import React, { useMemo, useState } from 'react';
import { Church, Users, Baby, BarChart3, ArrowLeft, Send, Target, Sparkles, HeartHandshake } from 'lucide-react';
import {
  AnnualPlanItem,
  ChurchChild,
  ChurchMember,
  DepartmentWorkspaceData,
  MinistrySubmission,
  Role,
  Student
} from '../types';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { computeChurchOverviewStatistics } from '../utils/churchOverviewStats';
import { computeChapelYouthWomenStats } from '../utils/chapelDemographics';
import { BulkAgeIncrementOptions, BulkAgeIncrementStats } from '../utils/ageUpdater';
import { NameScriptMode } from '../utils/amharicTransliterator';
import { useLanguage } from '../context/LanguageContext';
import { ChurchMasterTab } from './ChurchMasterTab';
import { ChurchChildrenTab, mapToOfficialChapel } from './ChurchChildrenTab';
import { ChurchStatisticsDashboardTab } from './ChurchStatisticsDashboardTab';
import { MinistrySubmissionsPanel } from './MinistrySubmissionsPanel';
import { UnifiedPlanManager } from './UnifiedPlanManager';
import { ConsolidatedPlansMatrix } from './ConsolidatedPlansMatrix';
import { ChapelYouthRegistryTab, ChapelWomenRegistryTab } from './ChapelYouthWomenTabs';

interface ChapelsHubPageProps {
  currentYear: string;
  ageReferenceYear?: number;
  currentUserRole: Role;
  chapelList: string[];
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
  churchMembers: ChurchMember[];
  churchChildren: ChurchChild[];
  // Locked to a specific chapel when logged in as that chapel's leader
  lockedChapel?: string | null;
  onBatchAddMembers: (members: ChurchMember[], mode?: 'append' | 'replace', baselineYear?: number) => void;
  onAddMember: (member: Omit<ChurchMember, 'id'>) => ChurchMember | void;
  onUpdateMember: (member: ChurchMember) => void;
  onDeleteMember: (id: number) => void;
  onClearChurchMembers: (chapelFilter?: string) => void;
  onAddChild: (c: Omit<ChurchChild, 'id'>) => void;
  onUpdateChild: (c: ChurchChild) => void;
  onDeleteChild: (id: number) => void;
  onClearChurchChildren: (chapelFilter?: string | string[]) => void;
  onBatchAddChildren: (children: Omit<ChurchChild, 'id'>[], mode?: 'append' | 'replace') => void;
  onEnrollToSundaySchool: (child: ChurchChild, targetClass: string) => void;
  onImportMissingStudentsToChurchChildren: (
    students: {
      name: string;
      gender: string;
      age: number | string;
      className: string;
      chapel?: string;
      phone?: string;
    }[]
  ) => void;
  onBulkIncrementAges?: (options: Omit<BulkAgeIncrementOptions, 'targetAcademicYear'>) => BulkAgeIncrementStats | null;
  onDeleteChapel?: (chapelName: string) => void;
  nameScriptMode?: NameScriptMode;
  onChangeNameScriptMode?: (mode: NameScriptMode) => void;
  onOpenTransliterator?: () => void;
  submissions?: MinistrySubmission[];
  onCreateSubmission?: (payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>) => void;
  onResubmitSubmission?: (id: number, updates: Partial<MinistrySubmission>) => void;
  onDeleteSubmission?: (id: number) => void;
  chapelPlansMap?: { [chapelName: string]: AnnualPlanItem[] };
  onUpdateChapelPlans?: (chapelName: string, plans: AnnualPlanItem[]) => void;
  departmentDataMap?: { [unitId: string]: DepartmentWorkspaceData };
  childrenPlans?: AnnualPlanItem[];
}

type ChapelTabId = 'overview_all' | 'stats' | 'members' | 'children' | 'youth' | 'women' | 'plans' | 'submissions';

export const ChapelsHubPage: React.FC<ChapelsHubPageProps> = ({
  currentYear,
  ageReferenceYear = 2017,
  currentUserRole,
  chapelList = DEFAULT_CHAPELS,
  classList,
  studentsByClass,
  churchMembers,
  churchChildren,
  lockedChapel,
  onBatchAddMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onClearChurchMembers,
  onAddChild,
  onUpdateChild,
  onDeleteChild,
  onClearChurchChildren,
  onBatchAddChildren,
  onEnrollToSundaySchool,
  onImportMissingStudentsToChurchChildren,
  onBulkIncrementAges,
  onDeleteChapel,
  nameScriptMode,
  onChangeNameScriptMode,
  onOpenTransliterator,
  submissions = [],
  onCreateSubmission,
  onResubmitSubmission,
  onDeleteSubmission,
  chapelPlansMap = {},
  onUpdateChapelPlans,
  departmentDataMap = {},
  childrenPlans = []
}) => {
  const { t, unitName, chapelLabel } = useLanguage();
  const officialLockedChapel = lockedChapel ? mapToOfficialChapel(lockedChapel) : null;
  const [selectedChapel, setSelectedChapel] = useState<string | null>(officialLockedChapel);
  const [activeTab, setActiveTab] = useState<ChapelTabId>(
    officialLockedChapel ? 'children' : 'overview_all'
  );

  const effectiveChapelScope = officialLockedChapel || selectedChapel;

  const overviewStats = useMemo(
    () =>
      computeChurchOverviewStatistics({
        currentYear,
        classList,
        studentsByClass,
        churchMembers,
        churchChildren,
        chapelList,
        scopedChapel: officialLockedChapel
      }),
    [currentYear, classList, studentsByClass, churchMembers, churchChildren, chapelList, officialLockedChapel]
  );

  const visibleChapelRows = useMemo(
    () => overviewStats.chapelRows.filter((r) => !r.isUnassignedBucket),
    [overviewStats.chapelRows]
  );

  const youthWomenByChapel = useMemo(
    () => computeChapelYouthWomenStats(churchMembers, chapelList, currentYear),
    [churchMembers, chapelList, currentYear]
  );

  return (
    <div className="space-y-5">
      {/* Header & Chapel Selector */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">
              {unitName('elders_council')} / {unitName('spiritual_council')} /{' '}
              <span className="text-blue-900 font-bold">
                {unitName('chapels_dept')}
                {effectiveChapelScope ? ` / ${chapelLabel(effectiveChapelScope)}` : ''}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Church className="w-5 h-5 text-blue-800 shrink-0" />
              <span>
                {effectiveChapelScope
                  ? t(
                      `${effectiveChapelScope} — የአባላት፣ የልጆችና የቤተሰብ ገጽ`,
                      `${chapelLabel(effectiveChapelScope)} — Members, Children & Plans`
                    )
                  : t('የ10ሩም ቻፕሎች አገልግሎት ማዕከል', 'All 10 Chapels Ministry Hub')}
              </span>
            </h2>
            <p className="text-xs text-slate-600">
              {officialLockedChapel
                ? t(
                    `የ${officialLockedChapel} መረጃ ብቻ በልዩ መግቢያ ቁልፍ ተለይቶ ቀርቧል።`,
                    `Restricted to ${chapelLabel(officialLockedChapel)} data only.`
                  )
                : t(
                    'በሲስተሙ ውስጥ ያሉትን 10ሩም ቻፕሎች (ኤልሮኢ፣ ሻሎም፣ ቤቴል፣ ያህዌ፣ ኤዴን፣ አቤንኤዘር፣ ርኆቦት፣ ኤልሻዳይ፣ ሩሐማ፣ አዶናይ) በዚህ ስር ይከታተሉ።',
                    'Monitor and manage all 10 church chapels, plans, execution reports, members, and children under one hub.'
                  )}
            </p>
          </div>

          {!officialLockedChapel && effectiveChapelScope && (
            <button
              type="button"
              onClick={() => {
                setSelectedChapel(null);
                setActiveTab('overview_all');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('ወደ 10ሩም ቻፕሎች ማውጫ ተመለስ', 'Back to All 10 Chapels')}</span>
            </button>
          )}
        </div>

        {/* Navigation Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          {!officialLockedChapel && (
            <button
              type="button"
              onClick={() => setActiveTab('overview_all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'overview_all'
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Church className="w-3.5 h-3.5" />
              <span>{t('ሁሉም 10ሩ ቻፕሎች', 'All 10 Chapels')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('children')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'children'
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Baby className="w-3.5 h-3.5" />
            <span>
              {effectiveChapelScope
                ? t(`የ${effectiveChapelScope} ልጆች ቋት`, `${chapelLabel(effectiveChapelScope)} Children`)
                : t('የቻፕሎች ልጆች ቋት', 'Chapels Children Registry')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('youth')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'youth'
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {effectiveChapelScope
                ? t(`የ${effectiveChapelScope} ወጣቶች ቋት`, `${chapelLabel(effectiveChapelScope)} Youth`)
                : t('የቻፕሎች ወጣቶች ቋት', 'Chapels Youth Registry')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('women')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'women'
                ? 'bg-rose-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>
              {effectiveChapelScope
                ? t(`የ${effectiveChapelScope} ሴቶች ቋት`, `${chapelLabel(effectiveChapelScope)} Women`)
                : t('የቻፕሎች ሴቶች ቋት', 'Chapels Women Registry')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {effectiveChapelScope
                ? t(`የ${effectiveChapelScope} አባላት ቋት`, `${chapelLabel(effectiveChapelScope)} Members`)
                : t('የቻፕሎች አባላት ቋት', 'Chapels Members Registry')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'stats'
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>
              {effectiveChapelScope
                ? t(`የ${effectiveChapelScope} ስታቲስቲክስ`, `${chapelLabel(effectiveChapelScope)} Statistics`)
                : t('የቻፕሎች ስታቲስቲክስ', 'Chapels Statistics')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'plans'
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>
              {effectiveChapelScope
                ? t(`የ${effectiveChapelScope} ዕቅድና ክንውን`, `${chapelLabel(effectiveChapelScope)} Plans & Execution`)
                : t('ዕቅድና ክንውን (የ10ሩም ቻፕሎች)', 'Plans & Execution (10 Chapels)')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'submissions'
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('ለመንፈሳዊ ዘርፍ መላኪያ', 'Send to Spiritual Council')}</span>
          </button>
        </div>
      </section>

      {/* Directory Grid of all 10 Chapels */}
      {activeTab === 'overview_all' && !officialLockedChapel && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              {t('የ10ሩም ቻፕሎች የቤተሰብ፣ የአባላት እና የልጆች (0–14) ማውጫ', 'Directory of All 10 Chapels: Households, Members & Children (0–14)')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'የአንድን ቻፕል አባላት፣ ልጆች፣ ስታቲስቲክስ ወይም ዕቅድና ክንውን ለብቻው ለማየት ከቻፕሉ ስም ላይ ይጫኑ',
                'Select Members, Children, Statistics, or Plans & Execution for any chapel'
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left">{t('ተ.ቁ', '#')}</th>
                  <th className="py-3 px-4 text-left">{t('የቻፕል ስም', 'Chapel Name')}</th>
                  <th className="py-3 px-3 text-right">{t('ጠቅላላ ቤተሰብ', 'Households')}</th>
                  <th className="py-3 px-3 text-right">{t('አባላት (ወ/ሴ/ድምር)', 'Members (M/F/Total)')}</th>
                  <th className="py-3 px-3 text-right">{t('ልጆች 0–14', 'Children 0–14')}</th>
                  <th className="py-3 px-3 text-right">{t('ወጣቶች 15–29', 'Youth 15–29')}</th>
                  <th className="py-3 px-3 text-right">{t('ሴቶች (ባለትዳር / አባወራ)', 'Women (Married / Head)')}</th>
                  <th className="py-3 px-4 text-right">{t('ቻፕሉን ክፈት', 'Open Chapel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleChapelRows.map((row, idx) => {
                  const yw = youthWomenByChapel.get(row.chapelName);
                  return (
                    <tr key={row.chapelName} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{chapelLabel(row.chapelName)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800 tabular-nums">
                        {row.totalHouseholds.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                        {t('ወ', 'M')} {row.members.male} · {t('ሴ', 'F')} {row.members.female} ·{' '}
                        <strong className="text-slate-900">{row.members.total}</strong>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                        {t('ወ', 'M')} {row.children.male} · {t('ሴ', 'F')} {row.children.female} ·{' '}
                        <strong className="text-slate-900">{row.children.total}</strong>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                        {t('ወ', 'M')} {yw?.youthMale ?? 0} · {t('ሴ', 'F')} {yw?.youthFemale ?? 0} ·{' '}
                        <strong className="text-blue-900">{yw?.youthTotal ?? 0}</strong>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                        <span className="text-rose-800 font-bold">{yw?.womenMarried ?? 0}</span> /{' '}
                        <span className="text-purple-800 font-bold">{yw?.womenFemaleHead ?? 0}</span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapel(row.chapelName);
                              setActiveTab('children');
                            }}
                            className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                          >
                            {t('ልጆች', 'Children')}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapel(row.chapelName);
                              setActiveTab('youth');
                            }}
                            className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                          >
                            {t('ወጣቶች', 'Youth')}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapel(row.chapelName);
                              setActiveTab('women');
                            }}
                            className="text-xs font-bold text-rose-800 hover:underline cursor-pointer"
                          >
                            {t('ሴቶች', 'Women')}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapel(row.chapelName);
                              setActiveTab('members');
                            }}
                            className="text-xs font-bold text-slate-700 hover:underline cursor-pointer"
                          >
                            {t('አባላት', 'Members')}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapel(row.chapelName);
                              setActiveTab('plans');
                            }}
                            className="text-xs font-bold text-indigo-800 hover:underline cursor-pointer"
                          >
                            {t('ዕቅድና ክንውን', 'Plans')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'children' && (
        <ChurchChildrenTab
          currentYear={currentYear}
          ageReferenceYear={ageReferenceYear}
          classList={classList}
          churchChildren={churchChildren}
          churchMembers={churchMembers}
          chapelList={chapelList}
          studentsByClass={studentsByClass}
          onAddChild={onAddChild}
          onAddChurchMember={onAddMember}
          onUpdateChild={onUpdateChild}
          onDeleteChild={onDeleteChild}
          onClearChurchChildren={onClearChurchChildren}
          onBatchAddChildren={onBatchAddChildren}
          onEnrollToSundaySchool={onEnrollToSundaySchool}
          onImportMissingStudentsToChurchChildren={onImportMissingStudentsToChurchChildren}
          onBulkIncrementAges={!effectiveChapelScope ? onBulkIncrementAges : undefined}
          currentUserRole={currentUserRole}
          loggedInChapel={effectiveChapelScope}
          onDeleteChapel={onDeleteChapel}
          nameScriptMode={nameScriptMode}
          onChangeNameScriptMode={onChangeNameScriptMode}
          onOpenTransliterator={onOpenTransliterator}
        />
      )}

      {activeTab === 'youth' && (
        <ChapelYouthRegistryTab
          currentYear={currentYear}
          churchMembers={churchMembers}
          chapelList={chapelList}
          loggedInChapel={effectiveChapelScope}
          currentUserRole={currentUserRole}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
          onDeleteMember={onDeleteMember}
          nameScriptMode={nameScriptMode}
        />
      )}

      {activeTab === 'women' && (
        <ChapelWomenRegistryTab
          currentYear={currentYear}
          churchMembers={churchMembers}
          chapelList={chapelList}
          loggedInChapel={effectiveChapelScope}
          currentUserRole={currentUserRole}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
          onDeleteMember={onDeleteMember}
          nameScriptMode={nameScriptMode}
        />
      )}

      {activeTab === 'members' && (
        <ChurchMasterTab
          currentYear={currentYear}
          ageReferenceYear={ageReferenceYear}
          churchMembers={churchMembers}
          chapelList={chapelList}
          churchChildren={churchChildren}
          studentsByClass={studentsByClass}
          classList={classList}
          onBatchAddMembers={onBatchAddMembers}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
          onDeleteMember={onDeleteMember}
          onClearChurchMembers={() => onClearChurchMembers(effectiveChapelScope || undefined)}
          onExtractChildrenToChildrenTab={onBatchAddChildren}
          onBulkIncrementAges={!effectiveChapelScope ? onBulkIncrementAges : undefined}
          currentUserRole={currentUserRole}
          loggedInChapel={effectiveChapelScope}
          nameScriptMode={nameScriptMode}
          onChangeNameScriptMode={onChangeNameScriptMode}
          onOpenTransliterator={onOpenTransliterator}
        />
      )}

      {activeTab === 'stats' && (
        <ChurchStatisticsDashboardTab
          currentYear={currentYear}
          classList={classList}
          studentsByClass={studentsByClass}
          churchMembers={churchMembers}
          churchChildren={churchChildren}
          chapelList={chapelList}
          loggedInChapel={effectiveChapelScope}
        />
      )}

      {activeTab === 'plans' && (
        effectiveChapelScope ? (
          <UnifiedPlanManager
            unitId="chapels_dept"
            unitName={unitName('chapels_dept')}
            currentYear={currentYear}
            plans={chapelPlansMap[effectiveChapelScope] || []}
            chapelName={effectiveChapelScope}
            onSavePlans={(nextPlans) => onUpdateChapelPlans?.(effectiveChapelScope, nextPlans)}
            onSendToSpiritual={onCreateSubmission}
          />
        ) : (
          <div className="space-y-5">
            <section className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {t('የአንድ ቻፕል ዕቅድና ክንውን ለመክፈት/ለመሙላት ከታች ይምረጡ', 'Select a Chapel to Prepare or Edit Plans & Execution')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t(
                      'እያንዳንዱ ቻፕል የራሱን ዕቅድ በExcel/PDF/Word ጭኖ ለመንፈሳዊ ዘርፍ መላክ ይችላል።',
                      'Each chapel manages its own Annual, Half-Year, and Q1–Q4 plan workbench and submits to Spiritual Council.'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {chapelList.map((ch) => {
                  const count = (chapelPlansMap[ch] || []).length;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSelectedChapel(ch)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-800 cursor-pointer transition"
                    >
                      {chapelLabel(ch)}{' '}
                      <span className="text-slate-500 font-semibold tabular-nums">({count})</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <ConsolidatedPlansMatrix
              currentYear={currentYear}
              submissions={submissions}
              departmentDataMap={departmentDataMap}
              childrenPlans={childrenPlans}
              chapelList={chapelList}
              onlyApproved={false}
            />
          </div>
        )
      )}

      {activeTab === 'submissions' && (
        <MinistrySubmissionsPanel
          mode="sender"
          unitId="chapels_dept"
          unitName={unitName('chapels_dept')}
          currentYear={currentYear}
          lockedChapel={effectiveChapelScope}
          submissions={submissions}
          availablePlans={effectiveChapelScope ? (chapelPlansMap[effectiveChapelScope] || []) : []}
          activitiesSummaryText={
            effectiveChapelScope
              ? `${effectiveChapelScope} (${currentYear} ዓ/ም) ማጠቃለያ፦\n• አባላት፦ ${overviewStats.membersSummary.total} (ወንድ ${overviewStats.membersSummary.male} / ሴት ${overviewStats.membersSummary.female})\n• ልጆች (0–14)፦ ${overviewStats.childrenSummary.total}`
              : `የ10ሩም ቻፕሎች (${currentYear} ዓ/ም) ማጠቃለያ፦\n• ጠቅላላ አባላት፦ ${overviewStats.membersSummary.total}\n• ጠቅላላ ልጆች (0–14)፦ ${overviewStats.childrenSummary.total}`
          }
          onCreateSubmission={onCreateSubmission}
          onResubmitSubmission={onResubmitSubmission}
          onDeleteSubmission={onDeleteSubmission}
        />
      )}
    </div>
  );
};

