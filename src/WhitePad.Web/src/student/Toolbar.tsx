import { useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import type { BackgroundType, PaperColor } from '../shared/types/messages';

export type ToolType = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'arrow' | 'axesL' | 'axesCross';

interface ToolbarProps {
  displayName: string;
  currentColor: string;
  currentThickness: number;
  currentTool: ToolType;
  currentConfidence: 'none' | 'red' | 'amber' | 'green';
  currentBackground: BackgroundType;
  currentPaperColor: PaperColor;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onToolChange: (tool: ToolType) => void;
  onConfidenceChange: (level: 'none' | 'red' | 'amber' | 'green') => void;
  onBackgroundChange: (background: BackgroundType) => void;
  onPaperColorChange: (paperColor: PaperColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToolbarResized?: () => void;
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

const TOOL_OPTIONS: Array<{ tool: ToolType; icon: string; label: string; title: string }> = [
  { tool: 'pen', icon: '✏️', label: 'Pen', title: 'Pen Tool' },
  { tool: 'eraser', icon: '🧹', label: 'Eraser', title: 'Eraser Tool' },
  { tool: 'line', icon: '📏', label: 'Line', title: 'Line Tool' },
  { tool: 'rectangle', icon: '▭', label: 'Rectangle', title: 'Rectangle Tool' },
  { tool: 'circle', icon: '○', label: 'Circle', title: 'Circle Tool' },
  { tool: 'arrow', icon: '→', label: 'Arrow', title: 'Arrow Tool' },
  { tool: 'axesL', icon: '⌞', label: 'L-Axes', title: 'L-shaped Axes (bottom-left origin)' },
  { tool: 'axesCross', icon: '✛', label: '+-Axes', title: 'Cross Axes (center origin)' },
];

const BACKGROUND_OPTIONS: Array<{ value: BackgroundType; icon: string; label: string; title: string }> = [
  { value: 'none', icon: '□', label: 'None', title: 'No Background' },
  { value: 'dotted', icon: '⋮⋮', label: 'Dotted', title: 'Dotted Grid' },
  { value: 'lined', icon: '☰', label: 'Lined', title: 'Lined Paper' },
  { value: 'squares', icon: '⊞', label: 'Squares', title: 'Square Grid' },
];

const PAPER_OPTIONS: Array<{ value: PaperColor; color: string; label: string; title: string }> = [
  { value: 'white', color: '#FFFFFF', label: 'White', title: 'White Paper' },
  { value: 'buff', color: '#F4E4BC', label: 'Buff', title: 'Buff Paper' },
];

const CONFIDENCE_OPTIONS = [
  { value: 'red' as const, icon: '🔴', title: 'Need Help', className: 'red' },
  { value: 'amber' as const, icon: '🟡', title: 'Unsure', className: 'amber' },
  { value: 'green' as const, icon: '🟢', title: 'Got It!', className: 'green' },
];

function Toolbar({
  displayName,
  currentColor,
  currentThickness,
  currentTool,
  currentConfidence,
  currentBackground,
  currentPaperColor,
  onColorChange,
  onThicknessChange,
  onToolChange,
  onConfidenceChange,
  onBackgroundChange,
  onPaperColorChange,
  onUndo,
  onRedo,
  onClear,
  onToolbarResized,
  canUndo,
  canRedo,
}: ToolbarProps) {
  type PickerType = 'color' | 'thickness' | 'confidence' | 'background' | 'paper';

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType | null>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    if (!activePicker) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (target.closest('.picker-popup') || target.closest('.picker-current-btn')) {
        return;
      }

      setActivePicker(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
    };
  }, [activePicker]);

  const handleCollapseToggle = () => {
    setIsCollapsed(!isCollapsed);
    // Notify parent after a delay to allow CSS transition to complete
    if (onToolbarResized) {
      setTimeout(() => {
        onToolbarResized();
      }, 350); // Wait for CSS transition (usually 300ms) plus a bit extra
    }
  };

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
    setActivePicker(null);
  };

  const handleThicknessSelect = (thickness: number) => {
    onThicknessChange(thickness);
    setActivePicker(null);
  };

  const handlePickerToggle = (pickerType: PickerType) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const shouldOpen = activePicker !== pickerType;
    if (shouldOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setPickerPos({
        top: rect.top,
        left: rect.right + 8,
      });
      setActivePicker(pickerType);
      return;
    }

    setActivePicker(null);
  };

  const handleConfidenceSelect = (level: 'none' | 'red' | 'amber' | 'green') => {
    onConfidenceChange(level);
    setActivePicker(null);
  };

  const handleBackgroundSelect = (background: BackgroundType) => {
    onBackgroundChange(background);
    setActivePicker(null);
  };

  const handlePaperSelect = (paperColor: PaperColor) => {
    onPaperColorChange(paperColor);
    setActivePicker(null);
  };

  const handleConfidenceToggle = (level: 'red' | 'amber' | 'green') => {
    onConfidenceChange(currentConfidence === level ? 'none' : level);
  };

  const getConfidenceIcon = (level: 'none' | 'red' | 'amber' | 'green') => {
    switch (level) {
      case 'red': return '🔴';
      case 'amber': return '🟡';
      case 'green': return '🟢';
      default: return '⚪';
    }
  };

  const getBackgroundIcon = (bg: BackgroundType) => {
    switch (bg) {
      case 'dotted': return '⋮⋮';
      case 'lined': return '☰';
      case 'squares': return '⊞';
      default: return '□';
    }
  };

  const currentPaperOption = PAPER_OPTIONS.find(option => option.value === currentPaperColor) ?? PAPER_OPTIONS[0];

  return (
    <>
      <div className={`toolbar vertical ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Collapse Toggle */}
        <button
          type="button"
          className="toolbar-collapse-btn"
          onClick={handleCollapseToggle}
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
          {TOOL_OPTIONS.map((tool) => (
            <button
              type="button"
              key={tool.tool}
              className={`tool-btn ${currentTool === tool.tool ? 'active' : ''}`}
              onClick={() => onToolChange(tool.tool)}
              title={tool.title}
            >
              <span className="tool-icon">{tool.icon}</span>
              {!isCollapsed && <span className="tool-label">{tool.label}</span>}
            </button>
          ))}
        </div>

        {/* Background Picker */}
        <div className="toolbar-section picker-section">
          {!isCollapsed && <label className="toolbar-section-label">BACKGROUND</label>}
          <div className="picker-container">
            <button
              type="button"
              className="picker-current-btn"
              onClick={handlePickerToggle('background')}
              title="Select Background"
            >
              <span style={{ fontSize: '18px' }}>{getBackgroundIcon(currentBackground)}</span>
            </button>
            {activePicker === 'background' && (
              portalTarget && createPortal(
                <div
                  className="picker-popup vertical"
                  style={{ top: `${pickerPos.top}px`, left: `${pickerPos.left}px` }}
                >
                  {BACKGROUND_OPTIONS.map((background) => (
                    <button
                      type="button"
                      key={background.value}
                      className={`background-button ${currentBackground === background.value ? 'selected' : ''}`}
                      onClick={() => handleBackgroundSelect(background.value)}
                      title={background.title}
                    >
                      <span className="bg-icon">{background.icon}</span>
                      <span className="bg-label">{background.label}</span>
                    </button>
                  ))}
                </div>,
                portalTarget
              )
            )}
          </div>
        </div>

        {/* Paper Picker */}
        <div className="toolbar-section picker-section">
          {!isCollapsed && <label className="toolbar-section-label">PAPER</label>}
          <div className="picker-container">
            <button
              type="button"
              className="picker-current-btn"
              onClick={handlePickerToggle('paper')}
              title="Select Paper"
            >
              <div
                className="color-preview-large"
                style={{ backgroundColor: currentPaperOption.color }}
              />
            </button>
            {activePicker === 'paper' && (
              portalTarget && createPortal(
                <div
                  className="picker-popup horizontal"
                  style={{ top: `${pickerPos.top}px`, left: `${pickerPos.left}px` }}
                >
                  {PAPER_OPTIONS.map((paper) => (
                    <button
                      type="button"
                      key={paper.value}
                      className={`paper-button ${currentPaperColor === paper.value ? 'selected' : ''}`}
                      onClick={() => handlePaperSelect(paper.value)}
                      title={paper.title}
                    >
                      <span className="paper-swatch" style={{ backgroundColor: paper.color }} />
                      <span className="paper-label">{paper.label}</span>
                    </button>
                  ))}
                </div>,
                portalTarget
              )
            )}
          </div>
        </div>

        {/* Color Picker - Horizontal Popup */}
        <div className="toolbar-section picker-section">
          {!isCollapsed && <label className="toolbar-section-label">COLOR</label>}
          <div className="picker-container">
            <button
              type="button"
              className="picker-current-btn"
              onClick={handlePickerToggle('color')}
              title="Select Color"
              disabled={isErasing}
            >
              <div
                className="color-preview-large"
                style={{ backgroundColor: currentColor }}
              />
            </button>
            {activePicker === 'color' && (
              portalTarget && createPortal(
                <div
                  className="picker-popup horizontal"
                  style={{ top: `${pickerPos.top}px`, left: `${pickerPos.left}px` }}
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
                </div>,
                portalTarget
              )
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
              onClick={handlePickerToggle('thickness')}
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
            {activePicker === 'thickness' && (
              portalTarget && createPortal(
                <div
                  className="picker-popup horizontal"
                  style={{ top: `${pickerPos.top}px`, left: `${pickerPos.left}px` }}
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
                </div>,
                portalTarget
              )
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

        {/* Confidence Section */}
        <div className="toolbar-section confidence-section">
          {!isCollapsed && <label className="toolbar-section-label">HOW DO YOU FEEL?</label>}
          {isCollapsed ? (
            // Collapsed: Show current confidence as a button with popup
            <div className="picker-container">
              <button
                type="button"
                className="picker-current-btn"
                onClick={handlePickerToggle('confidence')}
                title="Select Confidence Level"
              >
                <span style={{ fontSize: '20px' }}>{getConfidenceIcon(currentConfidence)}</span>
              </button>
              {activePicker === 'confidence' && (
                portalTarget && createPortal(
                  <div
                    className="picker-popup horizontal"
                    style={{ top: `${pickerPos.top}px`, left: `${pickerPos.left}px` }}
                  >
                    {CONFIDENCE_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`confidence-button ${option.className} ${currentConfidence === option.value ? 'selected' : ''}`}
                        onClick={() => handleConfidenceSelect(currentConfidence === option.value ? 'none' : option.value)}
                        title={option.title}
                      >
                        {option.icon}
                      </button>
                    ))}
                  </div>,
                  portalTarget
                )
              )}
            </div>
          ) : (
            // Expanded: Show all confidence buttons horizontally
            <div className="confidence-selector horizontal">
              {CONFIDENCE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`confidence-button ${option.className} ${currentConfidence === option.value ? 'selected' : ''}`}
                  onClick={() => handleConfidenceToggle(option.value)}
                  title={option.title}
                >
                  {option.icon}
                </button>
              ))}
            </div>
          )}
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

export default memo(Toolbar);
