import { useState } from 'react';

export type ToolType = 'pen' | 'eraser' | 'line' | 'rectangle' | 'triangle' | 'circle' | 'axes';

interface ToolbarProps {
  displayName: string;
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
  displayName,
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThicknessPicker, setShowThicknessPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const [thicknessPickerPos, setThicknessPickerPos] = useState({ top: 0, left: 0 });

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

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setShowColorPicker(false);
  };

  const handleThicknessSelect = (thickness: number) => {
    onThicknessChange(thickness);
    setShowThicknessPicker(false);
  };

  const handleColorPickerToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!showColorPicker) {
      const rect = e.currentTarget.getBoundingClientRect();
      setColorPickerPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
    setShowColorPicker(!showColorPicker);
  };

  const handleThicknessPickerToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!showThicknessPicker) {
      const rect = e.currentTarget.getBoundingClientRect();
      setThicknessPickerPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
    setShowThicknessPicker(!showThicknessPicker);
  };

  return (
    <>
      <div className={`toolbar vertical ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Collapse Toggle */}
        <button
          type="button"
          className="toolbar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Toolbar' : 'Collapse Toolbar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>

        {/* Student Name */}
        {!isCollapsed && (
          <div className="toolbar-student-name">
            {displayName}
          </div>
        )}

        {/* Drawing Tools Section */}
        <div className="toolbar-section tools-section">
          {!isCollapsed && <label className="toolbar-section-label">TOOLS</label>}
          <button
            type="button"
            className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => onToolChange('pen')}
            title="Pen Tool"
          >
            <span className="tool-icon">✏️</span>
            {!isCollapsed && <span className="tool-label">Pen</span>}
          </button>
          <button
            type="button"
            className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => onToolChange('eraser')}
            title="Eraser Tool"
          >
            <span className="tool-icon">🧹</span>
            {!isCollapsed && <span className="tool-label">Eraser</span>}
          </button>
          <button
            type="button"
            className={`tool-btn ${currentTool === 'line' ? 'active' : ''}`}
            onClick={() => onToolChange('line')}
            title="Line Tool"
          >
            <span className="tool-icon">📏</span>
            {!isCollapsed && <span className="tool-label">Line</span>}
          </button>
          <button
            type="button"
            className={`tool-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => onToolChange('rectangle')}
            title="Rectangle Tool"
          >
            <span className="tool-icon">▭</span>
            {!isCollapsed && <span className="tool-label">Rectangle</span>}
          </button>
          <button
            type="button"
            className={`tool-btn ${currentTool === 'triangle' ? 'active' : ''}`}
            onClick={() => onToolChange('triangle')}
            title="Triangle Tool"
          >
            <span className="tool-icon">△</span>
            {!isCollapsed && <span className="tool-label">Triangle</span>}
          </button>
          <button
            type="button"
            className={`tool-btn ${currentTool === 'circle' ? 'active' : ''}`}
            onClick={() => onToolChange('circle')}
            title="Circle Tool"
          >
            <span className="tool-icon">○</span>
            {!isCollapsed && <span className="tool-label">Circle</span>}
          </button>
          <button
            type="button"
            className={`tool-btn ${currentTool === 'axes' ? 'active' : ''}`}
            onClick={() => onToolChange('axes')}
            title="Axes Tool"
          >
            <span className="tool-icon">📐</span>
            {!isCollapsed && <span className="tool-label">Axes</span>}
          </button>
          <button
            type="button"
            className={`tool-btn ${showGrid ? 'active' : ''}`}
            onClick={onToggleGrid}
            title="Toggle Grid"
          >
            <span className="tool-icon">#</span>
            {!isCollapsed && <span className="tool-label">Grid</span>}
          </button>
        </div>

        {/* Color Picker - Horizontal Popup */}
        <div className="toolbar-section picker-section">
          {!isCollapsed && <label className="toolbar-section-label">COLOR</label>}
          <div className="picker-container">
            <button
              type="button"
              className="picker-current-btn"
              onClick={handleColorPickerToggle}
              title="Select Color"
              disabled={isErasing}
            >
              <div
                className="color-preview-large"
                style={{ backgroundColor: currentColor }}
              />
            </button>
            {showColorPicker && (
              <div
                className="picker-popup horizontal"
                style={{ top: `${colorPickerPos.top}px`, left: `${colorPickerPos.left}px` }}
              >
                {COLORS.map((color) => (
                  <button
                    type="button"
                    key={color.hex}
                    className={`color-button ${
                      currentColor === color.hex ? 'selected' : ''
                    }`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => handleColorSelect(color.hex)}
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thickness Picker - Horizontal Popup */}
        <div className="toolbar-section picker-section">
          {!isCollapsed && <label className="toolbar-section-label">SIZE</label>}
          <div className="picker-container">
            <button
              type="button"
              className="picker-current-btn"
              onClick={handleThicknessPickerToggle}
              title="Select Thickness"
            >
              <div
                className="thickness-preview"
                style={{
                  width: `${currentThickness * 2}px`,
                  height: `${currentThickness * 2}px`,
                }}
              />
            </button>
            {showThicknessPicker && (
              <div
                className="picker-popup horizontal"
                style={{ top: `${thicknessPickerPos.top}px`, left: `${thicknessPickerPos.left}px` }}
              >
                {THICKNESSES.map((thickness) => (
                  <button
                    type="button"
                    key={thickness.value}
                    className={`thickness-button ${
                      currentThickness === thickness.value ? 'selected' : ''
                    }`}
                    onClick={() => handleThicknessSelect(thickness.value)}
                    title={thickness.name}
                  >
                    <div
                      className="thickness-preview"
                      style={{
                        width: `${thickness.value * 2}px`,
                        height: `${thickness.value * 2}px`,
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions Section - Icon Only */}
        <div className="toolbar-section actions-section">
          {!isCollapsed && <label className="toolbar-section-label">ACTIONS</label>}
          <div className="actions-icons">
            <button
              type="button"
              className="action-icon-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              type="button"
              className="action-icon-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
            <button
              type="button"
              className="action-icon-btn danger"
              onClick={handleClearClick}
              title="Clear Board"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Confidence Section - Horizontal */}
        <div className="toolbar-section confidence-section">
          {!isCollapsed && <label className="toolbar-section-label">HOW DO YOU FEEL?</label>}
          <div className="confidence-selector horizontal">
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
