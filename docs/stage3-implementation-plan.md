# Stage 3 Implementation Plan
## Shape Tools & UI Improvements for Landscape iPad

**Status**: 🔄 IN PROGRESS
**Started**: February 7, 2026

---

## Goals

1. Add shape drawing tools (line, rectangle, triangle, circle, axes, grid)
2. Redesign student UI with vertical left sidebar for landscape iPad use
3. Maintain real-time sync with teacher dashboard
4. Keep performance <200ms latency

---

## Part 1: UI Redesign - Vertical Left Sidebar

### Rationale
- Students use iPads in landscape orientation
- Current horizontal toolbar at top wastes vertical space
- Vertical left sidebar maximizes canvas area
- Collapsible design allows full-screen drawing when needed

### Design Specifications

**Toolbar Layout** (Left Side):
```
┌────────────┬─────────────────────────────────┐
│  [≡]       │                                 │  ← Collapse button
│            │                                 │
│  TOOLS     │                                 │
│  [✏️ Pen]  │                                 │
│  [🧹 Erase]│                                 │
│  [📏 Line] │         Canvas Area             │
│  [▭ Rect]  │                                 │
│  [△ Tri]   │                                 │
│  [○ Circle]│                                 │
│  [📐 Axes] │                                 │
│  [# Grid]  │                                 │
│            │                                 │
│  COLORS ▼  │                                 │
│  [palette] │                                 │
│            │                                 │
│  THICK. ▼  │                                 │
│  [sizes]   │                                 │
│            │                                 │
│  [↶] [↷]   │                                 │
│  [🗑️ Clear]│                                 │
│            │                                 │
│  🔴 🟡 🟢   │                                 │
└────────────┴─────────────────────────────────┘
```

**Collapsed State**:
```
┌──┬─────────────────────────────────────────┐
│≡ │                                         │
│✏️│                                         │
│📏│          Canvas Area (Maximized)        │
│  │                                         │
│↶ │                                         │
│🗑️│                                         │
│🟢│                                         │
└──┴─────────────────────────────────────────┘
```

### Implementation Tasks

1. **Toolbar.tsx Redesign**
   - Change from horizontal flexbox to vertical layout
   - Add collapse/expand state and button
   - Group tools into collapsible sections
   - Add icon-only mode for collapsed state
   - Width: 240px (expanded), 60px (collapsed)

2. **DrawingPage.tsx Layout**
   - Update CSS to position toolbar on left
   - Adjust canvas size calculation (subtract toolbar width)
   - Add state for `toolbarCollapsed`
   - Pass collapse state to Toolbar component

3. **Global CSS Updates**
   - `.toolbar` → vertical layout, fixed left position
   - `.toolbar-section` → full width, vertical stacking
   - `.color-picker` → wrap colors in grid (2 columns when expanded)
   - Responsive breakpoints for portrait mode fallback

---

## Part 2: Shape Drawing Tools

### Shape Types

#### 1. Line Tool
- **Interaction**: Click start point → move mouse (show preview) → click end point
- **Data**: `{ type: 'line', points: [start, end] }`
- **Rendering**: Single straight line from point[0] to point[1]

#### 2. Rectangle Tool
- **Interaction**: Click corner → drag (show preview) → release to finish
- **Data**: `{ type: 'rectangle', points: [topLeft, bottomRight] }`
- **Rendering**: Rectangle from top-left to bottom-right corners

#### 3. Triangle Tool
- **Interaction**: Click point 1 → click point 2 (show preview line) → click point 3 (show preview triangle)
- **Data**: `{ type: 'triangle', points: [p1, p2, p3] }`
- **Rendering**: Triangle connecting three points

#### 4. Circle Tool
- **Interaction**: Click center → drag (show preview) → release to set radius
- **Data**: `{ type: 'circle', center: point, radius: number }`
- **Rendering**: Circle at center with given radius

#### 5. Axes Tool
- **Interaction**: Single click to place
- **Data**: `{ type: 'axes', center: point, size: number }`
- **Rendering**: X and Y axes crossing at center
- **Options**: Configurable size, arrow heads, labels

#### 6. Grid Tool
- **Interaction**: Toggle button to show/hide
- **Implementation**: Canvas overlay, not a shape (doesn't sync to teacher)
- **Options**: Grid spacing (10px, 20px, 50px), snap-to-grid toggle

### Shape Data Model

```typescript
interface Shape {
  shapeId: string;           // Unique ID
  studentId: string;         // Who drew it
  type: 'line' | 'rectangle' | 'triangle' | 'circle' | 'axes';
  points: StrokePoint[];     // Control points (normalized 0-1)
  center?: StrokePoint;      // For circle/axes
  radius?: number;           // For circle
  color: string;             // Stroke color
  lineWidth: number;         // Stroke thickness
  isComplete: boolean;       // True when finished drawing
}
```

### SignalR Integration

**New Message**: `ShapeDrawn`
```typescript
interface ShapeDrawn {
  shapeId: string;
  studentId: string;
  type: string;
  points: StrokePoint[];
  center?: StrokePoint;
  radius?: number;
  color: string;
  lineWidth: number;
  isComplete: boolean;
}
```

**Backend Method**: `SendShape(Shape shape)`
- Validates shape data
- Sets `studentId` server-side
- Broadcasts to `room:{roomId}:teacher` group

**Undo/Redo**: Shapes are treated like strokes for undo/redo purposes

### Implementation Tasks

1. **Define Shape Models**
   - Add `Shape.cs` to backend Models
   - Add `ShapeDrawn.cs` to Messages
   - Add TypeScript interfaces to `messages.ts`

2. **Update DrawingPage.tsx**
   - Add `currentTool` state: `'pen' | 'eraser' | 'line' | 'rectangle' | 'triangle' | 'circle' | 'axes' | 'grid'`
   - Add `shapeInProgress` state for preview
   - Add `shapesRef` Map to store completed shapes
   - Add shape drawing handlers:
     - `handleShapeStart(point)` - First click
     - `handleShapeUpdate(point)` - Mouse move (preview)
     - `handleShapeComplete(point)` - Final click/release
   - Add shape rendering function `renderShape(shape, ctx, canvas)`
   - Integrate shapes into undo/redo system

3. **Update Toolbar.tsx**
   - Add shape tool buttons with icons
   - Highlight selected tool
   - Tool selector UI (radio buttons or icon buttons)

4. **Update StudentTile.tsx**
   - Listen for `ShapeDrawn` SignalR message
   - Store shapes in shapesRef Map
   - Render shapes on canvas
   - Handle shape undo/delete

5. **Backend WhiteboardHub.cs**
   - Add `SendShape(Shape shape)` method
   - Add `UndoShape(string shapeId)` method
   - Broadcast `ShapeDrawn` to teacher
   - Broadcast `ShapeUndone` for undo

6. **Grid Overlay**
   - Add grid rendering on canvas (separate layer or overlay div)
   - Add grid toggle button
   - Add grid spacing options
   - Optional: Snap-to-grid logic (round points to nearest grid intersection)

---

## Part 3: Canvas Preview System

### Preview Rendering
- Show shape outline while drawing (before completion)
- Use dashed line style for preview: `ctx.setLineDash([5, 5])`
- Preview color: semi-transparent version of selected color
- Clear preview on each mouse move and redraw
- Finalize with solid line on completion

### Implementation
```typescript
const renderPreview = (shape: Shape, ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = shape.lineWidth;

  // Draw shape based on type
  // ...

  ctx.restore();
};
```

---

## Part 4: Testing Plan

### Unit Testing
- [ ] Each shape tool creates correct data structure
- [ ] Normalized coordinates work for all shapes
- [ ] Undo/redo works with shapes
- [ ] Shapes sync to teacher dashboard

### Integration Testing
- [ ] Draw all shape types as student, verify on teacher view
- [ ] Mix freehand and shapes in same drawing
- [ ] Multiple students drawing shapes simultaneously
- [ ] Undo a shape, redo a shape
- [ ] Clear board with shapes
- [ ] Lock student while drawing shape

### UI Testing
- [ ] Toolbar collapses and expands smoothly
- [ ] Tool selection visual feedback works
- [ ] Shape preview appears during drawing
- [ ] Canvas resize handles shapes correctly

### Performance Testing
- [ ] 20 shapes on canvas maintains 60fps
- [ ] Shape rendering on teacher view stays <200ms
- [ ] No memory leaks with repeated shape drawing

---

## Implementation Order

### Phase 1: UI Redesign (Day 1)
1. Redesign Toolbar.tsx as vertical left sidebar
2. Update DrawingPage.tsx layout
3. Add collapse/expand functionality
4. Update CSS for new layout
5. Test on desktop browser

### Phase 2: Basic Shape Infrastructure (Day 1-2)
1. Define Shape models (backend and frontend)
2. Add `currentTool` state to DrawingPage
3. Add tool selector to Toolbar
4. Implement shape preview system
5. Add SignalR shape messaging

### Phase 3: Individual Shape Tools (Day 2-3)
1. Implement Line tool
2. Implement Rectangle tool
3. Implement Triangle tool
4. Implement Circle tool
5. Implement Axes tool
6. Implement Grid overlay

### Phase 4: Integration & Testing (Day 3)
1. Integrate shapes with undo/redo
2. Test all shapes on teacher dashboard
3. Multi-student testing
4. Performance testing
5. Bug fixes and polish

### Phase 5: Documentation & Completion (Day 4)
1. Update CLAUDE.md
2. Create stage3-completion.md
3. Add shape tool examples/screenshots
4. Update project plan

---

## Technical Considerations

### Canvas Coordinate System
- All shapes use normalized 0-1 coordinates like strokes
- Conversion happens at render time
- Ensures shapes scale properly on teacher dashboard

### Shape vs Stroke Storage
- Shapes stored separately from strokes (different Map)
- Both included in undo/redo history
- Teacher view renders both strokes and shapes

### Shape Editing (Future Enhancement)
- Stage 3: Draw only, no editing
- Future: Click to select, drag to move, resize handles

### Grid Snap Logic (Optional)
```typescript
const snapToGrid = (point: StrokePoint, gridSize: number, canvas: HTMLCanvasElement): StrokePoint => {
  const pixelX = point.x * canvas.width;
  const pixelY = point.y * canvas.height;

  const snappedX = Math.round(pixelX / gridSize) * gridSize;
  const snappedY = Math.round(pixelY / gridSize) * gridSize;

  return {
    x: snappedX / canvas.width,
    y: snappedY / canvas.height,
    pressure: point.pressure,
  };
};
```

---

## Success Criteria

✅ Stage 3 Complete when:
- All 6 shape tools implemented and working
- Vertical left sidebar fully functional and collapsible
- Shapes sync to teacher dashboard in real-time
- Undo/redo works with shapes
- Grid overlay functional
- Performance maintained <200ms
- UI optimized for landscape iPad
- All tests passing
- Documentation updated

---

## Notes

- Prioritize UI redesign first (most impactful for iPad usability)
- Shape tools can be implemented incrementally
- Grid overlay is lowest priority (nice-to-have)
- Keep existing freehand drawing fully functional
- Maintain backwards compatibility with Stage 2 features
