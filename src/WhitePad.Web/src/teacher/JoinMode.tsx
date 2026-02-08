import { QRCodeSVG } from 'qrcode.react';
import { Student } from '../shared/types/messages';

interface JoinModeProps {
  roomName: string;
  joinToken: string;
  joinUrl: string;
  students: Student[];
  waitingRoomEnabled: boolean;
  onWaitingRoomToggle: (enabled: boolean) => void;
  onSwitchToViewer: () => void;
}

function JoinMode({
  roomName,
  joinToken,
  joinUrl,
  students,
  waitingRoomEnabled,
  onWaitingRoomToggle,
  onSwitchToViewer
}: JoinModeProps) {
  return (
    <div className="join-mode-container">
      <div className="join-mode-header">
        <h1>{roomName}</h1>
        <p className="join-mode-subtitle">Scan QR code or use join code to connect</p>
      </div>

      <div className="join-mode-content">
        <div className="join-code-section">
          <div className="qr-code-large">
            <QRCodeSVG
              value={joinUrl}
              size={300}
              level="M"
              includeMargin={true}
            />
          </div>

          <div className="join-token-display">
            <label>Join Code</label>
            <div className="token-value">{joinToken}</div>
            <p className="join-url-small">{joinUrl}</p>
          </div>
        </div>

        <div className="students-waiting-section">
          <div className="waiting-section-header">
            <h2>Students Waiting ({students.length})</h2>
            <div className="waiting-room-toggle">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={waitingRoomEnabled}
                  onChange={(e) => onWaitingRoomToggle(e.target.checked)}
                />
                <span className="checkbox-text">
                  🔒 Waiting Room
                  <span className="checkbox-hint">
                    {waitingRoomEnabled
                      ? 'Students locked until viewer mode'
                      : 'Students can draw immediately'}
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="students-waiting-list">
            {students.length === 0 ? (
              <p className="no-students">Waiting for students to join...</p>
            ) : (
              <ul>
                {students.map(student => (
                  <li key={student.studentId} className="student-waiting-item">
                    <div className="student-info">
                      <span className="student-name">{student.displayName}</span>
                      {student.isLocked && waitingRoomEnabled && (
                        <span className="student-status locked">🔒 Waiting</span>
                      )}
                    </div>
                    <span className="student-joined-time">
                      {new Date(student.connectedAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="join-mode-actions">
        <button
          type="button"
          className="button primary large"
          onClick={onSwitchToViewer}
          disabled={students.length === 0}
        >
          {waitingRoomEnabled ? 'Start Activity (Unlock & View)' : 'Switch to Student Viewer Mode'}
        </button>
        {students.length === 0 && (
          <p className="helper-text">Wait for students to join before switching</p>
        )}
        {students.length > 0 && waitingRoomEnabled && (
          <p className="helper-text">
            ⚠️ Students are locked and waiting. Click to start the activity.
          </p>
        )}
      </div>
    </div>
  );
}

export default JoinMode;
