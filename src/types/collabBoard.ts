export type BoardElementType = 'sticky' | 'text' | 'shape' | 'drawing';

export interface BoardDrawingPoint {
  x: number;
  y: number;
}

export interface BoardElement {
  id: string;
  type: BoardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  textColor?: string;
  text?: string;
  authorId: string;
  authorName: string;
  authorRole?: 'teacher' | 'student';
  shapeType?: 'rectangle' | 'circle' | 'arrow' | 'line';
  points?: BoardDrawingPoint[];
  strokeWidth?: number;
  fontSize?: number;
  zIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export type BoardTemplate = 'blank' | 'kwl' | 'frayer' | 'brainstorm' | 'reflection';

export interface BoardParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: 'teacher' | 'student';
  canEdit: boolean;
  lastActive: string;
}

export interface CollabBoard {
  id: string;
  code: string; // e.g. "IDE-582"
  title: string;
  description?: string;
  schoolId: string;
  classId: string;
  createdBy: string;
  creatorName: string;
  isLocked: boolean; // Teacher can lock edits
  template: BoardTemplate;
  elements: Record<string, BoardElement>;
  activeParticipants?: Record<string, BoardParticipant>;
  createdAt: string;
  updatedAt: string;
}
