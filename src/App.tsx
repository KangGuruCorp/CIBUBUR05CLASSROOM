/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';

// Layout & Modals
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { NotificationModal } from './components/layout/NotificationModal';
import { LoginPage } from './components/auth/LoginPage';
import { PasswordChangeModal } from './components/auth/PasswordChangeModal';
import { AvatarPickerModal } from './components/auth/AvatarPickerModal';
import { FloatingChat } from './components/chat/FloatingChat';
import { MobileFullscreenController } from './components/common/MobileFullscreenController';

// Student Views
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentClasswork } from './components/student/StudentClasswork';
import { StudentMissions } from './components/student/StudentMissions';
import { StudentLeaderboard } from './components/student/StudentLeaderboard';
import { StudentProfile } from './components/student/StudentProfile';
import { StudentQuizPage } from './components/student/quiz/StudentQuizPage';

// Teacher Views
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherClasswork } from './components/teacher/TeacherClasswork';
import { TeacherMissions } from './components/teacher/TeacherMissions';
import { TeacherStudents } from './components/teacher/TeacherStudents';
import { TeacherAnnouncements } from './components/teacher/TeacherAnnouncements';
import { TeacherReports } from './components/teacher/TeacherReports';
import { TeacherAuditLogs } from './components/teacher/TeacherAuditLogs';
import { TeacherQuizPage } from './components/teacher/quiz/TeacherQuizPage';
import { AdminDashboard } from './components/admin/AdminDashboard';

// Collaborative Board (Ruang Kolaborasi)
import { CollabBoardPage } from './components/collab/CollabBoardPage';

// Mode Kertas (Paper Mode) Standalone View
import { PaperStandaloneView } from './components/teacher/quiz/paper/PaperStandaloneView';

const MainContent: React.FC = () => {
  const { currentUser, currentRole, activeTab, setActiveTab, users } = useApp();

  // Akses langsung standalone Paper Mode via QR code ponsel guru (?mode=paper-scanner / ?mode=paper-presenter)
  const isPaperModeParam =
    typeof window !== 'undefined' &&
    (window.location.search.includes('mode=paper-scanner') ||
      window.location.search.includes('mode=paper-presenter'));

  if (isPaperModeParam) {
    return <PaperStandaloneView />;
  }

  // Ruang Kolaborasi hanya dapat diakses oleh Guru/Admin; jika siswa membuka tab ini, arahkan ke beranda
  useEffect(() => {
    if (activeTab === 'papan-ide' && currentRole === 'student') {
      setActiveTab('beranda');
    }
  }, [activeTab, currentRole, setActiveTab]);

  // Modal triggers
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Selected deep-link IDs
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // Quick action modal triggers for teacher
  const [openCreateAssignmentInitially, setOpenCreateAssignmentInitially] = useState(false);
  const [openCreateAnnouncementInitially, setOpenCreateAnnouncementInitially] = useState(false);

  // If no user is authenticated, immediately display the Login Page
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1">
          <LoginPage />
        </div>
        <MobileFullscreenController />
      </div>
    );
  }

  const handleOpenAssignment = (id: string) => {
    setSelectedAssignmentId(id);
    setSelectedMaterialId(null);
    setActiveTab('tugas');
  };

  const handleOpenMaterial = (id: string) => {
    setSelectedMaterialId(id);
    setSelectedAssignmentId(null);
    setActiveTab('tugas');
  };

  const renderContent = () => {
    if (currentRole === 'student') {
      switch (activeTab) {
        case 'beranda':
          return (
            <StudentDashboard
              onOpenAssignment={handleOpenAssignment}
              onOpenMaterial={handleOpenMaterial}
            />
          );
        case 'materi':
        case 'tugas':
        case 'tugas-kelas':
          return (
            <StudentClasswork
              selectedItemId={selectedAssignmentId || selectedMaterialId}
              onClearSelected={() => {
                setSelectedAssignmentId(null);
                setSelectedMaterialId(null);
              }}
            />
          );
        case 'quiz':
          return <StudentQuizPage />;
        case 'misi':
          return <StudentMissions />;
        case 'leaderboard':
          return <StudentLeaderboard />;
        case 'profil':
          return (
            <StudentProfile
              onOpenAvatarPicker={() => setShowAvatarPicker(true)}
            />
          );
        default:
          return (
            <StudentDashboard
              onOpenAssignment={handleOpenAssignment}
              onOpenMaterial={handleOpenMaterial}
            />
          );
      }
    } else {
      // Teacher Views
      switch (activeTab) {
        case 'beranda':
          return (
            <TeacherDashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenCreateAssignment={() => {
                setActiveTab('tugas');
                setOpenCreateAssignmentInitially(true);
              }}
              onOpenCreateAnnouncement={() => {
                setActiveTab('pengumuman');
                setOpenCreateAnnouncementInitially(true);
              }}
              onOpenEditProfile={() => setShowAvatarPicker(true)}
            />
          );
        case 'materi':
        case 'tugas':
        case 'tugas-kelas':
          return (
            <TeacherClasswork
              isCreateOpenInitially={openCreateAssignmentInitially}
              onCloseInitialCreate={() => {
                setOpenCreateAssignmentInitially(false);
              }}
            />
          );
        case 'quiz':
          return <TeacherQuizPage />;
        case 'papan-ide':
          return <CollabBoardPage />;
        case 'misi':
          return <TeacherMissions />;
        case 'leaderboard':
          return <StudentLeaderboard />;
        case 'siswa':
          return <TeacherStudents />;
        case 'pengumuman':
          return (
            <TeacherAnnouncements
              isCreateOpenInitially={openCreateAnnouncementInitially}
              onCloseInitialCreate={() => setOpenCreateAnnouncementInitially(false)}
            />
          );
        case 'laporan':
          return <TeacherReports />;
        case 'audit':
          return <TeacherAuditLogs />;
        default:
          return (
            <TeacherDashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenCreateAssignment={() => {
                setActiveTab('tugas');
                setOpenCreateAssignmentInitially(true);
              }}
              onOpenCreateAnnouncement={() => {
                setActiveTab('pengumuman');
                setOpenCreateAnnouncementInitially(true);
              }}
              onOpenEditProfile={() => setShowAvatarPicker(true)}
            />
          );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Quota limit warning banner */}


      {/* Top Header */}
      <Header
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onOpenAvatarPicker={() => setShowAvatarPicker(true)}
        onOpenNotificationModal={() => setShowNotifModal(true)}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar
          onOpenProfile={() => setShowAvatarPicker(true)}
        />

        {/* Dynamic Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Modals */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <AvatarPickerModal
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
      />

      <NotificationModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
      />

      {/* Floating Chat Room for Students & Teachers */}
      <FloatingChat />

      {/* Mobile Auto-Fullscreen Controller */}
      <MobileFullscreenController />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

