# Confidence Traffic Light Feature

## Overview

The confidence traffic light is a formative assessment tool that allows students to indicate their understanding level in real-time. Teachers can see at a glance which students need support.

---

## User Experience

### Student View

**Confidence Selector in Toolbar**:
- Three clickable buttons in toolbar: 🔴 Red, 🟡 Amber, 🟢 Green
- Default state: No color selected (none)
- Only one can be selected at a time
- Visual feedback: Selected button is highlighted with border/glow
- Button labels:
  - 🔴 "Need Help"
  - 🟡 "Unsure"
  - 🟢 "Got It"
- Click again to deselect (return to "none" state)

**Student View Indicator**:
- Small colored circle (optional) in corner of their own canvas
- Subtle, doesn't interfere with drawing
- Can be toggled off in settings

### Teacher View

**Individual Student Tiles**:
- Small colored circle (12-15px diameter) in bottom-right corner of each tile
- Colors:
  - 🔴 Red: `#EF4444` (student needs help)
  - 🟡 Amber: `#F59E0B` (student unsure)
  - 🟢 Green: `#10B981` (student confident)
  - No circle or gray circle if confidence not set
- Semi-transparent background to stand out against drawings
- Updates in real-time as students change selection

**Confidence Summary Bar**:
- Prominent display at top of teacher dashboard
- Shows counts for each level with color-coded labels:
  ```
  Confidence: 🔴 Need Help: 3  |  🟡 Unsure: 8  |  🟢 Got It: 12  |  ⚪ Not Set: 5
  ```
- Optional: Percentage view (e.g., "🔴 11%  🟡 29%  🟢 43%  ⚪ 17%")
- Updates in real-time
- Can be used to make teaching decisions:
  - Many red → pause and re-explain
  - Many green → move forward
  - Mixed → consider pair/peer support

---

## Technical Implementation

### Backend Changes

#### 1. Update Student Model

**File**: `src/WhitePad.Server/Models/Student.cs`

```csharp
public class Student
{
    public string StudentId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public string InputMode { get; set; } = "draw"; // "draw" or "type"
    public string ConfidenceLevel { get; set; } = "none"; // "none", "red", "amber", "green"
}
```

#### 2. Create Message DTO

**File**: `src/WhitePad.Server/Models/Messages/ConfidenceChanged.cs`

```csharp
namespace WhitePad.Server.Models.Messages;

public class ConfidenceChanged
{
    public string StudentId { get; set; } = string.Empty;
    public string ConfidenceLevel { get; set; } = "none"; // "none", "red", "amber", "green"
}
```

#### 3. Update WhiteboardHub

**File**: `src/WhitePad.Server/Hubs/WhiteboardHub.cs`

Add new method:

```csharp
public async Task SetConfidence(string confidenceLevel)
{
    var connectionId = Context.ConnectionId;

    // Validate confidence level
    var validLevels = new[] { "none", "red", "amber", "green" };
    if (!validLevels.Contains(confidenceLevel))
    {
        _logger.LogWarning("Invalid confidence level: {ConfidenceLevel}", confidenceLevel);
        return;
    }

    // Find student's room
    var rooms = await _roomStateManager.GetAllRoomsAsync();
    var room = rooms.FirstOrDefault(r => r.Participants.Any(p => p.ConnectionId == connectionId));

    if (room == null)
    {
        _logger.LogWarning("Student not in any room, cannot set confidence");
        return;
    }

    var student = room.Participants.FirstOrDefault(p => p.ConnectionId == connectionId);
    if (student == null) return;

    // Update confidence level
    student.ConfidenceLevel = confidenceLevel;
    student.LastSeenAt = DateTime.UtcNow;

    _logger.LogInformation("Student {StudentId} set confidence to {Level}", student.StudentId, confidenceLevel);

    // Notify teacher
    var message = new ConfidenceChanged
    {
        StudentId = student.StudentId,
        ConfidenceLevel = confidenceLevel
    };

    await Clients.Group($"room:{room.RoomId}:teacher").SendAsync("ConfidenceChanged", message);
}
```

#### 4. Update IWhiteboardClient Interface

**File**: `src/WhitePad.Server/Hubs/IWhiteboardClient.cs`

Add method signature:

```csharp
Task ConfidenceChanged(ConfidenceChanged message);
```

---

### Frontend Changes

#### 1. Add TypeScript Interface

**File**: `src/WhitePad.Web/src/shared/types/messages.ts`

```typescript
export interface ConfidenceChanged {
  studentId: string;
  confidenceLevel: 'none' | 'red' | 'amber' | 'green';
}

export interface Student {
  studentId: string;
  displayName: string;
  connectionId?: string;
  connectedAt: string;
  inputMode: string;
  confidenceLevel?: 'none' | 'red' | 'amber' | 'green'; // Add this
}
```

#### 2. Update Toolbar Component

**File**: `src/WhitePad.Web/src/student/Toolbar.tsx`

Add confidence selector section:

```typescript
interface ToolbarProps {
  // ... existing props
  currentConfidence: 'none' | 'red' | 'amber' | 'green';
  onConfidenceChange: (level: 'none' | 'red' | 'amber' | 'green') => void;
}

// In component JSX:
<div className="toolbar-section">
  <label className="toolbar-label">How confident are you?</label>
  <div className="confidence-selector">
    <button
      className={`confidence-button red ${currentConfidence === 'red' ? 'selected' : ''}`}
      onClick={() => onConfidenceChange(currentConfidence === 'red' ? 'none' : 'red')}
      title="Need Help"
    >
      🔴
    </button>
    <button
      className={`confidence-button amber ${currentConfidence === 'amber' ? 'selected' : ''}`}
      onClick={() => onConfidenceChange(currentConfidence === 'amber' ? 'none' : 'amber')}
      title="Unsure"
    >
      🟡
    </button>
    <button
      className={`confidence-button green ${currentConfidence === 'green' ? 'selected' : ''}`}
      onClick={() => onConfidenceChange(currentConfidence === 'green' ? 'none' : 'green')}
      title="Got It!"
    >
      🟢
    </button>
  </div>
</div>
```

#### 3. Update DrawingPage

**File**: `src/WhitePad.Web/src/student/DrawingPage.tsx`

Add state and handler:

```typescript
const [confidenceLevel, setConfidenceLevel] = useState<'none' | 'red' | 'amber' | 'green'>('none');

const handleConfidenceChange = (level: 'none' | 'red' | 'amber' | 'green') => {
  setConfidenceLevel(level);
  connection.invoke('SetConfidence', level).catch(err => {
    console.error('Failed to set confidence:', err);
  });
};

// Pass to Toolbar:
<Toolbar
  // ... existing props
  currentConfidence={confidenceLevel}
  onConfidenceChange={handleConfidenceChange}
/>
```

#### 4. Create ConfidenceSummary Component

**File**: `src/WhitePad.Web/src/teacher/ConfidenceSummary.tsx`

```typescript
import { Student } from '../shared/types/messages';

interface ConfidenceSummaryProps {
  students: Student[];
}

function ConfidenceSummary({ students }: ConfidenceSummaryProps) {
  const counts = {
    red: students.filter(s => s.confidenceLevel === 'red').length,
    amber: students.filter(s => s.confidenceLevel === 'amber').length,
    green: students.filter(s => s.confidenceLevel === 'green').length,
    none: students.filter(s => !s.confidenceLevel || s.confidenceLevel === 'none').length,
  };

  const total = students.length;

  return (
    <div className="confidence-summary">
      <h3>Student Confidence</h3>
      <div className="confidence-stats">
        <div className="confidence-stat red">
          <span className="confidence-icon">🔴</span>
          <span className="confidence-label">Need Help:</span>
          <span className="confidence-count">{counts.red}</span>
        </div>
        <div className="confidence-stat amber">
          <span className="confidence-icon">🟡</span>
          <span className="confidence-label">Unsure:</span>
          <span className="confidence-count">{counts.amber}</span>
        </div>
        <div className="confidence-stat green">
          <span className="confidence-icon">🟢</span>
          <span className="confidence-label">Got It:</span>
          <span className="confidence-count">{counts.green}</span>
        </div>
        <div className="confidence-stat none">
          <span className="confidence-icon">⚪</span>
          <span className="confidence-label">Not Set:</span>
          <span className="confidence-count">{counts.none}</span>
        </div>
      </div>
    </div>
  );
}

export default ConfidenceSummary;
```

#### 5. Update StudentTile Component

**File**: `src/WhitePad.Web/src/teacher/StudentTile.tsx`

Add confidence indicator:

```typescript
// In JSX, after canvas:
{student.confidenceLevel && student.confidenceLevel !== 'none' && (
  <div
    className={`confidence-indicator ${student.confidenceLevel}`}
    title={`Confidence: ${student.confidenceLevel}`}
  />
)}
```

#### 6. Update RoomDashboard

**File**: `src/WhitePad.Web/src/teacher/RoomDashboard.tsx`

Add ConfidenceSummary and listen for confidence changes:

```typescript
import ConfidenceSummary from './ConfidenceSummary';

// In useEffect, add listener:
connection.on('ConfidenceChanged', (message: ConfidenceChanged) => {
  setStudents(prev =>
    prev.map(s =>
      s.studentId === message.studentId
        ? { ...s, confidenceLevel: message.confidenceLevel }
        : s
    )
  );
});

// In JSX, add summary above student grid:
<ConfidenceSummary students={students} />
<StudentGrid students={students} connection={connection} />
```

---

### CSS Styling

**File**: `src/WhitePad.Web/src/styles/global.css`

```css
/* Confidence Selector */
.confidence-selector {
  display: flex;
  gap: 8px;
}

.confidence-button {
  width: 48px;
  height: 48px;
  border: 2px solid #dee2e6;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.confidence-button:hover {
  transform: scale(1.1);
  border-color: #495057;
}

.confidence-button.selected {
  border-width: 3px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.15);
}

.confidence-button.red.selected {
  border-color: #EF4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.confidence-button.amber.selected {
  border-color: #F59E0B;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}

.confidence-button.green.selected {
  border-color: #10B981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

/* Confidence Indicator on Student Tile */
.confidence-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.confidence-indicator.red {
  background-color: #EF4444;
}

.confidence-indicator.amber {
  background-color: #F59E0B;
}

.confidence-indicator.green {
  background-color: #10B981;
}

/* Confidence Summary */
.confidence-summary {
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.confidence-summary h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #212529;
}

.confidence-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.confidence-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.confidence-icon {
  font-size: 20px;
}

.confidence-label {
  font-weight: 500;
  color: #495057;
}

.confidence-count {
  font-weight: 700;
  font-size: 18px;
  color: #212529;
  min-width: 24px;
  text-align: center;
}
```

---

## Classroom Use Cases

### Scenario 1: Quick Check During Explanation
1. Teacher explains a concept
2. Teacher asks: "Show me your confidence level"
3. Students click traffic light (red/amber/green)
4. Teacher glances at summary: "🔴 5  🟡 8  🟢 10"
5. Decision: Amber/Red > 50% → re-explain in different way

### Scenario 2: Before Moving On
1. Teacher finishes topic
2. "Everyone, set your confidence before we move on"
3. Wait for most students to respond (watch "Not Set" count drop)
4. Check individual red/amber students by looking at their tiles
5. Decision: Call on specific students for support or pair them up

### Scenario 3: During Practice Activity
1. Students working on practice problems
2. Traffic light stays visible
3. Teacher circulates, prioritizes helping red students first
4. Students can change level as they progress
5. Real-time feedback helps teacher allocate time effectively

---

## Future Enhancements (Post-Stage 2)

- **Confidence History**: Track confidence changes over time per student
- **Anonymous Mode**: Option to show only aggregate stats (not per-student)
- **Custom Labels**: Let teachers rename the levels (e.g., "Lost", "Following", "Ahead")
- **Sound Alerts**: Optional alert when multiple students go red
- **Confidence Trends**: Chart showing confidence levels across a lesson
- **Integration with Questions**: Link confidence to specific questions/topics

---

## Testing Checklist

- [ ] Student can select red/amber/green confidence level
- [ ] Selected level is visually highlighted
- [ ] Clicking same level again deselects it (returns to "none")
- [ ] Confidence changes send SignalR message to server
- [ ] Server updates student model with confidence level
- [ ] Teacher dashboard receives ConfidenceChanged message
- [ ] Confidence indicator appears on correct student tile
- [ ] Indicator shows correct color (red/amber/green)
- [ ] Confidence summary shows correct counts
- [ ] Summary updates in real-time as students change levels
- [ ] Multiple students can change confidence simultaneously
- [ ] Confidence persists when student refreshes (if they rejoin same session)
- [ ] No console errors
- [ ] Performance remains smooth with 10+ students changing levels

---

## Design Rationale

**Why Traffic Light Colors?**
- Universally understood metaphor
- Red = stop/need help, Amber = caution/unsure, Green = go/confident
- Works for all ages and subjects

**Why Bottom-Right Corner?**
- Least likely to interfere with student drawings
- Consistent position for quick teacher scanning
- Far from toolbar to avoid accidental clicks

**Why Real-Time Updates?**
- Teachers need immediate feedback during lessons
- Enables responsive teaching adjustments
- Matches the real-time nature of the drawing tool

**Why Aggregate Summary?**
- Quick overview for whole-class decisions
- Reduces cognitive load (teacher doesn't scan 28 tiles individually)
- Shows trends and patterns at a glance
