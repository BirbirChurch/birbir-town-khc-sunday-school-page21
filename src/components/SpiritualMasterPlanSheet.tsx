import React, { useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Church,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Printer,
  Send,
  Sparkles,
  Upload
} from 'lucide-react';
import {
  AnnualPlanItem,
  ChurchChild,
  ChurchMember,
  MinistrySubmission,
  OrgUnitId,
  SpiritualMasterPlanNarratives,
  SpiritualMasterPlanRowValues,
  SpiritualMasterPlanSheetData,
  SpiritualMasterPlanSignOff
} from '../types';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { useLanguage } from '../context/LanguageContext';
import { formatDualDateTimeText, getAdjustedNow } from '../utils/ethiopianDate';
import { mapToOfficialChapel } from '../utils/amharicSearchAndChapel';
import {
  NARRATIVE_SECTION_META,
  SPIRITUAL_MASTER_PLAN_ITEMS,
  SPIRITUAL_MASTER_PLAN_LEAF_ITEMS,
  aggregateLiveChapelMasterPlans,
  annualPlansToMasterSheet,
  ensureSpiritualMasterPlanSheet,
  exportConsolidatedSpiritualMasterPlanExcel,
  exportSpiritualMasterPlanExcel,
  getFilledItemCountForSheet,
  parseSpiritualMasterPlanExcel,
  syncMasterPlanToAnnualPlans,
  toNum,
  updateSheetRowField
} from '../utils/spiritualMasterPlan';
import { ExportPhotoButton } from './ExportPhotoButton';

interface SpiritualMasterNarrativesFooterProps {
  currentYear: string;
  sheetData?: SpiritualMasterPlanSheetData;
  onSaveSheet: (nextSheet: SpiritualMasterPlanSheetData) => void;
  titleLabel?: string;
}

export const SpiritualMasterNarrativesFooter: React.FC<SpiritualMasterNarrativesFooterProps> = ({
  currentYear,
  sheetData,
  onSaveSheet,
  titleLabel
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const activeSheet = useMemo(
    () => ensureSpiritualMasterPlanSheet(sheetData, currentYear),
    [sheetData, currentYear]
  );

  const filledNarrativeCount = useMemo(() => {
    let count = 0;
    NARRATIVE_SECTION_META.forEach((sec) => {
      if ((activeSheet.narratives[sec.key] || []).some((l) => l.trim() !== '')) count++;
    });
    if (activeSheet.signOff.reporterName?.trim() || activeSheet.signOff.receiverName?.trim()) {
      count++;
    }
    return count;
  }, [activeSheet]);

  const handleNarrativeLineChange = (
    key: keyof SpiritualMasterPlanNarratives,
    idx: number,
    value: string
  ) => {
    const list = [...(activeSheet.narratives[key] || [])];
    list[idx] = value;
    onSaveSheet({
      ...activeSheet,
      year: currentYear,
      narratives: { ...activeSheet.narratives, [key]: list },
      updatedAt: new Date().toISOString()
    });
  };

  const handleAddNarrativeLine = (key: keyof SpiritualMasterPlanNarratives) => {
    onSaveSheet({
      ...activeSheet,
      year: currentYear,
      narratives: {
        ...activeSheet.narratives,
        [key]: [...(activeSheet.narratives[key] || []), '']
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleSignOffChange = (field: keyof SpiritualMasterPlanSignOff, value: string) => {
    onSaveSheet({
      ...activeSheet,
      year: currentYear,
      signOff: { ...activeSheet.signOff, [field]: value },
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 bg-slate-50/70 hover:bg-slate-100/70 transition text-left cursor-pointer"
      >
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
            {titleLabel ||
              t(
                'ሀ–ሠ ተጨማሪ ማብራሪያዎች እና የሪፖርት አቅራቢ/ተቀባይ ፊርማ',
                'Narrative Sections (ሀ–ሠ) & Reporter/Receiver Sign-off'
              )}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t(
              'ሌሎች የተከናወኑ ተግባራት፣ ያጋጠሙ ችግሮች፣ የመፍትሔ እርምጃዎች፣ ምስጋና፣ ጸሎት እና የፊርማ መረጃ',
              'Other completed activities, challenges, solutions, thanksgiving, prayer, and sign-off'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {filledNarrativeCount > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold tabular-nums">
              {filledNarrativeCount} {t('ክፍሎች ተሞልተዋል', 'filled')}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="p-5 space-y-5 border-t border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NARRATIVE_SECTION_META.map((sec) => {
              const lines = activeSheet.narratives[sec.key] || [];
              return (
                <div key={sec.key} className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {sec.prefix} {sec.labelAm}
                    </h5>
                    <button
                      type="button"
                      onClick={() => handleAddNarrativeLine(sec.key)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer print:hidden"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('መስመር ጨምር', 'Add Line')}</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-5 shrink-0 text-right tabular-nums">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleNarrativeLineChange(sec.key, idx, e.target.value)}
                          placeholder="........................................................"
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-base sm:text-xs text-slate-800 bg-slate-50/50 focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="font-extrabold text-slate-900">የሪፖርት አቅራቢ መረጃ</div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">የሪፖርት አቅራቢ ስም፡</label>
                <input
                  type="text"
                  value={activeSheet.signOff.reporterName || ''}
                  onChange={(e) => handleSignOffChange('reporterName', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ፊርማ፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.reporterSignature || ''}
                    onChange={(e) => handleSignOffChange('reporterSignature', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ቀን፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.reporterDate || ''}
                    onChange={(e) => handleSignOffChange('reporterDate', e.target.value)}
                    placeholder="ቀን/ወር/ዓ.ም"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="font-extrabold text-slate-900">የሪፖርት ተቀባይ መረጃ</div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">የሪፖርት ተቀባይ ስም፡</label>
                <input
                  type="text"
                  value={activeSheet.signOff.receiverName || ''}
                  onChange={(e) => handleSignOffChange('receiverName', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ፊርማ፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.receiverSignature || ''}
                    onChange={(e) => handleSignOffChange('receiverSignature', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ቀን፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.receiverDate || ''}
                    onChange={(e) => handleSignOffChange('receiverDate', e.target.value)}
                    placeholder="ቀን/ወር/ዓ.ም"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

interface SpiritualMasterPlanSheetProps {
  mode: 'chapel' | 'spiritual_council';
  currentYear: string;
  chapelName?: string;
  chapelList?: string[];
  // For chapel mode:
  sheetData?: SpiritualMasterPlanSheetData;
  onSaveSheet?: (nextSheet: SpiritualMasterPlanSheetData) => void;
  // For spiritual_council mode:
  centralSheetData?: SpiritualMasterPlanSheetData;
  centralPlans?: AnnualPlanItem[];
  onSaveCentralSheet?: (nextSheet: SpiritualMasterPlanSheetData) => void;
  chapelPlansMap?: { [chapelName: string]: AnnualPlanItem[] };
  chapelMasterPlans?: {
    [chapelName: string]: {
      [year: string]: SpiritualMasterPlanSheetData;
    };
  };
  onSaveChapelSheet?: (chapelName: string, nextSheet: SpiritualMasterPlanSheetData) => void;
  onBatchSaveChapelSheets?: (sheetsByChapel: { [chapelName: string]: SpiritualMasterPlanSheetData }) => void;
  // Optional helpers for Section 1 auto-fill & submission:
  churchMembers?: ChurchMember[];
  churchChildren?: ChurchChild[];
  onSendToSpiritual?: (
    payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>
  ) => void;
  unitId?: OrgUnitId;
  unitNameLabel?: string;
}

export const SpiritualMasterPlanSheet: React.FC<SpiritualMasterPlanSheetProps> = ({
  mode,
  currentYear,
  chapelName,
  chapelList = DEFAULT_CHAPELS,
  sheetData,
  onSaveSheet,
  centralSheetData,
  centralPlans = [],
  onSaveCentralSheet,
  chapelPlansMap = {},
  chapelMasterPlans = {},
  onSaveChapelSheet,
  onBatchSaveChapelSheets,
  churchMembers = [],
  churchChildren = [],
  onSendToSpiritual,
  unitId = 'chapels_dept',
  unitNameLabel = 'ቻፕሎች'
}) => {
  const { t, chapelLabel } = useLanguage();
  const sheetExportRef = useRef<HTMLDivElement | null>(null);

  const [councilView, setCouncilView] = useState<'all_combined' | 'per_chapel' | 'central_master'>(
    'all_combined'
  );
  const [metricView, setMetricView] = useState<'plan' | 'execution' | 'both'>('both');
  const [selectedInspectChapel, setSelectedInspectChapel] = useState<string>(
    chapelName || chapelList[0] || DEFAULT_CHAPELS[0]
  );
  const [expandedAggCodes, setExpandedAggCodes] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState('');

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(''), 6000);
  };

  // Live aggregated Plan & Execution data across all chapels (from UnifiedPlanManager + legacy fallback)
  const liveAgg = useMemo(
    () => aggregateLiveChapelMasterPlans(chapelPlansMap, chapelMasterPlans, chapelList, currentYear),
    [chapelPlansMap, chapelMasterPlans, chapelList, currentYear]
  );

  const aggregatedData = metricView === 'execution' ? liveAgg.execAggregated : liveAgg.planAggregated;
  const execAggregatedData = liveAgg.execAggregated;

  // Determine which sheet is currently displayed in the editor/viewer
  const activeContextLabel = useMemo(() => {
    if (mode === 'chapel') return chapelLabel(chapelName || chapelList[0] || '');
    if (councilView === 'all_combined') {
      return t('የሁሉም ቻፕሎች የተጠቃለለ ዕቅድና ክንውን (በአንድነት)', 'All Chapels Consolidated Plan & Execution');
    }
    if (councilView === 'per_chapel') {
      return chapelLabel(selectedInspectChapel);
    }
    return t('የመንፈሳዊ ዘርፍ ዋና ቋሚ ዕቅድ', 'Spiritual Sector Central Master Plan');
  }, [mode, councilView, chapelName, selectedInspectChapel, chapelList, chapelLabel, t]);

  const activeExecSheet: SpiritualMasterPlanSheetData = useMemo(() => {
    if (mode === 'spiritual_council' && councilView === 'all_combined') {
      return execAggregatedData.aggregatedSheet;
    }
    if (mode === 'spiritual_council' && councilView === 'per_chapel') {
      return annualPlansToMasterSheet(
        chapelPlansMap[selectedInspectChapel] || [],
        currentYear,
        chapelMasterPlans[selectedInspectChapel]?.[currentYear],
        true
      );
    }
    return annualPlansToMasterSheet(centralPlans, currentYear, centralSheetData, true);
  }, [
    mode,
    councilView,
    execAggregatedData,
    chapelPlansMap,
    chapelMasterPlans,
    selectedInspectChapel,
    currentYear,
    centralPlans,
    centralSheetData
  ]);

  const activeSheet: SpiritualMasterPlanSheetData = useMemo(() => {
    if (mode === 'chapel') {
      return ensureSpiritualMasterPlanSheet(sheetData, currentYear);
    }
    if (councilView === 'all_combined') {
      return aggregatedData.aggregatedSheet;
    }
    if (councilView === 'per_chapel') {
      if (metricView === 'execution') {
        return activeExecSheet;
      }
      const chAnnual = chapelPlansMap[selectedInspectChapel] || [];
      const legacy = chapelMasterPlans[selectedInspectChapel]?.[currentYear];
      return chAnnual.length > 0
        ? annualPlansToMasterSheet(chAnnual, currentYear, legacy, false)
        : ensureSpiritualMasterPlanSheet(legacy, currentYear);
    }
    if (metricView === 'execution') {
      return activeExecSheet;
    }
    return centralPlans.length > 0
      ? annualPlansToMasterSheet(centralPlans, currentYear, centralSheetData, false)
      : ensureSpiritualMasterPlanSheet(centralSheetData, currentYear);
  }, [
    mode,
    councilView,
    metricView,
    sheetData,
    aggregatedData,
    activeExecSheet,
    chapelPlansMap,
    chapelMasterPlans,
    selectedInspectChapel,
    currentYear,
    centralPlans,
    centralSheetData
  ]);

  const isReadOnlyTable =
    mode === 'spiritual_council' && (councilView === 'all_combined' || metricView !== 'plan');

  const commitActiveSheet = (next: SpiritualMasterPlanSheetData) => {
    const stamped: SpiritualMasterPlanSheetData = {
      ...next,
      year: currentYear,
      updatedAt: new Date().toISOString()
    };
    if (mode === 'chapel') {
      onSaveSheet?.(stamped);
    } else if (councilView === 'per_chapel') {
      onSaveChapelSheet?.(selectedInspectChapel, stamped);
    } else if (councilView === 'central_master') {
      onSaveCentralSheet?.(stamped);
    }
  };

  const handleCellChange = (
    code: string,
    field: keyof SpiritualMasterPlanRowValues,
    value: string
  ) => {
    if (isReadOnlyTable) return;
    const updated = updateSheetRowField(activeSheet, code, field, value);
    commitActiveSheet(updated);
  };

  const handleNarrativeLineChange = (
    key: keyof SpiritualMasterPlanNarratives,
    idx: number,
    value: string
  ) => {
    if (isReadOnlyTable) return;
    const list = [...(activeSheet.narratives[key] || [])];
    list[idx] = value;
    commitActiveSheet({
      ...activeSheet,
      narratives: {
        ...activeSheet.narratives,
        [key]: list
      }
    });
  };

  const handleAddNarrativeLine = (key: keyof SpiritualMasterPlanNarratives) => {
    if (isReadOnlyTable) return;
    commitActiveSheet({
      ...activeSheet,
      narratives: {
        ...activeSheet.narratives,
        [key]: [...(activeSheet.narratives[key] || []), '']
      }
    });
  };

  const handleSignOffChange = (field: keyof SpiritualMasterPlanSignOff, value: string) => {
    if (isReadOnlyTable) return;
    commitActiveSheet({
      ...activeSheet,
      signOff: {
        ...activeSheet.signOff,
        [field]: value
      }
    });
  };

  const handleAutoFillSection1FromRegistry = () => {
    const targetChapel = mode === 'chapel' ? chapelName : selectedInspectChapel;
    if (!targetChapel) return;

    const matchingMembers = churchMembers.filter(
      (m) => mapToOfficialChapel(m.chapel || '') === targetChapel
    );
    const matchingChildren = churchChildren.filter(
      (c) => mapToOfficialChapel(c.chapel || '') === targetChapel
    );

    const youthCount = matchingMembers.filter(
      (m) =>
        m.isYouth ||
        (m.age !== undefined &&
          m.age !== '' &&
          Number(m.age) >= 15 &&
          Number(m.age) <= 35)
    ).length;
    const headOrAdultCount = Math.max(0, matchingMembers.length - youthCount);
    const childCount = matchingChildren.length;
    const totalCount = headOrAdultCount + youthCount + childCount;

    let next = updateSheetRowField(activeSheet, '1.1', 'yearPlan', String(headOrAdultCount));
    next = updateSheetRowField(next, '1.2', 'yearPlan', String(youthCount));
    next = updateSheetRowField(next, '1.3', 'yearPlan', String(childCount));
    next = {
      ...next,
      rows: {
        ...next.rows,
        '1.4': {
          ...next.rows['1.4'],
          yearPlan: String(totalCount)
        }
      }
    };
    commitActiveSheet(next);
    showNotice(
      t(
        `✓ ከ${chapelLabel(targetChapel)} መረጃ ቋት ተሞልቷል፦ አባወራ/እማወራ ${headOrAdultCount}፣ ወጣቶች ${youthCount}፣ ልጆች ${childCount} (ድምር ${totalCount})።`,
        `✓ Populated Section 1 from ${chapelLabel(targetChapel)} registry (Total ${totalCount}).`
      )
    );
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const parsed = await parseSpiritualMasterPlanExcel(file, currentYear, chapelList);
      const detectedCount = parsed.detectedChapelNames.length;

      if (mode === 'spiritual_council' && councilView === 'all_combined') {
        if (detectedCount > 0 && onBatchSaveChapelSheets) {
          onBatchSaveChapelSheets(parsed.chapelSheets);
          showNotice(
            t(
              `✓ ከ "${file.name}" የ${detectedCount} ቻፕሎች ዕቅድ (${parsed.detectedChapelNames.join('፣ ')}) በተሳካ ሁኔታ ተቀብሏል!`,
              `✓ Imported ${detectedCount} chapel plan sheet(s) from "${file.name}"!`
            )
          );
        } else if (parsed.matchedRowsCount > 0 && onSaveCentralSheet) {
          onSaveCentralSheet(parsed.firstSheet);
          setCouncilView('central_master');
          showNotice(
            t(
              `✓ ${parsed.matchedRowsCount} የተሞሉ የዕቅድ መስመሮች ከ "${file.name}" ወደ መንፈሳዊ ዘርፍ ዋና ዕቅድ ተቀብለዋል!`,
              `✓ Imported ${parsed.matchedRowsCount} plan row(s) from "${file.name}" into Central Master Plan.`
            )
          );
        } else {
          showNotice(
            t(
              'ከተጫነው Excel ፋይል የሚዛመዱ የዕቅድ መስመሮች (1.1–8.2) ማግኘት አልተቻለም። እባክዎ የመደበኛውን Excel ቅጽ ይጠቀሙ።',
              'No matching Spiritual Plan rows (1.1–8.2) found in that Excel file. Please use the standard Excel template.'
            )
          );
        }
      } else {
        // Single target sheet (chapel, per_chapel, or central_master)
        const targetChapel =
          mode === 'chapel'
            ? chapelName
            : councilView === 'per_chapel'
            ? selectedInspectChapel
            : undefined;

        const chosenSheet =
          targetChapel && parsed.chapelSheets[targetChapel]
            ? parsed.chapelSheets[targetChapel]
            : parsed.firstSheet;

        const count = getFilledItemCountForSheet(chosenSheet);
        if (count === 0 && parsed.matchedRowsCount === 0) {
          showNotice(
            t(
              'ከተጫነው Excel ፋይል የተሞላ የዕቅድ መስመር አልተገኘም። እባክዎ መጀመሪያ «Excel ቅጽ አውርድ»ን በመጠቀም ይሙሉ።',
              'No populated rows found in the Excel file. Download the Excel template first and fill in values.'
            )
          );
        } else {
          commitActiveSheet(chosenSheet);
          showNotice(
            t(
              `✓ ከ "${file.name}" ${count || parsed.matchedRowsCount} የዕቅድ መስመሮች ለ${activeContextLabel} በተሳካ ሁኔታ ተቀብለዋል!`,
              `✓ Imported ${count || parsed.matchedRowsCount} rows from "${file.name}" for ${activeContextLabel}!`
            )
          );
        }
      }
    } catch {
      showNotice(
        t(
          'የExcel ፋይሉን በማንበብ ላይ ስህተት አጋጥሟል። ትክክለኛ .xlsx / .xls ፋይል ይሞክሩ።',
          'Error reading the Excel file. Please try a valid .xlsx / .xls file.'
        )
      );
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    if (mode === 'spiritual_council' && councilView === 'all_combined') {
      exportConsolidatedSpiritualMasterPlanExcel({
        year: currentYear,
        aggregatedData,
        chapelMasterPlans,
        chapelList
      });
      showNotice(
        t(
          '✓ የሁሉም ቻፕሎች ድምር እና የየቻፕሉ ዝርዝር Excel ፋይል ወርዷል።',
          '✓ Exported Consolidated & All Individual Chapels Excel workbook.'
        )
      );
      return;
    }

    exportSpiritualMasterPlanExcel({
      year: currentYear,
      sheet: activeSheet,
      subtitleLabel: activeContextLabel,
      fileName: `የመንፈሳዊ_ዘርፍ_ዕቅድ_${activeContextLabel}_${currentYear}.xlsx`
    });
    showNotice(
      t(
        `✓ የ${activeContextLabel} የ${currentYear} ዕቅድ Excel ቅጽ ወርዷል።`,
        `✓ Exported ${activeContextLabel} (${currentYear}) Excel file.`
      )
    );
  };

  const handleSubmitChapelPlanToSpiritual = () => {
    if (!onSendToSpiritual || !chapelName) return;
    const syncedAnnual = syncMasterPlanToAnnualPlans(
      activeSheet,
      currentYear,
      chapelLabel(chapelName),
      []
    );
    const filledCount = getFilledItemCountForSheet(activeSheet);
    if (filledCount === 0) {
      showNotice(
        t('ከመላክዎ በፊት ቢያንስ አንድ የዕቅድ መስመር ይሙሉ ወይም Excel ይጫኑ።', 'Fill at least one row before submitting.')
      );
      return;
    }

    const lines: string[] = [
      `በ${currentYear} ዓ.ም የብ/ከ/ቃ/ሕ/ቤ/ክ የመንፈሳዊ ዘርፍ ዕቅድ — ${chapelLabel(chapelName)}`,
      `የተሞሉ ዝርዝር ተግባራት፦ ${filledCount} / ${SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.length}`,
      ''
    ];
    SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.forEach((it) => {
      const rv = activeSheet.rows[it.code];
      if (!rv) return;
      const yr = toNum(rv.yearPlan) || toNum(rv.half1) + toNum(rv.half2);
      if (yr > 0 || toNum(rv.q1) > 0 || toNum(rv.q2) > 0 || toNum(rv.q3) > 0 || toNum(rv.q4) > 0) {
        lines.push(
          `${it.code} ${it.task.replace(/^-+\s*/, '')} (${it.unit}) — ዓመት: ${yr || 0} [1ኛ ግማሽ: ${rv.half1 || 0}, 2ኛ ግማሽ: ${rv.half2 || 0} | Q1:${rv.q1 || 0}, Q2:${rv.q2 || 0}, Q3:${rv.q3 || 0}, Q4:${rv.q4 || 0}]${rv.remarks ? ` — ${rv.remarks}` : ''}`
        );
      }
    });

    NARRATIVE_SECTION_META.forEach((sec) => {
      const filledNotes = (activeSheet.narratives[sec.key] || []).filter((l) => l.trim() !== '');
      if (filledNotes.length > 0) {
        lines.push('', `${sec.prefix} ${sec.labelAm}`);
        filledNotes.forEach((n, idx) => lines.push(`  ${idx + 1}. ${n}`));
      }
    });

    if (activeSheet.signOff.reporterName?.trim()) {
      lines.push('', `የሪፖርት አቅራቢ ስም፡ ${activeSheet.signOff.reporterName} (${activeSheet.signOff.reporterDate || '—'})`);
    }

    onSendToSpiritual({
      type: 'plan',
      title: `${chapelLabel(chapelName)} — በ${currentYear} ዓ.ም የመንፈሳዊ ዘርፍ ዕቅድ`,
      year: currentYear,
      period: 'ሙሉ ዓመት (2019 ቋሚ ዕቅድ)',
      periodCode: 'year',
      content: lines.join('\n'),
      senderUnitId: unitId,
      senderUnitName: unitNameLabel,
      senderChapel: chapelName,
      attachedPlans: syncedAnnual
    });
    showNotice(
      t(
        `✓ የ${chapelLabel(chapelName)} የ${currentYear} ዕቅድ ለመንፈሳዊ ዘርፍ ጉባኤ በተሳካ ሁኔታ ተልኳል!`,
        `✓ Submitted ${chapelLabel(chapelName)} master plan to Spiritual Sector Council!`
      )
    );
  };

  const toggleExpandAggCode = (code: string) => {
    setExpandedAggCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const allExpandableAggCodes = useMemo(
    () =>
      SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.filter(
        (it) => (aggregatedData.reportingChapelCountByCode[it.code] || 0) > 0
      ).map((it) => it.code),
    [aggregatedData]
  );

  const isAllAggExpanded =
    allExpandableAggCodes.length > 0 &&
    allExpandableAggCodes.every((c) => expandedAggCodes.has(c));

  const toggleExpandAllAgg = () => {
    if (isAllAggExpanded) {
      setExpandedAggCodes(new Set());
    } else {
      setExpandedAggCodes(new Set(allExpandableAggCodes));
    }
  };

  const filledRowsInActive = useMemo(
    () => getFilledItemCountForSheet(activeSheet),
    [activeSheet]
  );

  return (
    <div ref={sheetExportRef} className="space-y-5">
      {/* Print Header */}
      <div className="hidden print:block text-center pb-3 border-b border-slate-300">
        <h1 className="text-base font-extrabold">
          በ{currentYear} ዓ.ም የብ/ከ/ቃ/ሕ/ቤ/ክ የመንፈሳዊ ዘርፍ ዕቅድ
        </h1>
        <h2 className="text-xs font-bold text-slate-700 mt-0.5">{activeContextLabel}</h2>
        <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
          የታተመበት ቀንና ሰዓት፦ {formatDualDateTimeText(getAdjustedNow())}
        </p>
      </div>

      {/* Spiritual Council Permanent Header & Mode Switcher */}
      {mode === 'spiritual_council' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sky-700 shrink-0" />
                <span>
                  {t(
                    `በ${currentYear} ዓ.ም የብ/ከ/ቃ/ሕ/ቤ/ክ የመንፈሳዊ ዘርፍ ቋሚ ዕቅድ`,
                    `Birbir KHC ${currentYear} Spiritual Sector Master Plan`
                  )}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'ሁሉም ቻፕሎች የሚሞሉት ዕቅድ በራሱ በአንድነት ተደምሮ የሚታይበት እንዲሁም የእያንዳንዱ ቻፕል እና የመንፈሳዊ ዘርፍ ዕቅድ የሚመራበት ቋሚ ገጽ።',
                  'View consolidated totals across all chapels, inspect or import individual chapel plans, and maintain the central Spiritual Sector master sheet.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCouncilView('all_combined')}
                  className={`px-3 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    councilView === 'all_combined'
                      ? 'bg-sky-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Church className="w-3.5 h-3.5" />
                  <span>{t('የሁሉም ቻፕሎች በአንድነት', 'All Chapels Combined')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCouncilView('per_chapel')}
                  className={`px-3 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    councilView === 'per_chapel'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>
                    {t(
                      `የየቻፕሉ (${liveAgg.planAggregated.filledChapels.length}/${chapelList.length})`,
                      `Per Chapel (${liveAgg.planAggregated.filledChapels.length}/${chapelList.length})`
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCouncilView('central_master')}
                  className={`px-3 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    councilView === 'central_master'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{t('የመንፈሳዊ ዘርፍ ዋና ቅጽ', 'Spiritual Sector Sheet')}</span>
                </button>
              </div>

              <div className="inline-flex gap-1 p-1 bg-emerald-50 border border-emerald-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMetricView('both')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    metricView === 'both'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-emerald-900 hover:bg-white'
                  }`}
                >
                  {t('ዕቅድ / ክንውን', 'Plan / Done')}
                </button>
                <button
                  type="button"
                  onClick={() => setMetricView('plan')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    metricView === 'plan'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-emerald-900 hover:bg-white'
                  }`}
                >
                  {t('ዕቅድ ብቻ', 'Plan Only')}
                </button>
                <button
                  type="button"
                  onClick={() => setMetricView('execution')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    metricView === 'execution'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-emerald-900 hover:bg-white'
                  }`}
                >
                  {t('ክንውን ብቻ', 'Execution Only')}
                </button>
              </div>
            </div>
          </div>

          {/* Chapel Quick Status Strip */}
          {councilView === 'all_combined' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-1">
              {chapelList.map((ch) => {
                const counts = liveAgg.chapelFilledCounts[ch] || { planCount: 0, execCount: 0 };
                const cnt = metricView === 'execution' ? counts.execCount : counts.planCount;
                const hasData = counts.planCount > 0 || counts.execCount > 0;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedInspectChapel(ch);
                      setCouncilView('per_chapel');
                    }}
                    className={`text-left px-2.5 py-2 rounded-xl border transition cursor-pointer ${
                      hasData
                        ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400'
                        : 'bg-slate-50 border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold text-slate-900 truncate">
                      {chapelLabel(ch)}
                    </div>
                    <div
                      className={`text-[10px] font-bold tabular-nums mt-0.5 ${
                        hasData ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {hasData
                        ? `ዕ:${counts.planCount} · ክ:${counts.execCount}`
                        : cnt > 0
                        ? `${cnt}`
                        : t('አልተሞላም', 'Empty')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Individual Chapel Selector Bar */}
          {councilView === 'per_chapel' && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {chapelList.map((ch) => {
                const counts = liveAgg.chapelFilledCounts[ch] || { planCount: 0, execCount: 0 };
                const active = selectedInspectChapel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedInspectChapel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-amber-700 text-white border-amber-700'
                        : counts.planCount > 0 || counts.execCount > 0
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{chapelLabel(ch)}</span>
                    <span className={`text-[10px] tabular-nums ${active ? 'text-amber-100' : 'text-slate-500'}`}>
                      (ዕ:{counts.planCount} / ክ:{counts.execCount})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Action Toolbar */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
              በ{currentYear} ዓ.ም የብ/ከ/ቃ/ሕ/ቤ/ክ የመንፈሳዊ ዘርፍ ዕቅድ —{' '}
              <span className="text-sky-800">{activeContextLabel}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {isReadOnlyTable
                ? t(
                    `ከ${chapelList.length} ቻፕሎች ${aggregatedData.filledChapels.length}ቱ ዕቅድ ሞልተዋል · በየተግባሩ ረድፍ ላይ በመጫን የእያንዳንዱን ቻፕል ድርሻ ይመልከቱ።`,
                    `${aggregatedData.filledChapels.length} of ${chapelList.length} chapels reported · Click any row to expand individual chapel breakdown.`
                  )
                : t(
                    `የተሞሉ ተግባራት፦ ${filledRowsInActive} / ${SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.length} · ለውጦች በራሱ ይቀመጣሉ።`,
                    `Populated rows: ${filledRowsInActive} / ${SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.length} · Changes auto-save.`
                  )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {mode === 'spiritual_council' && councilView === 'all_combined' && allExpandableAggCodes.length > 0 && (
              <button
                type="button"
                onClick={toggleExpandAllAgg}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>
                  {isAllAggExpanded ? t('የቻፕሎችን ዝርዝር ሰብስብ', 'Collapse Breakdown') : t('የየቻፕሉን ዝርዝር ክፈት', 'Expand All Chapels')}
                </span>
              </button>
            )}

            {!isReadOnlyTable && (mode === 'chapel' || councilView === 'per_chapel') && churchMembers.length > 0 && (
              <button
                type="button"
                onClick={handleAutoFillSection1FromRegistry}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('1.1–1.4 ከመዝገብ ሙላ', 'Fill 1.1–1.4 from Registry')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isReadOnlyTable
                  ? t('የሁሉም ቻፕሎች Excel አውርድ', 'Export All Chapels Excel')
                  : t('የዕቅድ Excel ቅጽ አውርድ', 'Download Excel Template')}
              </span>
            </button>

            <label
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-bold cursor-pointer ${
                isImporting ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>
                {isReadOnlyTable
                  ? t('ከExcel ተቀበል (ብዙ ቻፕል)', 'Import Multi-Chapel Excel')
                  : t('ከExcel ዕቅድ ተቀበል', 'Import from Excel')}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
                onChange={handleExcelUpload}
                className="sr-only"
              />
            </label>

            <ExportPhotoButton
              targetRef={sheetExportRef}
              fileName={`የ2019_መንፈሳዊ_ዘርፍ_ቋሚ_ዕቅድ_${activeContextLabel}_${currentYear}`}
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>

            {mode === 'chapel' && onSendToSpiritual && chapelName && (
              <button
                type="button"
                onClick={handleSubmitChapelPlanToSpiritual}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('ለመንፈሳዊ ዘርፍ ላክ', 'Submit to Spiritual Council')}</span>
              </button>
            )}
          </div>
        </div>

        {noticeMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
        )}
      </section>

      {/* Main Master Plan Spreadsheet Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-extrabold">
                <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200 w-16">
                  ተ.ቁ
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[270px]">
                  ዝርዝር ተግባራት
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 text-left border-r border-slate-200 w-28">
                  መለኪያ
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200 w-24 bg-blue-50/70 text-blue-950">
                  {mode === 'spiritual_council' && metricView === 'both'
                    ? 'የዓመት (ዕ/ክ)'
                    : mode === 'spiritual_council' && metricView === 'execution'
                    ? 'የዓመት ክንውን'
                    : 'የዓመት ዕቅድ'}
                </th>
                <th colSpan={2} className="py-1.5 px-2 text-center border-r border-b border-slate-200 bg-sky-50/70 text-sky-950">
                  {mode === 'spiritual_council' && metricView === 'both'
                    ? 'የግማሽ ዓመት (ዕ/ክ)'
                    : mode === 'spiritual_council' && metricView === 'execution'
                    ? 'የግማሽ ዓመት ክንውን'
                    : 'የግማሽ ዓመት'}
                </th>
                <th colSpan={4} className="py-1.5 px-2 text-center border-r border-b border-slate-200 bg-amber-50/70 text-amber-950">
                  {mode === 'spiritual_council' && metricView === 'both'
                    ? 'የሩብ ዓመት (ዕ/ክ)'
                    : mode === 'spiritual_council' && metricView === 'execution'
                    ? 'የሩብ ዓመት ክንውን'
                    : 'የሩብ ዓመት ዕቅድ'}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-left min-w-[160px]">
                  ምርመራ
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                <th className="py-1.5 px-2 text-center border-r border-slate-200 w-20 bg-sky-50/40">
                  1ኛ
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200 w-20 bg-sky-50/40">
                  2ኛ
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200 w-16 bg-amber-50/40">
                  1ኛ
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200 w-16 bg-amber-50/40">
                  2ኛ
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200 w-16 bg-amber-50/40">
                  3ኛ
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200 w-16 bg-amber-50/40">
                  4ኛ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SPIRITUAL_MASTER_PLAN_ITEMS.map((item) => {
                if (item.isSection) {
                  return (
                    <tr key={item.code} className="bg-slate-100/90 border-y border-slate-200">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 border-r border-slate-200">
                        {item.code}
                      </td>
                      <td colSpan={10} className="py-2.5 px-3 font-extrabold text-slate-900">
                        {item.task}
                      </td>
                    </tr>
                  );
                }

                const rv = activeSheet.rows[item.code] || {
                  yearPlan: '',
                  half1: '',
                  half2: '',
                  q1: '',
                  q2: '',
                  q3: '',
                  q4: '',
                  remarks: ''
                };
                const ev = activeExecSheet.rows[item.code] || {
                  yearPlan: '',
                  half1: '',
                  half2: '',
                  q1: '',
                  q2: '',
                  q3: '',
                  q4: '',
                  remarks: ''
                };
                const showBothInline = mode === 'spiritual_council' && metricView === 'both';
                const canExpandChapels = mode === 'spiritual_council' && councilView === 'all_combined';
                const reportingCount = canExpandChapels
                  ? aggregatedData.reportingChapelCountByCode[item.code] || 0
                  : 0;
                const chapelBreakdowns = canExpandChapels
                  ? aggregatedData.chapelValuesByCode[item.code] || []
                  : [];
                const isExpanded = canExpandChapels && expandedAggCodes.has(item.code);

                const formatMetricCell = (
                  planVal: string | number | undefined,
                  execVal: string | number | undefined
                ) => {
                  const pStr = planVal ? `${toNum(planVal).toLocaleString()}${item.isPercentage ? '%' : ''}` : '—';
                  const eStr = execVal ? `${toNum(execVal).toLocaleString()}${item.isPercentage ? '%' : ''}` : '—';
                  if (showBothInline) {
                    return (
                      <span className="whitespace-nowrap">
                        <span className="text-slate-500 font-semibold">{pStr}</span>
                        <span className="text-slate-300 mx-0.5">/</span>
                        <strong className="text-emerald-800">{eStr}</strong>
                      </span>
                    );
                  }
                  if (metricView === 'execution') {
                    return <strong className="text-emerald-800">{eStr}</strong>;
                  }
                  return pStr;
                };

                return (
                  <React.Fragment key={item.code}>
                    <tr
                      onClick={() => {
                        if (canExpandChapels && chapelBreakdowns.length > 0) {
                          toggleExpandAggCode(item.code);
                        }
                      }}
                      className={`${
                        item.isSectionTotal ? 'bg-blue-50/40 font-bold' : 'hover:bg-slate-50/80'
                      } ${canExpandChapels && chapelBreakdowns.length > 0 ? 'cursor-pointer' : ''}`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-600 border-r border-slate-100 tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {canExpandChapels && chapelBreakdowns.length > 0 ? (
                            isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )
                          ) : null}
                          <span>{item.code}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <span>{item.task}</span>
                          {canExpandChapels && reportingCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 tabular-nums">
                              {reportingCount} {t('ቻፕል', 'ch')}
                              {item.isPercentage ? ` · ${t('አማካይ', 'avg')}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 border-r border-slate-100 text-[11px]">
                        {item.unit}
                      </td>

                      {isReadOnlyTable ? (
                        <>
                          <td className="py-2 px-2.5 text-right font-extrabold text-blue-950 bg-blue-50/25 border-r border-slate-100 tabular-nums">
                            {formatMetricCell(rv.yearPlan, ev.yearPlan)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-sky-900 bg-sky-50/20 border-r border-slate-100 tabular-nums">
                            {formatMetricCell(rv.half1, ev.half1)}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-sky-900 bg-sky-50/20 border-r border-slate-100 tabular-nums">
                            {formatMetricCell(rv.half2, ev.half2)}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-700 border-r border-slate-100 tabular-nums">
                            {formatMetricCell(rv.q1, ev.q1)}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-700 border-r border-slate-100 tabular-nums">
                            {formatMetricCell(rv.q2, ev.q2)}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-700 border-r border-slate-100 tabular-nums">
                            {formatMetricCell(rv.q3, ev.q3)}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-700 border-r border-slate-100 tabular-nums">
                            {formatMetricCell(rv.q4, ev.q4)}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-600">
                            {rv.remarks || '—'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 px-1.5 border-r border-slate-100 bg-blue-50/20">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={rv.yearPlan}
                              onChange={(e) => handleCellChange(item.code, 'yearPlan', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-right font-extrabold text-blue-950 bg-white tabular-nums text-base sm:text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-1.5 border-r border-slate-100 bg-sky-50/15">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={rv.half1}
                              onChange={(e) => handleCellChange(item.code, 'half1', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-right font-bold text-sky-900 bg-white tabular-nums text-base sm:text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-1.5 border-r border-slate-100 bg-sky-50/15">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={rv.half2}
                              onChange={(e) => handleCellChange(item.code, 'half2', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-right font-bold text-sky-900 bg-white tabular-nums text-base sm:text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-1 border-r border-slate-100">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={rv.q1}
                              onChange={(e) => handleCellChange(item.code, 'q1', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-right text-slate-800 bg-white tabular-nums text-base sm:text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-1 border-r border-slate-100">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={rv.q2}
                              onChange={(e) => handleCellChange(item.code, 'q2', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-right text-slate-800 bg-white tabular-nums text-base sm:text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-1 border-r border-slate-100">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={rv.q3}
                              onChange={(e) => handleCellChange(item.code, 'q3', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-right text-slate-800 bg-white tabular-nums text-base sm:text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-1 border-r border-slate-100">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={rv.q4}
                              onChange={(e) => handleCellChange(item.code, 'q4', e.target.value)}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg text-right text-slate-800 bg-white tabular-nums text-base sm:text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={rv.remarks || ''}
                              onChange={(e) => handleCellChange(item.code, 'remarks', e.target.value)}
                              placeholder="ምርመራ..."
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-slate-700 bg-white text-base sm:text-xs"
                            />
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Expanded Per-Chapel Breakdown in Consolidated Mode */}
                    {isExpanded && chapelBreakdowns.length > 0 && (
                      <tr className="bg-sky-50/40">
                        <td colSpan={11} className="p-3 pl-8 sm:pl-12">
                          <div className="bg-white border border-sky-200 rounded-xl overflow-hidden">
                            <div className="px-3 py-1.5 bg-sky-100/70 text-[11px] font-extrabold text-sky-950 flex items-center justify-between">
                              <span>
                                {item.code} {item.task.replace(/^-+\s*/, '')} — የየቻፕሉ ዝርዝር
                              </span>
                              <span>{chapelBreakdowns.length} ቻፕሎች</span>
                            </div>
                            <table className="w-full text-[11px] border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                  <th className="py-1.5 px-3 text-left">ቻፕል</th>
                                  <th className="py-1.5 px-2 text-right">የዓመት ዕቅድ</th>
                                  <th className="py-1.5 px-2 text-right">1ኛ ግማሽ</th>
                                  <th className="py-1.5 px-2 text-right">2ኛ ግማሽ</th>
                                  <th className="py-1.5 px-2 text-right">1ኛ ሩብ</th>
                                  <th className="py-1.5 px-2 text-right">2ኛ ሩብ</th>
                                  <th className="py-1.5 px-2 text-right">3ኛ ሩብ</th>
                                  <th className="py-1.5 px-2 text-right">4ኛ ሩብ</th>
                                  <th className="py-1.5 px-3 text-left">ምርመራ</th>
                                  <th className="py-1.5 px-2 text-right print:hidden">ገጽ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {chapelBreakdowns.map((cb) => {
                                  const execCb = liveAgg.execAggregated.chapelValuesByCode[item.code]?.find(
                                    (e) => e.chapel === cb.chapel
                                  )?.values;
                                  return (
                                    <tr key={`${item.code}_${cb.chapel}`}>
                                      <td className="py-1.5 px-3 font-bold text-slate-900">
                                        {chapelLabel(cb.chapel)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-extrabold text-blue-900 tabular-nums">
                                        {formatMetricCell(cb.values.yearPlan, execCb?.yearPlan)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
                                        {formatMetricCell(cb.values.half1, execCb?.half1)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
                                        {formatMetricCell(cb.values.half2, execCb?.half2)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                        {formatMetricCell(cb.values.q1, execCb?.q1)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                        {formatMetricCell(cb.values.q2, execCb?.q2)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                        {formatMetricCell(cb.values.q3, execCb?.q3)}
                                      </td>
                                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                        {formatMetricCell(cb.values.q4, execCb?.q4)}
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-600">
                                        {cb.values.remarks || '—'}
                                      </td>
                                      <td className="py-1.5 px-2 text-right print:hidden">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedInspectChapel(cb.chapel);
                                            setCouncilView('per_chapel');
                                          }}
                                          className="text-[10px] font-bold text-sky-800 hover:underline cursor-pointer"
                                        >
                                          ክፈት
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Narrative Sections ሀ - ሠ */}
      {isReadOnlyTable ? (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
              {t('ከቻፕሎች የቀረቡ ማብራሪያዎች (ሀ – ሠ)', 'Consolidated Narrative Notes Across Chapels (ሀ – ሠ)')}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'የተከናወኑ ሌሎች ተግባራት፣ ችግሮች፣ መፍትሔዎች፣ ምስጋና እና ጸሎት ከየቻፕሉ',
                'Other activities, challenges, solutions, thanksgiving, and prayer items submitted by chapels'
              )}
            </p>
          </div>
          {aggregatedData.consolidatedNarrativesByChapel.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
              {t('እስካሁን ከቻፕሎች የተሞሉ ተጨማሪ ማብራሪያዎች የሉም።', 'No chapel narrative notes recorded yet.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aggregatedData.consolidatedNarrativesByChapel.map((entry) => (
                <div
                  key={entry.chapel}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-900">{chapelLabel(entry.chapel)}</span>
                    {entry.signOff.reporterName && (
                      <span className="text-[11px] text-slate-500">
                        አቅራቢ፦ {entry.signOff.reporterName}
                      </span>
                    )}
                  </div>
                  {NARRATIVE_SECTION_META.map((sec) => {
                    const filled = (entry.narratives[sec.key] || []).filter((l) => l.trim() !== '');
                    if (filled.length === 0) return null;
                    return (
                      <div key={sec.key}>
                        <div className="font-bold text-slate-800">
                          {sec.prefix} {sec.labelAm}
                        </div>
                        <ul className="list-disc pl-5 text-slate-600 space-y-0.5 mt-0.5">
                          {filled.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {NARRATIVE_SECTION_META.map((sec) => {
              const lines = activeSheet.narratives[sec.key] || [];
              return (
                <div key={sec.key} className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {sec.prefix} {sec.labelAm}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleAddNarrativeLine(sec.key)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer print:hidden"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('መስመር ጨምር', 'Add Line')}</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-5 shrink-0 text-right tabular-nums">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleNarrativeLineChange(sec.key, idx, e.target.value)}
                          placeholder="........................................................"
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-base sm:text-xs text-slate-800 bg-slate-50/50 focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reporter & Receiver Sign-off Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="font-extrabold text-slate-900">የሪፖርት አቅራቢ መረጃ</div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">የሪፖርት አቅራቢ ስም፡</label>
                <input
                  type="text"
                  value={activeSheet.signOff.reporterName || ''}
                  onChange={(e) => handleSignOffChange('reporterName', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ፊርማ፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.reporterSignature || ''}
                    onChange={(e) => handleSignOffChange('reporterSignature', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ቀን፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.reporterDate || ''}
                    onChange={(e) => handleSignOffChange('reporterDate', e.target.value)}
                    placeholder="ቀን/ወር/ዓ.ም"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="font-extrabold text-slate-900">የሪፖርት ተቀባይ መረጃ</div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">የሪፖርት ተቀባይ ስም፡</label>
                <input
                  type="text"
                  value={activeSheet.signOff.receiverName || ''}
                  onChange={(e) => handleSignOffChange('receiverName', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ፊርማ፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.receiverSignature || ''}
                    onChange={(e) => handleSignOffChange('receiverSignature', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">ቀን፡</label>
                  <input
                    type="text"
                    value={activeSheet.signOff.receiverDate || ''}
                    onChange={(e) => handleSignOffChange('receiverDate', e.target.value)}
                    placeholder="ቀን/ወር/ዓ.ም"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-base sm:text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
