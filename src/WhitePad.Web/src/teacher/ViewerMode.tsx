import { HubConnection } from '@microsoft/signalr';
import { useEffect, useRef, useState } from 'react';
import { QuestionChanged, Student } from '../shared/types/messages';
import StudentGrid from './StudentGrid';
import { HubEvents, HubMethods } from '../shared/constants/hubContract';
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
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const currentQuestionRef = useRef<string | null>(null);
  const QUESTION_MAX_LENGTH = 280;

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

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    if (!connection) return;

    const handleQuestionChanged = (message: QuestionChanged) => {
      const nextQuestion = message.question ?? null;
      setCurrentQuestion(nextQuestion);
      setQuestionDraft(prev => {
        const previousQuestion = currentQuestionRef.current ?? '';
        if (prev.trim() === '' || prev === previousQuestion) {
          return nextQuestion ?? '';
        }
        return prev;
      });
    };

    connection.on(HubEvents.QuestionChanged, handleQuestionChanged);
    return () => {
      connection.off(HubEvents.QuestionChanged, handleQuestionChanged);
    };
  }, [connection]);

  const handleSendQuestion = async () => {
    if (!connection) return;
    const trimmed = questionDraft.trim();
    const payload = trimmed.length === 0 ? null : trimmed;
    try {
      await connection.invoke(HubMethods.SetQuestion, roomId, payload);
    } catch (err) {
      console.error('Failed to set question:', err);
    }
  };

  const handleClearQuestion = async () => {
    if (!connection) return;
    setQuestionDraft('');
    try {
      await connection.invoke(HubMethods.SetQuestion, roomId, null);
    } catch (err) {
      console.error('Failed to clear question:', err);
    }
  };

  const openQuestionModal = () => {
    setQuestionDraft(currentQuestion ?? '');
    setIsQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setIsQuestionModalOpen(false);
  };

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
            Back to Join Mode
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
          <button type="button" className="button secondary" onClick={openQuestionModal}>
            Ask a Question
          </button>
        </div>
        <div className="question-status">
          <span className="question-status-label">Question:</span>
          <span className="question-status-text">
            {currentQuestion && currentQuestion.trim().length > 0 ? currentQuestion : 'No question set'}
          </span>
        </div>
      </div>

      {isQuestionModalOpen && (
        <div className="modal-overlay" onClick={closeQuestionModal}>
          <div className="modal-content question-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Class Question</h2>
              <button type="button" className="modal-close" onClick={closeQuestionModal}>
                �
              </button>
            </div>
            <div className="modal-body">
              <textarea
                className="question-textarea"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                placeholder="Type a question for the class..."
                maxLength={QUESTION_MAX_LENGTH}
                rows={4}
              />
              <div className="question-actions">
                <span className="question-limit">
                  {questionDraft.length}/{QUESTION_MAX_LENGTH}
                </span>
                <div className="question-buttons">
                  <button type="button" className="button secondary" onClick={handleSendQuestion}>
                    Send / Update
                  </button>
                  <button type="button" className="button danger" onClick={handleClearQuestion}>
                    Clear Question
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewerMode;











