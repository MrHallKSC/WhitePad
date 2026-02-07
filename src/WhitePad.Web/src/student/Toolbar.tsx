import { useState } from 'react';

interface ToolbarProps {
  currentColor: string;
  currentThickness: number;
  isErasing: boolean;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onToggleEraser: () => void;
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
  isErasing,
  onColorChange,
  onThicknessChange,
  onToggleEraser,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  return (
    <div className="toolbar">
      {/* Color Picker */}
      <div className="toolbar-section">
        <label className="toolbar-label">Color:</label>
        <div className="color-picker">
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
      </div>

      {/* Thickness Selector */}
      <div className="toolbar-section">
        <label className="toolbar-label">Thickness:</label>
        <div className="thickness-selector">
          {THICKNESSES.map((thickness) => (
            <button
              key={thickness.value}
              className={`thickness-button ${
                currentThickness === thickness.value ? 'selected' : ''
              }`}
              onClick={() => onThicknessChange(thickness.value)}
              title={thickness.name}
              disabled={isErasing}
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
      </div>

      {/* Tool Buttons */}
      <div className="toolbar-section">
        <button
          className={`tool-button ${isErasing ? 'active' : ''}`}
          onClick={onToggleEraser}
          title={isErasing ? 'Switch to Pen' : 'Switch to Eraser'}
        >
          {isErasing ? '✏️ Pen' : '🧹 Eraser'}
        </button>

        <button
          className="tool-button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>

        <button
          className="tool-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>

        <button
          className="tool-button danger"
          onClick={handleClearClick}
          title="Clear Board"
        >
          🗑️ Clear
        </button>
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
    </div>
  );
}

export default Toolbar;
