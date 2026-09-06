import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Announcement,
  Assignment,
  AuditLog,
  Badge,
  ChatMessage,
  ClassRoom,
  LevelConfig,
  Material,
  MaterialProgress,
  Mission,
  MissionProgress,
  NotificationItem,
  PointLedger,
  School,
  Submission,
  User,
  UserBadge,
  UserPresence,
  UserRole,
  UserStats,
} from '../types';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BADGES,
  INITIAL_CHAT_MESSAGES,
  INITIAL_CLASSES,
  INITIAL_MATERIAL_PROGRESS,
  INITIAL_MATERIALS,
  INITIAL_MISSION_PROGRESS,
  INITIAL_MISSIONS,
  INITIAL_POINT_LEDGER,
  INITIAL_SCHOOL,
  INITIAL_SUBMISSIONS,
  INITIAL_USERS,
  INITIAL_USER_BADGES,
  INITIAL_USER_STATS,
} from '../data/mockData';
import { DEFAULT_LEVELS, fireCelebrationConfetti, getLevelInfo } from '../utils/gamification';
import {
  seedFirestoreIfEmpty,
  syncDocToFirestore,
  deleteDocFromFirestore,
  loadAllFromFirestore,
  subscribeToRealtimeCollection,
  syncAllStateToFirestore,
  updateUserPresence,
  setUserOffline,
  isFirestoreQuotaExceeded,
  COLLECTIONS,
} from '../lib/firestoreSync';
import { safeStorage, safeSessionStorage } from '../utils/storage';

const STORAGE_KEY = 'classroom_gamifikasi_v1_data';
const SESSION_USER_KEY = 'classroom_gamifikasi_session_user';

interface AppContextType {
  currentUser: User | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  isQuotaExceeded: boolean;
  currentClassId: string;
  setCurrentClassId: (classId: string) => void;
  users: User[];
  school: School;
  classes: ClassRoom[];
  materials: Material[];
  materialProgress: Record<string, MaterialProgress>;
  assignments: Assignment[];
  submissions: Record<string, Submission>;
  missions: Mission[];
  missionProgress: Record<string, MissionProgress>;
  pointLedger: PointLedger[];
  userStats: Record<string, UserStats>;
  badges: Badge[];
  userBadges: UserBadge[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  chatMessages: ChatMessage[];
  userPresences: Record<string, UserPresence>;
  isUserOnline: (userId: string) => boolean;
  levels: LevelConfig[];
  isFirebaseSynced: boolean;
  syncAllToCloud: () => Promise<boolean>;
  
  // Navigation and Auth
  activeTab: string;
  setActiveTab: (tab: string) => void;
  switchUser: (userId: string) => void;
  loginUser: (identifier: string, pass: string, role: UserRole) => { success: boolean; message?: string };
  logoutUser: () => void;
  updateUserAvatar: (avatarUrl: string) => void;
  updateUserProfile: (data: {
    displayName?: string;
    username?: string;
    password?: string;
    avatarUrl?: string;
  }) => { success: boolean; message?: string };
  updateSchoolProfile: (updatedSchool: Partial<School>) => Promise<{ success: boolean; message?: string }>;
  changePassword: (newPass: string) => void;
  
  // Student Actions
  markMaterialCompleted: (materialId: string) => void;
  submitAssignment: (assignmentId: string, answerText: string, files: any[]) => void;
  claimMissionReward: (missionId: string) => void;
  submitMissionForVerification: (missionId: string, note?: string, files?: any[]) => void;
  
  // Teacher Actions
  createMaterial: (mat: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'schoolId'>) => void;
  updateMaterial: (id: string, mat: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  saveMaterial: (mat: Partial<Material>) => void;
  
  createAssignment: (asg: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'schoolId'>) => void;
  updateAssignment: (id: string, asg: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  saveAssignment: (asg: Partial<Assignment>) => void;
  
  gradeSubmission: (submissionId: string, score: number, feedback: string, rewardPoints: number) => void;
  requestRevision: (submissionId: string, feedback: string) => void;
  
  adjustStudentPoints: (userId: string, amount: number, category: 'academic' | 'participation' | 'adjustment', reason: string) => void;
  createMission: (mis: Omit<Mission, 'id' | 'createdBy' | 'schoolId'>) => void;
  saveMission: (mis: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  verifyManualMission: (missionId: string, userId: string, score?: number, feedback?: string) => void;
  gradeAndAwardMission: (missionId: string, userId: string, pointsAwarded?: number, feedback?: string) => void;
  gradeAndAwardMissionBulk: (missionId: string, userIds: string[], score: number, feedback?: string, customRewardPoints?: number) => void;
  createAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt' | 'authorName' | 'schoolId'>) => void;
  saveAnnouncement: (ann: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  refreshFromCloud: () => Promise<void>;
  
  provisionStudent: (student: {
    displayName: string;
    studentNumber: string;
    absentNumber: number;
    classId: string;
    email?: string;
    username?: string;
    password?: string;
    avatarUrl?: string;
  }) => void;
  provisionMultipleStudents: (students: Array<{ displayName: string; studentNumber: string; absentNumber: number; classId: string; email?: string; username?: string; password?: string }>) => number;
  updateStudent: (userId: string, data: Partial<User>) => void;
  updateStudentPhoto: (userId: string, photoUrl: string) => void;
  deleteStudent: (userId: string) => void;
  setStudentPassword: (userId: string, newPassword: string) => void;
  resetStudentPassword: (userId: string) => string;
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  sendChatMessage: (params: {
    text: string;
    channelType?: 'public' | 'direct';
    recipientId?: string;
    imageUrl?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  toggleChatReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteChatMessage: (messageId: string) => Promise<void>;
  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for newest-first sorting across all views
export const getSortTimestamp = (item: any): number => {
  if (!item) return 0;
  const dateStr = item.createdAt || item.publishAt || item.openAt || item.startAt || item.updatedAt;
  if (dateStr) {
    const t = new Date(dateStr).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const match = String(item.id || '').match(/\d{10,}/);
  if (match) {
    const n = parseInt(match[0], 10);
    if (!isNaN(n)) return n;
  }
  return 0;
};

export const sortItemsNewestFirst = <T extends any>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const diff = getSortTimestamp(b) - getSortTimestamp(a);
    if (diff !== 0) return diff;
    return String((b as any)?.id || '').localeCompare(String((a as any)?.id || ''));
  });
};

// Intelligent bi-directional merge between local state and cloud data
function mergeLocalAndCloud(local: any, cloud: any) {
  if (!cloud) return local;

  const now = Date.now();
  const dummyPrefixes = ['usr_budi_', 'usr_alya_', 'usr_raka_', 'usr_nadia_', 'usr_fajar_', 'usr_keisha_', 'usr_rizky_', 'usr_salsa_', 'usr_dimas_', 'usr_siti_', 'usr_kevin_'];
  const isDummyUid = (uid: string) => dummyPrefixes.some((prefix) => uid.startsWith(prefix));

  // 1. Merge Users: Cloud is authoritative if users exist in Firestore
  const userMap = new Map<string, any>();
  const cloudUsers = (cloud.users || []).filter((u: any) => u?.uid && !isDummyUid(u.uid));
  const cloudUids = new Set(cloudUsers.map((u: any) => u.uid));

  // Add all valid cloud users
  cloudUsers.forEach((u: any) => {
    const localUser = (local.users || []).find((l: any) => l?.uid === u.uid);
    if (!localUser) {
      userMap.set(u.uid, u);
    } else {
      const cloudTime = new Date(u.updatedAt || u.createdAt || 0).getTime();
      const localTime = new Date(localUser.updatedAt || localUser.createdAt || 0).getTime();
      userMap.set(u.uid, cloudTime >= localTime ? { ...localUser, ...u } : { ...u, ...localUser });
    }
  });

  // Only retain local users that were created very recently (< 30s ago) and not yet synced, and NEVER dummy users
  if (cloudUids.size > 0) {
    (local.users || []).forEach((u: any) => {
      if (!u?.uid || cloudUids.has(u.uid) || isDummyUid(u.uid)) return;
      const created = new Date(u.createdAt || 0).getTime();
      if (now - created < 30000) {
        userMap.set(u.uid, u);
      }
    });
  } else {
    // If cloud had literally 0 users, use clean local users (excluding dummy users)
    (local.users || []).forEach((u: any) => {
      if (u?.uid && !isDummyUid(u.uid)) userMap.set(u.uid, u);
    });
  }

  // Ensure default teacher profile is Teguh Firmansyah Apriliana, M.Pd
  Array.from(userMap.entries()).forEach(([uid, u]) => {
    if (u.role === 'teacher' && (!u.displayName || u.displayName.includes('Rahmawati') || uid === 'usr_guru_rahma')) {
      userMap.set(uid, {
        ...u,
        displayName: 'Teguh Firmansyah Apriliana, M.Pd',
        searchName: 'teguh firmansyah apriliana guru wali kelas 6e',
        username: u.username && !u.username.includes('rahma') ? u.username : 'guru.teguh',
        email: u.email && !u.email.includes('rahma') ? u.email : 'teguh.april92@gmail.com',
        avatarUrl: u.avatarUrl && !u.avatarUrl.includes('GuruRahma') ? u.avatarUrl : 'https://api.dicebear.com/7.x/bottts/svg?seed=TeguhFirmansyah&backgroundColor=b6e3f4',
      });
    }
  });

  // 2. Merge User Stats - only for users that exist in userMap
  const mergedStats: Record<string, any> = {};
  if (cloud.userStats) {
    Object.entries(cloud.userStats).forEach(([uid, cStats]: [string, any]) => {
      if (userMap.has(uid) && !isDummyUid(uid)) {
        mergedStats[uid] = cStats;
      }
    });
  }
  if (local.userStats) {
    Object.entries(local.userStats).forEach(([uid, lStats]: [string, any]) => {
      if (userMap.has(uid) && !mergedStats[uid] && !isDummyUid(uid)) {
        mergedStats[uid] = lStats;
      }
    });
  }

  // 3. Merge Classes
  const classMap = new Map<string, any>();
  (local.classes || []).forEach((c: any) => { if (c?.id) classMap.set(c.id, c); });
  (cloud.classes || []).forEach((c: any) => {
    if (c?.id) {
      const existing = classMap.get(c.id);
      classMap.set(c.id, existing ? { ...existing, ...c } : c);
    }
  });

  // 4. Merge Materials: Cloud is authoritative when cloud.materials is loaded (is an Array)
  const dummyMaterialIds = new Set(['mat_01_ipa_tatasurya', 'mat_02_mtk_pecahan', 'mat_03_bindo_teks_eksplanasi']);
  let mergedMaterials: any[] = [];
  if (Array.isArray(cloud.materials)) {
    const cloudIds = new Set(cloud.materials.map((m: any) => m.id));
    const pendingLocal = (local.materials || []).filter((m: any) => {
      if (!m?.id || cloudIds.has(m.id) || dummyMaterialIds.has(m.id)) return false;
      const created = new Date(m.createdAt || 0).getTime();
      return now - created < 20000;
    });
    mergedMaterials = sortItemsNewestFirst([...cloud.materials, ...pendingLocal]);
  } else {
    mergedMaterials = sortItemsNewestFirst(
      (local.materials || []).filter((m: any) => !dummyMaterialIds.has(m?.id))
    );
  }

  // 5. Merge Assignments: Cloud is authoritative when cloud.assignments is loaded (is an Array)
  const dummyAssignmentIds = new Set(['asg_01_ipa_proyek_planet', 'asg_02_mtk_latihan_pecahan', 'asg_03_bindo_analisis_eksplanasi']);
  let mergedAssignments: any[] = [];
  if (Array.isArray(cloud.assignments)) {
    const cloudIds = new Set(cloud.assignments.map((a: any) => a.id));
    const pendingLocal = (local.assignments || []).filter((a: any) => {
      if (!a?.id || cloudIds.has(a.id) || dummyAssignmentIds.has(a.id)) return false;
      const created = new Date(a.createdAt || 0).getTime();
      return now - created < 20000;
    });
    mergedAssignments = sortItemsNewestFirst([...cloud.assignments, ...pendingLocal]);
  } else {
    mergedAssignments = sortItemsNewestFirst(
      (local.assignments || []).filter((a: any) => !dummyAssignmentIds.has(a?.id))
    );
  }

  // 6. Merge Submissions with timestamp comparison and resilient cross-keying
  const mergedSubmissions: Record<string, any> = { ...(local.submissions || {}) };
  if (cloud.submissions) {
    Object.entries(cloud.submissions).forEach(([key, cSub]: [string, any]) => {
      if (!cSub) return;
      const lSub = mergedSubmissions[key];
      if (!lSub) {
        mergedSubmissions[key] = cSub;
      } else {
        const cTime = new Date(cSub.updatedAt || cSub.submittedAt || 0).getTime();
        const lTime = new Date(lSub.updatedAt || lSub.submittedAt || 0).getTime();
        mergedSubmissions[key] = cTime >= lTime ? { ...lSub, ...cSub } : { ...cSub, ...lSub };
      }
      if (cSub.assignmentId && cSub.userId) {
        const altKey = `${cSub.assignmentId}_${cSub.userId}`;
        if (!mergedSubmissions[altKey]) {
          mergedSubmissions[altKey] = mergedSubmissions[key];
        }
      }
    });
  }

  // 7. Merge Missions: Cloud is authoritative when cloud.missions is loaded (is an Array)
  const dummyMissionIds = new Set(['mis_01_read_materials', 'mis_02_early_submission', 'mis_03_active_helper']);
  let mergedMissions: any[] = [];
  if (Array.isArray(cloud.missions)) {
    const cloudIds = new Set(cloud.missions.map((m: any) => m.id));
    const pendingLocal = (local.missions || []).filter((m: any) => {
      if (!m?.id || cloudIds.has(m.id) || dummyMissionIds.has(m.id)) return false;
      const created = new Date(m.createdAt || 0).getTime();
      return now - created < 20000;
    });
    mergedMissions = sortItemsNewestFirst([...cloud.missions, ...pendingLocal]);
  } else {
    mergedMissions = sortItemsNewestFirst(
      (local.missions || []).filter((m: any) => !dummyMissionIds.has(m?.id))
    );
  }

  // 8. Progress with timestamp comparison and resilient cross-keying
  const mergedMisProg: Record<string, any> = { ...(local.missionProgress || {}) };
  if (cloud.missionProgress) {
    Object.entries(cloud.missionProgress).forEach(([key, cProg]: [string, any]) => {
      if (!cProg) return;
      const lProg = mergedMisProg[key];
      if (!lProg) {
        mergedMisProg[key] = cProg;
      } else {
        const cTime = new Date(cProg.updatedAt || cProg.completedAt || 0).getTime();
        const lTime = new Date(lProg.updatedAt || lProg.completedAt || 0).getTime();
        mergedMisProg[key] = cTime >= lTime ? { ...lProg, ...cProg } : { ...cProg, ...lProg };
      }
      if (cProg.missionId && cProg.userId) {
        const altKey = `${cProg.missionId}_${cProg.userId}`;
        if (!mergedMisProg[altKey]) mergedMisProg[altKey] = mergedMisProg[key];
      }
    });
  }

  const mergedMatProg: Record<string, any> = { ...(local.materialProgress || {}) };
  if (cloud.materialProgress) {
    Object.entries(cloud.materialProgress).forEach(([key, cProg]: [string, any]) => {
      if (!cProg) return;
      const lProg = mergedMatProg[key];
      if (!lProg) {
        mergedMatProg[key] = cProg;
      } else {
        const cTime = new Date(cProg.completedAt || cProg.openedAt || 0).getTime();
        const lTime = new Date(lProg.completedAt || lProg.openedAt || 0).getTime();
        mergedMatProg[key] = cTime >= lTime ? { ...lProg, ...cProg } : { ...cProg, ...lProg };
      }
      if (cProg.materialId && cProg.userId) {
        const altKey = `${cProg.materialId}_${cProg.userId}`;
        if (!mergedMatProg[altKey]) mergedMatProg[altKey] = mergedMatProg[key];
      }
    });
  }

  // 9. Announcements
  const annMap = new Map<string, any>();
  (local.announcements || []).forEach((an: any) => { if (an?.id) annMap.set(an.id, an); });
  (cloud.announcements || []).forEach((an: any) => {
    if (an?.id) {
      const existing = annMap.get(an.id);
      annMap.set(an.id, existing ? { ...existing, ...an } : an);
    }
  });

  // 10. Point Ledger
  const ledgerMap = new Map<string, any>();
  (local.pointLedger || []).forEach((pl: any) => { if (pl?.id) ledgerMap.set(pl.id, pl); });
  (cloud.pointLedger || []).forEach((pl: any) => { if (pl?.id) ledgerMap.set(pl.id, pl); });
  const mergedLedger = Array.from(ledgerMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  // 11. Chat Messages
  const chatMap = new Map<string, any>();
  (local.chatMessages || []).forEach((m: any) => { if (m?.id) chatMap.set(m.id, m); });
  (cloud.chatMessages || []).forEach((m: any) => {
    if (m?.id) {
      const existing = chatMap.get(m.id);
      chatMap.set(m.id, existing ? { ...existing, ...m } : m);
    }
  });
  const mergedChat = Array.from(chatMap.values()).sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  // 12. Notifications
  const notifMap = new Map<string, any>();
  (local.notifications || []).forEach((n: any) => { if (n?.id) notifMap.set(n.id, n); });
  (cloud.notifications || []).forEach((n: any) => {
    if (n?.id) {
      const existing = notifMap.get(n.id);
      notifMap.set(n.id, existing ? { ...existing, ...n } : n);
    }
  });
  const mergedNotifs = Array.from(notifMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return {
    ...local,
    school: cloud.school ? { ...local.school, ...cloud.school } : local.school,
    classes: Array.from(classMap.values()),
    users: Array.from(userMap.values()),
    userStats: mergedStats,
    materials: mergedMaterials,
    materialProgress: mergedMatProg,
    assignments: mergedAssignments,
    submissions: cloud.submissions
      ? Object.fromEntries(
          Object.entries(mergedSubmissions).filter(
            ([_, sub]: [string, any]) => sub?.userId && userMap.has(sub.userId) && !isDummyUid(sub.userId)
          )
        )
      : {},
    missions: mergedMissions,
    missionProgress: cloud.missionProgress
      ? Object.fromEntries(
          Object.entries(mergedMisProg).filter(
            ([_, prog]: [string, any]) => prog?.userId && userMap.has(prog.userId) && !isDummyUid(prog.userId)
          )
        )
      : {},
    announcements: Array.from(annMap.values()),
    pointLedger: (cloud.pointLedger || []).filter((pl: any) => pl?.userId && userMap.has(pl.userId) && !isDummyUid(pl.userId)),
    chatMessages: mergedChat.length > 0 ? mergedChat : (local.chatMessages || INITIAL_CHAT_MESSAGES),
    badges: cloud.badges && cloud.badges.length > 0 ? cloud.badges : local.badges,
    userBadges: (cloud.userBadges || []).filter((b: any) => b?.userId && userMap.has(b.userId) && !isDummyUid(b.userId)),
    notifications: mergedNotifs.length > 0 ? mergedNotifs : (local.notifications || []),
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial from storage or defaults
  const [data, setData] = useState(() => {
    let sessionUserId: string | null = null;
    try {
      sessionUserId = safeSessionStorage.getItem(SESSION_USER_KEY);
    } catch (e) {}

    let saved: string | null = null;
    try {
      saved = safeStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure classes reflect Kelas 6E
        const updatedClasses = (parsed.classes || INITIAL_CLASSES).map((cls: any) =>
          cls.id === 'cls_6a' || cls.name?.includes('6A') ? { ...cls, name: 'Kelas 6E' } : cls
        );
        // Ensure teacher user reflects Teguh Firmansyah Apriliana, M.Pd
        const updatedUsers = (parsed.users || INITIAL_USERS).map((u: any) => {
          if (u.role === 'teacher' && (!u.displayName || u.displayName.includes('Rahmawati') || u.uid === 'usr_guru_rahma')) {
            return {
              ...u,
              displayName: 'Teguh Firmansyah Apriliana, M.Pd',
              searchName: 'teguh firmansyah apriliana guru wali kelas 6e',
              username: u.username && !u.username.includes('rahma') ? u.username : 'guru.teguh',
              email: u.email && !u.email.includes('rahma') ? u.email : 'teguh.april92@gmail.com',
              avatarUrl: u.avatarUrl && !u.avatarUrl.includes('GuruRahma') ? u.avatarUrl : 'https://api.dicebear.com/7.x/bottts/svg?seed=TeguhFirmansyah&backgroundColor=b6e3f4',
            };
          }
          return u;
        });
        const updatedSchool = parsed.school ? { ...parsed.school } : { ...INITIAL_SCHOOL };
        if (updatedSchool.logoUrl && updatedSchool.logoUrl.includes('images.unsplash.com')) {
          updatedSchool.logoUrl = '';
        }
        const cleanMaterials = sortItemsNewestFirst(
          (parsed.materials || []).filter(
            (m: any) => !['mat_01_ipa_tatasurya', 'mat_02_mtk_pecahan', 'mat_03_bindo_teks_eksplanasi'].includes(m?.id)
          )
        );
        const cleanAssignments = sortItemsNewestFirst(
          (parsed.assignments || []).filter(
            (a: any) => !['asg_01_ipa_proyek_planet', 'asg_02_mtk_latihan_pecahan', 'asg_03_bindo_analisis_eksplanasi'].includes(a?.id)
          )
        );
        const cleanMissions = sortItemsNewestFirst(
          (parsed.missions || []).filter(
            (ms: any) => !['mis_01_read_materials', 'mis_02_early_submission', 'mis_03_active_helper'].includes(ms?.id)
          )
        );

        return {
          ...parsed,
          users: updatedUsers,
          school: updatedSchool,
          classes: updatedClasses,
          materials: cleanMaterials,
          assignments: cleanAssignments,
          missions: cleanMissions,
          chatMessages: parsed.chatMessages && parsed.chatMessages.length > 0 ? parsed.chatMessages : INITIAL_CHAT_MESSAGES,
          currentUserId: sessionUserId || null, // null by default when opening fresh link
        };
      } catch (e) {
        console.error('Failed to parse stored state', e);
      }
    }
    return {
      users: INITIAL_USERS,
      school: INITIAL_SCHOOL,
      classes: INITIAL_CLASSES,
      materials: INITIAL_MATERIALS,
      materialProgress: INITIAL_MATERIAL_PROGRESS,
      assignments: INITIAL_ASSIGNMENTS,
      submissions: INITIAL_SUBMISSIONS,
      missions: INITIAL_MISSIONS,
      missionProgress: INITIAL_MISSION_PROGRESS,
      pointLedger: INITIAL_POINT_LEDGER,
      userStats: INITIAL_USER_STATS,
      badges: INITIAL_BADGES,
      userBadges: INITIAL_USER_BADGES,
      announcements: INITIAL_ANNOUNCEMENTS,
      auditLogs: INITIAL_AUDIT_LOGS,
      chatMessages: INITIAL_CHAT_MESSAGES,
      notifications: [
        {
          id: 'notif_init_01',
          userId: 'usr_budi_01',
          title: 'Tugas Baru Diterbitkan',
          message: 'Teguh Firmansyah Apriliana, M.Pd menerbitkan tugas "Poster Karakteristik Planet Favorit".',
          type: 'assignment',
          targetTab: 'tugas',
          targetId: 'asg_01_ipa_proyek_planet',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notif_init_02',
          userId: 'usr_budi_01',
          title: 'Nilai Tugas Keluar!',
          message: 'Tugas Matematika Pecahan dinilai: 95. Kamu dapat +50 Poin!',
          type: 'grade',
          targetTab: 'tugas',
          targetId: 'asg_02_mtk_latihan_pecahan',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ] as NotificationItem[],
      currentUserId: sessionUserId || null, // start at login page
      currentClassId: 'cls_6a',
    };
  });

  const [activeTab, setActiveTab] = useState<string>('beranda');
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(() => isFirestoreQuotaExceeded());
  const [userPresences, setUserPresences] = useState<Record<string, UserPresence>>({});
  const hasLoadedCloudRef = useRef(false);

  useEffect(() => {
    const handleQuota = (e: any) => {
      setIsQuotaExceeded(Boolean(e.detail?.exceeded));
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  // Initialize and seed Firebase if needed on mount, plus subscribe to real-time collections
  useEffect(() => {
    let isMounted = true;
    let unsubList: Array<() => void> = [];

    async function initFirebaseSync() {
      try {
        await seedFirestoreIfEmpty();
        if (isMounted) {
          setIsFirebaseSynced(true);
        }

        // Fetch latest data from Firestore to keep state strictly online synced
        const cloudData = await loadAllFromFirestore();
        if (isMounted && cloudData) {
          setData((prev: any) => {
            const merged = mergeLocalAndCloud(prev, cloudData);
            return merged;
          });
          hasLoadedCloudRef.current = true;
        }

        // Real-time synchronization listeners across all clients
        const unsubSubmissions = subscribeToRealtimeCollection(COLLECTIONS.SUBMISSIONS, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const updatedSubs = { ...prev.submissions };
            items.forEach((sub: any) => {
              if (sub.id) {
                updatedSubs[sub.id] = sub;
              }
              if (sub.assignmentId && sub.userId) {
                updatedSubs[`${sub.assignmentId}_${sub.userId}`] = sub;
              }
            });
            return { ...prev, submissions: updatedSubs };
          });
        });
        unsubList.push(unsubSubmissions);

        const unsubAssignments = subscribeToRealtimeCollection(COLLECTIONS.ASSIGNMENTS, (items) => {
          if (!isMounted) return;
          const sorted = sortItemsNewestFirst((items || []) as Assignment[]);
          setData((prev: any) => ({ ...prev, assignments: sorted }));
        });
        unsubList.push(unsubAssignments);

        const unsubMaterials = subscribeToRealtimeCollection(COLLECTIONS.MATERIALS, (items) => {
          if (!isMounted) return;
          const sorted = sortItemsNewestFirst((items || []) as Material[]);
          setData((prev: any) => ({ ...prev, materials: sorted }));
        });
        unsubList.push(unsubMaterials);

        const unsubAnnouncements = subscribeToRealtimeCollection(COLLECTIONS.ANNOUNCEMENTS, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => ({ ...prev, announcements: items as Announcement[] }));
        });
        unsubList.push(unsubAnnouncements);

        const unsubUsers = subscribeToRealtimeCollection(COLLECTIONS.USERS, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const firestoreUids = new Set(items.map((u: any) => u.uid));
            const now = Date.now();
            // Preserve locally provisioned users from the last 15s not yet in Firestore
            const pendingLocal = (prev.users || []).filter((u: any) => {
              if (firestoreUids.has(u.uid)) return false;
              const created = new Date(u.createdAt || 0).getTime();
              return now - created < 15000;
            });
            const merged = items.map((cloudUser: any) => {
              const local = (prev.users || []).find((u: any) => u.uid === cloudUser.uid);
              return local ? { ...local, ...cloudUser } : cloudUser;
            });
            return { ...prev, users: [...merged, ...pendingLocal] };
          });
        });
        unsubList.push(unsubUsers);

        const unsubUserStats = subscribeToRealtimeCollection(COLLECTIONS.USER_STATS, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const updated = { ...prev.userStats };
            items.forEach((st: any) => {
              const id = st.uid || st.id;
              if (id) updated[id] = st;
            });
            return { ...prev, userStats: updated };
          });
        });
        unsubList.push(unsubUserStats);

        const unsubPointLedger = subscribeToRealtimeCollection(COLLECTIONS.POINT_LEDGER, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const ledgerMap = new Map((prev.pointLedger || []).map((pl: any) => [pl.id, pl]));
            items.forEach((pl: any) => {
              if (pl.id) ledgerMap.set(pl.id, pl);
            });
            const sorted = Array.from(ledgerMap.values()).sort(
              (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            return { ...prev, pointLedger: sorted };
          });
        });
        unsubList.push(unsubPointLedger);

        const unsubMatProgress = subscribeToRealtimeCollection(COLLECTIONS.MATERIAL_PROGRESS, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const updated = { ...prev.materialProgress };
            items.forEach((p: any) => {
              const key = `${p.materialId}_${p.userId}`;
              updated[key] = p;
            });
            return { ...prev, materialProgress: updated };
          });
        });
        unsubList.push(unsubMatProgress);

        const unsubMisProgress = subscribeToRealtimeCollection(COLLECTIONS.MISSION_PROGRESS, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const updated = { ...prev.missionProgress };
            items.forEach((p: any) => {
              if (p.id) updated[p.id] = p;
              const key = `${p.missionId}_${p.userId}_${p.periodKey || 'w1'}`;
              updated[key] = p;
              if (p.missionId && p.userId) {
                updated[`${p.missionId}_${p.userId}`] = p;
                updated[`${p.missionId}_${p.userId}_once`] = p;
                updated[`${p.missionId}_${p.userId}_w1`] = p;
              }
            });
            return { ...prev, missionProgress: updated };
          });
        });
        unsubList.push(unsubMisProgress);

        const unsubMissions = subscribeToRealtimeCollection(COLLECTIONS.MISSIONS, (items) => {
          if (!isMounted) return;
          const sorted = sortItemsNewestFirst((items || []) as Mission[]);
          setData((prev: any) => ({ ...prev, missions: sorted }));
        });
        unsubList.push(unsubMissions);

        const unsubUserBadges = subscribeToRealtimeCollection(COLLECTIONS.USER_BADGES, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const badgeMap = new Map((prev.userBadges || []).map((b: any) => [b.id || `${b.userId}_${b.badgeId}`, b]));
            items.forEach((b: any) => {
              const id = b.id || `${b.userId}_${b.badgeId}`;
              badgeMap.set(id, b);
            });
            return { ...prev, userBadges: Array.from(badgeMap.values()) };
          });
        });
        unsubList.push(unsubUserBadges);

        const unsubChat = subscribeToRealtimeCollection(COLLECTIONS.CHAT_MESSAGES, (items) => {
          if (!isMounted) return;
          setData((prev: any) => {
            if (!items || items.length === 0) {
              return prev;
            }
            const firestoreIds = new Set(items.map((m: any) => m.id));
            const now = Date.now();
            // Preserve pending optimistic messages sent by currentUser within last 15s
            const pendingLocal = (prev.chatMessages || []).filter((m: any) => {
              if (firestoreIds.has(m.id)) return false;
              const msgTime = new Date(m.createdAt || 0).getTime();
              return now - msgTime < 15000 && m.senderId === prev.currentUserId;
            });

            const combined = [
              ...items.map((m: any) => ({
                ...m,
                reactions: m.reactions || {},
              })),
              ...pendingLocal,
            ];

            const sorted = combined.sort(
              (a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            return { ...prev, chatMessages: sorted };
          });
        });
        unsubList.push(unsubChat);

        const unsubNotifications = subscribeToRealtimeCollection(COLLECTIONS.NOTIFICATIONS, (items) => {
          if (!isMounted || !items.length) return;
          setData((prev: any) => {
            const notifMap = new Map((prev.notifications || []).map((n: any) => [n.id, n]));
            items.forEach((n: any) => {
              if (n.id) notifMap.set(n.id, n);
            });
            const sorted = Array.from(notifMap.values()).sort(
              (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            return { ...prev, notifications: sorted };
          });
        });
        unsubList.push(unsubNotifications);

        const unsubPresence = subscribeToRealtimeCollection(COLLECTIONS.USER_PRESENCE, (items) => {
          if (!isMounted) return;
          const presMap: Record<string, UserPresence> = {};
          items.forEach((p: any) => {
            const uid = p.userId || p.id;
            if (uid) {
              presMap[uid] = {
                userId: uid,
                displayName: p.displayName || '',
                role: p.role || 'student',
                avatarUrl: p.avatarUrl,
                classId: p.classId,
                isOnline: Boolean(p.isOnline),
                lastSeen: typeof p.lastSeen === 'number' ? p.lastSeen : Date.now(),
                lastSeenIso: p.lastSeenIso || new Date().toISOString(),
                activity: p.activity,
              };
            }
          });
          setUserPresences(presMap);
        });
        unsubList.push(unsubPresence);
      } catch (err) {
        console.warn('Firebase sync status:', err instanceof Error ? err.message : String(err));
      }
    }

    initFirebaseSync();

    return () => {
      isMounted = false;
      unsubList.forEach((unsub) => unsub());
    };
  }, []);

  const currentUser: User | null = data.currentUserId
    ? (data.users.find((u: User) => u.uid === data.currentUserId) || null)
    : null;
  const currentRole: UserRole | null = currentUser?.role || null;
  const isAuthenticated: boolean = !!currentUser;

  // Heartbeat mechanism for currentUser to maintain real-time online presence in Firestore
  useEffect(() => {
    if (!currentUser || isFirestoreQuotaExceeded()) return;

    let isSubscribed = true;

    const reportHeartbeat = (isOnline: boolean = true) => {
      if (!isSubscribed || !currentUser || isFirestoreQuotaExceeded()) return;
      updateUserPresence({
        userId: currentUser.uid,
        displayName: currentUser.displayName,
        role: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
        classId: data.currentClassId || currentUser.classIds?.[0] || 'cls_6a',
        isOnline,
        lastSeen: Date.now(),
        lastSeenIso: new Date().toISOString(),
        activity: 'Aktif di Aplikasi',
      });
    };

    // Immediate heartbeat upon mount / login
    reportHeartbeat(true);

    // Heartbeat every 90 seconds while page is active
    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && !isFirestoreQuotaExceeded()) {
        reportHeartbeat(true);
      }
    }, 90000);

    const handleBeforeUnload = () => {
      if (!isFirestoreQuotaExceeded()) {
        setUserOffline(currentUser.uid);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isFirestoreQuotaExceeded()) {
        reportHeartbeat(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      handleBeforeUnload();
    };
  }, [currentUser?.uid, data.currentClassId, isQuotaExceeded]);

  // Real-time online check:
  // Current user is always online.
  // Other users are strictly online only if isOnline === true and their heartbeat is within the last 60 seconds.
  const isUserOnline = (userId: string): boolean => {
    if (!userId) return false;
    if (currentUser && currentUser.uid === userId) return true;
    const pres = userPresences[userId];
    if (!pres || !pres.isOnline) return false;
    const now = Date.now();
    return (now - (pres.lastSeen || 0)) < 60000;
  };

  const refreshFromCloud = async () => {
    if (isFirestoreQuotaExceeded()) return;
    try {
      const cloudData = await loadAllFromFirestore();
      if (cloudData) {
        setData((prev: any) => {
          const merged = mergeLocalAndCloud(prev, cloudData);
          return merged;
        });
        setIsFirebaseSynced(true);
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    }
  };

  const syncAllToCloud = async (): Promise<boolean> => {
    if (isFirestoreQuotaExceeded()) return false;
    try {
      setIsFirebaseSynced(false);
      const res = await syncAllStateToFirestore(data);
      if (res) {
        setIsFirebaseSynced(true);
      }
      return res;
    } catch (e) {
      console.warn('Manual sync warning:', e);
      return false;
    }
  };

  // Save to local storage on change
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage quota exceeded or unavailable', e);
    }
  }, [data]);

  // Pastikan siswa selalu berada di kelas tempat ia terdaftar dan tidak dapat memilih kelas lain
  const studentFirstClassId = currentUser?.role === 'student' ? currentUser.classIds?.[0] : undefined;
  useEffect(() => {
    if (studentFirstClassId && data.currentClassId !== studentFirstClassId) {
      setData((prev: any) => ({ ...prev, currentClassId: studentFirstClassId }));
    }
  }, [currentUser?.uid, studentFirstClassId, data.currentClassId]);

  const setCurrentClassId = (classId: string) => {
    setData((prev: any) => ({ ...prev, currentClassId: classId }));
  };

  const switchUser = (userId: string) => {
    const target = data.users.find((u: User) => u.uid === userId);
    if (target) {
      try {
        safeSessionStorage.setItem(SESSION_USER_KEY, userId);
      } catch (e) {}

      setData((prev: any) => ({
        ...prev,
        currentUserId: userId,
        currentClassId: target.classIds?.[0] || prev.currentClassId,
      }));
      setActiveTab('beranda');
    }
  };

  const loginUser = (identifier: string, pass: string, role: UserRole) => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    const found = data.users.find((u: User) => {
      if (u.role !== role) return false;
      if (u.uid && u.uid.toLowerCase() === cleanId) return true;
      if (u.username && u.username.toLowerCase() === cleanId) return true;
      if (u.email && u.email.toLowerCase() === cleanId) return true;
      if (u.studentNumber && u.studentNumber.toLowerCase() === cleanId) return true;
      if (u.displayName && u.displayName.toLowerCase() === cleanId) return true;
      return false;
    });

    if (!found) {
      return {
        success: false,
        message: role === 'student' 
          ? 'Username / Akun siswa tidak ditemukan. Silakan pilih dari dropdown atau hubungi guru.' 
          : 'Email atau username guru tidak ditemukan.',
      };
    }

    const expectedPassword = found.password || (role === 'teacher' ? 'guru123' : '123456');
    const isPasswordValid = cleanPass === expectedPassword;

    if (!isPasswordValid) {
      return {
        success: false,
        message: role === 'teacher'
          ? 'Kata sandi guru salah. Silakan periksa kembali kata sandi akun Anda.'
          : 'Kata sandi salah. Silakan tanyakan kata sandi kepada guru kelas jika lupa.',
      };
    }

    switchUser(found.uid);
    return { success: true };
  };

  const logoutUser = () => {
    try {
      safeSessionStorage.removeItem(SESSION_USER_KEY);
    } catch (e) {}
    setData((prev: any) => ({
      ...prev,
      currentUserId: null,
    }));
  };

  const updateUserProfile = (profileData: {
    displayName?: string;
    username?: string;
    password?: string;
    avatarUrl?: string;
  }): { success: boolean; message?: string } => {
    if (!currentUser) return { success: false, message: 'Tidak ada sesi pengguna aktif.' };
    const now = new Date().toISOString();
    const cleanName = profileData.displayName?.trim();
    const cleanUsername = profileData.username?.trim().toLowerCase();
    const cleanPassword = profileData.password?.trim();

    // Check username uniqueness if modified
    if (cleanUsername && cleanUsername !== currentUser.username?.toLowerCase()) {
      const isUsernameTaken = data.users.some(
        (u: User) => u.uid !== currentUser.uid && u.username?.toLowerCase() === cleanUsername
      );
      if (isUsernameTaken) {
        return {
          success: false,
          message: `Username "${cleanUsername}" sudah digunakan oleh akun lain. Silakan pilih username yang berbeda.`,
        };
      }
    }

    setData((prev: any) => {
      const updatedUsers = prev.users.map((u: User) => {
        if (u.uid === currentUser.uid) {
          const updated: User = {
            ...u,
            ...(cleanName ? { displayName: cleanName, searchName: cleanName.toLowerCase() } : {}),
            ...(cleanUsername ? { username: cleanUsername } : {}),
            ...(cleanPassword ? { password: cleanPassword, mustChangePassword: false } : {}),
            ...(profileData.avatarUrl ? { avatarUrl: profileData.avatarUrl } : {}),
            updatedAt: now,
          };
          syncDocToFirestore(COLLECTIONS.USERS, currentUser.uid, updated);
          return updated;
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
      };
    });

    return { success: true };
  };

  const updateUserAvatar = (avatarUrl: string) => {
    updateUserProfile({ avatarUrl });
  };

  const updateSchoolProfile = async (updated: Partial<School>): Promise<{ success: boolean; message?: string }> => {
    try {
      const now = new Date().toISOString();
      const updatedSchool: School = {
        ...data.school,
        ...updated,
        settings: {
          ...data.school.settings,
          ...(updated.settings || {}),
        },
      };

      setData((prev: any) => ({
        ...prev,
        school: updatedSchool,
        auditLogs: [
          {
            id: `log_${Date.now()}`,
            schoolId: updatedSchool.id,
            actorId: currentUser?.uid || 'usr_guru',
            actorName: currentUser?.displayName || 'Guru Kelas',
            action: 'update_school_profile',
            targetType: 'school',
            targetId: updatedSchool.id,
            details: `Profil sekolah diperbarui menjadi "${updatedSchool.name}" (NPSN: ${updatedSchool.npsn || '-'}).`,
            timestamp: now,
          },
          ...(prev.auditLogs || []),
        ],
      }));

      await syncDocToFirestore(COLLECTIONS.SCHOOL, updatedSchool.id, updatedSchool);
      return { success: true };
    } catch (err: any) {
      console.error('Gagal memperbarui profil sekolah ke Firestore:', err);
      return { success: false, message: err?.message || 'Gagal menyimpan profil sekolah ke database.' };
    }
  };

  const changePassword = (newPass: string) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const updatedUser = { ...currentUser, mustChangePassword: false, password: newPass, updatedAt: now };
    setData((prev: any) => ({
      ...prev,
      users: prev.users.map((u: User) =>
        u.uid === currentUser.uid ? updatedUser : u
      ),
    }));
    syncDocToFirestore(COLLECTIONS.USERS, currentUser.uid, updatedUser);
  };

  const addNotification = (userId: string, title: string, message: string, type: any, targetTab?: string, targetId?: string) => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title,
      message,
      type,
      targetTab,
      targetId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setData((prev: any) => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications],
    }));
    syncDocToFirestore(COLLECTIONS.NOTIFICATIONS, newNotif.id, newNotif);
  };

  const markNotificationRead = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      notifications: prev.notifications.map((n: NotificationItem) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
    syncDocToFirestore(COLLECTIONS.NOTIFICATIONS, id, { isRead: true });
  };

  const markAllNotificationsRead = () => {
    if (!currentUser) return;
    setData((prev: any) => {
      const updated = prev.notifications.map((n: NotificationItem) =>
        n.userId === currentUser.uid ? { ...n, isRead: true } : n
      );
      updated
        .filter((n: NotificationItem) => n.userId === currentUser.uid)
        .forEach((n: NotificationItem) => {
          syncDocToFirestore(COLLECTIONS.NOTIFICATIONS, n.id, { isRead: true });
        });
      return {
        ...prev,
        notifications: updated,
      };
    });
  };

  // Helper to safely update stats & level
  const recalculateUserStats = (
    currentStatsMap: Record<string, UserStats>,
    userId: string,
    pointsDelta: number,
    category: 'academic' | 'participation' | 'mission' | 'adjustment'
  ): Record<string, UserStats> => {
    const user = data.users.find((u: User) => u.uid === userId);
    const existing = currentStatsMap[userId] || {
      uid: userId,
      schoolId: user?.schoolId || INITIAL_SCHOOL.id,
      classId: user?.classIds?.[0] || 'cls_6a',
      totalPoints: 0,
      academicPoints: 0,
      participationPoints: 0,
      level: 1,
      completedAssignments: 0,
      completedMissions: 0,
      badgeCount: 0,
      updatedAt: new Date().toISOString(),
    };

    const newTotal = Math.max(0, existing.totalPoints + pointsDelta);
    let newAcademic = existing.academicPoints;
    let newParticipation = existing.participationPoints;

    if (category === 'academic') {
      newAcademic = Math.max(0, newAcademic + pointsDelta);
    } else {
      newParticipation = Math.max(0, newParticipation + pointsDelta);
    }

    const { currentLevel } = getLevelInfo(newTotal, DEFAULT_LEVELS);
    const prevLevel = existing.level;

    if (currentLevel.level > prevLevel && currentUser && userId === currentUser.uid) {
      fireCelebrationConfetti('level_up');
      addNotification(
        userId,
        `🎉 Selamat! Kamu Naik ke Level ${currentLevel.level}`,
        `Hebat! Kamu sekarang bergelar "${currentLevel.name}". Terus kumpulkan poin untuk tantangan berikutnya!`,
        'point'
      );
    }

    return {
      ...currentStatsMap,
      [userId]: {
        ...existing,
        totalPoints: newTotal,
        academicPoints: newAcademic,
        participationPoints: newParticipation,
        level: currentLevel.level,
        updatedAt: new Date().toISOString(),
      },
    };
  };

  // Student marks material reading complete
  const markMaterialCompleted = (materialId: string) => {
    if (!currentUser) return;
    const key = `${materialId}_${currentUser.uid}`;
    const now = new Date().toISOString();

    setData((prev: any) => {
      const alreadyCompleted = prev.materialProgress[key]?.status === 'completed';

      const updatedProg = {
        ...prev.materialProgress,
        [key]: {
          materialId,
          userId: currentUser.uid,
          classId: data.currentClassId,
          status: 'completed',
          openedAt: prev.materialProgress[key]?.openedAt || now,
          completedAt: now,
        },
      };

      let updatedStats = { ...prev.userStats };
      let updatedLedger = [...prev.pointLedger];

      const targetMat = prev.materials.find((m: Material) => m.id === materialId);
      const pointsEarned = targetMat?.rewardPoints ?? 20;

      if (!alreadyCompleted && pointsEarned > 0) {
        // Award points to student
        const ledgerEntry: PointLedger = {
          id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          schoolId: data.school.id,
          classId: data.currentClassId,
          userId: currentUser.uid,
          amount: pointsEarned,
          category: 'participation',
          sourceType: 'material',
          sourceId: materialId,
          idempotencyKey: `complete_mat_${materialId}_${currentUser.uid}`,
          reason: `Mempelajari Modul Materi: ${targetMat?.title || 'Materi Belajar'}`,
          actorId: 'system',
          actorName: 'Sistem Kelas 6E',
          createdAt: now,
        };
        updatedLedger = [ledgerEntry, ...updatedLedger];
        updatedStats = recalculateUserStats(prev.userStats, currentUser.uid, pointsEarned, 'participation');

        fireCelebrationConfetti('level_up');
        addNotification(
          currentUser.uid,
          '⭐ Poin Materi Diperoleh!',
          `Hebat! Kamu telah menuntaskan modul "${targetMat?.title || 'Materi'}" dan mendapatkan +${pointsEarned} Poin!`,
          'material',
          'materi'
        );
      }

      // Check mission progress for reading materials
      let updatedMissionsProg = { ...prev.missionProgress };
      const activeMaterialMission = prev.missions.find(
        (m: Mission) => m.type === 'material' && m.status === 'active'
      );

      if (activeMaterialMission) {
        const misKey = `${activeMaterialMission.id}_${currentUser.uid}_w1`;
        const currentMProg = updatedMissionsProg[misKey]?.progress || 0;
        const newProg = Math.min(activeMaterialMission.target, currentMProg + 1);
        const isDone = newProg >= activeMaterialMission.target;

        updatedMissionsProg[misKey] = {
          missionId: activeMaterialMission.id,
          userId: currentUser.uid,
          classId: data.currentClassId,
          periodKey: 'w1',
          progress: newProg,
          status: isDone ? 'completed' : 'in_progress',
          completedAt: isDone ? now : undefined,
        };

        if (isDone) {
          addNotification(
            currentUser.uid,
            '🎯 Misi Eksplorasi Materi Selesai!',
            `Kamu telah menuntaskan target membaca materi. Buka menu Misi untuk klaim +${activeMaterialMission.rewardPoints} Poin!`,
            'mission',
            'misi'
          );
        }
      }

      return {
        ...prev,
        materialProgress: updatedProg,
        missionProgress: updatedMissionsProg,
        pointLedger: updatedLedger,
        userStats: updatedStats,
      };
    });

    // Firestore online synchronization for material completion
    const progData = {
      materialId,
      userId: currentUser.uid,
      classId: data.currentClassId,
      status: 'completed',
      openedAt: data.materialProgress[key]?.openedAt || now,
      completedAt: now,
      updatedAt: now,
    };
    syncDocToFirestore(COLLECTIONS.MATERIAL_PROGRESS, key, progData);

    const targetMat = data.materials.find((m: Material) => m.id === materialId);
    const pointsEarned = targetMat?.rewardPoints ?? 20;
    const wasAlreadyCompleted = data.materialProgress[key]?.status === 'completed';

    if (!wasAlreadyCompleted && pointsEarned > 0) {
      const ledgerEntry = {
        id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        schoolId: data.school.id,
        classId: data.currentClassId,
        userId: currentUser.uid,
        amount: pointsEarned,
        category: 'participation',
        sourceType: 'material',
        sourceId: materialId,
        idempotencyKey: `complete_mat_${materialId}_${currentUser.uid}`,
        reason: `Mempelajari Modul Materi: ${targetMat?.title || 'Materi Belajar'}`,
        actorId: 'system',
        actorName: 'Sistem Kelas 6E',
        createdAt: now,
      };
      syncDocToFirestore(COLLECTIONS.POINT_LEDGER, ledgerEntry.id, ledgerEntry);
      const updatedUserStat = recalculateUserStats(data.userStats, currentUser.uid, pointsEarned, 'participation')[currentUser.uid];
      if (updatedUserStat) {
        syncDocToFirestore(COLLECTIONS.USER_STATS, currentUser.uid, updatedUserStat);
      }
    }

    const activeMaterialMission = data.missions.find(
      (m: Mission) => m.type === 'material' && m.status === 'active'
    );
    if (activeMaterialMission) {
      const misKey = `${activeMaterialMission.id}_${currentUser.uid}_w1`;
      const currentMProg = data.missionProgress[misKey]?.progress || 0;
      const newProg = Math.min(activeMaterialMission.target, currentMProg + 1);
      const isDone = newProg >= activeMaterialMission.target;
      syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, misKey, {
        missionId: activeMaterialMission.id,
        userId: currentUser.uid,
        classId: data.currentClassId,
        periodKey: 'w1',
        progress: newProg,
        status: isDone ? 'completed' : 'in_progress',
        completedAt: isDone ? now : undefined,
        updatedAt: now,
      });
    }
  };

  // Student submits assignment
  const submitAssignment = (assignmentId: string, answerText: string, files: any[]) => {
    if (!currentUser) return;
    const targetAsg = data.assignments.find((a: Assignment) => a.id === assignmentId);
    if (!targetAsg) return;

    const subKey = `${assignmentId}_${currentUser.uid}`;
    const existingSub = data.submissions[subKey] || Object.values(data.submissions).find(
      (s: any) => s.assignmentId === assignmentId && s.userId === currentUser.uid
    );
    const now = new Date().toISOString();
    const isLate = new Date(now) > new Date(targetAsg.dueAt);
    const resolvedClassId = targetAsg.classIds?.[0] || currentUser.classIds?.[0] || data.currentClassId || 'cls_6a';

    const newSub: Submission = {
      id: subKey,
      assignmentId,
      userId: currentUser.uid,
      classId: resolvedClassId,
      answerText,
      files,
      status: 'submitted',
      attempt: (existingSub?.attempt || 0) + 1,
      submittedAt: now,
      isLate,
      updatedAt: now,
    };

    fireCelebrationConfetti('submission');

    let updatedMissionsProg = { ...data.missionProgress };
    // Update mission progress for assignment submission
    const assignmentMissions = data.missions.filter((m: Mission) => m.type === 'assignment' && m.status === 'active');
    assignmentMissions.forEach((mis: Mission) => {
      const pKey = mis.repeat === 'once' ? 'once' : 'w1';
      const misKey = `${mis.id}_${currentUser.uid}_${pKey}`;
      const currentProg = data.missionProgress[misKey]?.progress || 0;
      const newProg = Math.min(mis.target, currentProg + 1);
      const isDone = newProg >= mis.target;
      const progData: MissionProgress = {
        id: misKey,
        missionId: mis.id,
        userId: currentUser.uid,
        classId: resolvedClassId,
        periodKey: pKey,
        progress: newProg,
        status: isDone ? 'completed' : 'in_progress',
        completedAt: isDone ? now : undefined,
        updatedAt: now,
      };
      updatedMissionsProg[misKey] = progData;
      updatedMissionsProg[`${mis.id}_${currentUser.uid}`] = progData;
      syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, misKey, progData);
    });

    setData((prev: any) => {
      const updatedSubmissions = {
        ...prev.submissions,
        [subKey]: newSub,
        [newSub.id]: newSub,
      };
      
      // Update student completedAssignments count
      const userStat = prev.userStats[currentUser.uid] || {
        uid: currentUser.uid,
        schoolId: prev.school.id,
        classId: resolvedClassId,
        totalPoints: 0,
        academicPoints: 0,
        participationPoints: 0,
        level: 1,
        completedAssignments: 0,
        completedMissions: 0,
        badgeCount: 0,
        updatedAt: now,
      };

      const updatedStats = {
        ...prev.userStats,
        [currentUser.uid]: {
          ...userStat,
          completedAssignments: (userStat.completedAssignments || 0) + (existingSub?.status ? 0 : 1),
          updatedAt: now,
        },
      };

      // Check first submission badge
      let updatedBadges = [...prev.userBadges];
      const hasFirstBadge = updatedBadges.some(
        (b) => b.userId === currentUser.uid && b.badgeId === 'bdg_first_submission'
      );
      if (!hasFirstBadge) {
        updatedBadges.push({
          id: `${currentUser.uid}_bdg_first_submission`,
          userId: currentUser.uid,
          badgeId: 'bdg_first_submission',
          source: targetAsg.title,
          awardedAt: now,
        });
        fireCelebrationConfetti('badge');
        addNotification(
          currentUser.uid,
          '🎖️ Badge Baru: Langkah Pertama!',
          'Selamat! Kamu meraih lencana pengumpulan tugas pertamamu.',
          'system',
          'profil'
        );
      }

      // Check early bird
      if (!isLate && new Date(targetAsg.dueAt).getTime() - new Date(now).getTime() > 12 * 60 * 60 * 1000) {
        const hasEarlyBadge = updatedBadges.some(
          (b) => b.userId === currentUser.uid && b.badgeId === 'bdg_early_bird'
        );
        if (!hasEarlyBadge) {
          updatedBadges.push({
            id: `${currentUser.uid}_bdg_early_bird`,
            userId: currentUser.uid,
            badgeId: 'bdg_early_bird',
            source: targetAsg.title,
            awardedAt: now,
          });
        }
      }

      return {
        ...prev,
        submissions: updatedSubmissions,
        userStats: updatedStats,
        userBadges: updatedBadges,
        missionProgress: { ...prev.missionProgress, ...updatedMissionsProg },
      };
    });

    // Online persistent synchronization: sync submission and userStats to Firestore
    syncDocToFirestore(COLLECTIONS.SUBMISSIONS, subKey, newSub);
    if (newSub.id !== subKey) {
      syncDocToFirestore(COLLECTIONS.SUBMISSIONS, newSub.id, newSub);
    }
    const updatedUserStat = recalculateUserStats(data.userStats, currentUser.uid, 0, 'academic')[currentUser.uid];
    if (updatedUserStat) {
      syncDocToFirestore(COLLECTIONS.USER_STATS, currentUser.uid, updatedUserStat);
    }

    addNotification(
      currentUser.uid,
      '✅ Tugas Berhasil Dikirim',
      `Tugas "${targetAsg.title}" telah diterima server pada ${new Date().toLocaleTimeString('id-ID')}. Menunggu penilaian guru.`,
      'assignment',
      'tugas'
    );

    // Notify all teachers so they immediately see the submission in their notifications and pending queue
    const teachers = data.users.filter((u: User) => u.role === 'teacher');
    teachers.forEach((t: User) => {
      addNotification(
        t.uid,
        `📥 Tugas Baru Masuk: ${targetAsg.title}`,
        `${currentUser.displayName} baru saja mengumpulkan tugas "${targetAsg.title}". Siap untuk dinilai.`,
        'submission',
        'tugas',
        targetAsg.id
      );
    });
  };

  // Student claims completed mission
  const claimMissionReward = (missionId: string) => {
    if (!currentUser) return;
    const targetMission = data.missions.find((m: Mission) => m.id === missionId);
    if (!targetMission) return;

    const misKey = `${missionId}_${currentUser.uid}_w1`;
    const prog = data.missionProgress[misKey];
    if (!prog || prog.status !== 'completed') return;

    const now = new Date().toISOString();
    const ledgerEntry: PointLedger = {
      id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId: data.school.id,
      classId: data.currentClassId,
      userId: currentUser.uid,
      amount: targetMission.rewardPoints,
      category: 'mission',
      sourceType: 'mission',
      sourceId: missionId,
      idempotencyKey: `claim_${missionId}_${currentUser.uid}_w1`,
      reason: `Menyelesaikan Misi: ${targetMission.title}`,
      actorId: 'system',
      actorName: 'Sistem Kelas 6E',
      createdAt: now,
    };

    fireCelebrationConfetti('level_up');

    setData((prev: any) => {
      const updatedProg = {
        ...prev.missionProgress,
        [misKey]: {
          ...prog,
          status: 'claimed',
        },
      };

      const updatedStats = recalculateUserStats(
        prev.userStats,
        currentUser.uid,
        targetMission.rewardPoints,
        'mission'
      );
      // Increment completed missions
      if (updatedStats[currentUser.uid]) {
        updatedStats[currentUser.uid].completedMissions =
          (updatedStats[currentUser.uid].completedMissions || 0) + 1;
      }

      return {
        ...prev,
        missionProgress: updatedProg,
        pointLedger: [ledgerEntry, ...prev.pointLedger],
        userStats: updatedStats,
      };
    });

    // Online persistent synchronization for claimed missions
    syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, misKey, { ...prog, status: 'claimed', updatedAt: now });
    syncDocToFirestore(COLLECTIONS.POINT_LEDGER, ledgerEntry.id, ledgerEntry);
    const updatedUserStat = recalculateUserStats(data.userStats, currentUser.uid, targetMission.rewardPoints, 'mission')[currentUser.uid];
    if (updatedUserStat) {
      syncDocToFirestore(COLLECTIONS.USER_STATS, currentUser.uid, updatedUserStat);
    }

    addNotification(
      currentUser.uid,
      '🎁 Reward Misi Berhasil Diklaim!',
      `Kamu memperoleh +${targetMission.rewardPoints} Poin dari misi "${targetMission.title}".`,
      'point',
      'profil'
    );
  };

  // Teacher grades a submission
  const gradeSubmission = (
    submissionId: string,
    score: number,
    feedback: string,
    rewardPoints: number
  ) => {
    const sub = data.submissions[submissionId] || Object.values(data.submissions).find(
      (s: any) => s.id === submissionId || `${s.assignmentId}_${s.userId}` === submissionId
    );
    if (!sub) return;

    const targetAsg = data.assignments.find((a: Assignment) => a.id === sub.assignmentId);
    const targetStudent = data.users.find((u: User) => u.uid === sub.userId);
    const now = new Date().toISOString();

    const idempotencyKey = `grade_${sub.assignmentId}_${sub.userId}`;
    const alreadyGraded = sub.status === 'graded';

    const updatedSub: Submission = {
      ...sub,
      status: 'graded',
      score,
      feedback,
      gradedBy: currentUser?.uid || 'usr_guru_01',
      gradedAt: now,
      updatedAt: now,
    };

    const auditEntry: AuditLog = {
      id: `log_${Date.now()}`,
      schoolId: data.school.id,
      actorId: currentUser?.uid || 'usr_guru_01',
      actorName: currentUser?.displayName || 'Teguh Firmansyah Apriliana, M.Pd',
      action: 'grade_submission',
      targetType: 'submission',
      targetId: submissionId,
      metadata: {
        score,
        rewardPoints,
        studentName: targetStudent?.displayName,
        assignmentTitle: targetAsg?.title,
      },
      timestamp: now,
    };

    let createdLedgerEntry: PointLedger | null = null;

    setData((prev: any) => {
      let updatedLedger = [...prev.pointLedger];
      let updatedStats = { ...prev.userStats };
      let updatedBadges = [...prev.userBadges];

      // Add points if not already awarded
      if (!alreadyGraded && rewardPoints > 0) {
        createdLedgerEntry = {
          id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          schoolId: data.school.id,
          classId: sub.classId,
          userId: sub.userId,
          amount: rewardPoints,
          category: 'academic',
          sourceType: 'assignment',
          sourceId: sub.assignmentId,
          idempotencyKey,
          reason: `Nilai ${score} pada Tugas: ${targetAsg?.title || 'Tugas Kelas'}`,
          actorId: currentUser?.uid || 'usr_guru_01',
          actorName: currentUser?.displayName || 'Teguh Firmansyah Apriliana, M.Pd',
          createdAt: now,
        };
        updatedLedger = [createdLedgerEntry, ...updatedLedger];
        updatedStats = recalculateUserStats(prev.userStats, sub.userId, rewardPoints, 'academic');
      }

      // Check perfect score badge
      if (score === 100) {
        const hasPerfectBadge = updatedBadges.some(
          (b) => b.userId === sub.userId && b.badgeId === 'bdg_perfect_score'
        );
        if (!hasPerfectBadge) {
          updatedBadges.push({
            id: `${sub.userId}_bdg_perfect_score`,
            userId: sub.userId,
            badgeId: 'bdg_perfect_score',
            source: targetAsg?.title || 'Nilai 100',
            awardedAt: now,
          });
        }
      }

      return {
        ...prev,
        submissions: {
          ...prev.submissions,
          [submissionId]: updatedSub,
          [sub.id]: updatedSub,
          [`${sub.assignmentId}_${sub.userId}`]: updatedSub,
        },
        pointLedger: updatedLedger,
        userStats: updatedStats,
        userBadges: updatedBadges,
        auditLogs: [auditEntry, ...prev.auditLogs],
      };
    });

    // Firestore online synchronization for submission grading and points
    syncDocToFirestore(COLLECTIONS.SUBMISSIONS, submissionId, updatedSub);
    if (sub.id && sub.id !== submissionId) {
      syncDocToFirestore(COLLECTIONS.SUBMISSIONS, sub.id, updatedSub);
    }
    const altKey = `${sub.assignmentId}_${sub.userId}`;
    if (altKey !== submissionId) {
      syncDocToFirestore(COLLECTIONS.SUBMISSIONS, altKey, updatedSub);
    }

    if (!alreadyGraded && rewardPoints > 0) {
      const updatedUserStat = recalculateUserStats(data.userStats, sub.userId, rewardPoints, 'academic')[sub.userId];
      if (updatedUserStat) {
        syncDocToFirestore(COLLECTIONS.USER_STATS, sub.userId, updatedUserStat);
      }
      if (createdLedgerEntry) {
        syncDocToFirestore(COLLECTIONS.POINT_LEDGER, (createdLedgerEntry as PointLedger).id, createdLedgerEntry);
      }
    }

    addNotification(
      sub.userId,
      `📝 Tugas "${targetAsg?.title}" Telah Dinilai`,
      `Nilai kamu: ${score}/100 (+${rewardPoints} Poin). Ulasan guru: "${feedback}"`,
      'grade',
      'tugas',
      sub.assignmentId
    );
  };

  // Teacher requests revision
  const requestRevision = (submissionId: string, feedback: string) => {
    const sub = data.submissions[submissionId] || Object.values(data.submissions).find(
      (s: any) => s.id === submissionId || `${s.assignmentId}_${s.userId}` === submissionId
    );
    if (!sub) return;

    const targetAsg = data.assignments.find((a: Assignment) => a.id === sub.assignmentId);
    const now = new Date().toISOString();

    const updatedSub: Submission = {
      ...sub,
      status: 'revision_requested',
      feedback,
      gradedBy: currentUser?.uid || 'usr_guru_01',
      updatedAt: now,
    };

    setData((prev: any) => ({
      ...prev,
      submissions: {
        ...prev.submissions,
        [submissionId]: updatedSub,
        [sub.id]: updatedSub,
        [`${sub.assignmentId}_${sub.userId}`]: updatedSub,
      },
    }));

    syncDocToFirestore(COLLECTIONS.SUBMISSIONS, submissionId, updatedSub);
    if (sub.id && sub.id !== submissionId) {
      syncDocToFirestore(COLLECTIONS.SUBMISSIONS, sub.id, updatedSub);
    }
    const altKey = `${sub.assignmentId}_${sub.userId}`;
    if (altKey !== submissionId) {
      syncDocToFirestore(COLLECTIONS.SUBMISSIONS, altKey, updatedSub);
    }

    addNotification(
      sub.userId,
      `🔄 Permintaan Revisi Tugas: ${targetAsg?.title || 'Tugas'}`,
      `Guru meminta kamu memperbaiki tugas. Catatan: "${feedback}". Silakan unggah perbaikan.`,
      'assignment',
      'tugas',
      sub.assignmentId
    );
  };

  // Teacher manually adjusts points
  const adjustStudentPoints = (
    userId: string,
    amount: number,
    category: 'academic' | 'participation' | 'adjustment',
    reason: string
  ) => {
    const targetUser = data.users.find((u: User) => u.uid === userId);
    const now = new Date().toISOString();

    const ledgerEntry: PointLedger = {
      id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId: data.school.id,
      classId: targetUser?.classIds?.[0] || data.currentClassId,
      userId,
      amount,
      category,
      sourceType: 'manual',
      sourceId: `manual_${Date.now()}`,
      idempotencyKey: `adjust_${userId}_${Date.now()}`,
      reason,
      actorId: currentUser.uid,
      actorName: currentUser.displayName,
      createdAt: now,
    };

    const auditEntry: AuditLog = {
      id: `log_${Date.now()}`,
      schoolId: data.school.id,
      actorId: currentUser.uid,
      actorName: currentUser.displayName,
      action: 'adjust_points',
      targetType: 'points',
      targetId: userId,
      metadata: { amount, reason, studentName: targetUser?.displayName, category },
      timestamp: now,
    };

    setData((prev: any) => ({
      ...prev,
      pointLedger: [ledgerEntry, ...prev.pointLedger],
      userStats: recalculateUserStats(prev.userStats, userId, amount, category),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    // Sync points adjustment to Firestore online
    syncDocToFirestore(COLLECTIONS.POINT_LEDGER, ledgerEntry.id, ledgerEntry);
    const updatedUserStat = recalculateUserStats(data.userStats, userId, amount, category)[userId];
    if (updatedUserStat) {
      syncDocToFirestore(COLLECTIONS.USER_STATS, userId, updatedUserStat);
    }

    const isPositive = amount > 0;
    addNotification(
      userId,
      isPositive ? `🌟 Bonus Poin dari Guru (+${amount})` : `⚠️ Pengurangan Poin: Pelanggaran (${amount})`,
      isPositive
        ? `Apresiasi: "${reason}" oleh ${currentUser.displayName}.`
        : `Konsekuensi Pelanggaran: "${reason}" dicatat oleh ${currentUser.displayName}. Poin kamu berkurang ${Math.abs(amount)} poin.`,
      'point',
      'profil'
    );
  };

  // Materials CRUD
  const createMaterial = (mat: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'schoolId'>) => {
    const id = `mat_${Date.now()}`;
    const now = new Date().toISOString();
    const newMat: Material = {
      ...mat,
      id,
      rewardPoints: mat.rewardPoints ?? 20,
      schoolId: data.school.id,
      createdBy: currentUser?.uid || 'usr_guru_01',
      createdAt: now,
      updatedAt: now,
    };

    setData((prev: any) => {
      const updatedMaterials = sortItemsNewestFirst([newMat, ...(prev.materials || [])]);
      const newState = {
        ...prev,
        materials: updatedMaterials,
        auditLogs: [
          {
            id: `log_${Date.now()}`,
            schoolId: data.school.id,
            actorId: currentUser?.uid || 'usr_guru_01',
            actorName: currentUser?.displayName || 'Guru Kelas',
            action: 'create_material',
            targetType: 'material',
            targetId: id,
            metadata: { title: mat.title, subject: mat.subject },
            timestamp: now,
          },
          ...prev.auditLogs,
        ],
      };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });

    // Sync to Firestore online
    syncDocToFirestore(COLLECTIONS.MATERIALS, id, newMat);

    // Notify students
    data.users
      .filter((u: User) => {
        if (u.role !== 'student') return false;
        if (!mat.classIds.some((cid) => (u.classIds || []).includes(cid))) return false;
        if (mat.assignedUserIds && mat.assignedUserIds.length > 0) {
          return mat.assignedUserIds.includes(u.uid);
        }
        return true;
      })
      .forEach((student: User) => {
        addNotification(
          student.uid,
          `📚 Materi Baru: ${mat.title}`,
          `Materi pelajaran "${mat.subject}" telah diterbitkan oleh ${currentUser?.displayName || 'Guru'}.`,
          'material',
          'materi',
          id
        );
      });
  };

  const updateMaterial = (id: string, mat: Partial<Material>) => {
    const now = new Date().toISOString();
    setData((prev: any) => {
      const updated = sortItemsNewestFirst((prev.materials || []).map((m: Material) => (m.id === id ? { ...m, ...mat, updatedAt: now } : m)));
      const target = updated.find((m: Material) => m.id === id);
      if (target) {
        syncDocToFirestore(COLLECTIONS.MATERIALS, id, target);
      }
      const newState = { ...prev, materials: updated };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });
  };

  const deleteMaterial = (id: string) => {
    setData((prev: any) => {
      const updatedMaterials = (prev.materials || []).filter((m: Material) => m.id !== id);
      const updatedProg = { ...(prev.materialProgress || {}) };
      Object.keys(updatedProg).forEach((key) => {
        if (key.startsWith(`${id}_`) || updatedProg[key]?.materialId === id) {
          delete updatedProg[key];
        }
      });
      const newState = {
        ...prev,
        materials: updatedMaterials,
        materialProgress: updatedProg,
      };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });
    deleteDocFromFirestore(COLLECTIONS.MATERIALS, id);
  };

  const saveMaterial = (mat: Partial<Material>) => {
    if (mat.id) {
      updateMaterial(mat.id, mat);
    } else {
      createMaterial(mat as any);
    }
  };

  // Assignments CRUD
  const createAssignment = (asg: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'schoolId'>) => {
    const id = `asg_${Date.now()}`;
    const now = new Date().toISOString();
    const newAsg: Assignment = {
      ...asg,
      id,
      schoolId: data.school.id,
      createdBy: currentUser?.uid || 'usr_guru_01',
      createdAt: now,
      updatedAt: now,
    };

    setData((prev: any) => {
      const updatedAssignments = sortItemsNewestFirst([newAsg, ...(prev.assignments || [])]);
      const newState = {
        ...prev,
        assignments: updatedAssignments,
        auditLogs: [
          {
            id: `log_${Date.now()}`,
            schoolId: data.school.id,
            actorId: currentUser?.uid || 'usr_guru_01',
            actorName: currentUser?.displayName || 'Guru Kelas',
            action: 'create_assignment',
            targetType: 'assignment',
            targetId: id,
            metadata: { title: asg.title, subject: asg.subject, dueAt: asg.dueAt },
            timestamp: now,
          },
          ...prev.auditLogs,
        ],
      };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });

    // Sync to Firestore online
    syncDocToFirestore(COLLECTIONS.ASSIGNMENTS, id, newAsg);

    // Notify students
    data.users
      .filter((u: User) => {
        if (u.role !== 'student') return false;
        if (!asg.classIds.some((cid) => (u.classIds || []).includes(cid))) return false;
        if (asg.assignedUserIds && asg.assignedUserIds.length > 0) {
          return asg.assignedUserIds.includes(u.uid);
        }
        return true;
      })
      .forEach((student: User) => {
        addNotification(
          student.uid,
          `📝 Tugas Baru: ${asg.title}`,
          `Tugas ${asg.subject} berhadiah +${asg.rewardPoints} Poin. Batas pengumpulan: ${new Date(
            asg.dueAt
          ).toLocaleDateString('id-ID')}.`,
          'assignment',
          'tugas',
          id
        );
      });
  };

  const updateAssignment = (id: string, asg: Partial<Assignment>) => {
    const now = new Date().toISOString();
    setData((prev: any) => {
      const updated = sortItemsNewestFirst((prev.assignments || []).map((a: Assignment) => (a.id === id ? { ...a, ...asg, updatedAt: now } : a)));
      const target = updated.find((a: Assignment) => a.id === id);
      if (target) {
        syncDocToFirestore(COLLECTIONS.ASSIGNMENTS, id, target);
      }
      const newState = { ...prev, assignments: updated };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });
  };

  const deleteAssignment = (id: string) => {
    setData((prev: any) => {
      const updatedAssignments = (prev.assignments || []).filter((a: Assignment) => a.id !== id);
      const updatedSubs = { ...(prev.submissions || {}) };
      Object.keys(updatedSubs).forEach((key) => {
        if (key.startsWith(`${id}_`) || updatedSubs[key]?.assignmentId === id) {
          delete updatedSubs[key];
        }
      });
      const newState = {
        ...prev,
        assignments: updatedAssignments,
        submissions: updatedSubs,
      };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });
    deleteDocFromFirestore(COLLECTIONS.ASSIGNMENTS, id);
  };

  const saveAssignment = (asg: Partial<Assignment>) => {
    if (asg.id) {
      updateAssignment(asg.id, asg);
    } else {
      createAssignment(asg as any);
    }
  };

  // Missions CRUD
  const createMission = (mis: Omit<Mission, 'id' | 'createdBy' | 'schoolId'>) => {
    const id = `mis_${Date.now()}`;
    const now = new Date().toISOString();
    const newMis: Mission = {
      ...mis,
      id,
      schoolId: data.school.id,
      createdBy: currentUser?.uid || 'usr_guru_01',
      createdAt: now,
      updatedAt: now,
    };

    setData((prev: any) => {
      const updatedMissions = sortItemsNewestFirst([newMis, ...(prev.missions || [])]);
      const newState = {
        ...prev,
        missions: updatedMissions,
      };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });

    // Sync to Firestore online
    syncDocToFirestore(COLLECTIONS.MISSIONS, id, newMis);
  };

  const saveMission = (mis: Partial<Mission>) => {
    const now = new Date().toISOString();
    if (mis.id) {
      setData((prev: any) => {
        const updated = sortItemsNewestFirst((prev.missions || []).map((m: Mission) => (m.id === mis.id ? { ...m, ...mis, updatedAt: now } : m)));
        const target = updated.find((m: Mission) => m.id === mis.id);
        if (target) {
          syncDocToFirestore(COLLECTIONS.MISSIONS, mis.id!, target);
        }
        const newState = { ...prev, missions: updated };
        try {
          safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (e) {}
        return newState;
      });
    } else {
      createMission(mis as any);
    }
  };

  const deleteMission = (id: string) => {
    setData((prev: any) => {
      const updatedMissions = (prev.missions || []).filter((m: Mission) => m.id !== id);
      const updatedMisProg = { ...(prev.missionProgress || {}) };
      Object.keys(updatedMisProg).forEach((key) => {
        if (key.startsWith(`${id}_`) || updatedMisProg[key]?.missionId === id) {
          delete updatedMisProg[key];
        }
      });
      const newState = {
        ...prev,
        missions: updatedMissions,
        missionProgress: updatedMisProg,
      };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}
      return newState;
    });
    deleteDocFromFirestore(COLLECTIONS.MISSIONS, id);
  };

  const submitMissionForVerification = (missionId: string, answerText?: string, files?: any[]) => {
    if (!currentUser) return;
    const targetMis = data.missions.find((m: Mission) => m.id === missionId);
    if (!targetMis) return;

    const periodKey = targetMis.repeat === 'once' ? 'once' : 'w1';
    const misKey = `${missionId}_${currentUser.uid}_${periodKey}`;
    const now = new Date().toISOString();
    const existingProg = data.missionProgress[misKey] || data.missionProgress[`${missionId}_${currentUser.uid}`];

    const progData: MissionProgress = {
      id: misKey,
      missionId,
      userId: currentUser.uid,
      classId: data.currentClassId,
      periodKey,
      progress: targetMis.target,
      status: 'pending_verification',
      submittedAt: now,
      answerText: answerText || '',
      files: files || [],
      attempt: (existingProg?.attempt || 0) + 1,
      updatedAt: now,
    };

    fireCelebrationConfetti('submission');

    setData((prev: any) => ({
      ...prev,
      missionProgress: {
        ...prev.missionProgress,
        [misKey]: progData,
        [`${missionId}_${currentUser.uid}`]: progData,
      },
    }));

    syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, misKey, progData);
    syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, `${missionId}_${currentUser.uid}`, progData);

    addNotification(
      currentUser.uid,
      '🎯 Laporan Misi Berhasil Dikirim',
      `Laporan untuk misi "${targetMis.title}" telah dikirim ke guru. Menunggu verifikasi & penilaian.`,
      'mission',
      'misi'
    );

    // Notify teachers
    const teachers = data.users.filter((u: User) => u.role === 'teacher');
    teachers.forEach((t: User) => {
      addNotification(
        t.uid,
        `📥 Misi Perlu Diverifikasi: ${targetMis.title}`,
        `${currentUser.displayName} telah menyelesaikan dan mengirimkan bukti misi "${targetMis.title}". Siap untuk dinilai.`,
        'mission',
        'misi',
        targetMis.id
      );
    });
  };

  const verifyManualMission = (missionId: string, userId: string, score?: number, feedback?: string) => {
    const targetMis = data.missions.find((m: Mission) => m.id === missionId);
    const periodKey = targetMis?.repeat === 'once' ? 'once' : 'w1';
    const misKey = `${missionId}_${userId}_${periodKey}`;
    const now = new Date().toISOString();
    const existing = data.missionProgress[misKey] || data.missionProgress[`${missionId}_${userId}`];

    const progData: MissionProgress = {
      ...existing,
      id: misKey,
      missionId,
      userId,
      classId: existing?.classId || data.currentClassId,
      periodKey,
      progress: targetMis?.target || 1,
      status: 'completed',
      completedAt: now,
      verifiedBy: currentUser?.uid || 'usr_guru_01',
      score: score !== undefined ? score : 100,
      feedback: feedback || 'Disetujui dan diverifikasi oleh guru.',
      updatedAt: now,
    };

    setData((prev: any) => ({
      ...prev,
      missionProgress: {
        ...prev.missionProgress,
        [misKey]: progData,
        [`${missionId}_${userId}`]: progData,
        [`${missionId}_${userId}_once`]: progData,
        [`${missionId}_${userId}_w1`]: progData,
      },
    }));

    syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, misKey, progData);
    syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, `${missionId}_${userId}`, progData);

    addNotification(
      userId,
      `🎯 Misi Diverifikasi Guru: ${targetMis?.title || 'Misi'}`,
      `Guru telah menyetujui penyelesaian misimu! ${score ? `(Nilai: ${score}/100)` : ''} Silakan buka menu Misi untuk klaim hadiah!`,
      'mission',
      'misi'
    );
  };

  const gradeAndAwardMission = (missionId: string, userId: string, score: number, feedback?: string) => {
    const targetMis = data.missions.find((m: Mission) => m.id === missionId);
    if (!targetMis) return;
    const periodKey = targetMis.repeat === 'once' ? 'once' : 'w1';
    const misKey = `${missionId}_${userId}_${periodKey}`;
    const now = new Date().toISOString();
    const existing = data.missionProgress[misKey] || data.missionProgress[`${missionId}_${userId}`];
    const rewardPoints = targetMis.rewardPoints || 0;

    const progData: MissionProgress = {
      ...existing,
      id: misKey,
      missionId,
      userId,
      classId: existing?.classId || data.currentClassId,
      periodKey,
      progress: targetMis.target || 1,
      status: 'claimed',
      completedAt: now,
      verifiedBy: currentUser?.uid || 'usr_guru_01',
      score,
      feedback: feedback || `Dinilai oleh guru: ${score}/100`,
      updatedAt: now,
    };

    const ledgerEntry: PointLedger = {
      id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId: data.school.id,
      classId: data.currentClassId,
      userId,
      amount: rewardPoints,
      category: 'mission',
      sourceType: 'mission',
      sourceId: missionId,
      idempotencyKey: `grade_mis_${missionId}_${userId}_${Date.now()}`,
      reason: `Nilai ${score} pada Misi: ${targetMis.title}`,
      actorId: currentUser?.uid || 'usr_guru_01',
      actorName: currentUser?.displayName || 'Teguh Firmansyah Apriliana, M.Pd',
      createdAt: now,
    };

    setData((prev: any) => {
      const updatedStats = recalculateUserStats(prev.userStats, userId, rewardPoints, 'mission');
      if (updatedStats[userId]) {
        updatedStats[userId].completedMissions = (updatedStats[userId].completedMissions || 0) + 1;
      }

      return {
        ...prev,
        missionProgress: {
          ...prev.missionProgress,
          [misKey]: progData,
          [`${missionId}_${userId}`]: progData,
          [`${missionId}_${userId}_once`]: progData,
          [`${missionId}_${userId}_w1`]: progData,
        },
        pointLedger: [ledgerEntry, ...prev.pointLedger],
        userStats: updatedStats,
      };
    });

    syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, misKey, progData);
    syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, `${missionId}_${userId}`, progData);
    syncDocToFirestore(COLLECTIONS.POINT_LEDGER, ledgerEntry.id, ledgerEntry);

    const updatedUserStat = recalculateUserStats(data.userStats, userId, rewardPoints, 'mission')[userId];
    if (updatedUserStat) {
      syncDocToFirestore(COLLECTIONS.USER_STATS, userId, updatedUserStat);
    }

    addNotification(
      userId,
      `🎉 Misi "${targetMis.title}" Dinilai & Poin Diberikan!`,
      `Nilai kamu: ${score}/100 (+${rewardPoints} Poin). ${feedback ? `Ulasan: "${feedback}"` : ''}`,
      'point',
      'misi'
    );
  };

  const gradeAndAwardMissionBulk = (
    missionId: string,
    userIds: string[],
    score: number,
    feedback?: string,
    customRewardPoints?: number
  ) => {
    const targetMis = data.missions.find((m: Mission) => m.id === missionId);
    if (!targetMis || !userIds || userIds.length === 0) return;

    const periodKey = targetMis.repeat === 'once' ? 'once' : 'w1';
    const now = new Date().toISOString();
    const rewardPoints = customRewardPoints !== undefined ? customRewardPoints : (targetMis.rewardPoints || 0);

    const newProgressEntries: Record<string, MissionProgress> = {};
    const newLedgerEntries: PointLedger[] = [];
    let currentStats = { ...data.userStats };

    userIds.forEach((userId, index) => {
      const misKey = `${missionId}_${userId}_${periodKey}`;
      const existing = data.missionProgress[misKey] || data.missionProgress[`${missionId}_${userId}`];

      const progData: MissionProgress = {
        ...existing,
        id: misKey,
        missionId,
        userId,
        classId: existing?.classId || data.currentClassId,
        periodKey,
        progress: targetMis.target || 1,
        status: 'claimed',
        completedAt: now,
        verifiedBy: currentUser?.uid || 'usr_guru_01',
        score,
        feedback: feedback || `Dinilai secara masal oleh guru: ${score}/100`,
        updatedAt: now,
      };

      newProgressEntries[misKey] = progData;
      newProgressEntries[`${missionId}_${userId}`] = progData;
      newProgressEntries[`${missionId}_${userId}_once`] = progData;
      newProgressEntries[`${missionId}_${userId}_w1`] = progData;

      const ledgerEntry: PointLedger = {
        id: `led_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        schoolId: data.school.id,
        classId: data.currentClassId,
        userId,
        amount: rewardPoints,
        category: 'mission',
        sourceType: 'mission',
        sourceId: missionId,
        idempotencyKey: `grade_mis_${missionId}_${userId}_${Date.now()}_${index}`,
        reason: `Nilai ${score} pada Misi: ${targetMis.title} (Penilaian Masal)`,
        actorId: currentUser?.uid || 'usr_guru_01',
        actorName: currentUser?.displayName || 'Teguh Firmansyah Apriliana, M.Pd',
        createdAt: now,
      };

      newLedgerEntries.push(ledgerEntry);

      currentStats = recalculateUserStats(currentStats, userId, rewardPoints, 'mission');
      if (currentStats[userId]) {
        currentStats[userId] = {
          ...currentStats[userId],
          completedMissions: (currentStats[userId].completedMissions || 0) + 1,
        };
      }

      // Sync to Cloud / Firestore
      syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, misKey, progData);
      syncDocToFirestore(COLLECTIONS.MISSION_PROGRESS, `${missionId}_${userId}`, progData);
      syncDocToFirestore(COLLECTIONS.POINT_LEDGER, ledgerEntry.id, ledgerEntry);
      if (currentStats[userId]) {
        syncDocToFirestore(COLLECTIONS.USER_STATS, userId, currentStats[userId]);
      }

      addNotification(
        userId,
        `🎉 Misi "${targetMis.title}" Dinilai & Poin Diberikan!`,
        `Nilai kamu: ${score}/100 (+${rewardPoints} Poin). ${feedback ? `Ulasan: "${feedback}"` : ''}`,
        'point',
        'misi'
      );
    });

    setData((prev: any) => ({
      ...prev,
      missionProgress: {
        ...prev.missionProgress,
        ...newProgressEntries,
      },
      pointLedger: [...newLedgerEntries, ...prev.pointLedger],
      userStats: currentStats,
    }));
  };

  // Announcements
  const createAnnouncement = (ann: Omit<Announcement, 'id' | 'createdAt' | 'authorName' | 'schoolId'>) => {
    const id = `ann_${Date.now()}`;
    const newAnn: Announcement = {
      ...ann,
      id,
      authorName: currentUser?.displayName || 'Guru Kelas',
      schoolId: data.school.id,
      createdAt: new Date().toISOString(),
    };

    setData((prev: any) => ({
      ...prev,
      announcements: [newAnn, ...prev.announcements],
    }));

    // Sync to Firestore online
    syncDocToFirestore(COLLECTIONS.ANNOUNCEMENTS, id, newAnn);

    data.users
      .filter((u: User) => u.role === 'student' && ann.classIds.some((cid) => u.classIds.includes(cid)))
      .forEach((student: User) => {
        addNotification(
          student.uid,
          `📢 Pengumuman: ${ann.title}`,
          ann.content.substring(0, 100) + '...',
          'system',
          'beranda'
        );
      });
  };

  const saveAnnouncement = (ann: Partial<Announcement>) => {
    if (ann.id) {
      setData((prev: any) => {
        const updated = prev.announcements.map((a: Announcement) => (a.id === ann.id ? { ...a, ...ann } : a));
        const target = updated.find((a: Announcement) => a.id === ann.id);
        if (target) {
          syncDocToFirestore(COLLECTIONS.ANNOUNCEMENTS, ann.id!, target);
        }
        return { ...prev, announcements: updated };
      });
    } else {
      createAnnouncement(ann as any);
    }
  };

  const deleteAnnouncement = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      announcements: prev.announcements.filter((a: Announcement) => a.id !== id),
    }));
    deleteDocFromFirestore(COLLECTIONS.ANNOUNCEMENTS, id);
  };

  // Student Provisioning (Teacher/Admin)
  const provisionStudent = (student: {
    displayName: string;
    studentNumber: string;
    absentNumber: number;
    classId: string;
    email?: string;
    username?: string;
    password?: string;
    avatarUrl?: string;
  }) => {
    const uid = `usr_std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const avatarIndex = Math.floor(Math.random() * 10);
    const seeds = ['Panda', 'Tiger', 'Falcon', 'Dolphin', 'Eagle', 'Koala', 'Fox', 'Lion'];
    const seed = seeds[avatarIndex % seeds.length];

    const cleanUsername = student.username?.trim().toLowerCase() ||
      (student.studentNumber ? `siswa_${student.studentNumber.trim()}` : student.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + student.absentNumber);
    const initialPassword = student.password?.trim() || '123456';
    const finalAvatar = student.avatarUrl?.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4`;

    const newUser: User = {
      uid,
      role: 'student',
      status: 'active',
      displayName: student.displayName.trim(),
      searchName: student.displayName.toLowerCase().trim(),
      username: cleanUsername,
      password: initialPassword,
      avatarUrl: finalAvatar,
      schoolId: data.school.id,
      classIds: [student.classId],
      studentNumber: student.studentNumber.trim(),
      absentNumber: student.absentNumber,
      email: student.email?.trim(),
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };

    const newStats: UserStats = {
      uid,
      schoolId: data.school.id,
      classId: student.classId,
      totalPoints: 0,
      academicPoints: 0,
      participationPoints: 0,
      level: 1,
      completedAssignments: 0,
      completedMissions: 0,
      badgeCount: 0,
      updatedAt: now,
    };

    setData((prev: any) => ({
      ...prev,
      users: [...prev.users, newUser],
      userStats: { ...prev.userStats, [uid]: newStats },
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          schoolId: data.school.id,
          actorId: currentUser?.uid || 'usr_guru_01',
          actorName: currentUser?.displayName || 'Guru Kelas',
          action: 'provision_student',
          targetType: 'student',
          targetId: uid,
          metadata: { name: student.displayName, nis: student.studentNumber, username: cleanUsername, classId: student.classId },
          timestamp: now,
        },
        ...prev.auditLogs,
      ],
    }));

    // Firestore sync
    syncDocToFirestore(COLLECTIONS.USERS, uid, newUser);
    syncDocToFirestore(COLLECTIONS.USER_STATS, uid, newStats);
  };

  const provisionMultipleStudents = (
    students: Array<{
      displayName: string;
      studentNumber: string;
      absentNumber: number;
      classId: string;
      email?: string;
      username?: string;
      password?: string;
    }>
  ): number => {
    if (!students.length) return 0;
    const now = new Date().toISOString();
    const seeds = ['Panda', 'Tiger', 'Falcon', 'Dolphin', 'Eagle', 'Koala', 'Fox', 'Lion', 'Bunny', 'Penguin'];

    const newUsers: User[] = [];
    const newStatsMap: Record<string, UserStats> = {};

    students.forEach((s, idx) => {
      const uid = `usr_std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      const seed = seeds[(idx + Math.floor(Math.random() * 5)) % seeds.length];

      const cleanUsername = s.username?.trim().toLowerCase() ||
        (s.studentNumber ? `siswa_${s.studentNumber.toString().trim()}` : s.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + (s.absentNumber || idx + 1));
      const initialPassword = s.password?.trim() || '123456';

      const u: User = {
        uid,
        role: 'student',
        status: 'active',
        displayName: s.displayName.trim(),
        searchName: s.displayName.toLowerCase().trim(),
        username: cleanUsername,
        password: initialPassword,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4`,
        schoolId: data.school.id,
        classIds: [s.classId],
        studentNumber: s.studentNumber?.toString().trim() || '',
        absentNumber: s.absentNumber || idx + 1,
        email: s.email?.trim(),
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      };

      const stats: UserStats = {
        uid,
        schoolId: data.school.id,
        classId: s.classId,
        totalPoints: 0,
        academicPoints: 0,
        participationPoints: 0,
        level: 1,
        completedAssignments: 0,
        completedMissions: 0,
        badgeCount: 0,
        updatedAt: now,
      };

      newUsers.push(u);
      newStatsMap[uid] = stats;

      // Firestore sync in background
      syncDocToFirestore(COLLECTIONS.USERS, uid, u);
      syncDocToFirestore(COLLECTIONS.USER_STATS, uid, stats);
    });

    setData((prev: any) => ({
      ...prev,
      users: [...prev.users, ...newUsers],
      userStats: { ...prev.userStats, ...newStatsMap },
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          schoolId: data.school.id,
          actorId: currentUser?.uid || 'usr_guru_01',
          actorName: currentUser?.displayName || 'Guru Kelas',
          action: 'import_students_excel',
          targetType: 'student',
          targetId: `batch_${newUsers.length}`,
          metadata: { count: newUsers.length, classId: students[0]?.classId },
          timestamp: now,
        },
        ...prev.auditLogs,
      ],
    }));

    return newUsers.length;
  };

  const updateStudent = (userId: string, updateData: Partial<User>) => {
    const now = new Date().toISOString();
    setData((prev: any) => {
      const updatedUsers = prev.users.map((u: User) => {
        if (u.uid === userId) {
          const updated = {
            ...u,
            ...updateData,
            searchName: (updateData.displayName || u.displayName).toLowerCase().trim(),
            updatedAt: now,
          };
          syncDocToFirestore(COLLECTIONS.USERS, userId, updated);
          return updated;
        }
        return u;
      });
      return {
        ...prev,
        users: updatedUsers,
      };
    });
  };

  const updateStudentPhoto = (userId: string, photoUrl: string) => {
    const now = new Date().toISOString();
    const targetUser = data.users.find((u: User) => u.uid === userId);
    if (!targetUser) return;

    setData((prev: any) => {
      const updatedUsers = prev.users.map((u: User) => {
        if (u.uid === userId) {
          const updated = {
            ...u,
            avatarUrl: photoUrl,
            updatedAt: now,
          };
          syncDocToFirestore(COLLECTIONS.USERS, userId, updated);
          return updated;
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
        auditLogs: [
          {
            id: `log_${Date.now()}`,
            schoolId: data.school.id,
            actorId: currentUser?.uid || 'usr_guru_01',
            actorName: currentUser?.displayName || 'Guru Kelas',
            action: 'update_student_photo',
            targetType: 'student',
            targetId: userId,
            metadata: { name: targetUser.displayName },
            timestamp: now,
          },
          ...prev.auditLogs,
        ],
      };
    });

    addNotification(
      userId,
      '📸 Foto Profil Baru',
      'Guru telah memperbarui foto profil resmimu.',
      'system',
      'beranda'
    );
  };

  const setStudentPassword = (userId: string, newPassword: string) => {
    const now = new Date().toISOString();
    setData((prev: any) => {
      const updatedUsers = prev.users.map((u: User) => {
        if (u.uid === userId) {
          const updated = {
            ...u,
            password: newPassword.trim(),
            mustChangePassword: false,
            updatedAt: now,
          };
          syncDocToFirestore(COLLECTIONS.USERS, userId, updated);
          return updated;
        }
        return u;
      });

      return {
        ...prev,
        users: updatedUsers,
        auditLogs: [
          {
            id: `log_${Date.now()}`,
            schoolId: data.school.id,
            actorId: currentUser?.uid || 'usr_guru_01',
            actorName: currentUser?.displayName || 'Guru Kelas',
            action: 'set_student_password',
            targetType: 'student',
            targetId: userId,
            metadata: { updatedBy: currentUser?.displayName || 'Guru Kelas' },
            timestamp: now,
          },
          ...prev.auditLogs,
        ],
      };
    });
  };

  const deleteStudent = (userId: string) => {
    setData((prev: any) => {
      const updatedUsers = (prev.users || []).filter((u: User) => u.uid !== userId);
      const updatedStats = { ...(prev.userStats || {}) };
      delete updatedStats[userId];

      const updatedSubs = { ...(prev.submissions || {}) };
      Object.keys(updatedSubs).forEach((key) => {
        if (updatedSubs[key]?.userId === userId) delete updatedSubs[key];
      });

      const updatedMisProg = { ...(prev.missionProgress || {}) };
      Object.keys(updatedMisProg).forEach((key) => {
        if (updatedMisProg[key]?.userId === userId) delete updatedMisProg[key];
      });

      const updatedMatProg = { ...(prev.materialProgress || {}) };
      Object.keys(updatedMatProg).forEach((key) => {
        if (updatedMatProg[key]?.userId === userId) delete updatedMatProg[key];
      });

      const updatedLedger = (prev.pointLedger || []).filter((pl: any) => pl.userId !== userId);
      const updatedBadges = (prev.userBadges || []).filter((b: any) => b.userId !== userId);

      const newState = {
        ...prev,
        users: updatedUsers,
        userStats: updatedStats,
        submissions: updatedSubs,
        missionProgress: updatedMisProg,
        materialProgress: updatedMatProg,
        pointLedger: updatedLedger,
        userBadges: updatedBadges,
      };

      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {}

      return newState;
    });

    // Delete student and stats documents from Firestore
    deleteDocFromFirestore(COLLECTIONS.USERS, userId);
    deleteDocFromFirestore(COLLECTIONS.USER_STATS, userId);
  };

  const resetStudentPassword = (userId: string): string => {
    const tempPass = `sd${Math.floor(1000 + Math.random() * 9000)}`;
    setData((prev: any) => {
      const updatedUsers = prev.users.map((u: User) =>
        u.uid === userId ? { ...u, password: tempPass, mustChangePassword: true, updatedAt: new Date().toISOString() } : u
      );
      const target = updatedUsers.find((u: User) => u.uid === userId);
      if (target) {
        syncDocToFirestore(COLLECTIONS.USERS, userId, target);
      }
      return {
        ...prev,
        users: updatedUsers,
        auditLogs: [
          {
            id: `log_${Date.now()}`,
            schoolId: data.school.id,
            actorId: currentUser.uid,
            actorName: currentUser.displayName,
            action: 'reset_student_password',
            targetType: 'student',
            targetId: userId,
            metadata: { tempPass },
            timestamp: new Date().toISOString(),
          },
          ...prev.auditLogs,
        ],
      };
    });
    return tempPass;
  };

  const sendChatMessage = async (params: {
    text: string;
    channelType?: 'public' | 'direct';
    recipientId?: string;
    imageUrl?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harus masuk terlebih dahulu.' };
    }
    const trimmedText = params.text.trim();
    if (!trimmedText && !params.imageUrl) {
      return { success: false, message: 'Pesan tidak boleh kosong.' };
    }

    const now = new Date().toISOString();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channelType = params.channelType || 'public';

    const newMessage: ChatMessage = {
      id: messageId,
      classId: data.currentClassId || 'cls_6a',
      channelType,
      recipientId: channelType === 'direct' ? params.recipientId : undefined,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatarUrl,
      text: trimmedText,
      imageUrl: params.imageUrl,
      reactions: {},
      createdAt: now,
    };

    setData((prev: any) => ({
      ...prev,
      chatMessages: [...(prev.chatMessages || []), newMessage],
    }));

    // Async sync to Firestore
    syncDocToFirestore(COLLECTIONS.CHAT_MESSAGES, messageId, newMessage);

    // If direct message, notify the recipient
    if (channelType === 'direct' && params.recipientId && params.recipientId !== currentUser.uid) {
      addNotification(
        params.recipientId,
        `💬 Pesan Baru dari ${currentUser.displayName}`,
        trimmedText.slice(0, 80) || 'Mengirim gambar lampiran...',
        'system',
        'beranda'
      );
    }

    return { success: true };
  };

  const toggleChatReaction = async (messageId: string, emoji: string): Promise<void> => {
    if (!currentUser || !messageId || !emoji) return;

    setData((prev: any) => {
      let targetMessage: ChatMessage | null = null;
      const updatedMessages = (prev.chatMessages || []).map((msg: ChatMessage) => {
        if (msg.id === messageId) {
          const reactions = { ...(msg.reactions || {}) };
          const userList = new Set<string>(reactions[emoji] || []);
          if (userList.has(currentUser.uid)) {
            userList.delete(currentUser.uid);
          } else {
            userList.add(currentUser.uid);
          }

          if (userList.size === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = Array.from(userList);
          }

          const updated: ChatMessage = { ...msg, reactions };
          targetMessage = updated;
          return updated;
        }
        return msg;
      });

      if (targetMessage) {
        syncDocToFirestore(COLLECTIONS.CHAT_MESSAGES, messageId, targetMessage);
      }

      return {
        ...prev,
        chatMessages: updatedMessages,
      };
    });
  };

  const deleteChatMessage = async (messageId: string): Promise<void> => {
    if (!currentUser || !messageId) return;

    setData((prev: any) => {
      const filtered = (prev.chatMessages || []).filter((msg: ChatMessage) => msg.id !== messageId);
      return {
        ...prev,
        chatMessages: filtered,
      };
    });

    deleteDocFromFirestore(COLLECTIONS.CHAT_MESSAGES, messageId);
  };

  const resetToInitialData = () => {
    try {
      safeStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    setData({
      users: INITIAL_USERS,
      school: INITIAL_SCHOOL,
      classes: INITIAL_CLASSES,
      materials: INITIAL_MATERIALS,
      materialProgress: INITIAL_MATERIAL_PROGRESS,
      assignments: INITIAL_ASSIGNMENTS,
      submissions: INITIAL_SUBMISSIONS,
      missions: INITIAL_MISSIONS,
      missionProgress: INITIAL_MISSION_PROGRESS,
      pointLedger: INITIAL_POINT_LEDGER,
      userStats: INITIAL_USER_STATS,
      badges: INITIAL_BADGES,
      userBadges: INITIAL_USER_BADGES,
      announcements: INITIAL_ANNOUNCEMENTS,
      auditLogs: INITIAL_AUDIT_LOGS,
      chatMessages: INITIAL_CHAT_MESSAGES,
      notifications: [
        {
          id: 'notif_init_01',
          userId: 'usr_budi_01',
          title: 'Tugas Baru Diterbitkan',
          message: 'Teguh Firmansyah Apriliana, M.Pd menerbitkan tugas "Poster Karakteristik Planet Favorit".',
          type: 'assignment',
          targetTab: 'tugas',
          targetId: 'asg_01_ipa_proyek_planet',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      currentUserId: null,
      currentClassId: 'cls_6a',
    });
    try {
      safeSessionStorage.removeItem(SESSION_USER_KEY);
    } catch (e) {}
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole,
        isAuthenticated,
        currentClassId: data.currentClassId,
        setCurrentClassId,
        users: data.users || [],
        school: data.school || INITIAL_SCHOOL,
        classes: data.classes || [],
        materials: data.materials || [],
        materialProgress: data.materialProgress || {},
        assignments: data.assignments || [],
        submissions: data.submissions || {},
        missions: data.missions || [],
        missionProgress: data.missionProgress || {},
        pointLedger: data.pointLedger || [],
        userStats: data.userStats || {},
        badges: data.badges || [],
        userBadges: data.userBadges || [],
        announcements: data.announcements || [],
        notifications: data.notifications || [],
        auditLogs: data.auditLogs || [],
        chatMessages: data.chatMessages || [],
        userPresences,
        isUserOnline,
        levels: DEFAULT_LEVELS,
        isFirebaseSynced,
        activeTab,
        setActiveTab,
        switchUser,
        loginUser,
        logoutUser,
        updateUserAvatar,
        updateUserProfile,
        updateSchoolProfile,
        changePassword,
        markMaterialCompleted,
        submitAssignment,
        claimMissionReward,
        createMaterial,
        updateMaterial,
        deleteMaterial,
        saveMaterial,
        createAssignment,
        updateAssignment,
        deleteAssignment,
        saveAssignment,
        gradeSubmission,
        requestRevision,
        adjustStudentPoints,
        createMission,
        saveMission,
        deleteMission,
        submitMissionForVerification,
        verifyManualMission,
        gradeAndAwardMission,
        gradeAndAwardMissionBulk,
        createAnnouncement,
        saveAnnouncement,
        deleteAnnouncement,
        refreshFromCloud,
        provisionStudent,
        provisionMultipleStudents,
        updateStudent,
        updateStudentPhoto,
        deleteStudent,
        setStudentPassword,
        resetStudentPassword,
        markNotificationRead,
        markAllNotificationsRead,
        sendChatMessage,
        toggleChatReaction,
        deleteChatMessage,
        resetToInitialData,
        syncAllToCloud,
        isQuotaExceeded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
