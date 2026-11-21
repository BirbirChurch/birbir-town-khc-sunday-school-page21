export type Role = 'admin' | 'children_coordinator' | 'youth_coordinator' | 'leader' | 'teacher';

export interface Teacher {
  id: number;
  name: string;
  assignedClass: string;
  assignedSubject?: string;
  pin: string;
  phone?: string;
  order?: number;
}

export interface Student {
  id: number;
  name: string;
  age: number | string;
  gender: string;
  m1: number; // Max 10
  m2: number; // Max 10
  m3: number; // Max 10
  m4: number; // Max 20
  m5: number; // Max 10
  m6: number; // Max 10
  m7: number; // Max 30
  total?: number;
  rank?: number;
  chapel?: string; // ቻፕል
  parentName?: string; // የወላጅ ስም
  phone?: string; // የወላጅ ስልክ
}

export interface AbsenteeRecord {
  id: number;
  date: string;
  className: string;
  studentName: string;
  gender: string;
  reason: string;
}

export interface ChoirMember {
  id: number;
  name: string;
  age: number | string;
  gender: string;
  group: string;
  phone?: string;
}

export interface SpiritualMember {
  id: number;
  name: string;
  age: number | string;
  gender: string;
  group: string;
}

export interface AnnualPlanItem {
  id: number;
  year?: string;
  task: string;
  unit: string;
  yearPlan: number | string;
  q1Plan: number | string;
  q2Plan: number | string;
  q3Plan: number | string;
  q4Plan: number | string;
  q1Done: number | string;
  q2Done: number | string;
  q3Done: number | string;
  q4Done: number | string;
  role: string;
}

export type WeeklyAttendanceStatus = 'P' | 'A' | 'E' | '';

export interface StudentWeekAttendanceMap {
  [weekNumber: number]: WeeklyAttendanceStatus;
}

export interface ClassWeeklyAttendanceMap {
  [studentId: string]: StudentWeekAttendanceMap;
}

export interface YearWeeklyAttendanceMap {
  [className: string]: ClassWeeklyAttendanceMap;
}

export interface WeeklyAttendanceData {
  [year: string]: YearWeeklyAttendanceMap;
}

export interface WeekDatesData {
  [year: string]: {
    [weekNumber: number]: string; // ISO date YYYY-MM-DD
  };
}

export interface ChurchChild {
  id: number;
  memberCode?: string; // የአባል መለያ ኮድ (ምሳሌ፦ ብከቃሕቤክኤልሮኢ 0001)
  familyCode?: string; // የቤተሰብ መለያ ኮድ
  name: string; // የልጁ ሙሉ ስም
  gender: 'ወ' | 'ሴ' | string; // ጾታ
  age: number | string; // ዕድሜ
  educationLevel?: string; // የትምህርት ደረጃ (e.g., ኬጂ፣ 1ኛ ክፍል፣ 2ኛ ክፍል፣ ወዘተ)
  occupation?: string; // የስራ ዓይነት (e.g., ተማሪ፣ የቤት ውስጥ፣ ወዘተ)
  chapel?: string; // ቻፕል / አጥቢያ ማዕከል
  parentName?: string; // የወላጅ/አሳዳጊ ስም
  phone?: string; // የወላጅ ስልክ ቁጥር
  residence?: string; // መኖሪያ ቀበሌ/መንደር/ሰፈር
  fellowshipOrVillage?: string; // የህብረት/የቡድን ስም ወይም መንደር
  isBaptized?: boolean; // የተጠመቀ/ች (አማራጭ)
  notes?: string; // ማስታወሻ
  registeredDate?: string; // የተመዘገበበት ቀን
}

export type WomenHouseholdCategory = 'married' | 'female_head' | 'other';

export type EvangelismMemberStatus = 'paying' | 'unpaid' | 'discontinued' | 'not_member';

export interface ChurchMember {
  id: number;
  memberCode?: string; // የአባል መለያ ኮድ (ምሳሌ፦ ብከቃሕቤክኤልሮኢ 0001)
  familyCode?: string; // የቤተሰብ መለያ ኮድ (በኮዱ የገቡ የቤተሰብ አባላትን ለማገናኘት)
  name: string; // የአባል/የቤተሰብ ሙሉ ስም
  gender?: string; // ጾታ
  age?: number | string; // ዕድሜ
  educationLevel?: string; // የትምህርት ደረጃ
  occupation?: string; // የስራ ዓይነት
  isBaptized?: boolean; // የተጠመቀ/ች
  takesLordsSupper?: boolean; // የጌታ እራት የሚካፈል/ምትካፈል
  paysTithe?: boolean; // አስራት የሚከፍል/ምትከፍል
  chapel?: string; // ቻፕል/አጥቢያ
  parentName?: string; // የወላጅ/የቤተሰብ መሪ ስም
  phone?: string; // የወላጅ/አባል ስልክ ቁጥር
  residence?: string; // መኖሪያ ቀበሌ/መንደር
  relationToHead?: string; // የቤተሰብ ዝምድና (ምሳሌ፦ አባት፣ እናት፣ ልጅ...)
  maritalStatus?: string; // የጋብቻ ሁኔታ (ባለትዳር፣ ራሷ የቤቱ አባወራ፣ ያላገባ...)
  womenCategory?: WomenHouseholdCategory; // የሴቶች ምድብ (ባለትዳር / ራሳቸው አባወራ)
  isYouth?: boolean; // በወጣቶች መረጃ ቋት ውስጥ በቀጥታ የተመዘገበ/ች
  youthMinistryRole?: string; // በወጣቶች አገልግሎት ድርሻ
  serviceRoles?: string[]; // በቤተክርስቲያኒቱ አገልግሎቶች ላይ የተሰማራበት ድርሻ (መሪ፣ መዘምራን፣ የመዝሙር መሪ፣ ዲያቆን...)
  evangelismStatus?: EvangelismMemberStatus; // የወንጌል አገልግሎት አባልነትና የክፍያ ሁኔታ
  spiritualCourses?: string[]; // በቤተክርስቲያኒቱ እየተማረ ያለው መንፈሳዊ ትምህርት (መቅህማ፣ BTCP፣ መጽሐፍ ቅዱስ ት/ቤት...)
  sheetName?: string; // የኤክሴል ሺት ስም
  registeredDate?: string;
}

export type OrgUnitId =
  | 'elders_council'
  | 'office'
  | 'holistic_community'
  | 'admin_finance'
  | 'spiritual_council'
  | 'evangelism'
  | 'deacons'
  | 'women_ministry'
  | 'youth_ministry'
  | 'children_ministry'
  | 'chapels_dept'
  | 'love_compassion'
  | 'development'
  | 'bible_school'
  | 'rehoboth_school'
  | 'men_fellowship'
  | 'women_fellowship';

export interface DepartmentMemberRecord {
  id: number;
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  age?: number | string;
  phone?: string;
  roleOrClass: string;
  educationOrLevel?: string;
  status: string;
  joinDate?: string;
  notes?: string;
}

export interface DepartmentActivityRecord {
  id: number;
  date: string;
  title: string;
  category: string;
  locationOrGroup?: string;
  participantsCount?: number;
  status: 'ታቅዷል' | 'በሂደት ላይ' | 'ተጠናቋል';
  summary?: string;
}

export interface DepartmentFinanceRecord {
  id: number;
  date: string;
  type: 'ገቢ' | 'ወጪ';
  category: string;
  description: string;
  amount: number;
  receiptOrRef?: string;
  recordedBy?: string;
}

export type HRCategory = 'full_time_minister' | 'admin_staff';

export interface ChurchHRRecord {
  id: number;
  category: HRCategory;
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  roleTitle: string;
  roleTitles?: string[];
  department?: string;
  departments?: string[];
  phone?: string;
  hireDate?: string;
  monthlySalary?: number;
  educationLevel?: string;
  status: string;
  notes?: string;
}

export type AssetType = 'fixed' | 'consumable';

export interface ChurchAssetRecord {
  id: number;
  assetType: AssetType;
  name: string;
  category: string;
  codeOrSerial?: string;
  quantity: number;
  unit: string;
  unitValue: number;
  totalValue: number;
  conditionOrStatus: string;
  location?: string;
  acquiredDate?: string;
  notes?: string;
}

export interface YouthGroupMemberRecord {
  id: number;
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  age?: number | string;
  phone?: string;
  chapel?: string;
  group: string;
  roleTitle?: string;
  status?: string;
  joinDate?: string;
  notes?: string;
}

export type BeneficiarySupportType = 'permanent' | 'temporary';

export interface CompassionBeneficiaryRecord {
  id: number;
  supportType: BeneficiarySupportType; // 'permanent' = ቋሚ ተረጂ | 'temporary' = ጊዜያዊ ተረጂ
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  age?: number | string;
  phone?: string;
  chapel?: string;
  address?: string;
  aidCategory: string;
  monthlyAidAmount?: number;
  startDate?: string;
  endDate?: string;
  familySize?: number;
  status: string;
  notes?: string;
}

export type MissionaryScope = 'international' | 'national' | 'regional' | 'local';

export interface EvangelismMissionaryRecord {
  id: number;
  scope: MissionaryScope; // international | national | regional | local
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  phone?: string;
  educationLevel?: string;
  missionField: string;
  sendingOrganization?: string;
  deployedDate?: string;
  monthlySupportAmount?: number;
  status: string;
  notes?: string;
}

export interface GenderCountPair {
  male: number;
  female: number;
}

export interface EvangelismActivityMetrics {
  witnessed: GenderCountPair; // ወንጌል የተመሰከረላቸው
  saved: GenderCountPair; // የዳኑ ሰዎች
  repented: GenderCountPair; // በንስሐ የተመለሱ
  baptized: GenderCountPair; // የተጠመቁ ሰዎች
  discipleship: GenderCountPair; // የደቀመዝሙርነት ትምህርት የተማሩ ሰዎች
}

export interface MissionaryQuarterlyReportRecord {
  id: number;
  year: string; // 2019, 2020, ...
  missionaryId?: number;
  missionaryName: string;
  scope?: MissionaryScope;
  missionField?: string;
  q1: EvangelismActivityMetrics;
  q2: EvangelismActivityMetrics;
  q3: EvangelismActivityMetrics;
  q4: EvangelismActivityMetrics;
  notes?: string;
  updatedAt?: string;
}

export interface UnitLeaderRecord {
  id: number;
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  roleTitle: string;
  phone?: string;
  termOrStartDate?: string;
  status: string;
  notes?: string;
}

export type ChapelLeaderCategoryId =
  | 'fathers_leaders'
  | 'women_leaders'
  | 'youth_leaders'
  | 'children_leaders'
  | 'evangelism_leaders'
  | 'compassion_leaders'
  | 'deacons';

export interface ChapelLeaderRecord {
  id: number;
  chapel: string;
  category: ChapelLeaderCategoryId;
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  roleTitle?: string;
  phone?: string;
  assignedDate?: string;
  status: string;
  notes?: string;
}

export interface HistoricalLeaderRecord {
  id: number;
  name: string;
  gender: 'ወ' | 'ሴ' | string;
  serviceYear: string;
  sectorId: OrgUnitId | 'other';
  sectorName: string;
  chapelName?: string;
  responsibility: string;
  phone?: string;
  status: string;
  notes?: string;
  recordedAt?: string;
}

export interface DepartmentWorkspaceData {
  members: DepartmentMemberRecord[];
  activities: DepartmentActivityRecord[];
  finances: DepartmentFinanceRecord[];
  plans: AnnualPlanItem[];
  leaders?: UnitLeaderRecord[];
  chapelLeaders?: ChapelLeaderRecord[];
  historicalLeaders?: HistoricalLeaderRecord[];
  hrRecords?: ChurchHRRecord[];
  assetRecords?: ChurchAssetRecord[];
  chapelPlans?: { [chapelName: string]: AnnualPlanItem[] };
  youthChoirGroups?: string[];
  youthChoirMembers?: YouthGroupMemberRecord[];
  youthWorshipLeaders?: YouthGroupMemberRecord[];
  youthDiscipleshipGroups?: string[];
  youthDiscipleshipMembers?: YouthGroupMemberRecord[];
  youthCoordinatorNotes?: string;
  beneficiaryRecords?: CompassionBeneficiaryRecord[];
  missionaryRecords?: EvangelismMissionaryRecord[];
  missionaryReports?: MissionaryQuarterlyReportRecord[];
  eldersDefaultSeeded?: boolean;
  evangelismMissionariesDefaultSeeded?: boolean;
  adminHrDefaultSeeded?: boolean;
}

export type SubmissionType = 'plan' | 'report' | 'letter';

export type SubmissionStatus =
  | 'pending_spiritual'
  | 'returned_by_spiritual'
  | 'approved_spiritual'
  | 'forwarded_to_admin'
  | 'acknowledged_by_admin';

export interface SubmissionAttachment {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  storageKey?: string;
  dataUrl?: string;
}

export interface MinistrySubmission {
  id: number;
  type: SubmissionType;
  title: string;
  year: string;
  period?: string;
  periodCode?: 'year' | 'half' | 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4';
  referenceNumber?: string;
  content: string;
  senderUnitId: OrgUnitId;
  senderUnitName: string;
  senderChapel?: string;
  senderPersonName?: string;
  attachedPlans?: AnnualPlanItem[];
  attachmentName?: string;
  attachmentDataUrl?: string;
  attachmentKey?: string;
  attachments?: SubmissionAttachment[];
  status: SubmissionStatus;
  submittedAt: string;
  updatedAt?: string;
  spiritualReviewedAt?: string;
  spiritualNote?: string;
  forwardedToAdmin?: boolean;
  forwardedToAdminAt?: string;
  forwardedToAdminNote?: string;
  adminReviewedAt?: string;
  adminNote?: string;
}

export type PlanDispatchStatus = 'pending' | 'accepted' | 'returned';

export interface PlanDispatchItem {
  id: number;
  year: string;
  title: string;
  sourceFileName?: string;
  targetUnitId: OrgUnitId;
  targetUnitName: string;
  targetChapel?: string;
  plans: AnnualPlanItem[];
  sentByUnitId?: OrgUnitId;
  sentByName: string;
  sentAt: string;
  status: PlanDispatchStatus;
  acceptedAt?: string;
  acceptedMode?: 'append' | 'replace';
  receiverNote?: string;
}

export type BrowserDeviceType = 'mobile' | 'tablet' | 'desktop';

export interface BrowserClientInfo {
  browserId: string;
  browserFingerprint: string;
  browserName: string;
  osName: string;
  deviceType: BrowserDeviceType;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
}

export interface FailedLoginAttemptRecord {
  id: number;
  timestamp: string;
  attemptedTarget: string;
  attemptedRoleOrUnit: string;
  enteredPinPreview: string;
  browserId: string;
  browserFingerprint: string;
  browserName: string;
  osName: string;
  deviceType: BrowserDeviceType;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
}

export interface BlockedBrowserRule {
  id: number;
  browserId: string;
  browserFingerprint?: string;
  matchFingerprintToo?: boolean;
  browserName: string;
  osName: string;
  deviceType: BrowserDeviceType;
  screenResolution?: string;
  timezone?: string;
  userAgent?: string;
  isBlocked: boolean;
  reason?: string;
  lastTargetAttempted?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AppData {
  years: string[];
  pins: {
    admin: string;
    leader: string;
    childrenCoordinator?: string;
    youthCoordinator?: string;
    chapels?: { [chapelName: string]: string };
    units?: { [unitId: string]: string };
  };
  teachers: Teacher[];
  subjects: string[];
  classSubjects?: {
    [className: string]: string[];
  };
  choirGroups: string[];
  choirMembers: ChoirMember[];
  spiritualGroups: string[];
  spiritualMembers: SpiritualMember[];
  attendance: AbsenteeRecord[];
  weeklyAttendance?: WeeklyAttendanceData;
  weekDates?: WeekDatesData;
  plans: AnnualPlanItem[];
  students: {
    [year: string]: {
      [className: string]: Student[];
    };
  };
  chapels?: string[];
  churchChildren?: ChurchChild[];
  churchMembers?: ChurchMember[];
  departmentData?: { [unitId: string]: DepartmentWorkspaceData };
  submissions?: MinistrySubmission[];
  planDispatches?: PlanDispatchItem[];
  ageReferenceYear?: number; // የአባላት ዕድሜ የተዘጋጀበት መነሻ ዓ/ም (ለምሳሌ 2017)
  failedLoginAttempts?: FailedLoginAttemptRecord[];
  blockedBrowsers?: BlockedBrowserRule[];
}
