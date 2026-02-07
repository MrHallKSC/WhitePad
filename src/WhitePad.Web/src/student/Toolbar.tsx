import { useState } from 'react';

export type ToolType = 'pen' | 'eraser' | 'line' | 'rectangle' | 'triangle' | 'circle' | 'axes';

interface ToolbarProps {
  currentColor: string;
  currentThickness: number;
  currentTool: ToolType;
  currentConfidence: 'none' | 'red' | 'amber' | 'green';
  showGrid: boolean;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onToolChange: (tool: ToolType) => void;
  onConfidenceChange: (level: 'none' | 'red' | 'amber' | 'green') => void;
  onToggleGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'White', hex: '#FFFFFF' },
];

const THICKNESSES = [
  { name: 'Extra Thin', value: 1 },
  { name: 'Thin', value: 2 },
  { name: 'Medium', value: 4 },
  { name: 'Thick', value: 6 },
  { name: 'Extra Thick', value: 10 },
];

function Toolbar({
  currentColor,
  currentThickness,
  currentTool,
  currentConfidence,
  showGrid,
  onColorChange,
  onThicknessChange,
  onToolChange,
  onConfidenceChange,
  onToggleGrid,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [colorsExpanded, setColorsExpanded] = useState(true);
  const [thicknessExpanded, setThicknessExpanded] = useState(true);

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleClearConfirm = () => {
    onClear();
    setShowClearConfirm(false);
  };

  const handleClearCancel = () => {
    setShowClearConfirm(false);
  };

  const isErasing = currentTool === 'eraser';

  return (
    <>
      <div className={`toolbar vertical ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Collapse Toggle */}
        <button
          className="toolbar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Toolbar' : 'Collapse Toolbar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>

        {/* Drawing Tools Section */}
        <div className="toolbar-section tools-section">
          {!isCollapsed && <label className="toolbar-section-label">TOOLS</label>}
          <button
            className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => onToolChange('pen')}
            title="Pen Tool"
          >
            <span className="tool-icon">✏️</span>
            {!isCollapsed && <span className="tool-label">Pen</span>}
          </button>
          <button
            className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => onToolChange('eraser')}
            title="Eraser Tool"
          >
            <span className="tool-icon">🧹</span>
            {!isCollapsed && <span className="tool-label">Eraser</span>}
          </button>
          <button
            className={`tool-btn ${currentTool === 'line' ? 'active' : ''}`}
            onClick={() => onToolChange('line')}
            title="Line Tool"
          >
            <span className="tool-icon">📏</span>
            {!isCollapsed && <span className="tool-label">Line</span>}
          </button>
          <button
            className={`tool-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => onToolChange('rectangle')}
            title="Rectangle Tool"
          >
            <span className="tool-icon">▭</span>
            {!isCollapsed && <span className="tool-label">Rectangle</span>}
          </button>
          <button
            className={`tool-btn ${currentTool === 'triangle' ? 'active' : ''}`}
            onClick={() => onToolChange('triangle')}
            title="Triangle Tool"
          >
            <span className="tool-icon">△</span>
            {!isCollapsed && <span className="tool-label">Triangle</span>}
          </button>
          <button
            className={`tool-btn ${currentTool === 'circle' ? 'active' : ''}`}
            onClick={() => onToolChange('circle')}
            title="Circle Tool"
          >
            <span className="tool-icon">○</span>
            {!isCollapsed && <span className="tool-label">Circle</span>}
          </button>
          <button
            className={`tool-btn ${currentTool === 'axes' ? 'active' : ''}`}
            onClick={() => onToolChange('axes')}
            title="Axes Tool"
          >
            <span className="tool-icon">📐</span>
            {!isCollapsed && <span className="tool-label">Axes</span>}
          </button>
          <button
            className={`tool-btn ${showGrid ? 'active' : ''}`}
            onClick={onToggleGrid}
            title="Toggle Grid"
          >
            <span className="tool-icon">#</span>
            {!isCollapsed && <span className="tool-label">Grid</span>}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* Colors Section */}
            <div className="toolbar-section collapsible-section">
              <button
                type="button"
                className="toolbar-section-label clickable"
                onClick={() => setColorsExpanded(!colorsExpanded)}
              >
                COLORS {colorsExpanded ? '▼' : '▶'}
              </button>
              {colorsExpanded && (
                <div className="color-picker-grid">
                  {COLORS.map((color) => (
                    <button
                      key={color.hex}
                      className={`color-button ${
                        currentColor === color.hex && !isErasing ? 'selected' : ''
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => onColorChange(color.hex)}
                      title={color.name}
                      disabled={isErasing}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thickness Section */}
            <div className="toolbar-section collapsible-section">
              <button
                type="button"
                className="toolbar-section-label clickable"
                onClick={() => setThicknessExpanded(!thicknessExpanded)}
              >
                THICKNESS {thicknessExpanded ? '▼' : '▶'}
              </button>
              {thicknessExpanded && (
                <div className="thickness-selector-vertical">
                  {THICKNESSES.map((thickness) => (
                    <button
                      key={thickness.value}
                      className={`thickness-button ${
                        currentThickness === thickness.value ? 'selected' : ''
                      }`}
                      onClick={() => onThicknessChange(thickness.value)}
                      title={thickness.name}
                    >
                      <div
                        className="thickness-preview"
                        style={{
                          width: `${thickness.value * 2}px`,
                          height: `${thickness.value * 2}px`,
                        }}
                      />
                      <span className="thickness-label">{thickness.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions Section */}
        <div className="toolbar-section actions-section">
          {!isCollapsed && <label className="toolbar-section-label">ACTIONS</label>}
          <button
            className="action-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <span className="action-icon">↶</span>
            {!isCollapsed && <span className="action-label">Undo</span>}
          </button>
          <button
            className="action-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <span className="action-icon">↷</span>
            {!isCollapsed && <span className="action-label">Redo</span>}
          </button>
          <button
            className="action-btn danger"
            onClick={handleClearClick}
            title="Clear Board"
          >
            <span className="action-icon">🗑️</span>
            {!isCollapsed && <span className="action-label">Clear</span>}
          </button>
        </div>

        {/* Confidence Section */}
        <div className="toolbar-section confidence-section">
          {!isCollapsed && <label className="toolbar-section-label">CONFIDENCE</label>}
          <div className={`confidence-selector ${isCollapsed ? 'vertical' : 'vertical'}`}>
            <button
              type="button"
              className={`confidence-button red ${currentConfidence === 'red' ? 'selected' : ''}`}
              onClick={() => onConfidenceChange(currentConfidence === 'red' ? 'none' : 'red')}
              title="Need Help"
            >
              🔴
            </button>
            <button
              type="button"
              className={`confidence-button amber ${currentConfidence === 'amber' ? 'selected' : ''}`}
              onClick={() => onConfidenceChange(currentConfidence === 'amber' ? 'none' : 'amber')}
              title="Unsure"
            >
              🟡
            </button>
            <button
              type="button"
              className={`confidence-button green ${currentConfidence === 'green' ? 'selected' : ''}`}
              onClick={() => onConfidenceChange(currentConfidence === 'green' ? 'none' : 'green')}
              title="Got It!"
            >
              🟢
            </button>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Clear Board?</h3>
            <p>This will erase all your work. Are you sure?</p>
            <div className="modal-buttons">
              <button className="button danger" onClick={handleClearConfirm}>
                Yes, Clear
              </button>
              <button className="button" onClick={handleClearCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Toolbar;
