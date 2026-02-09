import { HubConnection } from '@microsoft/signalr';
import { useEffect, useState } from 'react';
import { Student } from '../shared/types/messages';
import StudentGrid from './StudentGrid';
import { HubMethods } from '../shared/constants/hubContract';
import ConfidenceSummary from './ConfidenceSummary';

interface ViewerModeProps {
  roomName: string;
  roomId: string;
  students: Student[];
  connection: HubConnection | null;
  onSwitchToJoin: () => void;
}

function ViewerMode({ roomName, roomId, students, connection, onSwitchToJoin }: ViewerModeProps) {
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);

  const handleLockAll = async () => {
    if (!connection) return;
    try {
      await connection.invoke(HubMethods.LockAllStudents, roomId);
    } catch (err) {
      console.error('Failed to lock all students:', err);
    }
  };

  const handleUnlockAll = async () => {
    if (!connection) return;
    try {
      await connection.invoke(HubMethods.UnlockAllStudents, roomId);
    } catch (err) {
      console.error('Failed to unlock all students:', err);
    }
  };

  const handleClearAll = async () => {
    if (!connection) return;
    if (!confirm('Clear all student boards? This cannot be undone.')) return;
    try {
      await connection.invoke(HubMethods.ClearAllBoards, roomId);
    } catch (err) {
      console.error('Failed to clear all boards:', err);
    }
  };

  useEffect(() => {
    if (!focusedStudentId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFocusedStudentId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedStudentId]);

  useEffect(() => {
    if (!focusedStudentId) return;
    const stillPresent = students.some(student => student.studentId === focusedStudentId);
    if (!stillPresent) {
      setFocusedStudentId(null);
    }
  }, [focusedStudentId, students]);

  return (
    <div className="viewer-mode-container">
      <div className="viewer-mode-header">
        <div className="viewer-mode-title">
          <h1>{roomName}</h1>
          <p className="student-count">Students Connected: {students.length}</p>
        </div>

        <ConfidenceSummary students={students} />

        <div className="viewer-mode-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onSwitchToJoin}
          >
            ← Back to Join Mode
          </button>
        </div>
      </div>

      <StudentGrid
        students={students}
        connection={connection}
        roomId={roomId}
        focusedStudentId={focusedStudentId}
        onFocusStudent={setFocusedStudentId}
        onExitFocus={() => setFocusedStudentId(null)}
      />

      <div className="classroom-controls">
        <h3>Classroom Controls</h3>
        <div className="control-buttons">
          <button type="button" className="button secondary" onClick={handleLockAll}>
            🔒 Lock All Students
          </button>
          <button type="button" className="button secondary" onClick={handleUnlockAll}>
            🔓 Unlock All Students
          </button>
          <button type="button" className="button danger" onClick={handleClearAll}>
            🗑️ Clear All Boards
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewerMode;

