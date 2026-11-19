export type Role = 'admin' | 'children_coordinator' | 'leader' | 'teacher';

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
  department?: string;
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

export interface DepartmentWorkspaceData {
  members: DepartmentMemberRecord[];
  activities: DepartmentActivityRecord[];
  finances: DepartmentFinanceRecord[];
  plans: AnnualPlanItem[];
  hrRecords?: ChurchHRRecord[];
  assetRecords?: ChurchAssetRecord[];
  chapelPlans?: { [chapelName: string]: AnnualPlanItem[] };
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

export interface AppData {
  years: string[];
  pins: {
    admin: string;
    leader: string;
    childrenCoordinator?: string;
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
  ageReferenceYear?: number; // የአባላት ዕድሜ የተዘጋጀበት መነሻ ዓ/ም (ለምሳሌ 2017)
}
