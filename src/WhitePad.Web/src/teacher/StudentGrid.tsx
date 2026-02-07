import { HubConnection } from '@microsoft/signalr';
import { Student } from '../shared/types/messages';
import StudentTile from './StudentTile';

interface StudentGridProps {
  students: Student[];
  connection: HubConnection | null;
  roomId: string;
}

function StudentGrid({ students, connection, roomId }: StudentGridProps) {
  if (students.length === 0) {
    return (
      <div className="student-grid">
        <p>No students connected yet. Share the join URL with students.</p>
      </div>
    );
  }

  return (
    <div className="student-grid">
      {students.map(student => (
        <StudentTile
          key={student.studentId}
          student={student}
          connection={connection}
          roomId={roomId}
        />
      ))}
    </div>
  );
}

export default StudentGrid;
