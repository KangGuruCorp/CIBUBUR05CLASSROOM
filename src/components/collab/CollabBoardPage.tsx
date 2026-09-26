import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CollabBoard } from '../../types/collabBoard';
import { subscribeToBoard } from '../../services/boardService';
import { CollabBoardCanvas } from './CollabBoardCanvas';
import { CollabBoardLobby } from './CollabBoardLobby';

export const CollabBoardPage: React.FC = () => {
  const { currentUser, setActiveTab } = useApp();
  const [activeBoard, setActiveBoard] = useState<CollabBoard | null>(null);

  // Subscribe to real-time changes for the currently open board
  useEffect(() => {
    if (!activeBoard) return;

    const unsubscribe = subscribeToBoard(activeBoard.id, (updated) => {
      if (updated) {
        setActiveBoard(updated);
      }
    });

    return () => unsubscribe();
  }, [activeBoard?.id]);

  if (!currentUser) return null;

  const handleExit = () => {
    setActiveTab('beranda');
  };

  if (activeBoard) {
    return (
      <CollabBoardCanvas
        board={activeBoard}
        currentUser={{
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          role: currentUser.role,
          avatar: currentUser.avatarUrl,
        }}
        onBack={() => setActiveBoard(null)}
        onExit={handleExit}
      />
    );
  }

  return (
    <CollabBoardLobby
      onSelectBoard={(b) => setActiveBoard(b)}
      onExit={handleExit}
    />
  );
};

export default CollabBoardPage;
