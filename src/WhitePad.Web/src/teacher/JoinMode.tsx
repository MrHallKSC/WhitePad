import { QRCodeSVG } from 'qrcode.react';
import { Student } from '../shared/types/messages';

interface JoinModeProps {
  roomName: string;
  joinToken: string;
  joinUrl: string;
  students: Student[];
  onSwitchToViewer: () => void;
}

function JoinMode({
  roomName,
  joinToken,
  joinUrl,
  students,
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
            <h2>Students Joined ({students.length})</h2>
          </div>

          <div className="students-waiting-list">
            {students.length === 0 ? (
              <p className="no-students">No students have joined yet...</p>
            ) : (
              <ul>
                {students.map(student => (
                  <li key={student.studentId} className="student-waiting-item">
                    <div className="student-info">
                      <span className="student-name">{student.displayName}</span>
                      <span className="student-status drawing">Drawing</span>
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
        >
          Switch to Teacher Viewer Mode
        </button>
        {students.length === 0 && (
          <p className="helper-text">Students will appear here as they join and can draw straight away.</p>
        )}
      </div>
    </div>
  );
}

export default JoinMode;
