import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { AnnualPlanItem, ChurchChild, ChurchMember, MinistrySubmission, Student } from '../types';
import { downloadMultiSheetXLSX } from '../utils/csv';
import { SundaySchoolAgeCohortCard } from './SundaySchoolAgeCohortCard';
import { UnifiedPlanManager } from './UnifiedPlanManager';
import { useLanguage } from '../context/LanguageContext';
import {
  buildAgeCohortExcelSheets,
  buildChurchStudentLookup,
  computePerClassSundaySchoolCohorts,
  computeSundaySchoolAgeCohorts,
  enrichStudentWithChurchLookup
} from '../utils/sundaySchoolAgeStats';

interface PlanReportTabProps {
  currentYear: string;
  plans: AnnualPlanItem[];
  onUpdatePlan: (plan: AnnualPlanItem) => void;
  onAddPlan: (plan: Omit<AnnualPlanItem, 'id'>) => void;
  onDeletePlan: (id: number) => void;
  onImportPlans: (plans: AnnualPlanItem[]) => void;
  onSendToSpiritual?: (
    payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>
  ) => void;
  onGoToAllStudents?: () => void;
  totalStudentsCount?: number;
  classList?: string[];
  studentsByClass?: { [className: string]: Student[] };
  churchChildren?: ChurchChild[];
  churchMembers?: ChurchMember[];
}

export const PlanReportTab: React.FC<PlanReportTabProps> = ({
  currentYear,
  plans,
  onImportPlans,
  onSendToSpiritual,
  onGoToAllStudents,
  totalStudentsCount,
  classList = [],
  studentsByClass = {},
  churchChildren = [],
  churchMembers = []
}) => {
  const { t, unitName } = useLanguage();

  // Strictly restrict Sunday School classes to CLASS_LIST (ማቆያ እስከ 12ኛ ክፍል)
  const allClassNames = useMemo(() => [...classList], [classList]);

  const { enrichedByClass, allEnrichedStudents } = useMemo(() => {
    const lookup = buildChurchStudentLookup(churchChildren, churchMembers);
    const byClass: { [cName: string]: Student[] } = {};
    const flat: Student[] = [];
    allClassNames.forEach((cName) => {
      const list = (studentsByClass[cName] || []).map((st) =>
        enrichStudentWithChurchLookup(st, lookup, currentYear)
      );
      byClass[cName] = list;
      flat.push(...list);
    });
    return { enrichedByClass: byClass, allEnrichedStudents: flat };
  }, [allClassNames, studentsByClass, churchChildren, churchMembers, currentYear]);

  const sundaySchoolAgeStats = useMemo(
    () => computeSundaySchoolAgeCohorts(allEnrichedStudents, currentYear),
    [allEnrichedStudents, currentYear]
  );

  const perClassAgeCohorts = useMemo(
    () => computePerClassSundaySchoolCohorts(allClassNames, enrichedByClass, currentYear),
    [allClassNames, enrichedByClass, currentYear]
  );

  const handleExportAgeStatsExcel = () => {
    const { summaryRows, perClassRows } = buildAgeCohortExcelSheets(
      sundaySchoolAgeStats,
      perClassAgeCohorts,
      currentYear,
      'ሁሉም የሰንበት ት/ቤት ክፍሎች'
    );
    downloadMultiSheetXLSX(
      [
        { name: 'የዕድሜ ምድብ (0-14) ድምር', data: summaryRows },
        { name: 'በየክፍሉ የዕድሜ ስታቲስቲክስ', data: perClassRows }
      ],
      `የሰንበት_ክፍል_የዕድሜ_ምድብ_ሪፖርት_${currentYear}ዓም.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {onGoToAllStudents && (
        <div className="flex justify-end print:hidden">
          <button
            type="button"
            onClick={onGoToAllStudents}
            className="bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer border border-indigo-700"
            title={t('ሁሉንም የተመዘገቡ ተማሪዎች ማስተር ገጽ ክፈት', 'Open All Registered Sunday School Students Master Page')}
          >
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {t('የተመዘገቡ ተማሪዎች ማስተር', 'All Registered Students')} ({totalStudentsCount || 0})
            </span>
          </button>
        </div>
      )}

      {/* Unified Plan & Execution Workbench (Excel/PDF/Word import, Annual/H1/H2/Q1-Q4, +10%/15%/20% next-year generator) */}
      <UnifiedPlanManager
        unitId="children_ministry"
        unitName={unitName('children_ministry', 'የልጆች አገልግሎት')}
        currentYear={currentYear}
        plans={plans}
        onSavePlans={onImportPlans}
        onSendToSpiritual={onSendToSpiritual}
      />

      {/* Sunday School Student Age Cohort Breakdown (0-3, 4-6, 7-9, 10-12, 13-14: Male / Female / Total) */}
      {allClassNames.length > 0 && (
        <SundaySchoolAgeCohortCard
          stats={sundaySchoolAgeStats}
          perClassCohorts={perClassAgeCohorts}
          scopeLabel={t('ሁሉም የሰንበት ት/ቤት ክፍሎች', 'All Sunday School Classes')}
          onExportExcel={handleExportAgeStatsExcel}
        />
      )}

      {/* Official Signatures Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-800 shadow-sm">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <p className="font-bold text-slate-900">{t('ዕቅድ አዘጋጅ፦', 'Prepared By:')}</p>
          <p className="font-semibold text-blue-900 mt-1">ወ/ዊ ገላትያ ደስታ</p>
          <p className="text-xs text-slate-500">
            {t('የልጆች አገልግሎት አስተባባሪ', 'Children Ministry Coordinator')}
          </p>
          <p className="text-xs text-slate-400 mt-3">{t('ፊርማ፦', 'Signature:')} _______________________</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <p className="font-bold text-slate-900">{t('ዕቅድ አጽዳቂ፦', 'Approved By:')}</p>
          <p className="font-semibold text-amber-900 mt-1">መጋቢ ጉጃ ኡባ</p>
          <p className="text-xs text-slate-500">
            {t('የመንፈሳዊ ዘርፍ አስተባባሪ', 'Spiritual Sector Coordinator')}
          </p>
          <p className="text-xs text-slate-400 mt-3">{t('ፊርማ፦', 'Signature:')} _______________________</p>
        </div>
      </div>
    </div>
  );
};
