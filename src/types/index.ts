export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  uid: string;
  role: UserRole;
  status: 'active' | 'inactive';
  displayName: string;
  searchName: string;
  username?: string; // Username untuk login siswa/guru
  password?: string; // Kata sandi yang diatur oleh guru/admin
  avatarUrl: string;
  schoolId: string;
  classIds: string[];
  studentNumber?: string; // NIS
  nisn?: string; // Private
  absentNumber?: number;
  email?: string;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserPrivate {
  uid: string;
  nisn?: string;
  parentContact?: string;
  birthDate?: string;
  notes?: string;
}

export interface School {
  id: string;
  name: string;
  logoUrl?: string;
  academicYear: string;
  timezone: string;
  npsn?: string;
  address?: string;
  principalName?: string;
  motto?: string;
  contactEmail?: string;
  contactPhone?: string;
  settings: {
    leaderboardMode: 'top10_self' | 'full' | 'group';
    allowLateSubmission: boolean;
  };
}

export interface ClassRoom {
  id: string;
  schoolId: string;
  name: string; // e.g. "Kelas 6A"
  grade: number;
  academicYear: string;
  teacherIds: string[];
  status: 'active' | 'archived';
  createdAt: string;
  studentCount?: number;
}

export interface MaterialAttachment {
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'youtube' | 'link';
  url?: string;
  youtubeUrl?: string;
  sizeMB?: number;
}

export interface Material {
  id: string;
  schoolId: string;
  classIds: string[];
  assignedUserIds?: string[]; // Specific students assigned (if undefined or empty, assigned to all students in class)
  subject: string; // e.g. "Ilmu Pengetahuan Alam (IPA)"
  topic?: string; // e.g. "Tata Surya & Planet"
  title: string;
  description: string;
  contentBody?: string;
  coverUrl?: string;
  youtubeUrl?: string; // Embedded YouTube video link
  youtubeTitle?: string; // Optional YouTube title/caption
  attachments: MaterialAttachment[];
  rewardPoints?: number; // Poin untuk Leaderboard & Reward Guru
  rewardXp?: number; // XP untuk Kenaikan Level
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publishAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialProgress {
  materialId: string;
  userId: string;
  classId: string;
  status: 'opened' | 'completed';
  openedAt: string;
  completedAt?: string;
}

export interface AssignmentAttachmentRules {
  allowedTypes: string[]; // e.g. ['image/jpeg', 'image/png', 'application/pdf', 'text/plain']
  maxFiles: number;
  maxSizeMB: number;
}

export interface Assignment {
  id: string;
  schoolId: string;
  classIds: string[];
  assignedUserIds?: string[]; // Specific students assigned (if undefined or empty, assigned to all students in class)
  subject: string;
  topic?: string;
  type?: 'assignment' | 'quiz' | 'question';
  title: string;
  instructions: string;
  attachments?: MaterialAttachment[];
  youtubeUrl?: string;
  questionType?: 'short_answer' | 'multiple_choice';
  questionOptions?: string[];
  attachmentRules: AssignmentAttachmentRules;
  openAt: string;
  dueAt: string;
  allowLate: boolean;
  allowRevision: boolean;
  maxScore: number;
  rewardPoints: number; // Poin untuk Leaderboard & Reward Guru
  rewardXp?: number; // XP untuk Kenaikan Level
  linkedQuizId?: string; // ID Kuis yang terhubung dengan tugas ini
  status: 'draft' | 'scheduled' | 'published' | 'closed' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionFile {
  name: string;
  url: string;
  type: string;
  size: number;
  previewUrl?: string;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'revision_requested' | 'resubmitted' | 'graded';

export interface Submission {
  id: string; // assignmentId_uid
  assignmentId: string;
  userId: string;
  classId: string;
  answerText?: string;
  files: SubmissionFile[];
  status: SubmissionStatus;
  attempt: number;
  submittedAt?: string;
  isLate: boolean;
  score?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  updatedAt: string;
}

export type MissionType = 'manual' | 'event_count' | 'assignment' | 'material' | 'streak' | 'custom';
export type MissionRepeat = 'once' | 'daily' | 'weekly';
export type MissionStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';
export type MissionRewardMode = 'automatic' | 'manual_verification';

export interface Mission {
  id: string;
  schoolId: string;
  classIds: string[];
  title: string;
  description: string;
  type: MissionType;
  target: number; // e.g. 2 (read 2 materials)
  rewardPoints: number; // Poin untuk Leaderboard
  rewardXp?: number; // XP untuk Kenaikan Level
  rewardMode?: MissionRewardMode; // 'automatic' (default) | 'manual_verification' (poin tertahan hingga diverifikasi guru)
  badgeId?: string;
  startAt: string;
  endAt: string;
  status: MissionStatus;
  repeat: MissionRepeat;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MissionProgress {
  id?: string;
  missionId: string;
  userId: string;
  classId: string;
  periodKey: string;
  progress: number;
  status: 'in_progress' | 'pending_verification' | 'completed' | 'claimed';
  note?: string;
  notes?: string;
  answerText?: string;
  files?: SubmissionFile[];
  attempt?: number;
  feedback?: string;
  submittedAt?: string;
  completedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  score?: number;
  rewardPointsAwarded?: number;
  rewardXpAwarded?: number;
  updatedAt?: string;
}

export interface PointLedger {
  id: string;
  schoolId: string;
  classId: string;
  userId: string;
  amount: number; // Poin amount
  xpAmount?: number; // XP amount
  category: 'academic' | 'participation' | 'mission' | 'adjustment';
  sourceType: 'assignment' | 'mission' | 'manual' | 'badge' | 'material';
  sourceId: string;
  idempotencyKey: string;
  reason: string;
  actorId: string; // Teacher or System
  actorName?: string;
  createdAt: string;
}

export interface UserStats {
  uid: string;
  schoolId: string;
  classId: string;
  totalPoints: number; // Poin untuk Leaderboard & Tukar Reward Guru
  totalXp?: number; // Akumulasi XP untuk Leveling
  academicPoints: number;
  participationPoints: number;
  level: number;
  completedAssignments: number;
  completedMissions: number;
  badgeCount: number;
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: 'academic' | 'streak' | 'participation' | 'special';
  criteria: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserBadge {
  id: string; // uid_badgeId
  userId: string;
  badgeId: string;
  source: string;
  awardedAt: string;
}

export interface LevelConfig {
  level: number;
  minPoints: number; // backward compatibility
  maxPoints: number; // backward compatibility
  minXp?: number;
  maxXp?: number;
  name: string;
  badgeIcon: string;
  color: string;
}

export interface Announcement {
  id: string;
  schoolId: string;
  classIds: string[];
  title: string;
  content: string;
  authorName: string;
  priority: 'normal' | 'important' | 'urgent';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'material' | 'grade' | 'mission' | 'point' | 'system';
  targetTab?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  schoolId: string;
  actorId: string;
  actorName: string;
  actorRole?: UserRole | string;
  action: string;
  targetType: 'assignment' | 'material' | 'points' | 'student' | 'submission';
  targetId: string;
  metadata: Record<string, any>;
  details?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  classId: string;
  channelType: 'public' | 'direct';
  recipientId?: string; // target student or teacher uid if direct
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar: string;
  text: string;
  imageUrl?: string;
  reactions?: Record<string, string[]>; // emoji key (e.g. '👍', '❤️') -> array of user uids
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  classId?: string;
  isOnline: boolean;
  lastSeen: number; // timestamp in milliseconds (Date.now())
  lastSeenIso: string;
  activity?: string;
}

// ─── Quiz Types ─────────────────────────────────────────────────────────────

export type QuizQuestionType =
  | 'single_choice' // PG Biasa
  | 'complex_multiple_choice' // PG Kompleks (Multi-Select / Benar-Salah)
  | 'matching' // Menjodohkan
  | 'short_answer' // Isian Singkat
  | 'essay'; // Uraian

export interface MatchingPair {
  id: string;
  left: string; // Pertanyaan / Premis Kiri
  right: string; // Jawaban / Pasangan Kanan
}

export interface ComplexStatement {
  id: string;
  statement: string;
  isCorrect: boolean; // True jika benar, False jika salah
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  imageUrl?: string;
  points: number; // Bobot nilai (default: 10)
  explanation?: string; // Pembahasan

  // 1. Pilihan Ganda (single_choice)
  options?: string[];
  correctOptionIndex?: number;

  // 2. Pilihan Ganda Kompleks (complex_multiple_choice)
  complexMode?: 'multi_select' | 'true_false';
  correctOptionIndices?: number[]; // Untuk multi-select
  complexStatements?: ComplexStatement[]; // Untuk tabel Benar/Salah

  // 3. Menjodohkan (matching)
  matchingPairs?: MatchingPair[];

  // 4. Isian Singkat (short_answer)
  acceptedAnswers?: string[]; // Kunci jawaban yang diterima
  caseSensitive?: boolean;

  // 5. Uraian (essay)
  essayRubric?: string; // Kunci jawaban / panduan penilaian guru
  minWords?: number;
}

export interface Quiz {
  id: string;
  schoolId: string;
  classIds: string[];
  assignedUserIds?: string[];
  subject: string; // e.g. "IPAS", "Matematika"
  topic?: string;
  title: string;
  description: string;
  coverUrl?: string;
  durationMinutes: number; // 0 = tanpa batas waktu
  openAt?: string;
  dueAt?: string;
  shuffleQuestions: boolean;
  showScoreImmediately: boolean;
  maxScore: number;
  rewardPoints: number; // Poin untuk Leaderboard & Reward Guru
  rewardXp?: number; // XP untuk Kenaikan Level
  linkedAssignmentId?: string; // ID Tugas Kelas yang terhubung dengan kuis ini
  questions: QuizQuestion[];
  status: 'draft' | 'published' | 'scheduled' | 'closed' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizStudentAnswer {
  questionId: string;
  type: QuizQuestionType;
  selectedOptionIndex?: number;
  selectedOptionIndices?: number[];
  statementAnswers?: Record<string, boolean>; // statementId -> boolean
  matchingPairsAnswer?: Record<string, string>; // pairId -> matched right text
  shortAnswerText?: string;
  essayText?: string;
  earnedScore?: number;
  maxScore?: number;
  isCorrect?: boolean;
  teacherFeedback?: string;
  isManualOverride?: boolean;
  originalAutoScore?: number;
  originalIsCorrect?: boolean;
}

export interface QuizSubmission {
  id: string; // quizId_userId
  quizId: string;
  userId: string;
  classId: string;
  answers: Record<string, QuizStudentAnswer>;
  status: 'in_progress' | 'submitted' | 'graded';
  startedAt: string;
  submittedAt?: string;
  totalScore?: number;
  maxScore?: number;
  percentageScore?: number;
  rewardPointsAwarded?: number;
  rewardXpAwarded?: number;
  isLate: boolean;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  updatedAt: string;
}

export * from './paperMode';
