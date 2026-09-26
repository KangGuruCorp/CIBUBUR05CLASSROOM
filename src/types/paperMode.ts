export type PaperOption = 'A' | 'B' | 'C' | 'D';

export interface PaperModeAnswer {
  studentId: string; // User UID
  markerId: number; // Marker ID (e.g. 1..50, usually student absentNumber)
  studentName: string;
  selectedOption: PaperOption;
  isCorrect?: boolean;
  score?: number;
  timestamp: number;
}

export type PaperSessionStatus = 'lobby' | 'active' | 'question_closed' | 'summary' | 'completed';

export interface PaperModeSession {
  id: string; // e.g. "paper_session_12345"
  quizId: string;
  classId: string;
  teacherId: string;
  currentQuestionIndex: number;
  status: PaperSessionStatus;
  answersByQuestion: Record<number, Record<string, PaperModeAnswer>>; // questionIndex -> { studentId: PaperModeAnswer }
  showLiveStats: boolean; // whether to show A/B/C/D distribution bar chart on projector
  showCorrectAnswer: boolean; // whether to reveal correct answer on projector
  createdAt: string;
  updatedAt: string;
}

export interface PaperCardStudentInfo {
  studentId: string;
  markerId: number;
  studentName: string;
  absentNumber?: number;
  studentNumber?: string;
  className: string;
}

export interface AiExtractedQuestion {
  id_soal?: string;
  teks_soal: string;
  pilihan: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  kunci_jawaban: 'A' | 'B' | 'C' | 'D';
  pembahasan?: string;
}
