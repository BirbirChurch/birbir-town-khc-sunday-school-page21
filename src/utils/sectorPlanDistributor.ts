import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AnnualPlanItem, OrgUnitId } from '../types';
import { CHURCH_ORG_UNITS, getOrgUnitById } from '../constants/churchStructure';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { normalizeAmharicSearchText, mapToOfficialChapelStrict } from './amharicSearchAndChapel';
import { rowsToAnnualPlanItems, plainTextLinesToRows } from './planParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface SectorMatchResult {
  unitId: OrgUnitId;
  unitName: string;
  chapel?: string;
  key: string;
}

export interface ParsedSectorPlanGroup {
  key: string;
  sourceLabel: string;
  targetUnitId: OrgUnitId | 'unassigned';
  targetUnitName: string;
  targetChapel?: string;
  plans: AnnualPlanItem[];
}

const buildKey = (unitId: OrgUnitId | 'unassigned', chapel?: string): string =>
  unitId === 'chapels_dept' && chapel ? `chapels_dept::${chapel}` : unitId;

const UNIT_MATCH_ALIASES: { unitId: OrgUnitId; keywords: string[] }[] = [
  { unitId: 'women_fellowship', keywords: ['የሴቶች መተሳሰብ', 'ሴቶች መተሳሰብ', 'women fellowship', 'ሴቶች ህብረት'] },
  { unitId: 'men_fellowship', keywords: ['የወንዶች መተሳሰብ', 'ወንዶች መተሳሰብ', 'men fellowship', 'ወንዶች ህብረት'] },
  { unitId: 'rehoboth_school', keywords: ['ርኆቦት ት/ቤት', 'ርሆቦት ት/ቤት', 'ርኆቦት ትምህርት', 'rehoboth school', 'አፀደ ሕፃናት'] },
  { unitId: 'bible_school', keywords: ['መጽሐፍ ቅዱስ ት/ቤት', 'መጽሀፍ ቅዱስ', 'bible school', 'theological', 'theology'] },
  { unitId: 'love_compassion', keywords: ['ፍቅርና ርኅራሄ', 'ፍቅርና ርህራሄ', 'ርኅራሄ', 'ርህራሄ', 'ፍቅር', 'compassion', 'charity'] },
  { unitId: 'development', keywords: ['ልማት', 'development'] },
  { unitId: 'children_ministry', keywords: ['ልጆች አገልግሎት', 'የልጆች', 'ሰንበት ት/ቤት', 'ሰንበት ትምህርት', 'children ministry', 'sunday school', 'children'] },
  { unitId: 'youth_ministry', keywords: ['ወጣቶች', 'ወጣት', 'youth ministry', 'youth'] },
  { unitId: 'women_ministry', keywords: ['ሴቶች አገልግሎት', 'የሴቶች አገልግሎት', 'የሴቶች ዘርፍ', 'women ministry', 'women'] },
  { unitId: 'deacons', keywords: ['ዲያቆናት', 'ዲያቆን', 'deacons', 'deacon'] },
  { unitId: 'evangelism', keywords: ['ወንጌል ስርጭት', 'ወንጌል', 'ተልዕኮ', 'evangelism', 'mission'] },
  { unitId: 'chapels_dept', keywords: ['አጥቢያ ቻፕሎች', 'ቻፕሎች', '10 ቻፕል', 'chapels', 'chapel hub'] },
  { unitId: 'admin_finance', keywords: ['አስተዳደርና ፋይናንስ', 'አስተዳደር', 'ፋይናንስ', 'ሰው ኃይል', 'ንብረት', 'admin', 'finance'] },
  { unitId: 'holistic_community', keywords: ['ሁለንተናዊ', 'ማህበረሰብ አገልግሎት', 'holistic'] },
  { unitId: 'spiritual_council', keywords: ['መንፈሳዊ ዘርፍ', 'spiritual council', 'spiritual sector'] },
  { unitId: 'office', keywords: ['ዋና ጽ/ቤት', 'ቤተክርስቲያን ጽ/ቤት', 'ጽ/ቤት', 'ጽህፈት ቤት', 'main office', 'office'] },
  { unitId: 'elders_council', keywords: ['ሽማግሌዎች', 'ሽማግሌ', 'elders council', 'elders'] }
];

export const matchSectorOrChapel = (rawLabel: string): SectorMatchResult | null => {
  const trimmed = String(rawLabel || '').trim();
  if (!trimmed || trimmed.length < 2) return null;

  const norm = normalizeAmharicSearchText(trimmed);
  const lower = trimmed.toLowerCase();

  // 1. Check explicit Org Unit numeric code prefix (e.g. "1.2.5", "1.1.2")
  const codeMatch = trimmed.match(/\b(\d+(?:\.\d+)*)\b/);
  if (codeMatch) {
    const byCode = CHURCH_ORG_UNITS.find((u) => u.code === codeMatch[1]);
    if (byCode) {
      return {
        unitId: byCode.id,
        unitName: byCode.name,
        key: buildKey(byCode.id)
      };
    }
  }

  // 2. Distinguish Rehoboth School vs Rehoboth Chapel first
  if (
    (norm.includes('ርሆቦት') || lower.includes('rehoboth')) &&
    (norm.includes('ት/ቤት') || norm.includes('ትምህርት') || lower.includes('school'))
  ) {
    const unit = getOrgUnitById('rehoboth_school')!;
    return { unitId: unit.id, unitName: unit.name, key: buildKey(unit.id) };
  }

  // 3. Check specific official Chapel names (all 10 chapels)
  const officialChapel = mapToOfficialChapelStrict(trimmed);
  if (officialChapel) {
    const chapelsUnit = getOrgUnitById('chapels_dept')!;
    return {
      unitId: 'chapels_dept',
      unitName: chapelsUnit.name,
      chapel: officialChapel,
      key: buildKey('chapels_dept', officialChapel)
    };
  }
  for (const ch of DEFAULT_CHAPELS) {
    const chBase = normalizeAmharicSearchText(ch.replace('ቻፕል', '').trim());
    if (chBase && norm.includes(chBase)) {
      const chapelsUnit = getOrgUnitById('chapels_dept')!;
      return {
        unitId: 'chapels_dept',
        unitName: chapelsUnit.name,
        chapel: ch,
        key: buildKey('chapels_dept', ch)
      };
    }
  }

  // 4. Exact / normalized match against CHURCH_ORG_UNITS names
  for (const u of CHURCH_ORG_UNITS) {
    const uNorm = normalizeAmharicSearchText(u.name);
    const shortClean = uNorm.replace(/^\d+(?:\.\d+)*\s*/, '').trim();
    if (norm === uNorm || norm === shortClean || (shortClean.length >= 4 && norm.includes(shortClean))) {
      return { unitId: u.id, unitName: u.name, key: buildKey(u.id) };
    }
  }

  // 5. Ordered keyword aliases (most specific phrases first)
  for (const entry of UNIT_MATCH_ALIASES) {
    const matched = entry.keywords.some((kw) => {
      const kwNorm = normalizeAmharicSearchText(kw);
      return norm.includes(kwNorm) || lower.includes(kw.toLowerCase());
    });
    if (matched) {
      const unit = getOrgUnitById(entry.unitId)!;
      return { unitId: unit.id, unitName: unit.name, key: buildKey(unit.id) };
    }
  }

  return null;
};

const isSectorHeaderName = (cell: string): boolean => {
  const h = String(cell || '').trim().toLowerCase();
  return (
    h.includes('ዘርፍ') ||
    h.includes('መምሪያ') ||
    h.includes('ክፍል') ||
    h.includes('ቻፕል') ||
    h.includes('አገልግሎት') ||
    h === 'sector' ||
    h === 'department' ||
    h === 'unit' ||
    h === 'chapel' ||
    h.includes('target unit')
  );
};

const isTaskHeaderName = (cell: string): boolean => {
  const h = String(cell || '').trim().toLowerCase();
  return (
    h.includes('ተግባር') ||
    h.includes('ርዕስ') ||
    h.includes('task') ||
    h.includes('activity') ||
    h.includes('description') ||
    h.includes('plan item')
  );
};

interface SectionChunk {
  sectorLabel: string;
  headerRow?: string[];
  rows: string[][];
}

/**
 * Splits a 2D row matrix into sector-grouped chunks if it contains either:
 *  (a) a dedicated Sector/Department/Chapel column, OR
 *  (b) inline section header rows naming a sector or chapel.
 */
const splitRowsBySectorColumnOrSections = (
  rows: string[][],
  fallbackSectorLabel: string
): SectionChunk[] => {
  const cleanRows = rows.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim()));
  if (cleanRows.length === 0) return [];

  // Detect header row within first 5 rows
  let headerRowIdx = -1;
  let sectorColIdx = -1;
  let taskColIdx = -1;

  for (let r = 0; r < Math.min(6, cleanRows.length); r++) {
    const cells = cleanRows[r].map((c) => String(c ?? '').trim());
    const tIdx = cells.findIndex(isTaskHeaderName);
    const sIdx = cells.findIndex((c, idx) => idx !== tIdx && isSectorHeaderName(c));
    if (tIdx !== -1) {
      headerRowIdx = r;
      taskColIdx = tIdx;
      sectorColIdx = sIdx;
      break;
    }
  }

  // Case A: Explicit Sector/Department/Chapel column exists!
  if (headerRowIdx >= 0 && sectorColIdx >= 0 && taskColIdx >= 0) {
    const headerCells = cleanRows[headerRowIdx].map((c) => String(c ?? '').trim());
    const reducedHeader = headerCells.filter((_, idx) => idx !== sectorColIdx);
    const grouped = new Map<string, string[][]>();
    let lastSector = fallbackSectorLabel;

    for (let i = headerRowIdx + 1; i < cleanRows.length; i++) {
      const row = cleanRows[i].map((c) => String(c ?? '').trim());
      const rawSectorCell = row[sectorColIdx] || '';
      const taskCell = row[taskColIdx] || '';

      // Skip repeated sub-headers
      if (isTaskHeaderName(taskCell) && isSectorHeaderName(rawSectorCell)) continue;

      if (rawSectorCell) {
        lastSector = rawSectorCell;
      }
      const sectorKey = rawSectorCell || lastSector || fallbackSectorLabel;
      const strippedRow = row.filter((_, idx) => idx !== sectorColIdx);
      if (!strippedRow.some(Boolean)) continue;

      const list = grouped.get(sectorKey) || [];
      list.push(strippedRow);
      grouped.set(sectorKey, list);
    }

    return Array.from(grouped.entries()).map(([sectorLabel, sRows]) => ({
      sectorLabel,
      headerRow: reducedHeader,
      rows: [reducedHeader, ...sRows]
    }));
  }

  // Case B: Look for inline section heading rows (e.g. a row with 1-2 cells matching a sector/chapel name)
  const chunks: SectionChunk[] = [];
  let currentLabel = fallbackSectorLabel;
  let activeHeaderRow: string[] | undefined =
    headerRowIdx >= 0 ? cleanRows[headerRowIdx].map((c) => String(c ?? '').trim()) : undefined;
  let currentRows: string[][] = activeHeaderRow ? [activeHeaderRow] : [];

  const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

  for (let i = startIdx; i < cleanRows.length; i++) {
    const cells = cleanRows[i].map((c) => String(c ?? '').trim());
    const nonEmpty = cells.filter(Boolean);
    if (nonEmpty.length === 0) continue;

    // Repeated table header inside same sheet/document
    if (cells.some(isTaskHeaderName)) {
      activeHeaderRow = cells;
      if (currentRows.length <= 1) {
        currentRows = [cells];
      }
      continue;
    }

    // Detect section banner row: 1 or 2 non-empty cells, no pure target numbers, matches a sector/chapel
    const hasNumericCell = nonEmpty.some((c) => /^\d+(?:[.,]\d+)?$/.test(c));
    if (nonEmpty.length <= 2 && !hasNumericCell) {
      const candidateText = nonEmpty.join(' ');
      const matched = matchSectorOrChapel(candidateText);
      if (matched) {
        if (currentRows.length > (activeHeaderRow ? 1 : 0)) {
          chunks.push({
            sectorLabel: currentLabel,
            headerRow: activeHeaderRow,
            rows: currentRows
          });
        }
        currentLabel = candidateText;
        currentRows = activeHeaderRow ? [activeHeaderRow] : [];
        continue;
      }
    }

    currentRows.push(cells);
  }

  if (currentRows.length > (activeHeaderRow ? 1 : 0)) {
    chunks.push({
      sectorLabel: currentLabel,
      headerRow: activeHeaderRow,
      rows: currentRows
    });
  }

  return chunks;
};

const addGroupItems = (
  map: Map<string, ParsedSectorPlanGroup>,
  sectorLabel: string,
  items: AnnualPlanItem[],
  planYear: string
) => {
  if (items.length === 0) return;
  const matched = matchSectorOrChapel(sectorLabel);
  const targetUnitId: OrgUnitId | 'unassigned' = matched ? matched.unitId : 'unassigned';
  const targetUnitName = matched
    ? matched.chapel
      ? `${matched.unitName} — ${matched.chapel}`
      : matched.unitName
    : sectorLabel || 'ያልተመደበ / አጠቃላይ ዕቅድ';
  const key = matched ? matched.key : `unassigned::${sectorLabel || 'general'}`;

  const stampedItems = items.map((it) => ({
    ...it,
    year: planYear,
    role: it.role || (matched?.chapel || matched?.unitName || it.role)
  }));

  const existing = map.get(key);
  if (existing) {
    existing.plans.push(...stampedItems);
  } else {
    map.set(key, {
      key,
      sourceLabel: sectorLabel || targetUnitName,
      targetUnitId,
      targetUnitName,
      targetChapel: matched?.chapel,
      plans: stampedItems
    });
  }
};

export const parseMasterPlanForSectors = async (
  file: File,
  planYear: string
): Promise<ParsedSectorPlanGroup[]> => {
  const lower = (file.name || '').toLowerCase();
  const groupMap = new Map<string, ParsedSectorPlanGroup>();

  // 1. Excel / CSV (supports multiple sheets AND/OR sector column AND/OR inline headings)
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

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
      if (!aoa || aoa.length === 0) continue;

      const sheetMatched = matchSectorOrChapel(sheetName);
      const chunks = splitRowsBySectorColumnOrSections(aoa, sheetMatched ? sheetName : sheetName);

      chunks.forEach((chunk) => {
        const matched = matchSectorOrChapel(chunk.sectorLabel);
        const defaultRole = matched?.chapel || matched?.unitName || chunk.sectorLabel || 'የዘርፉ አመራር';
        const parsed = rowsToAnnualPlanItems(chunk.rows, defaultRole, planYear);
        addGroupItems(groupMap, chunk.sectorLabel, parsed, planYear);
      });
    }

    return Array.from(groupMap.values());
  }

  // 2. Word (.docx)
  if (lower.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const htmlRes = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = htmlRes.value || '';

    if (typeof DOMParser !== 'undefined' && html.includes('<table')) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const tables = Array.from(doc.querySelectorAll('table'));

      tables.forEach((tbl, tblIdx) => {
        // Check preceding heading / paragraph right before this table for a sector label
        let headingLabel = `ክፍል ${tblIdx + 1}`;
        let prevEl: Element | null = tbl.previousElementSibling;
        for (let step = 0; step < 3 && prevEl; step++) {
          const txt = (prevEl.textContent || '').trim();
          if (txt && matchSectorOrChapel(txt)) {
            headingLabel = txt;
            break;
          }
          prevEl = prevEl.previousElementSibling;
        }

        const tableRows: string[][] = [];
        Array.from(tbl.querySelectorAll('tr')).forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) =>
            (cell.textContent || '').replace(/\s+/g, ' ').trim()
          );
          if (cells.some(Boolean)) tableRows.push(cells);
        });

        const chunks = splitRowsBySectorColumnOrSections(tableRows, headingLabel);
        chunks.forEach((chunk) => {
          const matched = matchSectorOrChapel(chunk.sectorLabel);
          const defaultRole = matched?.chapel || matched?.unitName || chunk.sectorLabel || 'የዘርፉ አመራር';
          const parsed = rowsToAnnualPlanItems(chunk.rows, defaultRole, planYear);
          addGroupItems(groupMap, chunk.sectorLabel, parsed, planYear);
        });
      });

      if (groupMap.size > 0) return Array.from(groupMap.values());
    }

    const rawRes = await mammoth.extractRawText({ arrayBuffer: buffer });
    const textRows = plainTextLinesToRows(rawRes.value || '');
    const chunks = splitRowsBySectorColumnOrSections(textRows, file.name);
    chunks.forEach((chunk) => {
      const matched = matchSectorOrChapel(chunk.sectorLabel);
      const defaultRole = matched?.chapel || matched?.unitName || 'የዘርፉ አመራር';
      const parsed = rowsToAnnualPlanItems(chunk.rows, defaultRole, planYear);
      addGroupItems(groupMap, chunk.sectorLabel, parsed, planYear);
    });
    return Array.from(groupMap.values());
  }

  // 3. PDF (.pdf)
  if (lower.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const allRows: string[][] = [];

    for (let pageNo = 1; pageNo <= pdfDoc.numPages; pageNo++) {
      const page = await pdfDoc.getPage(pageNo);
      const content = await page.getTextContent();
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

      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      sortedYs.forEach((y) => {
        const cells = (lineMap.get(y) || [])
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text);
        if (cells.length === 1) {
          const single = cells[0].trim();
          if (matchSectorOrChapel(single)) {
            allRows.push([single]);
          } else {
            plainTextLinesToRows(single).forEach((r) => allRows.push(r));
          }
        } else if (cells.length > 1) {
          allRows.push(cells);
        }
      });
    }

    const chunks = splitRowsBySectorColumnOrSections(allRows, file.name);
    chunks.forEach((chunk) => {
      const matched = matchSectorOrChapel(chunk.sectorLabel);
      const defaultRole = matched?.chapel || matched?.unitName || 'የዘርፉ አመራር';
      const parsed = rowsToAnnualPlanItems(chunk.rows, defaultRole, planYear);
      addGroupItems(groupMap, chunk.sectorLabel, parsed, planYear);
    });
    return Array.from(groupMap.values());
  }

  // 4. Plain text fallback
  const text = await file.text();
  const chunks = splitRowsBySectorColumnOrSections(plainTextLinesToRows(text), file.name);
  chunks.forEach((chunk) => {
    const matched = matchSectorOrChapel(chunk.sectorLabel);
    const defaultRole = matched?.chapel || matched?.unitName || 'የዘርፉ አመራር';
    const parsed = rowsToAnnualPlanItems(chunk.rows, defaultRole, planYear);
    addGroupItems(groupMap, chunk.sectorLabel, parsed, planYear);
  });
  return Array.from(groupMap.values());
};

export const downloadMasterPlanTemplateExcel = (planYear: string) => {
  const wb = XLSX.utils.book_new();

  const masterRows: (string | number)[][] = [
    [`የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን — የ${planYear} ዓ/ም የሁሉም ዘርፎች እና ቻፕሎች የተቀናጀ ዕቅድ ናሙና`],
    ['መመሪያ፦ በ"ዘርፍ / ቻፕል" አምድ ስር የዘርፉን ወይም የቻፕሉን ስም ያስገቡ (ወይም ለየዘርፉ በተለየ Sheet ይጻፉ)። ሲጭኑ ወደየዘርፉ ቋት በራስ-ሰር ይላካል።'],
    [],
    ['ዘርፍ / ቻፕል', 'ዋና ተግባር', 'መለኪያ', 'የዓመት ዕቅድ', '1ኛ ሩብ', '2ኛ ሩብ', '3ኛ ሩብ', '4ኛ ሩብ', 'ኃላፊ'],
    ['1.2.1 የወንጌል ስርጭትና ተልዕኮ አገልግሎት', 'የወንጌል ስርጭት ዘመቻ ማካሄድ', 'በዙር', 4, 1, 1, 1, 1, 'የወንጌል አገልግሎት ኮሚቴ'],
    ['1.2.2 የዲያቆናት አገልግሎት', 'የአባላት ቤት-ለቤት ጉብኝት እና እንክብካቤ', 'በቁጥር', 48, 12, 12, 12, 12, 'የዲያቆናት ጉባኤ'],
    ['1.2.3 የሴቶች አገልግሎት', 'የሴቶች የጸሎትና የቃል ጥናት ስብሰባ', 'በቁጥር', 24, 6, 6, 6, 6, 'የሴቶች አገልግሎት'],
    ['1.2.4 የወጣቶች አገልግሎት', 'የወጣቶች መንፈሳዊ ኮንፈረንስ', 'በዙር', 2, 0, 1, 0, 1, 'የወጣቶች አመራር'],
    ['1.2.5 የልጆች አገልግሎት', 'የሰንበት ትምህርት ቤት መምህራን ስልጠና', 'በዙር', 4, 1, 1, 1, 1, 'የልጆች አስተባባሪ'],
    ['1.2.7 የፍቅርና ርኅራሄ አገልግሎት', 'ለተቸገሩ ቤተሰቦች ድጋፍ ማድረግ', 'በቁጥር', 12, 3, 3, 3, 3, 'የርኅራሄ ኮሚቴ'],
    ['1.1.2 አስተዳደርና ፋይናንስ', 'የዓመታዊ በጀትና ንብረት ቆጠራ ማካሄድ', 'በዙር', 2, 0, 1, 0, 1, 'ፋይናንስና ንብረት'],
    ['ኤልሮኢ ቻፕል', 'የቻፕል የቤት ህብረቶች ክትትል', 'በቁጥር', 24, 6, 6, 6, 6, 'የኤልሮኢ ቻፕል መሪ']
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(masterRows), `የ${planYear}_ሁሉም_ዘርፎች`);

  // Also add individual sample sheets for key sectors so multi-sheet workbooks are demonstrated cleanly
  const sampleSheetHeader = ['ተ.ቁ', 'ዋና ተግባር', 'መለኪያ', 'የዓመት ዕቅድ', '1ኛ ሩብ', '2ኛ ሩብ', '3ኛ ሩብ', '4ኛ ሩብ', 'ኃላፊ'];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      sampleSheetHeader,
      [1, 'የወንጌል ተልዕኮ ቡድኖችን ማሰልጠን', 'በዙር', 4, 1, 1, 1, 1, 'ወንጌል አገልግሎት']
    ]),
    'ወንጌል ስርጭት'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      sampleSheetHeader,
      [1, 'የሰንበት ት/ቤት ልጆች ክትትል', 'በቁጥር', 40, 10, 10, 10, 10, 'ልጆች አገልግሎት']
    ]),
    'ልጆች አገልግሎት'
  );

  XLSX.writeFile(wb, `የ${planYear}_ዓም_የሁሉም_ዘርፎች_ዕቅድ_ናሙና.xlsx`);
};
