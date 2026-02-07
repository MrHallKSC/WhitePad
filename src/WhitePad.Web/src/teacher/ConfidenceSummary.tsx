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

  const getPercentage = (count: number) => {
    if (total === 0) return '0';
    return Math.round((count / total) * 100).toString();
  };

  return (
    <div className="confidence-summary">
      <h3>Student Confidence</h3>
      <div className="confidence-stats">
        <div className="confidence-stat none">
          <span className="confidence-icon">⚪</span>
          <span className="confidence-label">Not Set:</span>
          <span className="confidence-count">{counts.none} ({getPercentage(counts.none)}%)</span>
        </div>
        <div className="confidence-stat red">
          <span className="confidence-icon">🔴</span>
          <span className="confidence-label">Need Help:</span>
          <span className="confidence-count">{counts.red} ({getPercentage(counts.red)}%)</span>
        </div>
        <div className="confidence-stat amber">
          <span className="confidence-icon">🟡</span>
          <span className="confidence-label">Unsure:</span>
          <span className="confidence-count">{counts.amber} ({getPercentage(counts.amber)}%)</span>
        </div>
        <div className="confidence-stat green">
          <span className="confidence-icon">🟢</span>
          <span className="confidence-label">Got It:</span>
          <span className="confidence-count">{counts.green} ({getPercentage(counts.green)}%)</span>
        </div>
      </div>
    </div>
  );
}

export default ConfidenceSummary;
