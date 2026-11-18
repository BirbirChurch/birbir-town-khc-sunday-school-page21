import React, { useMemo, useState } from 'react';
import { Church, Users, Baby, BarChart3, ArrowLeft, Send } from 'lucide-react';
import { ChurchChild, ChurchMember, MinistrySubmission, Role, Student } from '../types';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { computeChurchOverviewStatistics } from '../utils/churchOverviewStats';
import { BulkAgeIncrementOptions, BulkAgeIncrementStats } from '../utils/ageUpdater';
import { NameScriptMode } from '../utils/amharicTransliterator';
import { ChurchMasterTab } from './ChurchMasterTab';
import { ChurchChildrenTab, mapToOfficialChapel } from './ChurchChildrenTab';
import { ChurchStatisticsDashboardTab } from './ChurchStatisticsDashboardTab';
import { MinistrySubmissionsPanel } from './MinistrySubmissionsPanel';

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
}

type ChapelTabId = 'overview_all' | 'stats' | 'members' | 'children' | 'submissions';

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
  onDeleteSubmission
}) => {
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

  return (
    <div className="space-y-5">
      {/* Header & Chapel Selector */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">
              የሽማግሌዎች ጉባኤ / የመንፈሳዊ ዘርፍ ጉባኤ /{' '}
              <span className="text-blue-900 font-bold">
                ቻፕሎች{effectiveChapelScope ? ` / ${effectiveChapelScope}` : ''}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Church className="w-5 h-5 text-blue-800 shrink-0" />
              <span>
                {effectiveChapelScope
                  ? `${effectiveChapelScope} — የአባላት፣ የልጆችና የቤተሰብ ገጽ`
                  : 'የ10ሩም ቻፕሎች አገልግሎት ማዕከል'}
              </span>
            </h2>
            <p className="text-xs text-slate-600">
              {officialLockedChapel
                ? `የ${officialLockedChapel} መረጃ ብቻ በልዩ መግቢያ ቁልፍ ተለይቶ ቀርቧል።`
                : 'በሲስተሙ ውስጥ ያሉትን 10ሩም ቻፕሎች (ኤልሮኢ፣ ሻሎም፣ ቤቴል፣ ያህዌ፣ ኤዴን፣ አቤንኤዘር፣ ርኆቦት፣ ኤልሻዳይ፣ ሩሐማ፣ አዶናይ) በዚህ ስር ይከታተሉ።'}
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
              <span>ወደ 10ሩም ቻፕሎች ማውጫ ተመለስ</span>
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
              <span>ሁሉም 10ሩ ቻፕሎች</span>
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
            <span>{effectiveChapelScope ? `የ${effectiveChapelScope} ልጆች ቋት` : 'የቻፕሎች ልጆች ቋት'}</span>
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
            <span>{effectiveChapelScope ? `የ${effectiveChapelScope} አባላት ቋት` : 'የቻፕሎች አባላት ቋት'}</span>
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
            <span>{effectiveChapelScope ? `የ${effectiveChapelScope} ስታቲስቲክስ` : 'የቻፕሎች ስታቲስቲክስ'}</span>
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
            <span>ለመንፈሳዊ ዘርፍ መላኪያ</span>
          </button>
        </div>
      </section>

      {/* Directory Grid of all 10 Chapels */}
      {activeTab === 'overview_all' && !officialLockedChapel && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              የ10ሩም ቻፕሎች የቤተሰብ፣ የአባላት እና የልጆች (0–14) ማውጫ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              የአንድን ቻፕል አባላት፣ ልጆች ወይም ስታቲስቲክስ ለብቻው ለማየት ከቻፕሉ ስም ላይ ይጫኑ
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left">ተ.ቁ</th>
                  <th className="py-3 px-4 text-left">የቻፕል ስም</th>
                  <th className="py-3 px-3 text-right">ጠቅላላ ቤተሰብ</th>
                  <th className="py-3 px-3 text-right">አባላት (ወ/ሴ/ድምር)</th>
                  <th className="py-3 px-3 text-right">ልጆች 0–14 (ወ/ሴ/ድምር)</th>
                  <th className="py-3 px-4 text-right">ቻፕሉን ክፈት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleChapelRows.map((row, idx) => (
                  <tr key={row.chapelName} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{row.chapelName}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800 tabular-nums">
                      {row.totalHouseholds.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                      ወ {row.members.male} · ሴ {row.members.female} ·{' '}
                      <strong className="text-slate-900">{row.members.total}</strong>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                      ወ {row.children.male} · ሴ {row.children.female} ·{' '}
                      <strong className="text-slate-900">{row.children.total}</strong>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChapel(row.chapelName);
                            setActiveTab('members');
                          }}
                          className="text-xs font-bold text-blue-800 hover:underline cursor-pointer"
                        >
                          አባላት
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChapel(row.chapelName);
                            setActiveTab('children');
                          }}
                          className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                        >
                          ልጆች
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChapel(row.chapelName);
                            setActiveTab('stats');
                          }}
                          className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                        >
                          ስታቲስቲክስ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {activeTab === 'submissions' && (
        <MinistrySubmissionsPanel
          mode="sender"
          unitId="chapels_dept"
          unitName="ቻፕሎች"
          currentYear={currentYear}
          lockedChapel={effectiveChapelScope}
          submissions={submissions}
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
