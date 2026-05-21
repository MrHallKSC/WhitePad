import { useState, memo, type ComponentType } from 'react';
import type { BackgroundType, PaperColor } from '../shared/types/messages';
import {
  PenIcon, EraserIcon, LineIcon, RectangleIcon, CircleIcon, ArrowIcon,
  AxesLIcon, AxesCrossIcon, UndoIcon, RedoIcon, TrashIcon, CloseIcon,
  CheckIcon, QuestionIcon, BgNoneIcon, BgDottedIcon, BgLinedIcon, BgSquaresIcon,
} from './icons';

export type ToolType = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'arrow' | 'axesL' | 'axesCross';

type ConfidenceLevel = 'none' | 'red' | 'amber' | 'green';

interface ToolbarProps {
  displayName: string;
  currentColor: string;
  currentThickness: number;
  currentTool: ToolType;
  currentConfidence: ConfidenceLevel;
  currentBackground: BackgroundType;
  currentPaperColor: PaperColor;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onToolChange: (tool: ToolType) => void;
  onConfidenceChange: (level: ConfidenceLevel) => void;
  onBackgroundChange: (background: BackgroundType) => void;
  onPaperColorChange: (paperColor: PaperColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToolbarResized?: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type IconComponent = ComponentType<{ size?: number }>;

// iPad palette
const COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#E11D48' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Purple', hex: '#7C3AED' },
];

const THICKNESSES = [2, 4, 6, 8, 10];

const TOOL_OPTIONS: Array<{ tool: ToolType; Icon: IconComponent; label: string }> = [
  { tool: 'pen', Icon: PenIcon, label: 'Pen' },
  { tool: 'eraser', Icon: EraserIcon, label: 'Eraser' },
  { tool: 'line', Icon: LineIcon, label: 'Line' },
  { tool: 'rectangle', Icon: RectangleIcon, label: 'Rectangle' },
  { tool: 'circle', Icon: CircleIcon, label: 'Circle' },
  { tool: 'arrow', Icon: ArrowIcon, label: 'Arrow' },
  { tool: 'axesL', Icon: AxesLIcon, label: 'L-Axes' },
  { tool: 'axesCross', Icon: AxesCrossIcon, label: '+-Axes' },
];

const BACKGROUND_OPTIONS: Array<{ value: BackgroundType; Icon: IconComponent; label: string }> = [
  { value: 'none', Icon: BgNoneIcon, label: 'Plain' },
  { value: 'dotted', Icon: BgDottedIcon, label: 'Dotted' },
  { value: 'lined', Icon: BgLinedIcon, label: 'Lined' },
  { value: 'squares', Icon: BgSquaresIcon, label: 'Squares' },
];

const PAPER_OPTIONS: Array<{ value: PaperColor; color: string; label: string }> = [
  { value: 'white', color: '#FFFFFF', label: 'White' },
  { value: 'buff', color: '#F4E4BC', label: 'Buff' },
];

const CONFIDENCE_OPTIONS: Array<{ value: ConfidenceLevel; color: string; label: string }> = [
  { value: 'none', color: '#9CA3AF', label: 'Not set' },
  { value: 'red', color: '#E11D48', label: 'Need help' },
  { value: 'amber', color: '#F59E0B', label: 'Unsure' },
  { value: 'green', color: '#22C55E', label: 'Got it' },
];

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  none: '#9CA3AF',
  red: '#E11D48',
  amber: '#F59E0B',
  green: '#22C55E',
};

function Toolbar({
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
  canUndo,
  canRedo,
}: ToolbarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isConfidenceOpen, setIsConfidenceOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const ActiveToolIcon = TOOL_OPTIONS.find(t => t.tool === currentTool)?.Icon ?? PenIcon;

  const handleClearConfirm = () => {
    onClear();
    setShowClearConfirm(false);
  };

  const selectConfidence = (level: ConfidenceLevel) => {
    onConfidenceChange(level);
    setIsConfidenceOpen(false);
  };

  return (
    <>
      {/* Top-left: tool toggle + slide-out panel */}
      <div className="wp-tool-dock">
        <button
          type="button"
          className="wp-circle-btn wp-tool-toggle"
          onClick={() => setIsPanelOpen(open => !open)}
          aria-label={isPanelOpen ? 'Close tools' : 'Open tools'}
          aria-expanded={isPanelOpen}
        >
          {isPanelOpen ? <CloseIcon /> : <ActiveToolIcon />}
        </button>

        {isPanelOpen && (
          <div className="wp-glass wp-tool-panel" role="dialog" aria-label="Drawing tools">
            <section className="wp-panel-section">
              <h3 className="wp-panel-label">Draw</h3>
              <div className="wp-tool-grid">
                {TOOL_OPTIONS.map(({ tool, Icon, label }) => (
                  <button
                    type="button"
                    key={tool}
                    className={`wp-tool-tile ${currentTool === tool ? 'active' : ''}`}
                    onClick={() => onToolChange(tool)}
                    title={label}
                  >
                    <Icon size={22} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="wp-panel-section">
              <h3 className="wp-panel-label">Paper style</h3>
              <div className="wp-pill-grid two">
                {BACKGROUND_OPTIONS.map(({ value, Icon, label }) => (
                  <button
                    type="button"
                    key={value}
                    className={`wp-pill ${currentBackground === value ? 'active' : ''}`}
                    onClick={() => onBackgroundChange(value)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="wp-panel-section">
              <h3 className="wp-panel-label">Paper colour</h3>
              <div className="wp-pill-grid two">
                {PAPER_OPTIONS.map(({ value, color, label }) => (
                  <button
                    type="button"
                    key={value}
                    className={`wp-pill ${currentPaperColor === value ? 'active' : ''}`}
                    onClick={() => onPaperColorChange(value)}
                  >
                    <span className="wp-paper-dot" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="wp-panel-section">
              <h3 className="wp-panel-label">Colour</h3>
              <div className="wp-swatch-row">
                {COLORS.map(({ name, hex }) => (
                  <button
                    type="button"
                    key={hex}
                    className={`wp-swatch ${currentColor === hex ? 'active' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => onColorChange(hex)}
                    title={name}
                    aria-label={name}
                  />
                ))}
              </div>
            </section>

            <section className="wp-panel-section">
              <h3 className="wp-panel-label">Size</h3>
              <div className="wp-size-row">
                {THICKNESSES.map(thickness => (
                  <button
                    type="button"
                    key={thickness}
                    className={`wp-size-btn ${currentThickness === thickness ? 'active' : ''}`}
                    onClick={() => onThicknessChange(thickness)}
                    aria-label={`Size ${thickness}`}
                  >
                    <span className="wp-size-dot" style={{ width: thickness * 2, height: thickness * 2 }} />
                  </button>
                ))}
              </div>
            </section>

            <section className="wp-panel-section">
              <div className="wp-action-row">
                <button type="button" className="wp-btn" onClick={onUndo} disabled={!canUndo}>
                  <UndoIcon size={18} /> Undo
                </button>
                <button type="button" className="wp-btn" onClick={onRedo} disabled={!canRedo}>
                  <RedoIcon size={18} /> Redo
                </button>
              </div>
              <button
                type="button"
                className="wp-btn danger full"
                onClick={() => setShowClearConfirm(true)}
                disabled={!canUndo}
              >
                <TrashIcon size={18} /> Clear
              </button>
            </section>
          </div>
        )}
      </div>

      {/* Bottom-right: clear + confidence cluster */}
      <div className="wp-action-dock">
        {isConfidenceOpen && (
          <div className="wp-glass wp-confidence-panel" role="dialog" aria-label="Confidence">
            <h3 className="wp-panel-label">How are you feeling?</h3>
            {CONFIDENCE_OPTIONS.map(({ value, color, label }) => (
              <button
                type="button"
                key={value}
                className={`wp-confidence-option ${currentConfidence === value ? 'active' : ''}`}
                onClick={() => selectConfidence(value)}
              >
                <span className="wp-confidence-dot" style={{ backgroundColor: color }} />
                <span className="wp-confidence-text">{label}</span>
                {currentConfidence === value && <CheckIcon size={16} />}
              </button>
            ))}
          </div>
        )}

        <div className="wp-dock-row">
          <button
            type="button"
            className="wp-circle-btn danger"
            onClick={() => setShowClearConfirm(true)}
            disabled={!canUndo}
            aria-label="Clear board"
          >
            <TrashIcon />
          </button>
          <button
            type="button"
            className="wp-circle-btn wp-confidence-toggle"
            style={{ backgroundColor: CONFIDENCE_COLORS[currentConfidence] }}
            onClick={() => setIsConfidenceOpen(open => !open)}
            aria-label="Set confidence"
          >
            {currentConfidence === 'none' ? <QuestionIcon /> : <span className="wp-confidence-tick" />}
          </button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Clear Board?</h3>
            <p>This will erase all your work. Are you sure?</p>
            <div className="modal-buttons">
              <button className="button danger" onClick={handleClearConfirm}>
                Yes, Clear
              </button>
              <button className="button" onClick={() => setShowClearConfirm(false)}>
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
