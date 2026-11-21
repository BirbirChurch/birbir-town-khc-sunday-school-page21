import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AnnualPlanItem } from '../types';
import { generateUniqueId } from './idGenerator';
import { AppLanguage } from './i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PlanPeriodKey = 'year' | 'half' | 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4';

export const PLAN_PERIOD_META: Record<
  PlanPeriodKey,
  { am: string; en: string; shortAm: string; shortEn: string }
> = {
  year: {
    am: 'የዓመት ዕቅድ (ሙሉ ዓመት)',
    en: 'Full Year (Annual)',
    shortAm: 'ሙሉ ዓመት',
    shortEn: 'Annual'
  },
  half: {
    am: 'ግማሽ ዓመት (1ኛ + 2ኛ ሩብ ዓመት)',
    en: 'Half Year (H1)',
    shortAm: 'ግማሽ ዓመት',
    shortEn: 'Half Year'
  },
  h1: {
    am: '1ኛ ግማሽ ዓመት (Q1 + Q2)',
    en: '1st Half-Year (Q1 + Q2)',
    shortAm: '1ኛ ግማሽ',
    shortEn: 'H1 (Q1–Q2)'
  },
  h2: {
    am: '2ኛ ግማሽ ዓመት (Q3 + Q4)',
    en: '2nd Half-Year (Q3 + Q4)',
    shortAm: '2ኛ ግማሽ',
    shortEn: 'H2 (Q3–Q4)'
  },
  q1: {
    am: '1ኛ ሩብ ዓመት (ሐምሌ–መስከረም)',
    en: '1st Quarter (Q1)',
    shortAm: '1ኛ ሩብ',
    shortEn: 'Q1'
  },
  q2: {
    am: '2ኛ ሩብ ዓመት (ጥቅምት–ታህሳስ)',
    en: '2nd Quarter (Q2)',
    shortAm: '2ኛ ሩብ',
    shortEn: 'Q2'
  },
  q3: {
    am: '3ኛ ሩብ ዓመት (ጥር–መጋቢት)',
    en: '3rd Quarter (Q3)',
    shortAm: '3ኛ ሩብ',
    shortEn: 'Q3'
  },
  q4: {
    am: '4ኛ ሩብ ዓመት (ሚያዝያ–ሰኔ)',
    en: '4th Quarter (Q4)',
    shortAm: '4ኛ ሩብ',
    shortEn: 'Q4'
  }
};

export const splitAnnualAcrossQuarters = (annualTotal: number): [number, number, number, number] => {
  const safe = Math.max(0, Math.round(Number(annualTotal) || 0));
  if (safe === 0) return [0, 0, 0, 0];
  const base = Math.floor(safe / 4);
  const rem = safe % 4;
  return [
    base + (rem > 0 ? 1 : 0),
    base + (rem > 1 ? 1 : 0),
    base + (rem > 2 ? 1 : 0),
    base
  ];
};

export const ensureQuartersOnPlan = (item: AnnualPlanItem): AnnualPlanItem => {
  const yPlan = Math.max(0, Number(item.yearPlan) || 0);
  const qSum =
    (Number(item.q1Plan) || 0) +
    (Number(item.q2Plan) || 0) +
    (Number(item.q3Plan) || 0) +
    (Number(item.q4Plan) || 0);

  if (yPlan > 0 && qSum === 0) {
    const [q1, q2, q3, q4] = splitAnnualAcrossQuarters(yPlan);
    return { ...item, q1Plan: q1, q2Plan: q2, q3Plan: q3, q4Plan: q4 };
  }
  return item;
};

export const getPlanTargetForPeriod = (item: AnnualPlanItem, period: PlanPeriodKey): number => {
  const normalized = ensureQuartersOnPlan(item);
  const q1 = Number(normalized.q1Plan) || 0;
  const q2 = Number(normalized.q2Plan) || 0;
  const q3 = Number(normalized.q3Plan) || 0;
  const q4 = Number(normalized.q4Plan) || 0;
  const y = Number(normalized.yearPlan) || q1 + q2 + q3 + q4;

  switch (period) {
    case 'year':
      return y;
    case 'half':
    case 'h1':
      return q1 + q2 || Math.round(y / 2);
    case 'h2':
      return q3 + q4 || Math.max(0, y - Math.round(y / 2));
    case 'q1':
      return q1;
    case 'q2':
      return q2;
    case 'q3':
      return q3;
    case 'q4':
      return q4;
  }
};

export const getPlanDoneForPeriod = (item: AnnualPlanItem, period: PlanPeriodKey): number => {
  const d1 = Number(item.q1Done) || 0;
  const d2 = Number(item.q2Done) || 0;
  const d3 = Number(item.q3Done) || 0;
  const d4 = Number(item.q4Done) || 0;

  switch (period) {
    case 'year':
      return d1 + d2 + d3 + d4;
    case 'half':
    case 'h1':
      return d1 + d2;
    case 'h2':
      return d3 + d4;
    case 'q1':
      return d1;
    case 'q2':
      return d2;
    case 'q3':
      return d3;
    case 'q4':
      return d4;
  }
};

export const generateNextYearPlans = (
  items: AnnualPlanItem[],
  selectedIds: Set<number>,
  growthPercent: 10 | 15 | 20
): AnnualPlanItem[] => {
  const multiplier = 1 + growthPercent / 100;
  return items
    .filter((item) => selectedIds.has(item.id))
    .map((raw) => {
      const item = ensureQuartersOnPlan(raw);
      const baseYear = Number(item.yearPlan) || 0;
      const grownYear = baseYear > 0 ? Math.max(baseYear + 1, Math.round(baseYear * multiplier)) : 1;

      const q1Raw = Number(item.q1Plan) || 0;
      const q2Raw = Number(item.q2Plan) || 0;
      const q3Raw = Number(item.q3Plan) || 0;
      const q4Raw = Number(item.q4Plan) || 0;

      let q1 = Math.round(q1Raw * multiplier);
      let q2 = Math.round(q2Raw * multiplier);
      let q3 = Math.round(q3Raw * multiplier);
      let q4 = Math.round(q4Raw * multiplier);

      if (q1 + q2 + q3 + q4 === 0) {
        [q1, q2, q3, q4] = splitAnnualAcrossQuarters(grownYear);
      } else {
        const diff = grownYear - (q1 + q2 + q3 + q4);
        if (diff !== 0) {
          q4 = Math.max(0, q4 + diff);
        }
      }

      return {
        id: generateUniqueId(),
        task: item.task,
        unit: item.unit,
        yearPlan: grownYear,
        q1Plan: q1,
        q2Plan: q2,
        q3Plan: q3,
        q4Plan: q4,
        q1Done: 0,
        q2Done: 0,
        q3Done: 0,
        q4Done: 0,
        role: item.role
      };
    });
};

export const buildPlanPeriodSummaryText = (
  items: AnnualPlanItem[],
  unitName: string,
  year: string,
  period: PlanPeriodKey,
  mode: 'plan' | 'execution',
  lang: AppLanguage
): string => {
  const pLabel = lang === 'en' ? PLAN_PERIOD_META[period].en : PLAN_PERIOD_META[period].am;
  const totalTarget = items.reduce((s, it) => s + getPlanTargetForPeriod(it, period), 0);
  const totalDone = items.reduce((s, it) => s + getPlanDoneForPeriod(it, period), 0);
  const pct = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

  const header =
    lang === 'en'
      ? `${unitName} — ${mode === 'execution' ? 'Execution Report' : 'Action Plan'} (${year} E.C.) · Period: ${pLabel}`
      : `${unitName} — ${mode === 'execution' ? 'የክንውን ሪፖርት' : 'የአገልግሎት ዕቅድ'} (${year} ዓ/ም) · ወቅት፦ ${pLabel}`;

  const totalsLine =
    mode === 'execution'
      ? lang === 'en'
        ? `Total Planned: ${totalTarget} | Executed: ${totalDone} | Achievement: ${pct}%`
        : `ጠቅላላ ዕቅድ፦ ${totalTarget} | ክንውን፦ ${totalDone} | አፈጻጸም፦ ${pct}%`
      : lang === 'en'
      ? `Total Activities: ${items.length} | Planned Target (${pLabel}): ${totalTarget}`
      : `ጠቅላላ ተግባራት፦ ${items.length} | የ${pLabel} ዕቅድ ድምር፦ ${totalTarget}`;

  const lines = items.slice(0, 35).map((it, idx) => {
    const target = getPlanTargetForPeriod(it, period);
    const done = getPlanDoneForPeriod(it, period);
    if (mode === 'execution') {
      const rowPct = target > 0 ? Math.round((done / target) * 100) : 0;
      return `${idx + 1}. ${it.task} (${it.unit}) — ${lang === 'en' ? 'Plan' : 'ዕቅድ'}: ${target}, ${lang === 'en' ? 'Done' : 'ክንውን'}: ${done} (${rowPct}%)`;
    }
    return `${idx + 1}. ${it.task} (${it.unit}) — ${lang === 'en' ? 'Target' : 'ዕቅድ'}: ${target}${it.role ? ` [${it.role}]` : ''}`;
  });

  return [header, totalsLine, '', ...lines].join('\n');
};

// ---------------- File Parsers (Excel / CSV / PDF / Word .docx) ----------------

const extractFirstNumber = (text: string): number | null => {
  if (!text) return null;
  const cleaned = String(text).replace(/,/g, '');
  const m = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const val = parseFloat(m[1]);
  return isNaN(val) ? null : val;
};

const isHeaderOrNoiseRow = (cells: string[]): boolean => {
  const joined = cells.join(' ').toLowerCase().trim();
  if (!joined || joined.length < 2) return true;
  if (
    (joined.includes('ተ.ቁ') || joined.includes('no.') || joined.includes('s/n')) &&
    (joined.includes('ተግባር') || joined.includes('task') || joined.includes('activity') || joined.includes('ዕቅድ'))
  ) {
    return true;
  }
  if (joined.startsWith('ድምር') || joined.startsWith('ጠቅላላ') || joined === 'total') {
    return true;
  }
  return false;
};

export const rowsToAnnualPlanItems = (
  rows: string[][],
  defaultRole: string,
  planYear?: string
): AnnualPlanItem[] => {
  const items: AnnualPlanItem[] = [];
  if (!rows || rows.length === 0) return items;

  // Detect column header mapping if present in first 4 rows
  let headerIdx = -1;
  let colTask = -1;
  let colUnit = -1;
  let colYear = -1;
  let colQ1 = -1;
  let colQ2 = -1;
  let colQ3 = -1;
  let colQ4 = -1;
  let colQ1Done = -1;
  let colQ2Done = -1;
  let colQ3Done = -1;
  let colQ4Done = -1;
  let colRole = -1;

  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r].map((c) => String(c || '').trim().toLowerCase());
    const taskIdx = row.findIndex(
      (h) =>
        h.includes('ተግባር') ||
        h.includes('ርዕስ') ||
        h.includes('task') ||
        h.includes('activity') ||
        h.includes('description') ||
        h.includes('plan item')
    );
    if (taskIdx !== -1) {
      headerIdx = r;
      colTask = taskIdx;
      colUnit = row.findIndex((h) => h.includes('መለኪያ') || h === 'unit' || h.includes('measure'));
      colYear = row.findIndex(
        (h) =>
          h.includes('ዓመት') ||
          h.includes('year') ||
          h.includes('annual') ||
          (h.includes('ዕቅድ') && !h.includes('1') && !h.includes('2') && !h.includes('3') && !h.includes('4') && !h.includes('ተግባር'))
      );
      colQ1 = row.findIndex((h) => h.includes('q1') || h.includes('1ኛ ሩብ') || h.includes('ሩብ 1'));
      colQ2 = row.findIndex((h) => h.includes('q2') || h.includes('2ኛ ሩብ') || h.includes('ሩብ 2'));
      colQ3 = row.findIndex((h) => h.includes('q3') || h.includes('3ኛ ሩብ') || h.includes('ሩብ 3'));
      colQ4 = row.findIndex((h) => h.includes('q4') || h.includes('4ኛ ሩብ') || h.includes('ሩብ 4'));
      colQ1Done = row.findIndex((h) => h.includes('q1done') || (h.includes('1ኛ') && h.includes('ክንውን')));
      colQ2Done = row.findIndex((h) => h.includes('q2done') || (h.includes('2ኛ') && h.includes('ክንውን')));
      colQ3Done = row.findIndex((h) => h.includes('q3done') || (h.includes('3ኛ') && h.includes('ክንውን')));
      colQ4Done = row.findIndex((h) => h.includes('q4done') || (h.includes('4ኛ') && h.includes('ክንውን')));
      colRole = row.findIndex((h) => h.includes('ኃላፊ') || h.includes('role') || h.includes('responsible') || h.includes('owner'));
      break;
    }
  }

  const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const rawCols = (rows[i] || []).map((c) => String(c ?? '').trim());
    if (rawCols.every((c) => !c)) continue;
    if (isHeaderOrNoiseRow(rawCols)) continue;

    let taskText = '';
    let unitText = 'በቁጥር';
    let yPlan = 0;
    let q1Plan = 0;
    let q2Plan = 0;
    let q3Plan = 0;
    let q4Plan = 0;
    let q1Done = 0;
    let q2Done = 0;
    let q3Done = 0;
    let q4Done = 0;
    let roleText = defaultRole;

    if (headerIdx >= 0 && colTask >= 0) {
      taskText = rawCols[colTask] || '';
      if (colUnit >= 0 && rawCols[colUnit]) unitText = rawCols[colUnit];
      if (colYear >= 0) yPlan = extractFirstNumber(rawCols[colYear]) ?? 0;
      if (colQ1 >= 0) q1Plan = extractFirstNumber(rawCols[colQ1]) ?? 0;
      if (colQ2 >= 0) q2Plan = extractFirstNumber(rawCols[colQ2]) ?? 0;
      if (colQ3 >= 0) q3Plan = extractFirstNumber(rawCols[colQ3]) ?? 0;
      if (colQ4 >= 0) q4Plan = extractFirstNumber(rawCols[colQ4]) ?? 0;
      if (colQ1Done >= 0) q1Done = extractFirstNumber(rawCols[colQ1Done]) ?? 0;
      if (colQ2Done >= 0) q2Done = extractFirstNumber(rawCols[colQ2Done]) ?? 0;
      if (colQ3Done >= 0) q3Done = extractFirstNumber(rawCols[colQ3Done]) ?? 0;
      if (colQ4Done >= 0) q4Done = extractFirstNumber(rawCols[colQ4Done]) ?? 0;
      if (colRole >= 0 && rawCols[colRole]) roleText = rawCols[colRole];
    } else {
      // Heuristic column parsing when headers are omitted
      const nonEmpty = rawCols.filter(Boolean);
      if (nonEmpty.length === 0) continue;
      // Skip leading serial index if first cell is purely small integer
      let offset = /^\d{1,3}\.?$/.test(nonEmpty[0]) && nonEmpty.length >= 2 ? 1 : 0;
      taskText = nonEmpty[offset] || '';
      const rest = nonEmpty.slice(offset + 1);

      const numericVals: number[] = [];
      const textVals: string[] = [];
      rest.forEach((cell) => {
        if (/^\d+(?:[.,]\d+)?$/.test(cell.replace(/,/g, ''))) {
          numericVals.push(parseFloat(cell.replace(/,/g, '')));
        } else {
          textVals.push(cell);
        }
      });

      if (textVals.length >= 1) unitText = textVals[0];
      if (textVals.length >= 2) roleText = textVals[textVals.length - 1];

      if (numericVals.length >= 5) {
        yPlan = numericVals[0];
        q1Plan = numericVals[1];
        q2Plan = numericVals[2];
        q3Plan = numericVals[3];
        q4Plan = numericVals[4];
      } else if (numericVals.length >= 1) {
        yPlan = numericVals[0];
      }
    }

    taskText = taskText.replace(/^[\d.)\-•*\s]+/, '').trim();
    if (!taskText || taskText.length < 2) continue;

    const qTotal = q1Plan + q2Plan + q3Plan + q4Plan;
    if (yPlan <= 0 && qTotal > 0) {
      yPlan = qTotal;
    } else if (yPlan <= 0) {
      yPlan = 4;
    }

    if (qTotal === 0) {
      const [s1, s2, s3, s4] = splitAnnualAcrossQuarters(yPlan);
      q1Plan = s1;
      q2Plan = s2;
      q3Plan = s3;
      q4Plan = s4;
    }

    items.push({
      id: generateUniqueId(),
      ...(planYear ? { year: planYear } : {}),
      task: taskText,
      unit: unitText || 'በቁጥር',
      yearPlan: yPlan,
      q1Plan,
      q2Plan,
      q3Plan,
      q4Plan,
      q1Done,
      q2Done,
      q3Done,
      q4Done,
      role: roleText || defaultRole
    });
  }

  return items;
};

export const plainTextLinesToRows = (text: string): string[][] => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);

  const rows: string[][] = [];
  for (const line of lines) {
    // If tab, pipe, or multiple spaces separate columns, preserve columns
    if (line.includes('\t')) {
      rows.push(line.split('\t').map((c) => c.trim()));
      continue;
    }
    if (line.includes('|')) {
      rows.push(
        line
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
      );
      continue;
    }
    if (/\s{2,}/.test(line)) {
      rows.push(line.split(/\s{2,}/).map((c) => c.trim()));
      continue;
    }

    // Single prose/bullet line (e.g. "1. የወንጌል ስብከት ማካሄድ - 24 ጊዜ")
    const cleaned = line.replace(/^[\d.)\-•*\u2022]+\s*/, '').trim();
    if (!cleaned) continue;
    // Try extracting trailing target count (e.g., "24" or "12 በዙር")
    const countMatch = cleaned.match(/^(.*?)\s*[-:–—]?\s*(\d+)\s*(በቁጥር|በዙር|ጊዜ|ሰው|ቤተሰብ|ቀን|times|units?)?$/i);
    if (countMatch && countMatch[1].trim().length >= 3) {
      rows.push([
        countMatch[1].trim(),
        countMatch[3] || 'በቁጥር',
        countMatch[2]
      ]);
    } else {
      rows.push([cleaned, 'በቁጥር', '4']);
    }
  }
  return rows;
};

export const parseAnnualPlanFile = async (
  file: File,
  defaultRole: string,
  planYear?: string
): Promise<AnnualPlanItem[]> => {
  const lower = (file.name || '').toLowerCase();

  // 1. Excel / CSV
  if (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsm') ||
    lower.endsWith('.xlsb') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.ods')
  ) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) return [];
    const aoa = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' });
    return rowsToAnnualPlanItems(aoa, defaultRole, planYear);
  }

  // 2. Word (.docx)
  if (lower.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const htmlRes = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = htmlRes.value || '';

    // First look for HTML <table> elements in the Word document
    if (typeof DOMParser !== 'undefined' && html.includes('<table')) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const tables = Array.from(doc.querySelectorAll('table'));
      const tableRows: string[][] = [];
      tables.forEach((tbl) => {
        Array.from(tbl.querySelectorAll('tr')).forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('th, td')).map(
            (cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim()
          );
          if (cells.some(Boolean)) tableRows.push(cells);
        });
      });
      const parsedFromTables = rowsToAnnualPlanItems(tableRows, defaultRole, planYear);
      if (parsedFromTables.length > 0) return parsedFromTables;
    }

    // Fallback to raw paragraphs / bulleted items
    const rawRes = await mammoth.extractRawText({ arrayBuffer: buffer });
    const textRows = plainTextLinesToRows(rawRes.value || '');
    return rowsToAnnualPlanItems(textRows, defaultRole, planYear);
  }

  // 3. PDF (.pdf)
  if (lower.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const allRows: string[][] = [];

    for (let pageNo = 1; pageNo <= pdfDoc.numPages; pageNo++) {
      const page = await pdfDoc.getPage(pageNo);
      const content = await page.getTextContent();
      // Group text items by Y line position
      const lineMap = new Map<number, { x: number; text: string }[]>();
      content.items.forEach((rawItem: any) => {
        const text = String(rawItem?.str || '').trim();
        if (!text) return;
        const transform = rawItem?.transform || [1, 0, 0, 1, 0, 0];
        const x = Math.round(Number(transform[4]) || 0);
        const yBucket = Math.round((Number(transform[5]) || 0) / 4) * 4;
        const arr = lineMap.get(yBucket) || [];
        arr.push({ x, text });
        lineMap.set(yBucket, arr);
      });

      // PDF coordinates go bottom-up, so sort Y descending
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      sortedYs.forEach((y) => {
        const cells = (lineMap.get(y) || [])
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text);
        if (cells.length === 1) {
          plainTextLinesToRows(cells[0]).forEach((r) => allRows.push(r));
        } else if (cells.length > 1) {
          allRows.push(cells);
        }
      });
    }

    return rowsToAnnualPlanItems(allRows, defaultRole, planYear);
  }

  // 4. Plain text fallback
  const text = await file.text();
  return rowsToAnnualPlanItems(plainTextLinesToRows(text), defaultRole, planYear);
};
