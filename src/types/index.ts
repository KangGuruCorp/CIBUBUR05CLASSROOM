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
  rewardPoints?: number; // Gamification points awarded upon completing/reading the material
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
  rewardPoints: number;
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

export interface Mission {
  id: string;
  schoolId: string;
  classIds: string[];
  title: string;
  description: string;
  type: MissionType;
  target: number; // e.g. 2 (read 2 materials)
  rewardPoints: number;
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
  updatedAt?: string;
}

export interface PointLedger {
  id: string;
  schoolId: string;
  classId: string;
  userId: string;
  amount: number;
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
  totalPoints: number;
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
  minPoints: number;
  maxPoints: number;
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

