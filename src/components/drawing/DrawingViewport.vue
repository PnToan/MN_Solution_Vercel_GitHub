<template>
  <main class="mn-canvas-area" ref="viewportRef" tabindex="0" @keydown="onKeyDown">
    <DrawingCanvas
      :canvas-cursor-class="canvasCursorClass"
      :set-canvas-ref="setCanvasRef"
      @pointer-down="onPointerDown"
      @pointer-move="onPointerMove"
      @pointer-up="onPointerUp"
      @wheel="onWheel"
    />
    <DimensionInput
      v-if="dimInput.active"
      :model="dimInput"
      :input-style="dimInputStyle"
      :set-input-ref="setDimInputRef"
      @update-value="updateDimInputValue"
      @key-down="onDimInputKeyDown"
      @blur="cancelDimInput"
    />

    <BoxHeightInput
      v-if="boxHeightInput.active"
      :model="boxHeightInput"
      :input-style="boxHeightInputStyle"
      :set-input-ref="setBoxHeightInputRef"
      @update-value="updateBoxHeightInputValue"
      @key-down="onBoxHeightInputKeyDown"
      @blur="cancelBoxHeightInput"
    />

    <PanelEditWindow
      v-if="activePanelEditContext"
      :active-context="activePanelEditContext"
      :panel-edit-tools="panelEditTools"
      :current-shape-tool="drawing.state.panelEdit.shapeTool"
      :current-tool="app.state.currentTool"
      :canvas-cursor-class="panelEditCanvasCursorClass"
      :pending-action="panelEditRect.pendingAction"
      :footer-text="panelEditFooterText"
      :set-canvas-ref="setPanelEditCanvasRef"
      @select-tool="selectPanelEditWindowTool"
      @select-face="selectPanelEditFace"
      @apply="applyPanelEdit"
      @panel-pointer-down="onPanelEditPointerDown"
      @panel-pointer-move="onPanelEditPointerMove"
      @panel-pointer-up="onPanelEditPointerUp"
      @panel-wheel="onPanelEditWheel"
      @confirm-action="confirmPanelEditRectangleAction"
    />

    <Viewport3DPreview
      :visible="app.state.mini3DVisible"
      @toggle="app.toggleMini3D"
    />
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import DrawingCanvas from './DrawingCanvas.vue'
import DimensionInput from './DimensionInput.vue'
import BoxHeightInput from './BoxHeightInput.vue'
import PanelEditWindow from '../panel-edit/PanelEditWindow.vue'
import Viewport3DPreview from './Viewport3DPreview.vue'
import { useBoxHeightInput } from '../../composables/drawing/useBoxHeightInput'
import { useViewportCanvas } from '../../composables/drawing/useViewportCanvas'
import { useDimensionInput } from '../../composables/drawing/useDimensionInput'
import { usePanelToolKeyboard } from '../../composables/drawing/usePanelToolKeyboard'
import { useSelectDrag } from '../../composables/drawing/useSelectDrag'
import { useViewportKeyboard } from '../../composables/drawing/useViewportKeyboard'
import { useViewportCursor } from '../../composables/drawing/useViewportCursor'
import { usePanelEditFooterText } from '../../composables/panel-edit/usePanelEditFooterText'
import { usePanelEditState } from '../../composables/panel-edit/usePanelEditState'
import { usePanelEditHistory } from '../../composables/panel-edit/usePanelEditHistory'
import { usePanelEditDraftReset } from '../../composables/panel-edit/usePanelEditDraftReset'
import { usePanelEditSavedState } from '../../composables/panel-edit/usePanelEditSavedState'
import { usePanelEditLayout } from '../../composables/panel-edit/usePanelEditLayout'
import { usePanelEditApplyData } from '../../composables/panel-edit/usePanelEditApplyData'
import { usePanelEditSelection } from '../../composables/panel-edit/usePanelEditSelection'
import { usePanelEditApply } from '../../composables/panel-edit/usePanelEditApply'
import { usePanelEditLineHit } from '../../composables/panel-edit/usePanelEditLineHit'
import { PANEL_EDIT_TOOLS } from '../../constants/panelEditTools'
import { useAppStore } from '../../stores/useAppStore'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useWallStore } from '../../stores/useWallStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { useBoxStore } from '../../stores/useBoxStore'
import { renderCanvas2D, getWallDimHit, getBoxDimHit, getDimensionHit } from '../../renderers/canvas-2d-renderer'
import { screenToLocal, localToScreen } from '../../renderers/viewport-transform'
import { projectBoxToCameraRect, cameraLocalToWorldPoint, getCameraConfig } from '../../core/view/view-camera'
import { hitTestPanel, hitTestZoneEdge } from '../../core/snap/snap-engine'
import { createPanelEditRectangleRecord, getEditPanelToolCursorClass, isEditPanelDrawTool, isEditPanelTool } from '../../core/tools/editPanelTool'
import { createEditPanelMoveController } from '../../core/tools/editPanelMoveTool'
import { getPanelEditArcData, getPanelEditArcDefaultBulge, getPanelEditArcDraftWithRadiusInput, getPanelEditArcPoints } from '../../core/tools/editPanelArcTool'
import { findShortcutAction, loadShortcutSettings, shortcutEventToText } from '../../core/settings/shortcut-settings'
import { clampValue, getDistance } from '../../core/geometry/number-utils'
import { getClosestPointOnPanelEditCircleEdge, getPanelEditCircleBounds, getPanelEditCirclePolygon, getPanelEditCircleRadius } from '../../core/panel-edit/panelEditCircleGeometry'
import { getPanelEditPolygonBounds, getPanelEditRectBounds, getPanelEditRectPolygon, getPanelEditRectangleRegion } from '../../core/panel-edit/panelEditRectangleGeometry'
import { getPanelEditPointKey, getPanelEditPolygonSignedArea, getPanelEditSegmentIntersection, getPanelEditSegmentParameter, isPanelEditPointInsidePolygon, isPanelEditPointOnSegment } from '../../core/panel-edit/panelEditSegmentGeometry'

const app = useAppStore()
const cabinet = useCabinetStore()
const wall = useWallStore()
const drawing = useDrawingStore()
const box = useBoxStore()
const viewportRef = ref(null)
const panelEditCanvasRef = ref(null)
let drawImpl = () => {}
let resizeCanvasImpl = () => {}
let onAppSettingsAppliedImpl = () => {}

//=================
function draw() {
  return drawImpl()
} // End draw

//=================
function resizeCanvas() {
  return resizeCanvasImpl()
} // End resizeCanvas

//=================
function onAppSettingsApplied() {
  return onAppSettingsAppliedImpl()
} // End onAppSettingsApplied

//=================
function setPanelEditCanvasRef(element) {
  panelEditCanvasRef.value = element

  if (element) nextTick(resizePanelEditCanvas)
} // End setPanelEditCanvasRef

const hoverDim = ref(null)
const moveCopyMode = ref(false)
const viewportCanvas = useViewportCanvas({
  viewportRef,
  app,
  drawing,
  renderCanvas2D,
  afterResize: resizePanelEditCanvas,
  getRenderPayload: ({ width, height }) => ({
    width,
    height,
    viewport: app.state.viewport,
    currentView: app.state.currentView,
    wallRect: projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    wallEditingDim: wall.state.editingDim,
    zones: drawing.state.zones,
    panels: getVisiblePanels(),
    movePreviewTarget: drawing.getMovePreviewTarget(),
    moveHoverSnapPoints: drawing.getMoveHoverSnapPoints(),
    moveTargetSnap: drawing.getMoveTargetSnap(),
    moveCursorLocal: app.state.currentTool === 'move'
      ? drawing.getMoveCursorLocal()
      : null,
    moveCopyMode: app.state.currentTool === 'move' ? moveCopyMode.value : false,
    panelPreviewItems: drawing.getPanelPreviewItems(),
    panelInputBuffer: drawing.state.panelInputBuffer,
    boxes: getVisibleBoxes(),
    boxDraftRect: box.getDraftRect(),
    boxEditingDim: box.state.editingDim,
    hover: drawing.state.hover,
    snapPreview: drawing.state.snapPreview,
    selectedPanelId: drawing.state.selectedPanelId,
    selectedPanelIds: drawing.state.selectedPanelIds,
    selectedBoxId: app.state.currentTool === 'select' ? null : box.state.selectedBoxId,
    selectedBoxIds: app.state.currentTool === 'select' ? [] : box.state.selectedBoxIds,
    selectDrag: selectDrag.value,
    dimensions: drawing.getRenderableDimensions(app.state.currentView),
    selectedDimensionIds: drawing.state.selectedDimensionIds,
    dimensionDraft: drawing.getDimensionDraft(),
    editingDimensionId: dimInput.value.target === 'dimension' ? dimInput.value.dimensionId : null,
    showGrid: app.state.showGrid
  })
})
const canvasRef = viewportCanvas.canvasRef
const setCanvasRef = viewportCanvas.setCanvasRef
drawImpl = viewportCanvas.draw
resizeCanvasImpl = viewportCanvas.resizeCanvas
onAppSettingsAppliedImpl = viewportCanvas.onAppSettingsApplied
const {
  dimInput,
  dimInputStyle,
  setDimInputRef,
  updateDimInputValue,
  openDimInput,
  cancelDimInput,
  onDimInputKeyDown
} = useDimensionInput({
  wall,
  box,
  drawing,
  app,
  draw,
  getWallBox3D,
  getWallDimInputInfo,
  getBoxDimInputInfo
})
const {
  boxHeightInput,
  boxHeightInputStyle,
  setBoxHeightInputRef,
  updateBoxHeightInputValue,
  openBoxHeightInput,
  cancelBoxHeightInput,
  onBoxHeightInputKeyDown
} = useBoxHeightInput({
  canvasRef,
  wall,
  box,
  drawing,
  app,
  draw,
  exitToSelect
})
const {
  selectDrag,
  getScreenPointFromEvent,
  startSelectDrag,
  resetSelectDrag,
  getSelectDragRect,
  localRectToScreenRect,
  getSelectedIdsByDragRect
} = useSelectDrag({
  canvasRef,
  app,
  drawing,
  draw,
  getVisiblePanels,
  getVisibleBoxes,
  getPanelLocalRect,
  getPanelSelectRect,
  getBoxLocalRect,
  getBoxSelectRect,
  getDimensionSelectRect,
  hitTestVisiblePanel
})
const {
  handlePanelToolKey
} = usePanelToolKeyboard({
  app,
  drawing,
  draw
})
const {
  handleViewportKeyboard
} = useViewportKeyboard({
  app,
  drawing,
  box,
  wall,
  draw,
  moveCopyMode,
  dimInput,
  boxHeightInput,
  exitToSelect
})
let panning = false
let panStart = null
let panOriginal = null
let panelEditPanning = false
let panelEditPanStart = null
let panelEditPanOriginal = null

const {
  panelEditViewport,
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  panelEditArc,
  panelEditSelection,
  panelEditSelectDrag,
  panelEditMove,
  panelEditHistory
} = usePanelEditState()

const {
  getPanelEditPoint,
  getPanelEditZoomClamp,
  getPanelEditLayout,
  getPanelEditLocalFromScreen
} = usePanelEditLayout({ panelEditViewport })

const {
  getClosestPointOnPanelEditLine,
  getPanelEditLineSelectionKey,
  getPanelEditLineHit
} = usePanelEditLineHit({
  panelEditLine,
  getPanelEditPoint,
  getPanelEditLocalFromScreen
})

const {
  resetPanelEditTapeDraft,
  resetPanelEditRectDraft,
  resetPanelEditLineDraft,
  resetPanelEditCircleDraft,
  resetPanelEditArcDraft,
  resetPanelEditSelectDrag,
  resetPanelEditCommandDrafts
} = usePanelEditDraftReset({
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  panelEditArc,
  panelEditSelectDrag,
  resetPanelEditMoveDraft
})

const {
  getPanelEditSelectionItemKey,
  normalizePanelEditSelectionItems,
  setPanelEditSelection,
  clearPanelEditSelection,
  getPanelEditSelectedLineKeySet,
  isPanelEditRectangleSelected,
  isPanelEditCircleSelected,
  isPanelEditSelectionItemEqual,
  isPanelEditRectangleHovered,
  isPanelEditCircleHovered,
  setPanelEditHoverItem,
  getPanelEditRectangleHit,
  getPanelEditCircleHit,
  getPanelEditHoverItem,
  getPanelEditPointerLocal,
  getPanelEditSelectDragRectFromPoints,
  getPanelEditSelectDragRect,
  panelEditBoundsTouch,
  getPanelEditLineBounds,
  getPanelEditSelectionByRect
} = usePanelEditSelection({
  panelEditCanvasRef,
  panelEditSelection,
  panelEditSelectDrag,
  panelEditLine,
  panelEditRect,
  panelEditCircle,
  getPanelEditLocalFromScreen,
  getPanelEditLineSelectionKey,
  getPanelEditPolygonBounds,
  getPanelEditRectBounds,
  getPanelEditCircleRadius,
  getPanelEditCircleBounds
})

const {
  clonePanelEditHistoryData,
  pushPanelEditHistorySnapshot,
  clearPanelEditHistory,
  undoPanelEditHistory,
  redoPanelEditHistory
} = usePanelEditHistory({
  app,
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  panelEditArc,
  panelEditHistory,
  clearPanelEditSelection,
  resetPanelEditMoveDraft,
  resetPanelEditSelectDrag,
  resizePanelEditCanvas
})

const {
  loadPanelEditSavedState
} = usePanelEditSavedState({
  drawing,
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  panelEditArc,
  clearPanelEditSelection,
  resetPanelEditMoveDraft,
  resetPanelEditSelectDrag,
  clearPanelEditHistory
})


const {
  getPanelEditSavedRectanglesForApply,
  getPanelEditSavedLinesForApply,
  getPanelEditSavedCirclesForApply,
  getPanelEditSavedGuidesForApply
} = usePanelEditApplyData({
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle
})

const panelEditTools = PANEL_EDIT_TOOLS
const panelEditMoveController = createEditPanelMoveController({
  panelEditMove,
  panelEditSelection,
  panelEditLine,
  panelEditRect,
  panelEditCircle,
  drawing,
  app,
  nextTick,
  resizePanelEditCanvas,
  getPanelEditSelectedLineKeySet,
  getPanelEditLineSelectionKey,
  clonePanelEditHistoryData,
  pushPanelEditHistorySnapshot,
  drawPanelEditLine,
  drawPanelEditRectangle,
  drawPanelEditCircle
})
const zoomLabel = computed(() => `${Math.round(app.state.viewport.zoom * 100)}%`)
const localX = computed(() => Math.round(app.state.mouse.localX))
const localY = computed(() => Math.round(app.state.mouse.localY))
const activePanelEditContext = computed(() => drawing.state.panelEdit?.active ? drawing.state.panelEdit.context : null)
const panelEditCanvasCursorClass = computed(() => getEditPanelToolCursorClass(drawing.state.panelEdit?.shapeTool))
const panelEditFooterText = usePanelEditFooterText({
  activePanelEditContext,
  drawing,
  panelEditLine,
  panelEditSelection,
  panelEditSelectDrag,
  panelEditRect,
  panelEditMove,
  panelEditTape,
  panelEditArc,
  panelEditCircle,
  panelEditTools,
  getPanelEditArcData,
  getEffectivePanelEditArcDraft,
  getPanelEditCircleRadius
})

//=================
function getWallBox3D() {
  return wall.getBox3D()
} // End getWallBox3D
const activeViewConfig = computed(() => app.getViewConfig(app.state.currentView))
const axisHorizontal = computed(() => activeViewConfig.value.axisA || 'X')
const axisVertical = computed(() => activeViewConfig.value.axisB || 'Y')

const {
  canvasCursorClass
} = useViewportCursor({
  app,
  hoverDim,
  isEditPanelTool,
  isEditPanelDrawTool
})

//=================
function getCssVariable(variableName, fallback) {
  if (typeof window === 'undefined') return fallback

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()

  return value || fallback
} // End getCssVariable

//=================
function resizePanelEditCanvas() {
  const canvas = panelEditCanvasRef.value

  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const deviceRatio = window.devicePixelRatio || 1
  canvas.width = Math.max(1, rect.width * deviceRatio)
  canvas.height = Math.max(1, rect.height * deviceRatio)
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  const editContext = canvas.getContext('2d')
  editContext.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0)
  drawPanelEditCanvas(editContext, rect.width, rect.height)
} // End resizePanelEditCanvas


//=================
function getPanelEditGuideSegments(context) {
  if (!context) return []

  return (panelEditTape.value.guides || []).map((guide) => {
    const value = Number(guide.value || 0)

    if (guide.axis === 'vertical') {
      return {
        id: guide.id,
        type: 'guide',
        axis: 'vertical',
        start: { x: value, y: 0 },
        end: { x: value, y: context.height }
      }
    }

    return {
      id: guide.id,
      type: 'guide',
      axis: 'horizontal',
      start: { x: 0, y: value },
      end: { x: context.width, y: value }
    }
  })
} // End getPanelEditGuideSegments

//=================
function getPanelEditPanelBoundarySegments(context) {
  if (!context) return []

  return [
    { id: 'panel-edge-left', type: 'panelEdge', axis: 'vertical', edge: 'left', start: { x: 0, y: 0 }, end: { x: 0, y: context.height } },
    { id: 'panel-edge-right', type: 'panelEdge', axis: 'vertical', edge: 'right', start: { x: context.width, y: 0 }, end: { x: context.width, y: context.height } },
    { id: 'panel-edge-bottom', type: 'panelEdge', axis: 'horizontal', edge: 'bottom', start: { x: 0, y: 0 }, end: { x: context.width, y: 0 } },
    { id: 'panel-edge-top', type: 'panelEdge', axis: 'horizontal', edge: 'top', start: { x: 0, y: context.height }, end: { x: context.width, y: context.height } }
  ]
} // End getPanelEditPanelBoundarySegments

//=================
function getPanelEditLineSegmentsForSnap(context, sourceLines = null) {
  if (!context) return []

  const lines = Array.isArray(sourceLines) ? sourceLines : (panelEditLine.value.lines || [])

  return lines.map((line) => ({
    id: line.id,
    type: 'line',
    axis: line.axis,
    start: { x: Number(line.start?.x || 0), y: Number(line.start?.y || 0) },
    end: { x: Number(line.end?.x || 0), y: Number(line.end?.y || 0) }
  }))
} // End getPanelEditLineSegmentsForSnap


//=================
function getPanelEditRectangleSegmentsForSnap(context, sourceRectangles = null) {
  if (!context) return []

  const segments = []
  const rectangles = Array.isArray(sourceRectangles) ? sourceRectangles : (panelEditRect.value.rectangles || [])

  rectangles.forEach((rectangle) => {
    const id = rectangle.id || `rect-${segments.length}`
    const polygon = Array.isArray(rectangle.polygon) && rectangle.polygon.length >= 3
      ? rectangle.polygon.map((point) => ({ x: Number(point.x || 0), y: Number(point.y || 0) }))
      : getPanelEditRectPolygon(rectangle)

    polygon.forEach((point, index) => {
      const nextPoint = polygon[(index + 1) % polygon.length]

      if (!point || !nextPoint) return

      const dx = Number(nextPoint.x || 0) - Number(point.x || 0)
      const dy = Number(nextPoint.y || 0) - Number(point.y || 0)
      const axis = Math.abs(dx) <= 0.001 ? 'vertical' : (Math.abs(dy) <= 0.001 ? 'horizontal' : 'free')

      segments.push({
        id: `rect-edge-${id}-${index}`,
        type: 'rect',
        rectangleId: id,
        axis,
        start: { x: Number(point.x || 0), y: Number(point.y || 0) },
        end: { x: Number(nextPoint.x || 0), y: Number(nextPoint.y || 0) }
      })
    })
  })

  return segments
} // End getPanelEditRectangleSegmentsForSnap

//=================
function getPanelEditMoveSelectedSnapSource(options = {}) {
  const selectedLineKeys = getPanelEditSelectedLineKeySet()
  const selectedRectIds = new Set(panelEditSelection.value.items.filter((item) => item.type === 'rect').map((item) => item.id))
  const selectedCircleIds = new Set(panelEditSelection.value.items.filter((item) => item.type === 'circle').map((item) => item.id))
  const preview = options.useMovePreview === true ? getPanelEditMovePreviewItems() : null

  return {
    lines: preview
      ? preview.lines
      : (panelEditLine.value.lines || []).filter((line) => selectedLineKeys.has(getPanelEditLineSelectionKey(line))),
    rectangles: preview
      ? preview.rectangles
      : (panelEditRect.value.rectangles || []).filter((rectangle) => selectedRectIds.has(rectangle.id)),
    circles: preview
      ? preview.circles
      : (panelEditCircle.value.circles || []).filter((circle) => selectedCircleIds.has(circle.id))
  }
} // End getPanelEditMoveSelectedSnapSource

//=================
function getPanelEditCircleSnapCandidates(source = {}) {
  const candidates = []
  const circles = Array.isArray(source.circles) ? source.circles : (panelEditCircle.value.circles || [])
  const rectangles = Array.isArray(source.rectangles) ? source.rectangles : (panelEditRect.value.rectangles || [])

  circles.forEach((circle) => {
    const radius = getPanelEditCircleRadius(circle)
    const centerX = Number(circle?.center?.x || 0)
    const centerY = Number(circle?.center?.y || 0)

    if (!circle?.center || radius <= 0) return

    candidates.push(
      { key: `circle-center-${circle.id}`, x: centerX, y: centerY, axis: 'both', edge: 'circle-center', kind: 'circle', circleId: circle.id },
      { key: `circle-top-${circle.id}`, x: centerX, y: centerY + radius, axis: 'horizontal', edge: 'circle-top', kind: 'circle', circleId: circle.id },
      { key: `circle-bottom-${circle.id}`, x: centerX, y: centerY - radius, axis: 'horizontal', edge: 'circle-bottom', kind: 'circle', circleId: circle.id },
      { key: `circle-left-${circle.id}`, x: centerX - radius, y: centerY, axis: 'vertical', edge: 'circle-left', kind: 'circle', circleId: circle.id },
      { key: `circle-right-${circle.id}`, x: centerX + radius, y: centerY, axis: 'vertical', edge: 'circle-right', kind: 'circle', circleId: circle.id }
    )
  })

  rectangles.forEach((rectangle) => {
    const radius = Number(rectangle.radius || 0)
    const centerX = Number(rectangle.center?.x || 0)
    const centerY = Number(rectangle.center?.y || 0)

    if (rectangle.shapeType !== 'circle' || !rectangle.center || radius <= 0) return

    candidates.push(
      { key: `circle-cutout-center-${rectangle.id}`, x: centerX, y: centerY, axis: 'both', edge: 'circle-center', kind: 'circle', rectangleId: rectangle.id },
      { key: `circle-cutout-top-${rectangle.id}`, x: centerX, y: centerY + radius, axis: 'horizontal', edge: 'circle-top', kind: 'circle', rectangleId: rectangle.id },
      { key: `circle-cutout-bottom-${rectangle.id}`, x: centerX, y: centerY - radius, axis: 'horizontal', edge: 'circle-bottom', kind: 'circle', rectangleId: rectangle.id },
      { key: `circle-cutout-left-${rectangle.id}`, x: centerX - radius, y: centerY, axis: 'vertical', edge: 'circle-left', kind: 'circle', rectangleId: rectangle.id },
      { key: `circle-cutout-right-${rectangle.id}`, x: centerX + radius, y: centerY, axis: 'vertical', edge: 'circle-right', kind: 'circle', rectangleId: rectangle.id }
    )
  })

  return candidates
} // End getPanelEditCircleSnapCandidates

//=================
function getPanelEditTapeSnap(context, layout, screenX, screenY, options = {}) {
  if (!context || !layout) return null

  const tolerance = 12
  const local = getPanelEditLocalFromScreen(context, layout, screenX, screenY)
  const clampedLocal = {
    x: Math.max(0, Math.min(context.width, local.x)),
    y: Math.max(0, Math.min(context.height, local.y))
  }
  const selectedMoveOnly = options.selectedMoveOnly === true
  const snapSource = selectedMoveOnly ? getPanelEditMoveSelectedSnapSource(options) : null
  const includeGuides = !selectedMoveOnly && options.includeGuides !== false
  const includePanel = !selectedMoveOnly && options.includePanel !== false
  const guides = includeGuides ? panelEditTape.value.guides : []
  const candidates = []

  if (includePanel) {
    candidates.push(
      { key: 'left-bottom', x: 0, y: 0, axis: 'vertical', edge: 'left', kind: 'circle' },
      { key: 'left-mid', x: 0, y: context.height / 2, axis: 'vertical', edge: 'left', kind: 'circle' },
      { key: 'left-top', x: 0, y: context.height, axis: 'vertical', edge: 'left', kind: 'circle' },
      { key: 'right-bottom', x: context.width, y: 0, axis: 'vertical', edge: 'right', kind: 'circle' },
      { key: 'right-mid', x: context.width, y: context.height / 2, axis: 'vertical', edge: 'right', kind: 'circle' },
      { key: 'right-top', x: context.width, y: context.height, axis: 'vertical', edge: 'right', kind: 'circle' },
      { key: 'bottom-mid', x: context.width / 2, y: 0, axis: 'horizontal', edge: 'bottom', kind: 'circle' },
      { key: 'top-mid', x: context.width / 2, y: context.height, axis: 'horizontal', edge: 'top', kind: 'circle' }
    )
  }

  const verticalGuides = guides.filter((guide) => guide.axis === 'vertical')
  const horizontalGuides = guides.filter((guide) => guide.axis === 'horizontal')
  const editLines = selectedMoveOnly ? snapSource.lines : (Array.isArray(panelEditLine.value.lines) ? panelEditLine.value.lines : [])
  const verticalLines = editLines.filter((line) => line.axis === 'vertical')
  const horizontalLines = editLines.filter((line) => line.axis === 'horizontal')

  candidates.push(...getPanelEditCircleSnapCandidates(selectedMoveOnly ? snapSource : {}))

  editLines.forEach((line) => {
    ;[line.start, line.end].forEach((point, pointIndex) => {
      candidates.push({
        key: `line-end-${line.id}-${pointIndex}`,
        x: Number(point.x || 0),
        y: Number(point.y || 0),
        axis: line.axis,
        edge: 'line-end',
        kind: 'circle',
        lineId: line.id
      })
    })
  })

  const snapSegments = [
    ...getPanelEditLineSegmentsForSnap(context, editLines),
    ...getPanelEditRectangleSegmentsForSnap(context, selectedMoveOnly ? snapSource.rectangles : null),
    ...(includeGuides ? getPanelEditGuideSegments(context) : []),
    ...(includePanel ? getPanelEditPanelBoundarySegments(context) : [])
  ]

  for (let firstIndex = 0; firstIndex < snapSegments.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < snapSegments.length; secondIndex += 1) {
      const firstSegment = snapSegments[firstIndex]
      const secondSegment = snapSegments[secondIndex]
      const intersection = getPanelEditSegmentIntersection(firstSegment, secondSegment)

      if (!intersection) continue

      candidates.push({
        key: `snap-cross-${firstSegment.id}-${secondSegment.id}`,
        x: intersection.x,
        y: intersection.y,
        axis: options.preferredAxis || 'both',
        edge: 'line-cross',
        kind: 'circle',
        lineId: firstSegment.type === 'line' ? firstSegment.id : null,
        lineId2: secondSegment.type === 'line' ? secondSegment.id : null,
        guideId: firstSegment.type === 'guide' ? firstSegment.id : null,
        guideId2: secondSegment.type === 'guide' ? secondSegment.id : null
      })
    }
  }

  verticalLines.forEach((verticalLine) => {
    const verticalX = Number(verticalLine.start.x || 0)
    const verticalYMin = Math.min(Number(verticalLine.start.y || 0), Number(verticalLine.end.y || 0))
    const verticalYMax = Math.max(Number(verticalLine.start.y || 0), Number(verticalLine.end.y || 0))

    horizontalLines.forEach((horizontalLine) => {
      const horizontalY = Number(horizontalLine.start.y || 0)
      const horizontalXMin = Math.min(Number(horizontalLine.start.x || 0), Number(horizontalLine.end.x || 0))
      const horizontalXMax = Math.max(Number(horizontalLine.start.x || 0), Number(horizontalLine.end.x || 0))

      if (verticalX < horizontalXMin - 0.01 || verticalX > horizontalXMax + 0.01) return
      if (horizontalY < verticalYMin - 0.01 || horizontalY > verticalYMax + 0.01) return

      candidates.push({
        key: `line-cross-${verticalLine.id}-${horizontalLine.id}`,
        x: verticalX,
        y: horizontalY,
        axis: options.preferredAxis || 'both',
        edge: 'line-cross',
        kind: 'circle',
        lineId: verticalLine.id,
        lineId2: horizontalLine.id
      })
    })
  })

  verticalGuides.forEach((verticalGuide) => {
    horizontalGuides.forEach((horizontalGuide) => {
      candidates.push({
        key: `guide-cross-${verticalGuide.id}-${horizontalGuide.id}`,
        x: Number(verticalGuide.value || 0),
        y: Number(horizontalGuide.value || 0),
        axis: options.preferredAxis || 'both',
        edge: 'guide-cross',
        kind: 'circle',
        guideId: verticalGuide.id,
        guideId2: horizontalGuide.id
      })
    })
  })

  let bestPoint = null

  candidates.forEach((candidate) => {
    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, candidate.x, candidate.y)
    const distance = Math.hypot(point.x - screenX, point.y - screenY)

    if (distance <= tolerance && (!bestPoint || distance < bestPoint.distance)) {
      bestPoint = {
        ...candidate,
        screen: point,
        local: { x: candidate.x, y: candidate.y },
        distance
      }
    }
  })

  if (bestPoint) return bestPoint

  const insideY = screenY >= layout.top - tolerance && screenY <= layout.bottom + tolerance
  const insideX = screenX >= layout.left - tolerance && screenX <= layout.right + tolerance
  const edgeCandidates = []

  if (includePanel && insideY) {
    edgeCandidates.push({
      key: 'left-edge',
      distance: Math.abs(screenX - layout.left),
      axis: 'vertical',
      edge: 'left',
      kind: 'square',
      local: { x: 0, y: clampedLocal.y },
      screen: { x: layout.left, y: screenY }
    })
    edgeCandidates.push({
      key: 'right-edge',
      distance: Math.abs(screenX - layout.right),
      axis: 'vertical',
      edge: 'right',
      kind: 'square',
      local: { x: context.width, y: clampedLocal.y },
      screen: { x: layout.right, y: screenY }
    })
  }

  if (includePanel && insideX) {
    edgeCandidates.push({
      key: 'bottom-edge',
      distance: Math.abs(screenY - layout.bottom),
      axis: 'horizontal',
      edge: 'bottom',
      kind: 'square',
      local: { x: clampedLocal.x, y: 0 },
      screen: { x: screenX, y: layout.bottom }
    })
    edgeCandidates.push({
      key: 'top-edge',
      distance: Math.abs(screenY - layout.top),
      axis: 'horizontal',
      edge: 'top',
      kind: 'square',
      local: { x: clampedLocal.x, y: context.height },
      screen: { x: screenX, y: layout.top }
    })
  }

  verticalGuides.forEach((guide) => {
    const guideValue = Number(guide.value || 0)
    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, guideValue, clampedLocal.y)

    edgeCandidates.push({
      key: `guide-vertical-${guide.id}`,
      distance: Math.abs(screenX - point.x),
      axis: 'vertical',
      edge: 'guide',
      kind: 'square',
      guideId: guide.id,
      local: { x: guideValue, y: clampedLocal.y },
      screen: { x: point.x, y: screenY }
    })
  })

  horizontalGuides.forEach((guide) => {
    const guideValue = Number(guide.value || 0)
    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, clampedLocal.x, guideValue)

    edgeCandidates.push({
      key: `guide-horizontal-${guide.id}`,
      distance: Math.abs(screenY - point.y),
      axis: 'horizontal',
      edge: 'guide',
      kind: 'square',
      guideId: guide.id,
      local: { x: clampedLocal.x, y: guideValue },
      screen: { x: screenX, y: point.y }
    })
  })

  verticalLines.forEach((line) => {
    const lineX = Number(line.start.x || 0)
    const yMin = Math.min(Number(line.start.y || 0), Number(line.end.y || 0))
    const yMax = Math.max(Number(line.start.y || 0), Number(line.end.y || 0))
    const clampedY = Math.max(yMin, Math.min(yMax, clampedLocal.y))
    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, lineX, clampedY)

    edgeCandidates.push({
      key: `line-vertical-${line.id}`,
      distance: Math.abs(screenX - point.x),
      axis: 'vertical',
      edge: 'line',
      kind: 'square',
      lineId: line.id,
      local: { x: lineX, y: clampedY },
      screen: { x: point.x, y: point.y }
    })
  })

  horizontalLines.forEach((line) => {
    const lineY = Number(line.start.y || 0)
    const xMin = Math.min(Number(line.start.x || 0), Number(line.end.x || 0))
    const xMax = Math.max(Number(line.start.x || 0), Number(line.end.x || 0))
    const clampedX = Math.max(xMin, Math.min(xMax, clampedLocal.x))
    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, clampedX, lineY)

    edgeCandidates.push({
      key: `line-horizontal-${line.id}`,
      distance: Math.abs(screenY - point.y),
      axis: 'horizontal',
      edge: 'line',
      kind: 'square',
      lineId: line.id,
      local: { x: clampedX, y: lineY },
      screen: { x: point.x, y: point.y }
    })
  })

  editLines
    .filter((line) => line.axis === 'free')
    .forEach((line) => {
      const closest = getClosestPointOnPanelEditLine(line, clampedLocal)

      if (!closest) return

      const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, closest.x, closest.y)
      const distance = Math.hypot(point.x - screenX, point.y - screenY)

      edgeCandidates.push({
        key: `line-free-${line.id}`,
        distance,
        axis: 'free',
        edge: 'line',
        kind: 'square',
        lineId: line.id,
        local: { x: closest.x, y: closest.y },
        screen: point
      })
    })

  snapSegments
    .filter((segment) => segment.type === 'rect')
    .forEach((segment) => {
      const closest = getClosestPointOnPanelEditLine(segment, clampedLocal)

      if (!closest) return

      const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, closest.x, closest.y)
      const distance = Math.hypot(point.x - screenX, point.y - screenY)

      edgeCandidates.push({
        key: `rect-edge-${segment.id}`,
        distance,
        axis: segment.axis,
        edge: 'rect',
        kind: 'square',
        rectangleId: segment.rectangleId,
        local: { x: closest.x, y: closest.y },
        screen: point
      })
    })

  const circleEdgeSources = [
    ...(selectedMoveOnly ? snapSource.circles : (panelEditCircle.value.circles || [])),
    ...(selectedMoveOnly ? snapSource.rectangles : (panelEditRect.value.rectangles || []))
      .filter((rectangle) => rectangle.shapeType === 'circle' && rectangle.center && Number(rectangle.radius || 0) > 0)
  ]

  circleEdgeSources.forEach((circle, index) => {
    const closest = getClosestPointOnPanelEditCircleEdge(circle, clampedLocal)

    if (!closest) return

    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, closest.x, closest.y)
    const distance = Math.hypot(point.x - screenX, point.y - screenY)
    const sourceId = circle.id || `circle-edge-${index}`

    edgeCandidates.push({
      key: `circle-edge-${sourceId}`,
      distance,
      axis: 'free',
      edge: 'circle',
      kind: 'square',
      circleId: circle.shapeType === 'circle' ? null : circle.id,
      rectangleId: circle.shapeType === 'circle' ? circle.id : null,
      local: { x: closest.x, y: closest.y },
      screen: point
    })
  })

  const bestEdge = edgeCandidates
    .filter((candidate) => candidate.distance <= tolerance)
    .sort((a, b) => a.distance - b.distance)[0]

  return bestEdge || null
} // End getPanelEditTapeSnap

//=================
function drawPanelEditGuideLine(targetContext, context, layout, guide, options = {}) {
  if (!guide) return

  const value = Number(guide.value || 0)
  const isDraft = options.draft === true
  const color = isDraft ? '#ff7a00' : '#006eff'

  targetContext.save()
  targetContext.strokeStyle = color
  targetContext.fillStyle = color
  targetContext.lineWidth = isDraft ? 2 : 1.5
  targetContext.setLineDash(isDraft ? [8, 5] : [12, 5])
  targetContext.beginPath()

  const canvasWidth = panelEditCanvasRef.value?.clientWidth || targetContext.canvas?.width || 0
  const canvasHeight = panelEditCanvasRef.value?.clientHeight || targetContext.canvas?.height || 0

  if (guide.axis === 'vertical') {
    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, value, 0)
    targetContext.moveTo(point.x, 0)
    targetContext.lineTo(point.x, canvasHeight)
  } else {
    const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, 0, value)
    targetContext.moveTo(0, point.y)
    targetContext.lineTo(canvasWidth, point.y)
  }

  targetContext.stroke()
  targetContext.setLineDash([])
  targetContext.restore()
} // End drawPanelEditGuideLine

//=================
function drawPanelEditTapeSnap(targetContext, snap) {
  if (!snap?.screen) return

  const size = snap.kind === 'circle' ? 6 : 7

  targetContext.save()
  targetContext.strokeStyle = '#ff7a00'
  targetContext.fillStyle = '#ffffff'
  targetContext.lineWidth = 2
  targetContext.beginPath()

  if (snap.kind === 'circle') {
    targetContext.arc(snap.screen.x, snap.screen.y, size, 0, Math.PI * 2)
  } else {
    targetContext.rect(snap.screen.x - size / 2, snap.screen.y - size / 2, size, size)
  }

  targetContext.fill()
  targetContext.stroke()
  targetContext.restore()
} // End drawPanelEditTapeSnap

//=================
function resetPanelEditMoveDraft() {
  panelEditMoveController.reset()
} // End resetPanelEditMoveDraft

//=================
function exitPanelEditCommandToSelect() {
  const context = activePanelEditContext.value

  if (!context) return false

  resetPanelEditCommandDrafts()
  drawing.setPanelEditShapeTool('editPanelSelect')
  app.setTool('editPanel')
  app.setStatus(`Edit Panel: Select | ${context.panelName} | ${context.faceLabel}`)
  nextTick(resizePanelEditCanvas)

  return true
} // End exitPanelEditCommandToSelect

//=================
function getPanelEditTapeDraftValueFromPointer(context, layout, draft, event) {
  const canvas = panelEditCanvasRef.value

  if (!canvas || !context || !layout || !draft) {
    return {
      value: draft?.value || 0,
      snap: null
    }
  }

  const rect = canvas.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  const snap = getPanelEditTapeSnap(context, layout, screenX, screenY, { preferredAxis: draft.axis })

  if (snap) {
    return {
      value: draft.axis === 'vertical' ? snap.local.x : snap.local.y,
      snap
    }
  }

  const local = getPanelEditLocalFromScreen(context, layout, screenX, screenY)

  return {
    value: draft.axis === 'vertical' ? local.x : local.y,
    snap: null
  }
} // End getPanelEditTapeDraftValueFromPointer

//=================
function commitPanelEditTapeGuide() {
  const draft = panelEditTape.value.draft

  if (!draft) return

  pushPanelEditHistorySnapshot()

  panelEditTape.value = {
    ...panelEditTape.value,
    draft: null,
    inputBuffer: '',
    guides: [
      ...panelEditTape.value.guides,
      {
        id: `guide-${Date.now()}-${panelEditTape.value.guides.length + 1}`,
        axis: draft.axis,
        baseValue: draft.baseValue,
        value: draft.value
      }
    ]
  }
  app.setStatus('Thước: đã tạo đường guide')
  nextTick(resizePanelEditCanvas)
} // End commitPanelEditTapeGuide

//=================
function getPanelEditRectPointFromPointer(context, layout, event) {
  const canvas = panelEditCanvasRef.value

  if (!canvas || !context || !layout) return null

  const rect = canvas.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  const snap = getPanelEditTapeSnap(context, layout, screenX, screenY)

  if (snap) {
    return {
      local: { ...snap.local },
      snap
    }
  }

  const local = getPanelEditLocalFromScreen(context, layout, screenX, screenY)

  return {
    local: {
      x: Math.max(0, Math.min(context.width, local.x)),
      y: Math.max(0, Math.min(context.height, local.y))
    },
    snap: null
  }
} // End getPanelEditRectPointFromPointer

//=================
function getPanelEditCirclePointFromPointer(context, layout, event) {
  return getPanelEditRectPointFromPointer(context, layout, event)
} // End getPanelEditCirclePointFromPointer

//=================
function drawPanelEditCircle(targetContext, context, layout, circle, options = {}) {
  if (!circle?.center) return

  const inputRadius = Number(options.radiusLabel)
  const radius = Number.isFinite(inputRadius) && inputRadius > 0
    ? inputRadius
    : getPanelEditCircleRadius(circle)

  if (radius <= 0) return

  const center = getPanelEditPoint(context, layout.left, layout.top, layout.scale, circle.center.x, circle.center.y)
  const isDraft = options.draft === true
  const isSelected = options.selected === true
  const isHover = options.hover === true

  targetContext.save()
  targetContext.strokeStyle = isDraft ? '#ff7a00' : (isSelected ? '#ff0000' : (isHover ? '#ff7a00' : '#111111'))
  targetContext.fillStyle = isDraft ? 'rgba(255, 122, 0, 0.08)' : (isHover ? 'rgba(255, 122, 0, 0.08)' : 'rgba(0, 0, 0, 0.02)')
  targetContext.lineWidth = isDraft ? 2 : (isSelected || isHover ? 2.5 : 1.5)
  targetContext.setLineDash(isDraft ? [8, 5] : [])
  targetContext.beginPath()
  targetContext.arc(center.x, center.y, radius * layout.scale, 0, Math.PI * 2)
  targetContext.fill()
  targetContext.stroke()

  if (isDraft && options.radiusLabel) {
    targetContext.setLineDash([])
    targetContext.font = '13px Arial'
    targetContext.textAlign = 'left'
    targetContext.textBaseline = 'middle'
    targetContext.fillStyle = '#ff0000'
    targetContext.fillText(`R = ${options.radiusLabel} mm`, center.x + radius * layout.scale + 8, center.y)
  }

  targetContext.restore()
} // End drawPanelEditCircle


//=================
function drawPanelEditRectangle(targetContext, context, layout, rectangle, options = {}) {
  if (!rectangle) return

  const isDraft = options.draft === true
  const isSelected = options.selected === true
  const isHover = options.hover === true
  const isCutout = rectangle.operation === 'cutout'

  if (rectangle.regionKind === 'polygon' && Array.isArray(rectangle.polygon)) {
    targetContext.save()

    if (isCutout && !isDraft) {
      targetContext.fillStyle = getCssVariable('--mn-bg-canvas', '#f4f4f4')
      targetContext.strokeStyle = '#111111'
      targetContext.lineWidth = 1.8
      targetContext.setLineDash([])
      targetContext.beginPath()
      if (drawPanelEditPolygonPath(targetContext, context, layout, rectangle.polygon)) {
        targetContext.fill()
        erasePanelEditPolygonBoundarySegments(targetContext, context, layout, rectangle.polygon)
        drawPanelEditPolygonCutoutEdges(targetContext, context, layout, rectangle.polygon)

        if (isSelected || isHover) {
          targetContext.strokeStyle = isSelected ? '#ff0000' : '#ff7a00'
          targetContext.lineWidth = 2.5
          targetContext.setLineDash(isHover && !isSelected ? [6, 4] : [])
          targetContext.beginPath()
          if (drawPanelEditPolygonPath(targetContext, context, layout, rectangle.polygon)) {
            targetContext.stroke()
          }
        }
      }
      targetContext.restore()
      return
    }

    targetContext.strokeStyle = isDraft ? '#ff7a00' : (isSelected ? '#ff0000' : (isHover ? '#ff7a00' : '#111111'))
    targetContext.fillStyle = isDraft ? 'rgba(255, 122, 0, 0.12)' : (isHover ? 'rgba(255, 122, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)')
    targetContext.lineWidth = isDraft ? 2 : (isSelected || isHover ? 2.5 : 1.5)
    targetContext.setLineDash(isDraft ? [8, 5] : [])
    targetContext.beginPath()
    if (drawPanelEditPolygonPath(targetContext, context, layout, rectangle.polygon)) {
      targetContext.fill()
      targetContext.stroke()
    }
    targetContext.restore()
    return
  }

  const bounds = getPanelEditRectBounds(rectangle)

  if (bounds.width <= 0 || bounds.height <= 0) return

  const start = getPanelEditPoint(context, layout.left, layout.top, layout.scale, bounds.x, bounds.y + bounds.height)
  const rectWidth = bounds.width * layout.scale
  const rectHeight = bounds.height * layout.scale

  targetContext.save()
  if (isCutout && !isDraft) {
    targetContext.fillStyle = getCssVariable('--mn-bg-canvas', '#f4f4f4')
    targetContext.strokeStyle = '#111111'
    targetContext.lineWidth = 1.8
    targetContext.setLineDash([])
    targetContext.beginPath()
    targetContext.rect(start.x, start.y, rectWidth, rectHeight)
    targetContext.fill()
    erasePanelEditCutoutBoundarySegments(targetContext, context, layout, bounds)
    drawPanelEditCutoutEdges(targetContext, context, layout, bounds)

    if (isSelected || isHover) {
      targetContext.strokeStyle = isSelected ? '#ff0000' : '#ff7a00'
      targetContext.lineWidth = 2.5
      targetContext.setLineDash(isHover && !isSelected ? [6, 4] : [])
      targetContext.beginPath()
      targetContext.rect(start.x, start.y, rectWidth, rectHeight)
      targetContext.stroke()
    }

    targetContext.restore()
    return
  }

  targetContext.strokeStyle = isDraft ? '#ff7a00' : (isSelected ? '#ff0000' : (isHover ? '#ff7a00' : '#111111'))
  targetContext.fillStyle = isDraft ? 'rgba(255, 122, 0, 0.12)' : (isHover ? 'rgba(255, 122, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)')
  targetContext.lineWidth = isDraft ? 2 : (isSelected || isHover ? 2.5 : 1.5)
  targetContext.setLineDash(isDraft ? [8, 5] : [])
  targetContext.beginPath()
  targetContext.rect(start.x, start.y, rectWidth, rectHeight)
  targetContext.fill()
  targetContext.stroke()
  targetContext.restore()
} // End drawPanelEditRectangle


//=================
function erasePanelEditCutoutBoundarySegments(targetContext, context, layout, bounds) {
  const left = Number(bounds.x || 0)
  const bottom = Number(bounds.y || 0)
  const right = left + Number(bounds.width || 0)
  const top = bottom + Number(bounds.height || 0)
  const tolerance = 0.01
  const edges = [
    { draw: left <= tolerance, start: { x: left, y: bottom }, end: { x: left, y: top } },
    { draw: right >= context.width - tolerance, start: { x: right, y: bottom }, end: { x: right, y: top } },
    { draw: bottom <= tolerance, start: { x: left, y: bottom }, end: { x: right, y: bottom } },
    { draw: top >= context.height - tolerance, start: { x: left, y: top }, end: { x: right, y: top } }
  ]

  targetContext.save()
  targetContext.strokeStyle = getCssVariable('--mn-bg-canvas', '#f4f4f4')
  targetContext.lineWidth = 5
  targetContext.lineCap = 'butt'
  targetContext.setLineDash([])
  targetContext.beginPath()
  edges.forEach((edge) => {
    if (!edge.draw) return

    const p1 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, edge.start.x, edge.start.y)
    const p2 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, edge.end.x, edge.end.y)

    targetContext.moveTo(p1.x, p1.y)
    targetContext.lineTo(p2.x, p2.y)
  })
  targetContext.stroke()
  targetContext.restore()
} // End erasePanelEditCutoutBoundarySegments

//=================
function drawPanelEditCutoutEdges(targetContext, context, layout, bounds) {
  const left = Number(bounds.x || 0)
  const bottom = Number(bounds.y || 0)
  const right = left + Number(bounds.width || 0)
  const top = bottom + Number(bounds.height || 0)
  const tolerance = 0.01
  const edges = [
    {
      skip: left <= tolerance,
      start: { x: left, y: bottom },
      end: { x: left, y: top }
    },
    {
      skip: right >= context.width - tolerance,
      start: { x: right, y: bottom },
      end: { x: right, y: top }
    },
    {
      skip: bottom <= tolerance,
      start: { x: left, y: bottom },
      end: { x: right, y: bottom }
    },
    {
      skip: top >= context.height - tolerance,
      start: { x: left, y: top },
      end: { x: right, y: top }
    }
  ]

  targetContext.beginPath()
  edges.forEach((edge) => {
    if (edge.skip) return

    const p1 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, edge.start.x, edge.start.y)
    const p2 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, edge.end.x, edge.end.y)

    targetContext.moveTo(p1.x, p1.y)
    targetContext.lineTo(p2.x, p2.y)
  })
  targetContext.stroke()
} // End drawPanelEditCutoutEdges


//=================
function isPanelEditBoundarySegment(context, pointA, pointB) {
  const edgeA = getPanelEditBoundaryEdge(context, pointA)
  const edgeB = getPanelEditBoundaryEdge(context, pointB)

  return edgeA && edgeA === edgeB
} // End isPanelEditBoundarySegment

//=================
function isPanelEditCutoutBoundaryOnlySegment(context, pointA, pointB) {
  return isPanelEditSegmentOnPanelBoundaryLine(context, pointA, pointB)
} // End isPanelEditCutoutBoundaryOnlySegment

//=================
function isPanelEditSegmentOnPanelBoundaryLine(context, pointA, pointB) {
  if (!context || !pointA || !pointB) return false

  const tolerance = 0.01
  const x1 = Number(pointA.x || 0)
  const y1 = Number(pointA.y || 0)
  const x2 = Number(pointB.x || 0)
  const y2 = Number(pointB.y || 0)
  const width = Number(context.width || 0)
  const height = Number(context.height || 0)

  if (Math.abs(x1) <= tolerance && Math.abs(x2) <= tolerance) return true
  if (Math.abs(x1 - width) <= tolerance && Math.abs(x2 - width) <= tolerance) return true
  if (Math.abs(y1) <= tolerance && Math.abs(y2) <= tolerance) return true
  if (Math.abs(y1 - height) <= tolerance && Math.abs(y2 - height) <= tolerance) return true

  return false
} // End isPanelEditSegmentOnPanelBoundaryLine

//=================
function getPanelEditBoundaryCornerBetweenEdges(context, edgeA, edgeB) {
  if (!context || !edgeA || !edgeB || edgeA === edgeB) return null

  const key = [edgeA, edgeB].sort().join('-')

  if (key === 'left-top') return { x: 0, y: context.height }
  if (key === 'bottom-left') return { x: 0, y: 0 }
  if (key === 'right-top') return { x: context.width, y: context.height }
  if (key === 'bottom-right') return { x: context.width, y: 0 }

  return null
} // End getPanelEditBoundaryCornerBetweenEdges

//=================
function getPanelEditBoundaryPointCoord(edge, point) {
  if (!edge || !point) return 0

  if (edge === 'left' || edge === 'right') return Number(point.y || 0)

  return Number(point.x || 0)
} // End getPanelEditBoundaryPointCoord

//=================
function getPanelEditBoundaryEdgeLength(context, edge) {
  if (!context || !edge) return 0

  if (edge === 'left' || edge === 'right') return Number(context.height || 0)

  return Number(context.width || 0)
} // End getPanelEditBoundaryEdgeLength

//=================
function getPanelEditBoundaryPointFromCoord(context, edge, coord) {
  const value = Number(coord || 0)

  if (edge === 'left') return { x: 0, y: value }
  if (edge === 'right') return { x: context.width, y: value }
  if (edge === 'bottom') return { x: value, y: 0 }
  if (edge === 'top') return { x: value, y: context.height }

  return { x: 0, y: 0 }
} // End getPanelEditBoundaryPointFromCoord

//=================
function addPanelEditBoundaryEraseSpan(spans, context, edge, pointA, pointB) {
  if (!spans || !context || !edge || !pointA || !pointB) return

  const length = getPanelEditBoundaryEdgeLength(context, edge)
  const coordA = Math.max(0, Math.min(length, getPanelEditBoundaryPointCoord(edge, pointA)))
  const coordB = Math.max(0, Math.min(length, getPanelEditBoundaryPointCoord(edge, pointB)))
  const start = Math.min(coordA, coordB)
  const end = Math.max(coordA, coordB)

  if (end - start <= 0.01) return

  spans[edge].push({ start, end })
} // End addPanelEditBoundaryEraseSpan



//=================
function addPanelEditBoundarySplitCoord(values, coord, length) {
  if (!Array.isArray(values) || !Number.isFinite(coord) || !Number.isFinite(length)) return

  const value = Math.max(0, Math.min(length, coord))

  if (values.some((item) => Math.abs(item - value) <= 0.01)) return

  values.push(value)
} // End addPanelEditBoundarySplitCoord

//=================
function getPanelEditBoundaryProbePoint(context, edge, coord) {
  const epsilon = 0.25
  const value = Number(coord || 0)

  if (edge === 'left') return { x: epsilon, y: value }
  if (edge === 'right') return { x: Number(context.width || 0) - epsilon, y: value }
  if (edge === 'bottom') return { x: value, y: epsilon }
  if (edge === 'top') return { x: value, y: Number(context.height || 0) - epsilon }

  return { x: 0, y: 0 }
} // End getPanelEditBoundaryProbePoint

//=================
function addPanelEditBoundarySegmentIntersection(values, context, edge, pointA, pointB) {
  if (!values || !context || !edge || !pointA || !pointB) return

  const x1 = Number(pointA.x || 0)
  const y1 = Number(pointA.y || 0)
  const x2 = Number(pointB.x || 0)
  const y2 = Number(pointB.y || 0)
  const width = Number(context.width || 0)
  const height = Number(context.height || 0)
  const length = getPanelEditBoundaryEdgeLength(context, edge)
  let t = null
  let coord = null

  if (edge === 'left' || edge === 'right') {
    const x = edge === 'left' ? 0 : width

    if (Math.abs(x2 - x1) <= 1e-9) return

    t = (x - x1) / (x2 - x1)
    if (t < -0.0001 || t > 1.0001) return

    coord = y1 + (y2 - y1) * t
    if (coord < -0.01 || coord > height + 0.01) return
  } else {
    const y = edge === 'bottom' ? 0 : height

    if (Math.abs(y2 - y1) <= 1e-9) return

    t = (y - y1) / (y2 - y1)
    if (t < -0.0001 || t > 1.0001) return

    coord = x1 + (x2 - x1) * t
    if (coord < -0.01 || coord > width + 0.01) return
  }

  addPanelEditBoundarySplitCoord(values, coord, length)
} // End addPanelEditBoundarySegmentIntersection

//=================
function collectPanelEditBoundarySplitCoords(context, edge, polygon) {
  const length = getPanelEditBoundaryEdgeLength(context, edge)
  const values = [0, length]

  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]

    if (getPanelEditBoundaryEdge(context, point) === edge) {
      addPanelEditBoundarySplitCoord(values, getPanelEditBoundaryPointCoord(edge, point), length)
    }

    addPanelEditBoundarySegmentIntersection(values, context, edge, point, nextPoint)
  })

  return values.sort((a, b) => a - b)
} // End collectPanelEditBoundarySplitCoords

//=================
function collectPanelEditPolygonBoundaryEraseSpans(context, polygon) {
  const spans = {
    left: [],
    right: [],
    bottom: [],
    top: []
  }

  if (!context || !Array.isArray(polygon) || polygon.length < 3) return spans

  Object.keys(spans).forEach((edge) => {
    const values = collectPanelEditBoundarySplitCoords(context, edge, polygon)

    for (let index = 0; index < values.length - 1; index += 1) {
      const start = values[index]
      const end = values[index + 1]

      if (end - start <= 0.01) continue

      const mid = (start + end) / 2
      const probe = getPanelEditBoundaryProbePoint(context, edge, mid)

      if (!isPanelEditPointInsidePolygon(probe, polygon)) continue

      spans[edge].push({ start, end })
    }
  })

  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]
    const edgeA = getPanelEditBoundaryEdge(context, point)
    const edgeB = getPanelEditBoundaryEdge(context, nextPoint)

    if (!edgeA || !edgeB || edgeA === edgeB) return

    const corner = getPanelEditBoundaryCornerBetweenEdges(context, edgeA, edgeB)

    if (!corner) return

    const cornerProbe = {
      x: corner.x + (corner.x <= 0 ? 0.25 : -0.25),
      y: corner.y + (corner.y <= 0 ? 0.25 : -0.25)
    }

    if (!isPanelEditPointInsidePolygon(corner, polygon) && !isPanelEditPointInsidePolygon(cornerProbe, polygon)) return

    addPanelEditBoundaryEraseSpan(spans, context, edgeA, point, corner)
    addPanelEditBoundaryEraseSpan(spans, context, edgeB, nextPoint, corner)
  })

  return spans
} // End collectPanelEditPolygonBoundaryEraseSpans

//=================
function mergePanelEditBoundaryEraseSpans(spans) {
  return spans
    .filter((span) => span && Number.isFinite(span.start) && Number.isFinite(span.end) && span.end - span.start > 0.01)
    .sort((a, b) => a.start - b.start)
    .reduce((merged, span) => {
      const last = merged[merged.length - 1]

      if (!last || span.start > last.end + 0.01) {
        merged.push({ start: span.start, end: span.end })
        return merged
      }

      last.end = Math.max(last.end, span.end)
      return merged
    }, [])
} // End mergePanelEditBoundaryEraseSpans

//=================
function drawPanelEditVisibleBoundarySegment(targetContext, context, layout, edge, startCoord, endCoord) {
  if (endCoord - startCoord <= 0.01) return

  const startPoint = getPanelEditBoundaryPointFromCoord(context, edge, startCoord)
  const endPoint = getPanelEditBoundaryPointFromCoord(context, edge, endCoord)
  const p1 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, startPoint.x, startPoint.y)
  const p2 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, endPoint.x, endPoint.y)

  targetContext.moveTo(p1.x, p1.y)
  targetContext.lineTo(p2.x, p2.y)
} // End drawPanelEditVisibleBoundarySegment

//=================
function redrawPanelEditVisiblePanelBoundary(targetContext, context, layout, polygons) {
  const polygonList = Array.isArray(polygons?.[0]) ? polygons : [polygons].filter(Boolean)
  const edges = ['left', 'right', 'bottom', 'top']
  const spans = {
    left: [],
    right: [],
    bottom: [],
    top: []
  }

  polygonList.forEach((polygon) => {
    const polygonSpans = collectPanelEditPolygonBoundaryEraseSpans(context, polygon)

    edges.forEach((edge) => {
      spans[edge].push(...(polygonSpans[edge] || []))
    })
  })

  targetContext.save()
  targetContext.strokeStyle = '#111111'
  targetContext.lineWidth = 2
  targetContext.lineCap = 'square'
  targetContext.lineJoin = 'miter'
  targetContext.setLineDash([])
  targetContext.beginPath()

  edges.forEach((edge) => {
    const length = getPanelEditBoundaryEdgeLength(context, edge)
    const merged = mergePanelEditBoundaryEraseSpans(spans[edge] || [])
    let cursor = 0

    merged.forEach((span) => {
      drawPanelEditVisibleBoundarySegment(targetContext, context, layout, edge, cursor, span.start)
      cursor = Math.max(cursor, span.end)
    })

    drawPanelEditVisibleBoundarySegment(targetContext, context, layout, edge, cursor, length)
  })

  targetContext.stroke()
  targetContext.restore()
} // End redrawPanelEditVisiblePanelBoundary

//=================
function drawPanelEditEraseSegment(targetContext, context, layout, pointA, pointB) {
  const p1 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, pointA.x, pointA.y)
  const p2 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, pointB.x, pointB.y)

  targetContext.moveTo(p1.x, p1.y)
  targetContext.lineTo(p2.x, p2.y)
} // End drawPanelEditEraseSegment


//=================
function erasePanelEditPolygonBoundarySegments(targetContext, context, layout, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return

  const backgroundColor = getCssVariable('--mn-bg-canvas', '#f4f4f4')
  const spans = collectPanelEditPolygonBoundaryEraseSpans(context, polygon)
  const edges = ['left', 'right', 'bottom', 'top']

  targetContext.save()
  targetContext.strokeStyle = backgroundColor
  targetContext.lineWidth = 8
  targetContext.lineCap = 'square'
  targetContext.lineJoin = 'miter'
  targetContext.setLineDash([])
  targetContext.beginPath()

  edges.forEach((edge) => {
    const merged = mergePanelEditBoundaryEraseSpans(spans[edge] || [])

    merged.forEach((span) => {
      drawPanelEditVisibleBoundarySegment(targetContext, context, layout, edge, span.start, span.end)
    })
  })

  targetContext.stroke()
  targetContext.restore()
} // End erasePanelEditPolygonBoundarySegments

//=================
function drawPanelEditPolygonCutoutEdges(targetContext, context, layout, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return

  targetContext.save()
  targetContext.strokeStyle = '#111111'
  targetContext.lineWidth = 2
  targetContext.lineCap = 'square'
  targetContext.lineJoin = 'miter'
  targetContext.setLineDash([])
  targetContext.beginPath()
  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]

    if (isPanelEditCutoutBoundaryOnlySegment(context, point, nextPoint)) return

    const p1 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, point.x, point.y)
    const p2 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, nextPoint.x, nextPoint.y)

    targetContext.moveTo(p1.x, p1.y)
    targetContext.lineTo(p2.x, p2.y)
  })
  targetContext.stroke()
  targetContext.restore()
} // End drawPanelEditPolygonCutoutEdges

//=================
function redrawPanelEditCutoutEdgesAfterBoundary(targetContext, context, layout, polygons) {
  const polygonList = Array.isArray(polygons?.[0]) ? polygons : [polygons].filter(Boolean)

  polygonList.forEach((polygon) => {
    drawPanelEditPolygonCutoutEdges(targetContext, context, layout, polygon)
  })
} // End redrawPanelEditCutoutEdgesAfterBoundary

//=================
function commitPanelEditRectangle() {
  const draft = panelEditRect.value.draft

  if (!draft) return

  const rectangle = createPanelEditRectangleRecord(draft, {
    id: `rect-${Date.now()}-${panelEditRect.value.rectangles.length + 1}`,
    operation: 'none'
  })

  if (!rectangle) {
    resetPanelEditRectDraft()
    app.setStatus('Vẽ hình chữ nhật: kích thước không hợp lệ')
    nextTick(resizePanelEditCanvas)
    return
  }

  panelEditRect.value = {
    ...panelEditRect.value,
    hoverSnap: null,
    draft: null,
    pendingAction: rectangle
  }
  app.setStatus('Vẽ hình chữ nhật: chọn None hoặc Khấu')
  nextTick(resizePanelEditCanvas)
} // End commitPanelEditRectangle

//=================
function confirmPanelEditRectangleAction(operation) {
  const pending = panelEditRect.value.pendingAction

  if (!pending) return

  const isCutout = operation === 'cutout'
  const isExistingRegion = ['lineRegion', 'rectangleRegion', 'circleRegion'].includes(pending.source)

  if (isExistingRegion && !isCutout) {
    panelEditRect.value = {
      ...panelEditRect.value,
      pendingAction: null
    }
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null
    }
    app.setStatus('Select vùng: không thay đổi')
    nextTick(resizePanelEditCanvas)
    return
  }

  pushPanelEditHistorySnapshot()

  const rectangle = {
    id: pending.id || `rect-${Date.now()}-${panelEditRect.value.rectangles.length + 1}`,
    start: { ...pending.start },
    end: { ...pending.end },
    source: pending.source || 'rectangle',
    regionKind: pending.regionKind || 'rect',
    shapeType: pending.shapeType || null,
    center: pending.center ? { x: Number(pending.center.x || 0), y: Number(pending.center.y || 0) } : null,
    radius: Number(pending.radius || 0),
    polygon: Array.isArray(pending.polygon) ? pending.polygon.map((point) => ({ ...point })) : null,
    operation: isCutout ? 'cutout' : 'none'
  }
  const nextRectangles = (panelEditRect.value.rectangles || [])
    .filter((rectangleItem) => !(isCutout && pending.source === 'rectangleRegion' && rectangleItem.id === pending.sourceId))
  const nextCircles = (panelEditCircle.value.circles || [])
    .filter((circleItem) => !(isCutout && pending.source === 'circleRegion' && circleItem.id === pending.sourceId))

  panelEditRect.value = {
    ...panelEditRect.value,
    hoverSnap: null,
    draft: null,
    pendingAction: null,
    rectangles: [
      ...nextRectangles,
      rectangle
    ]
  }
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null
  }
  panelEditCircle.value = {
    ...panelEditCircle.value,
    circles: nextCircles
  }

  app.setStatus(isCutout ? 'Edit Panel: đã chọn Khấu xuyên panel' : 'Vẽ hình chữ nhật: đã tạo hình chữ nhật')
  nextTick(resizePanelEditCanvas)
} // End confirmPanelEditRectangleAction

//=================
function drawPanelEditRearEdge(targetContext, context, layout) {
  const rearColor = '#ff0000'
  const rearOffset = 100 * layout.scale
  const labelOffset = 18
  const tickSize = 8
  let start = null
  let end = null
  let label = null
  let tickDirection = 'horizontal'

  if (context.rearEdge === 'left') {
    const x = layout.left - rearOffset
    start = { x, y: layout.top }
    end = { x, y: layout.bottom }
    label = { x: x - labelOffset, y: layout.top + layout.faceHeight / 2, rotate: -Math.PI / 2 }
    tickDirection = 'horizontal'
  } else if (context.rearEdge === 'right') {
    const x = layout.right + rearOffset
    start = { x, y: layout.top }
    end = { x, y: layout.bottom }
    label = { x: x + labelOffset, y: layout.top + layout.faceHeight / 2, rotate: Math.PI / 2 }
    tickDirection = 'horizontal'
  } else if (context.rearEdge === 'top') {
    const y = layout.top - rearOffset
    start = { x: layout.left, y }
    end = { x: layout.right, y }
    label = { x: layout.left + layout.faceWidth / 2, y: y - labelOffset, rotate: 0 }
    tickDirection = 'vertical'
  } else {
    const y = layout.bottom + rearOffset
    start = { x: layout.left, y }
    end = { x: layout.right, y }
    label = { x: layout.left + layout.faceWidth / 2, y: y + labelOffset, rotate: 0 }
    tickDirection = 'vertical'
  }

  targetContext.save()
  targetContext.strokeStyle = rearColor
  targetContext.fillStyle = rearColor
  targetContext.lineWidth = 3
  targetContext.beginPath()
  targetContext.moveTo(start.x, start.y)
  targetContext.lineTo(end.x, end.y)
  targetContext.stroke()

  targetContext.lineWidth = 1.5
  targetContext.beginPath()
  if (tickDirection === 'horizontal') {
    targetContext.moveTo(start.x - tickSize, start.y)
    targetContext.lineTo(start.x + tickSize, start.y)
    targetContext.moveTo(end.x - tickSize, end.y)
    targetContext.lineTo(end.x + tickSize, end.y)
  } else {
    targetContext.moveTo(start.x, start.y - tickSize)
    targetContext.lineTo(start.x, start.y + tickSize)
    targetContext.moveTo(end.x, end.y - tickSize)
    targetContext.lineTo(end.x, end.y + tickSize)
  }
  targetContext.stroke()

  targetContext.translate(label.x, label.y)
  targetContext.rotate(label.rotate)
  targetContext.font = '12px Arial, Helvetica, sans-serif'
  targetContext.textAlign = 'center'
  targetContext.textBaseline = 'middle'
  targetContext.fillText(context.rearLabel || 'Cạnh Sau', 0, 0)
  targetContext.restore()
} // End drawPanelEditRearEdge

//=================
function drawPanelEditFaceEdgeLabels(targetContext, context, layout) {
  if (!context?.edgeLabels) return

  const sideLabel = context.edgeLabels.side || context.edgeLabels.left || context.edgeLabels.right

  if (!sideLabel) return

  const sideEdge = context.edgeLabels.sideEdge || (context.edgeLabels.right ? 'right' : 'left')
  const labelColor = '#ff0000'
  const sideOffset = 100 * layout.scale
  const labelOffset = 18
  const tickSize = 8
  const x = sideEdge === 'right' ? layout.right + sideOffset : layout.left - sideOffset
  const start = { x, y: layout.top }
  const end = { x, y: layout.bottom }
  const labelX = sideEdge === 'right' ? x + labelOffset : x - labelOffset
  const labelRotate = sideEdge === 'right' ? Math.PI / 2 : -Math.PI / 2

  targetContext.save()
  targetContext.strokeStyle = labelColor
  targetContext.fillStyle = labelColor
  targetContext.lineWidth = 3
  targetContext.beginPath()
  targetContext.moveTo(start.x, start.y)
  targetContext.lineTo(end.x, end.y)
  targetContext.stroke()

  targetContext.lineWidth = 1.5
  targetContext.beginPath()
  targetContext.moveTo(start.x - tickSize, start.y)
  targetContext.lineTo(start.x + tickSize, start.y)
  targetContext.moveTo(end.x - tickSize, end.y)
  targetContext.lineTo(end.x + tickSize, end.y)
  targetContext.stroke()

  targetContext.translate(labelX, layout.top + layout.faceHeight / 2)
  targetContext.rotate(labelRotate)
  targetContext.font = '12px Arial, Helvetica, sans-serif'
  targetContext.textAlign = 'center'
  targetContext.textBaseline = 'middle'
  targetContext.fillText(sideLabel, 0, 0)
  targetContext.restore()
} // End drawPanelEditFaceEdgeLabels


//=================
function getPanelEditLinePointFromPointer(context, layout, event, options = {}) {
  const canvas = panelEditCanvasRef.value

  if (!canvas || !context || !layout) return null

  const rect = canvas.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  const snap = getPanelEditTapeSnap(context, layout, screenX, screenY, options)
  const rawLocal = getPanelEditLocalFromScreen(context, layout, screenX, screenY)
  const local = snap?.local || {
    x: Math.max(0, Math.min(context.width, rawLocal.x)),
    y: Math.max(0, Math.min(context.height, rawLocal.y))
  }

  return {
    local: { ...local },
    snap: snap || null
  }
} // End getPanelEditLinePointFromPointer


//=================
function getPanelEditAxisLockedPoint(start, current) {
  if (!start || !current) return current

  const dx = Number(current.x || 0) - Number(start.x || 0)
  const dy = Number(current.y || 0) - Number(start.y || 0)

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: Number(current.x || 0), y: Number(start.y || 0) }
  }

  return { x: Number(start.x || 0), y: Number(current.y || 0) }
} // End getPanelEditAxisLockedPoint

//=================
function normalizePanelEditLine(context, start, end, options = {}) {
  if (!context || !start || !end) return null

  let x1 = Math.max(0, Math.min(context.width, Number(start.x || 0)))
  let y1 = Math.max(0, Math.min(context.height, Number(start.y || 0)))
  let x2 = Math.max(0, Math.min(context.width, Number(end.x || 0)))
  let y2 = Math.max(0, Math.min(context.height, Number(end.y || 0)))
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)

  if (length <= 0.01) return null

  let axis = 'free'

  if (Math.abs(dx) <= 0.01) {
    axis = 'vertical'
    x2 = x1
  } else if (Math.abs(dy) <= 0.01) {
    axis = 'horizontal'
    y2 = y1
  }

  return {
    id: options.id || `line-${Date.now()}`,
    groupId: options.groupId || null,
    groupType: options.groupType || null,
    axis,
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 }
  }
} // End normalizePanelEditLine


//=================
function getEffectivePanelEditArcDraft(draft = panelEditArc.value.draft) {
  return getPanelEditArcDraftWithRadiusInput(draft, panelEditArc.value.inputBuffer)
} // End getEffectivePanelEditArcDraft

//=================
function getPanelEditLineScreenPoints(context, layout, line) {
  if (!line?.start) return null

  const endPoint = line.end || line.current

  if (!endPoint) return null

  const start = getPanelEditPoint(context, layout.left, layout.top, layout.scale, line.start.x, line.start.y)
  const end = getPanelEditPoint(context, layout.left, layout.top, layout.scale, endPoint.x, endPoint.y)

  return { start, end }
} // End getPanelEditLineScreenPoints

//=================
function drawPanelEditLine(targetContext, context, layout, line, options = {}) {
  const screen = getPanelEditLineScreenPoints(context, layout, line)

  if (!screen) return

  const isDraft = options.draft === true
  const isSelected = options.selected === true
  const isHover = options.hover === true

  targetContext.save()
  targetContext.strokeStyle = isDraft ? '#ff7a00' : (isSelected ? '#ff0000' : (isHover ? '#ff7a00' : '#111111'))
  targetContext.lineWidth = isDraft ? 2 : (isSelected || isHover ? 3 : 1.8)
  targetContext.setLineDash(isDraft ? [8, 5] : [])
  targetContext.beginPath()
  targetContext.moveTo(screen.start.x, screen.start.y)
  targetContext.lineTo(screen.end.x, screen.end.y)
  targetContext.stroke()
  targetContext.restore()
} // End drawPanelEditLine

//=================
function getPanelEditArcPointFromPointer(context, layout, event) {
  return getPanelEditLinePointFromPointer(context, layout, event)
} // End getPanelEditArcPointFromPointer

//=================
function drawPanelEditArcDraft(targetContext, context, layout, draft, options = {}) {
  if (!draft?.start) return

  const effectiveDraft = getPanelEditArcDraftWithRadiusInput(draft, options.radiusLabel || '')
  const arcData = getPanelEditArcData(effectiveDraft)
  const endPoint = effectiveDraft.end || effectiveDraft.current

  if (!endPoint) return

  targetContext.save()

  if (arcData) {
    const arcPoints = getPanelEditArcPoints(effectiveDraft, 36)

    if (arcPoints.length >= 2) {
      targetContext.strokeStyle = '#ff7a00'
      targetContext.lineWidth = 2
      targetContext.setLineDash([8, 5])
      targetContext.beginPath()

      arcPoints.forEach((point, index) => {
        const screenPoint = getPanelEditPoint(context, layout.left, layout.top, layout.scale, point.x, point.y)

        if (index === 0) {
          targetContext.moveTo(screenPoint.x, screenPoint.y)
        } else {
          targetContext.lineTo(screenPoint.x, screenPoint.y)
        }
      })

      targetContext.stroke()
    }

    const labelText = options.radiusLabel || `${Math.round(arcData.radius * 10) / 10}`

    if (labelText) {
      const labelScreen = getPanelEditPoint(context, layout.left, layout.top, layout.scale, arcData.bulge.x, arcData.bulge.y)

      targetContext.fillStyle = '#ff0000'
      targetContext.font = '13px Arial'
      targetContext.textAlign = 'left'
      targetContext.textBaseline = 'bottom'
      targetContext.fillText(`R = ${labelText} mm`, labelScreen.x + 8, labelScreen.y - 8)
    }
  }

  targetContext.restore()
} // End drawPanelEditArcDraft

//=================
function drawPanelEditArcHoverPreview(targetContext, context, layout, point) {
  if (!point) return

  const radius = Math.min(24, Math.max(10, Math.min(context.width, context.height) * 0.04))
  const center = getPanelEditPoint(context, layout.left, layout.top, layout.scale, point.x, point.y)

  targetContext.save()
  targetContext.strokeStyle = '#ff7a00'
  targetContext.lineWidth = 1.5
  targetContext.setLineDash([6, 4])
  targetContext.beginPath()
  targetContext.arc(center.x, center.y + radius * layout.scale * 0.2, radius * layout.scale, Math.PI * 1.1, Math.PI * 1.9)
  targetContext.stroke()
  targetContext.restore()
} // End drawPanelEditArcHoverPreview

//=================
function commitPanelEditArc() {
  const draft = panelEditArc.value.draft
  const context = activePanelEditContext.value

  if (!draft?.start || !context) return

  const sourceDraft = getEffectivePanelEditArcDraft(draft)
  const sourceEnd = sourceDraft.end || sourceDraft.current
  const arcDraft = sourceDraft.stage === 'bulge'
    ? sourceDraft
    : {
        ...sourceDraft,
        stage: 'bulge',
        end: sourceEnd,
        current: getPanelEditArcDefaultBulge(sourceDraft.start, sourceEnd)
      }
  const arcPoints = getPanelEditArcPoints(arcDraft, 28)

  if (arcPoints.length < 2) {
    resetPanelEditArcDraft()
    app.setStatus('Arc: cung không hợp lệ')
    resizePanelEditCanvas()
    return
  }

  const baseId = `arc-${Date.now()}`
  const nextLines = []

  for (let index = 0; index < arcPoints.length - 1; index += 1) {
    const line = normalizePanelEditLine(context, arcPoints[index], arcPoints[index + 1], {
      id: `${baseId}-seg-${index + 1}`,
      groupId: baseId,
      groupType: 'arc'
    })

    if (line) nextLines.push(line)
  }

  if (!nextLines.length) {
    resetPanelEditArcDraft()
    app.setStatus('Arc: không tạo được line cung')
    resizePanelEditCanvas()
    return
  }

  pushPanelEditHistorySnapshot()
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null,
    lines: [
      ...panelEditLine.value.lines,
      ...nextLines
    ]
  }
  panelEditArc.value = {
    ...panelEditArc.value,
    hoverSnap: null,
    hoverPoint: null,
    draft: null,
    inputBuffer: ''
  }
  app.setStatus('Arc: đã tạo cung tròn 3 điểm')
  nextTick(resizePanelEditCanvas)
} // End commitPanelEditArc

//=================
function isFullPanelEditVerticalLine(context, line) {
  if (!context || !line || line.axis !== 'vertical') return false

  const yValues = [Number(line.start.y || 0), Number(line.end.y || 0)].sort((a, b) => a - b)

  return yValues[0] <= 0.01 && yValues[1] >= context.height - 0.01
} // End isFullPanelEditVerticalLine

//=================
function isFullPanelEditHorizontalLine(context, line) {
  if (!context || !line || line.axis !== 'horizontal') return false

  const xValues = [Number(line.start.x || 0), Number(line.end.x || 0)].sort((a, b) => a - b)

  return xValues[0] <= 0.01 && xValues[1] >= context.width - 0.01
} // End isFullPanelEditHorizontalLine

//=================
function getSortedPanelEditCuts(values, maxValue) {
  const result = [0, maxValue]

  values.forEach((value) => {
    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) return
    if (numberValue <= 0.01 || numberValue >= maxValue - 0.01) return
    if (result.some((item) => Math.abs(item - numberValue) <= 0.01)) return

    result.push(numberValue)
  })

  return result.sort((a, b) => a - b)
} // End getSortedPanelEditCuts

//=================
function getPanelEditBoundaryEdge(context, point) {
  if (!context || !point) return null

  const tolerance = 0.01
  const x = Number(point.x || 0)
  const y = Number(point.y || 0)

  if (Math.abs(x) <= tolerance) return 'left'
  if (Math.abs(x - context.width) <= tolerance) return 'right'
  if (Math.abs(y) <= tolerance) return 'bottom'
  if (Math.abs(y - context.height) <= tolerance) return 'top'

  return null
} // End getPanelEditBoundaryEdge

//=================
function getPanelEditCornerForEdges(context, edgeA, edgeB) {
  const key = [edgeA, edgeB].sort().join('-')

  if (key === 'left-top') return { x: 0, y: context.height }
  if (key === 'bottom-left') return { x: 0, y: 0 }
  if (key === 'right-top') return { x: context.width, y: context.height }
  if (key === 'bottom-right') return { x: context.width, y: 0 }

  return null
} // End getPanelEditCornerForEdges



//=================
function getPanelEditBoundaryCutoutPolygons() {
  return (panelEditRect.value.rectangles || [])
    .filter((rectangle) => rectangle.operation === 'cutout')
    .map((rectangle) => {
      if (Array.isArray(rectangle.polygon) && rectangle.polygon.length >= 3) {
        return rectangle.polygon.map((point) => ({ x: Number(point.x || 0), y: Number(point.y || 0) }))
      }

      return getPanelEditRectPolygon(rectangle)
    })
    .filter((polygon) => Array.isArray(polygon) && polygon.length >= 3)
} // End getPanelEditBoundaryCutoutPolygons



//=================
function getPanelEditCircleRegion(circle, index) {
  const bounds = getPanelEditCircleBounds(circle)

  if (!bounds) return null

  return {
    id: `circle-region-${circle.id || index}`,
    source: 'circleRegion',
    sourceId: circle.id || null,
    regionKind: 'polygon',
    shapeType: 'circle',
    polygon: getPanelEditCirclePolygon(circle),
    start: { x: bounds.x, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    center: { x: Number(circle.center.x || 0), y: Number(circle.center.y || 0) },
    radius: getPanelEditCircleRadius(circle),
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    operation: 'none'
  }
} // End getPanelEditCircleRegion

//=================
function getPanelEditClosedShapeRegions() {
  const rectangleRegions = (panelEditRect.value.rectangles || [])
    .map((rectangle, index) => getPanelEditRectangleRegion(rectangle, index))
    .filter(Boolean)
  const circleRegions = (panelEditCircle.value.circles || [])
    .map((circle, index) => getPanelEditCircleRegion(circle, index))
    .filter(Boolean)

  return [
    ...rectangleRegions,
    ...circleRegions
  ]
} // End getPanelEditClosedShapeRegions

//=================
function isPointInPanelEditPolygon(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false

  let inside = false

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index]
    const previousPoint = polygon[previous]
    const intersects = ((currentPoint.y > point.y) !== (previousPoint.y > point.y))
      && (point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / ((previousPoint.y - currentPoint.y) || 0.000001) + currentPoint.x)

    if (intersects) inside = !inside
  }

  return inside
} // End isPointInPanelEditPolygon

//=================
function addPanelEditUniquePoint(points, point) {
  const key = getPanelEditPointKey(point)

  if (points.some((item) => getPanelEditPointKey(item) === key)) return

  points.push({
    x: Math.round(Number(point.x || 0) * 1000) / 1000,
    y: Math.round(Number(point.y || 0) * 1000) / 1000
  })
} // End addPanelEditUniquePoint

//=================
function getPanelEditPlanarSegments(context) {
  if (!context) return []

  const userSegments = (panelEditLine.value.lines || []).map((line) => ({
    id: line.id,
    type: 'line',
    start: { x: Number(line.start?.x || 0), y: Number(line.start?.y || 0) },
    end: { x: Number(line.end?.x || 0), y: Number(line.end?.y || 0) }
  }))
  const boundarySegments = [
    { id: 'boundary-bottom', type: 'boundary', start: { x: 0, y: 0 }, end: { x: context.width, y: 0 } },
    { id: 'boundary-right', type: 'boundary', start: { x: context.width, y: 0 }, end: { x: context.width, y: context.height } },
    { id: 'boundary-top', type: 'boundary', start: { x: context.width, y: context.height }, end: { x: 0, y: context.height } },
    { id: 'boundary-left', type: 'boundary', start: { x: 0, y: context.height }, end: { x: 0, y: 0 } }
  ]
  const baseSegments = [...boundarySegments, ...userSegments]
  const splitPointsBySegment = baseSegments.map((segment) => [{ ...segment.start }, { ...segment.end }])

  for (let firstIndex = 0; firstIndex < baseSegments.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < baseSegments.length; secondIndex += 1) {
      const intersection = getPanelEditSegmentIntersection(baseSegments[firstIndex], baseSegments[secondIndex])

      if (!intersection) continue

      addPanelEditUniquePoint(splitPointsBySegment[firstIndex], intersection)
      addPanelEditUniquePoint(splitPointsBySegment[secondIndex], intersection)
    }
  }

  const result = []

  baseSegments.forEach((segment, segmentIndex) => {
    const points = splitPointsBySegment[segmentIndex]
      .sort((pointA, pointB) => getPanelEditSegmentParameter(segment, pointA) - getPanelEditSegmentParameter(segment, pointB))

    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
      const startPoint = points[pointIndex]
      const endPoint = points[pointIndex + 1]
      const length = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y)

      if (length <= 0.01) continue

      result.push({
        id: `${segment.id}-part-${pointIndex}`,
        type: segment.type,
        start: startPoint,
        end: endPoint
      })
    }
  })

  return result
} // End getPanelEditPlanarSegments

//=================
function getPanelEditPlanarRegions(context) {
  if (!context || !(panelEditLine.value.lines || []).length) return []

  const segments = getPanelEditPlanarSegments(context)
  const vertices = new Map()
  const adjacency = new Map()
  const edgeKeys = new Set()

  function ensureVertex(point) {
    const key = getPanelEditPointKey(point)

    if (!vertices.has(key)) {
      vertices.set(key, {
        key,
        x: Math.round(Number(point.x || 0) * 1000) / 1000,
        y: Math.round(Number(point.y || 0) * 1000) / 1000
      })
    }

    if (!adjacency.has(key)) adjacency.set(key, [])

    return key
  }

  segments.forEach((segment) => {
    const startKey = ensureVertex(segment.start)
    const endKey = ensureVertex(segment.end)

    if (startKey === endKey) return

    const edgeKey = [startKey, endKey].sort().join('|')

    if (edgeKeys.has(edgeKey)) return

    edgeKeys.add(edgeKey)
    adjacency.get(startKey).push(endKey)
    adjacency.get(endKey).push(startKey)
  })

  adjacency.forEach((neighbors, key) => {
    const vertex = vertices.get(key)

    neighbors.sort((neighborA, neighborB) => {
      const pointA = vertices.get(neighborA)
      const pointB = vertices.get(neighborB)
      const angleA = Math.atan2(pointA.y - vertex.y, pointA.x - vertex.x)
      const angleB = Math.atan2(pointB.y - vertex.y, pointB.x - vertex.x)

      return angleA - angleB
    })
  })

  const visited = new Set()
  const regions = []
  const panelArea = context.width * context.height

  vertices.forEach((_vertex, startKey) => {
    const neighbors = adjacency.get(startKey) || []

    neighbors.forEach((nextKey) => {
      const directedKey = `${startKey}->${nextKey}`

      if (visited.has(directedKey)) return

      const faceKeys = []
      let fromKey = startKey
      let toKey = nextKey

      for (let guard = 0; guard < 10000; guard += 1) {
        const currentDirectedKey = `${fromKey}->${toKey}`

        if (visited.has(currentDirectedKey)) break

        visited.add(currentDirectedKey)
        faceKeys.push(fromKey)

        const toNeighbors = adjacency.get(toKey) || []
        const reverseIndex = toNeighbors.indexOf(fromKey)

        if (reverseIndex < 0 || !toNeighbors.length) break

        const followingKey = toNeighbors[(reverseIndex - 1 + toNeighbors.length) % toNeighbors.length]

        fromKey = toKey
        toKey = followingKey

        if (fromKey === startKey && toKey === nextKey) break
      }

      const polygon = faceKeys.map((key) => {
        const point = vertices.get(key)

        return { x: point.x, y: point.y }
      })
      const area = getPanelEditPolygonSignedArea(polygon)
      const absoluteArea = Math.abs(area)

      if (polygon.length < 3) return
      if (area <= 0.01) return
      if (absoluteArea >= panelArea - 0.01 && (panelEditLine.value.lines || []).length) return

      const bounds = getPanelEditPolygonBounds(polygon)

      if (bounds.width <= 0.01 || bounds.height <= 0.01) return

      regions.push({
        id: `planar-region-${regions.length + 1}`,
        source: 'lineRegion',
        regionKind: 'polygon',
        polygon,
        start: { x: bounds.x, y: bounds.y },
        end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        operation: 'none'
      })
    })
  })

  return regions
} // End getPanelEditPlanarRegions

//=================
function getPanelEditLineRegions(context) {
  return [
    ...getPanelEditClosedShapeRegions(context),
    ...getPanelEditPlanarRegions(context)
  ]
} // End getPanelEditLineRegions

//=================
function drawPanelEditPolygonPath(targetContext, context, layout, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false

  polygon.forEach((point, index) => {
    const screenPoint = getPanelEditPoint(context, layout.left, layout.top, layout.scale, point.x, point.y)

    if (index === 0) {
      targetContext.moveTo(screenPoint.x, screenPoint.y)
      return
    }

    targetContext.lineTo(screenPoint.x, screenPoint.y)
  })
  targetContext.closePath()

  return true
} // End drawPanelEditPolygonPath

//=================
function drawPanelEditLineRegions(targetContext, context, layout) {
  const regions = getPanelEditLineRegions(context)
  const hoverRegion = panelEditLine.value.hoverRegion

  regions.forEach((region) => {
    const isHover = hoverRegion?.id === region.id

    if (!isHover) return

    targetContext.save()
    targetContext.fillStyle = 'rgba(255, 122, 0, 0.1)'
    targetContext.strokeStyle = '#ff7a00'
    targetContext.lineWidth = 1.5
    targetContext.setLineDash([6, 4])

    if (region.regionKind === 'polygon') {
      targetContext.beginPath()
      if (drawPanelEditPolygonPath(targetContext, context, layout, region.polygon)) {
        targetContext.fill()
        targetContext.stroke()
      }
      targetContext.restore()
      return
    }

    const topLeft = getPanelEditPoint(context, layout.left, layout.top, layout.scale, region.x, region.y + region.height)

    targetContext.fillRect(topLeft.x, topLeft.y, region.width * layout.scale, region.height * layout.scale)
    targetContext.strokeRect(topLeft.x, topLeft.y, region.width * layout.scale, region.height * layout.scale)
    targetContext.restore()
  })
} // End drawPanelEditLineRegions

//=================
function hitPanelEditLineRegion(context, layout, event) {
  const canvas = panelEditCanvasRef.value

  if (!canvas || !context || !layout) return null

  const rect = canvas.getBoundingClientRect()
  const local = getPanelEditLocalFromScreen(context, layout, event.clientX - rect.left, event.clientY - rect.top)
  const regions = getPanelEditLineRegions(context)

  return regions.find((region) => {
    if (region.regionKind === 'polygon') {
      return isPointInPanelEditPolygon(local, region.polygon)
    }

    return local.x >= region.x
      && local.x <= region.x + region.width
      && local.y >= region.y
      && local.y <= region.y + region.height
  }) || null
} // End hitPanelEditLineRegion

//=================
function commitPanelEditLine() {
  const draft = panelEditLine.value.draft
  const context = activePanelEditContext.value

  if (!draft || !context) return

  const line = normalizePanelEditLine(context, draft.start, draft.current, {
    id: `line-${Date.now()}-${panelEditLine.value.lines.length + 1}`
  })

  if (!line) {
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverSnap: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null
    }
    app.setStatus('Line: chiều dài line không hợp lệ')
    nextTick(resizePanelEditCanvas)
    return
  }

  pushPanelEditHistorySnapshot()
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverSnap: null,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null,
    draft: null,
    lines: [
      ...panelEditLine.value.lines,
      line
    ]
  }
  app.setStatus('Line: đã tạo line')
  nextTick(resizePanelEditCanvas)
} // End commitPanelEditLine

//=================
function commitPanelEditCircle(radiusOverride = null) {
  const draft = panelEditCircle.value.draft

  if (!draft?.center) return

  const radius = Number.isFinite(Number(radiusOverride)) && Number(radiusOverride) > 0
    ? Number(radiusOverride)
    : getPanelEditCircleRadius(draft)

  if (radius <= 0) {
    panelEditCircle.value = {
      ...panelEditCircle.value,
      hoverSnap: null,
      draft: null,
      inputBuffer: ''
    }
    app.setStatus('Vẽ hình tròn: bán kính không hợp lệ')
    nextTick(resizePanelEditCanvas)
    return
  }

  pushPanelEditHistorySnapshot()

  panelEditCircle.value = {
    ...panelEditCircle.value,
    hoverSnap: null,
    draft: null,
    inputBuffer: '',
    circles: [
      ...panelEditCircle.value.circles,
      {
        id: `circle-${Date.now()}-${panelEditCircle.value.circles.length + 1}`,
        center: { ...draft.center },
        radius
      }
    ]
  }
  app.setStatus(`Vẽ hình tròn: đã tạo hình tròn R${Math.round(radius)}`)
  nextTick(resizePanelEditCanvas)
} // End commitPanelEditCircle


//=================
function getPanelEditMoveSnapHintCandidates() {
  const snapSource = getPanelEditMoveSelectedSnapSource()

  return getPanelEditCircleSnapCandidates(snapSource)
} // End getPanelEditMoveSnapHintCandidates

//=================
function drawPanelEditMoveSnapHints(targetContext, context, layout) {
  if (drawing.state.panelEdit?.shapeTool !== 'editPanelMove') return
  if (panelEditMove.value.stage === 'target') return

  getPanelEditMoveSnapHintCandidates().forEach((candidate) => {
    const screen = getPanelEditPoint(context, layout.left, layout.top, layout.scale, candidate.x, candidate.y)

    drawPanelEditTapeSnap(targetContext, {
      ...candidate,
      screen,
      local: { x: candidate.x, y: candidate.y }
    })
  })
} // End drawPanelEditMoveSnapHints

//=================
function drawPanelEditSelectDrag(targetContext, context, layout) {
  const dragRect = getPanelEditSelectDragRect()

  if (!dragRect || dragRect.width <= 0.01 || dragRect.height <= 0.01) return

  const topLeft = getPanelEditPoint(context, layout.left, layout.top, layout.scale, dragRect.x, dragRect.y + dragRect.height)

  targetContext.save()
  targetContext.fillStyle = 'rgba(255, 122, 0, 0.08)'
  targetContext.strokeStyle = '#ff7a00'
  targetContext.lineWidth = 1.5
  targetContext.setLineDash([6, 4])
  targetContext.fillRect(topLeft.x, topLeft.y, dragRect.width * layout.scale, dragRect.height * layout.scale)
  targetContext.strokeRect(topLeft.x, topLeft.y, dragRect.width * layout.scale, dragRect.height * layout.scale)
  targetContext.restore()
} // End drawPanelEditSelectDrag

//=================
function getPanelEditMoveDelta() {
  return panelEditMoveController.getDelta()
} // End getPanelEditMoveDelta

//=================
function getPanelEditMovePreviewItems() {
  return panelEditMoveController.getPreviewItems()
} // End getPanelEditMovePreviewItems

//=================
function isPanelEditMovePreviewActive() {
  return panelEditMoveController.isPreviewActive()
} // End isPanelEditMovePreviewActive

//=================
function drawPanelEditMovePreview(targetContext, context, layout) {
  panelEditMoveController.drawPreview(targetContext, context, layout)
} // End drawPanelEditMovePreview

//=================
function commitPanelEditMove() {
  return panelEditMoveController.commit()
} // End commitPanelEditMove

//=================
function cancelPanelEditMove() {
  return panelEditMoveController.cancel()
} // End cancelPanelEditMove

//=================
function startPanelEditMove(point, snap = null) {
  return panelEditMoveController.start(point, snap)
} // End startPanelEditMove

//=================
function drawPanelEditCanvas(editContext = null, width = null, height = null) {
  const canvas = panelEditCanvasRef.value
  const context = activePanelEditContext.value

  if (!canvas || !context) return

  const targetContext = editContext || canvas.getContext('2d')
  const canvasWidth = width || canvas.clientWidth
  const canvasHeight = height || canvas.clientHeight
  const backgroundColor = getCssVariable('--mn-bg-canvas', '#f4f4f4')
  const panelColor = getCssVariable('--mn-panel-color', '#87ceff')
  const borderColor = getCssVariable('--mn-panel-selected-line-color', '#008cff')
  const dimColor = '#111111'
  const dimOffset = 28
  const tickSize = 7
  const layout = getPanelEditLayout(context, canvasWidth, canvasHeight)
  const left = layout.left
  const right = layout.right
  const top = layout.top
  const bottom = layout.bottom
  const horizontalDimSide = context.rearEdge === 'top' ? 'bottom' : 'top'
  const verticalDimSide = context.rearEdge === 'left' ? 'right' : 'left'
  const horizontalDimY = horizontalDimSide === 'top' ? top - dimOffset : bottom + dimOffset
  const verticalDimX = verticalDimSide === 'left' ? left - dimOffset : right + dimOffset

  targetContext.clearRect(0, 0, canvasWidth, canvasHeight)
  targetContext.fillStyle = backgroundColor
  targetContext.fillRect(0, 0, canvasWidth, canvasHeight)

  targetContext.save()
  targetContext.fillStyle = panelColor
  targetContext.globalAlpha = 0.8
  targetContext.fillRect(left, top, layout.faceWidth, layout.faceHeight)
  targetContext.restore()

  targetContext.strokeStyle = borderColor
  targetContext.lineWidth = 2
  targetContext.strokeRect(left, top, layout.faceWidth, layout.faceHeight)

  drawPanelEditRearEdge(targetContext, context, layout)
  drawPanelEditFaceEdgeLabels(targetContext, context, layout)

  panelEditTape.value.guides.forEach((guide) => {
    drawPanelEditGuideLine(targetContext, context, layout, guide)
  })

  if (panelEditTape.value.draft) {
    drawPanelEditGuideLine(targetContext, context, layout, panelEditTape.value.draft, { draft: true })
  }

  drawPanelEditLineRegions(targetContext, context, layout)

  const hoverLineKey = getPanelEditLineSelectionKey(panelEditLine.value.hoverLine)
  const selectedLineKeys = getPanelEditSelectedLineKeySet()
  const movePreviewActive = isPanelEditMovePreviewActive()

  panelEditLine.value.lines.forEach((line) => {
    const lineKey = getPanelEditLineSelectionKey(line)
    const isSelected = selectedLineKeys.has(lineKey)

    if (movePreviewActive && isSelected) return

    drawPanelEditLine(targetContext, context, layout, line, {
      hover: hoverLineKey && hoverLineKey === lineKey,
      selected: isSelected
    })
  })

  if (panelEditLine.value.draft) {
    drawPanelEditLine(targetContext, context, layout, panelEditLine.value.draft, { draft: true })
  }

  if (panelEditArc.value.draft) {
    drawPanelEditArcDraft(targetContext, context, layout, panelEditArc.value.draft, {
      radiusLabel: panelEditArc.value.inputBuffer || null
    })
  } else if (drawing.state.panelEdit?.shapeTool === 'editPanelArc') {
    drawPanelEditArcHoverPreview(targetContext, context, layout, panelEditArc.value.hoverPoint)
  }

  panelEditRect.value.rectangles.forEach((rectangle) => {
    const isSelected = isPanelEditRectangleSelected(rectangle)

    if (movePreviewActive && isSelected) return

    drawPanelEditRectangle(targetContext, context, layout, rectangle, {
      hover: isPanelEditRectangleHovered(rectangle),
      selected: isSelected
    })
  })

  panelEditCircle.value.circles.forEach((circle) => {
    const isSelected = isPanelEditCircleSelected(circle)

    if (movePreviewActive && isSelected) return

    drawPanelEditCircle(targetContext, context, layout, circle, {
      hover: isPanelEditCircleHovered(circle),
      selected: isSelected
    })
  })

  drawPanelEditMovePreview(targetContext, context, layout)

  const boundaryCutoutPolygons = getPanelEditBoundaryCutoutPolygons()

  redrawPanelEditVisiblePanelBoundary(targetContext, context, layout, boundaryCutoutPolygons)
  redrawPanelEditCutoutEdgesAfterBoundary(targetContext, context, layout, boundaryCutoutPolygons)

  if (panelEditRect.value.pendingAction) {
    drawPanelEditRectangle(targetContext, context, layout, panelEditRect.value.pendingAction, { draft: true })
  }

  if (panelEditRect.value.draft) {
    drawPanelEditRectangle(targetContext, context, layout, panelEditRect.value.draft, { draft: true })
  }

  if (panelEditCircle.value.draft) {
    drawPanelEditCircle(targetContext, context, layout, panelEditCircle.value.draft, {
      draft: true,
      radiusLabel: panelEditCircle.value.inputBuffer || `${Math.round(getPanelEditCircleRadius(panelEditCircle.value.draft) * 10) / 10}`
    })
  }

  if (drawing.state.panelEdit?.shapeTool === 'editPanelTape') {
    drawPanelEditTapeSnap(targetContext, panelEditTape.value.hoverSnap)
  }

  if (drawing.state.panelEdit?.shapeTool === 'editPanelRect') {
    drawPanelEditTapeSnap(targetContext, panelEditRect.value.hoverSnap)
  }

  if (drawing.state.panelEdit?.shapeTool === 'editPanelLine') {
    drawPanelEditTapeSnap(targetContext, panelEditLine.value.hoverSnap)
  }

  if (drawing.state.panelEdit?.shapeTool === 'editPanelArc') {
    drawPanelEditTapeSnap(targetContext, panelEditArc.value.hoverSnap)
  }

  if (drawing.state.panelEdit?.shapeTool === 'editPanelCircle') {
    drawPanelEditTapeSnap(targetContext, panelEditCircle.value.hoverSnap)
  }

  if (drawing.state.panelEdit?.shapeTool === 'editPanelMove') {
    drawPanelEditMoveSnapHints(targetContext, context, layout)
    drawPanelEditTapeSnap(targetContext, panelEditMove.value.hoverSnap)
  }

  if (drawing.state.panelEdit?.shapeTool === 'editPanelSelect') {
    drawPanelEditSelectDrag(targetContext, context, layout)
  }

  targetContext.strokeStyle = dimColor
  targetContext.fillStyle = dimColor
  targetContext.lineWidth = 1.5
  targetContext.font = '12px Arial, Helvetica, sans-serif'

  targetContext.beginPath()
  targetContext.moveTo(left, horizontalDimY)
  targetContext.lineTo(right, horizontalDimY)
  targetContext.moveTo(left, horizontalDimY - tickSize)
  targetContext.lineTo(left, horizontalDimY + tickSize)
  targetContext.moveTo(right, horizontalDimY - tickSize)
  targetContext.lineTo(right, horizontalDimY + tickSize)
  targetContext.stroke()
  targetContext.textAlign = 'center'
  targetContext.textBaseline = horizontalDimSide === 'top' ? 'bottom' : 'top'
  targetContext.fillText(
    `${Math.round(context.width)} mm`,
    left + layout.faceWidth / 2,
    horizontalDimSide === 'top' ? horizontalDimY - 8 : horizontalDimY + 8
  )

  targetContext.beginPath()
  targetContext.moveTo(verticalDimX, top)
  targetContext.lineTo(verticalDimX, bottom)
  targetContext.moveTo(verticalDimX - tickSize, top)
  targetContext.lineTo(verticalDimX + tickSize, top)
  targetContext.moveTo(verticalDimX - tickSize, bottom)
  targetContext.lineTo(verticalDimX + tickSize, bottom)
  targetContext.stroke()
  targetContext.save()
  targetContext.translate(
    verticalDimSide === 'left' ? verticalDimX - 12 : verticalDimX + 12,
    top + layout.faceHeight / 2
  )
  targetContext.rotate(verticalDimSide === 'left' ? -Math.PI / 2 : Math.PI / 2)
  targetContext.textAlign = 'center'
  targetContext.textBaseline = 'bottom'
  targetContext.fillText(`${Math.round(context.height)} mm`, 0, 0)
  targetContext.restore()
} // End drawPanelEditCanvas
//=================
function selectPanelEditWindowTool(toolId) {
  if (toolId === 'editPanelSelect') {
    exitPanelEditCommandToSelect()
    return
  }

  const context = drawing.setPanelEditShapeTool(toolId)

  if (!context) {
    app.setStatus('Edit Panel: chọn 1 tấm trước')
    return
  }

  app.setTool(toolId)
  resetPanelEditCommandDrafts()
  const toolName = panelEditTools.find((tool) => tool.id === toolId)?.label || toolId.replace('editPanel', '')
  app.setStatus(`${toolName}: ${context.panelName} | ${context.faceLabel} | ${context.rearLabel}`)
  nextTick(resizePanelEditCanvas)
} // End selectPanelEditWindowTool

//=================
function selectPanelEditFace(faceSide) {
  const context = drawing.setPanelEditFaceSide(faceSide)

  if (!context) return

  panelEditViewport.value = {
    zoom: 1,
    panX: 0,
    panY: 0
  }
  loadPanelEditSavedState(context)
  app.setStatus(`Edit Panel: ${context.panelName} | ${context.faceLabel} | ${context.rearLabel}`)
  nextTick(resizePanelEditCanvas)
} // End selectPanelEditFace

//=================
function onPanelEditPointerDown(event) {
  panelEditCanvasRef.value?.focus?.()
  viewportRef.value?.focus()

  const context = activePanelEditContext.value
  const canvas = panelEditCanvasRef.value

  if (!canvas || !context) return

  try {
    canvas.setPointerCapture?.(event.pointerId)
  } catch (_error) {
    // Ignore browsers that cannot capture this pointer.
  }

  if (event.button === 1 || event.button === 2) {
    panelEditPanning = true
    panelEditPanStart = { x: event.clientX, y: event.clientY }
    panelEditPanOriginal = {
      x: panelEditViewport.value.panX,
      y: panelEditViewport.value.panY
    }
    return
  }

  if (event.button !== 0) return

  if (panelEditRect.value.pendingAction) return

  const shapeTool = drawing.state.panelEdit?.shapeTool
  const rect = canvas.getBoundingClientRect()
  const layout = getPanelEditLayout(context, rect.width, rect.height)

  if (!shapeTool || shapeTool === 'editPanelSelect') {
    const startLocal = getPanelEditPointerLocal(context, layout, event)

    panelEditSelectDrag.value = {
      active: true,
      start: startLocal,
      current: startLocal,
      moved: false
    }
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelMove') {
    if (panelEditMove.value.stage === 'target') {
      const point = getPanelEditLinePointFromPointer(context, layout, event, { selectedMoveOnly: true, useMovePreview: true })

      if (!point) return

      const lockedLocal = event.shiftKey
        ? getPanelEditAxisLockedPoint(panelEditMove.value.start, point.local)
        : point.local

      panelEditMoveController.updateTargetPoint(lockedLocal, point.snap)
      commitPanelEditMove()
      return
    }

    if (panelEditSelection.value.items.length === 0) {
      const lineHit = getPanelEditLineHit(context, layout, event.clientX - rect.left, event.clientY - rect.top)

      if (lineHit) {
        setPanelEditSelection([{ type: 'line', key: getPanelEditLineSelectionKey(lineHit) }])
      }
    }

    if (panelEditSelection.value.items.length === 0) {
      app.setStatus('Move: chưa có chi tiết được chọn')
      resizePanelEditCanvas()
      return
    }

    const point = getPanelEditLinePointFromPointer(context, layout, event, { selectedMoveOnly: true })

    if (!point) return

    startPanelEditMove(point.local, point.snap)
    return
  }

  if (shapeTool === 'editPanelLine') {
    const point = getPanelEditLinePointFromPointer(context, layout, event)

    if (!point) {
      app.setStatus('Line: click điểm đầu để bắt đầu vẽ')
      return
    }

    if (panelEditLine.value.draft) {
      const lockedLocal = event.shiftKey
        ? getPanelEditAxisLockedPoint(panelEditLine.value.draft.start, point.local)
        : point.local

      panelEditLine.value = {
        ...panelEditLine.value,
        hoverSnap: point.snap,
        hoverLine: null,
        selectedLineId: null,
        draft: {
          ...panelEditLine.value.draft,
          current: lockedLocal
        }
      }
      commitPanelEditLine()
      return
    }

    panelEditLine.value = {
      ...panelEditLine.value,
      hoverSnap: point.snap,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: {
        start: point.local,
        current: point.local
      }
    }
    app.setStatus('Line: chọn điểm cuối')
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelRect') {
    const point = getPanelEditRectPointFromPointer(context, layout, event)

    if (!point) return

    if (panelEditRect.value.draft) {
      panelEditRect.value = {
        ...panelEditRect.value,
        hoverSnap: point.snap,
        draft: {
          ...panelEditRect.value.draft,
          current: point.local
        }
      }
      commitPanelEditRectangle()
      return
    }

    panelEditRect.value = {
      ...panelEditRect.value,
      hoverSnap: point.snap,
      hoverLine: null,
      selectedLineId: null,
      draft: {
        start: point.local,
        current: point.local
      }
    }
    app.setStatus('Vẽ hình chữ nhật: chọn điểm góc chéo')
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelArc') {
    const point = getPanelEditArcPointFromPointer(context, layout, event)

    if (!point) return

    const draft = panelEditArc.value.draft

    if (draft?.stage === 'bulge') {
      const isAcceptingSuggestedArc = draft.suggested === true
        && draft.end
        && getDistance(point.local, draft.end) <= 0.01

      if (isAcceptingSuggestedArc) {
        panelEditArc.value = {
          ...panelEditArc.value,
          hoverSnap: point.snap,
          draft
        }
        commitPanelEditArc()
        return
      }

      panelEditArc.value = {
        ...panelEditArc.value,
        hoverSnap: point.snap,
        draft: {
          ...draft,
          current: point.local
        }
      }
      commitPanelEditArc()
      return
    }

    if (draft?.stage === 'end') {
      const endPoint = point.local
      const defaultBulge = getPanelEditArcDefaultBulge(draft.start, endPoint)

      if (!defaultBulge) {
        app.setStatus('Arc: điểm 2 không hợp lệ')
        return
      }

      panelEditArc.value = {
        ...panelEditArc.value,
        hoverSnap: point.snap,
        draft: {
          ...draft,
          stage: 'bulge',
          end: endPoint,
          current: defaultBulge,
          suggested: true
        }
      }
      app.setStatus('Arc: đang đề xuất cung 1/4 | Enter hoặc click đúp điểm 2 để OK | rê chuột chọn điểm đỉnh')
      resizePanelEditCanvas()
      return
    }

    panelEditArc.value = {
      ...panelEditArc.value,
      hoverSnap: point.snap,
      hoverPoint: point.local,
      draft: {
        stage: 'end',
        start: point.local,
        current: point.local
      },
      inputBuffer: ''
    }
    app.setStatus('Arc: rê chuột tới điểm 2 hoặc nhập R + Enter')
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelCircle') {
    const point = getPanelEditCirclePointFromPointer(context, layout, event)

    if (!point) return

    if (panelEditCircle.value.draft) {
      panelEditCircle.value = {
        ...panelEditCircle.value,
        hoverSnap: point.snap,
        draft: {
          ...panelEditCircle.value.draft,
          current: point.local
        }
      }
      commitPanelEditCircle()
      return
    }

    panelEditCircle.value = {
      ...panelEditCircle.value,
      hoverSnap: point.snap,
      inputBuffer: '',
      draft: {
        center: point.local,
        current: point.local
      }
    }
    app.setStatus('Vẽ hình tròn: rê chuột preview, click điểm bán kính hoặc nhập số + Enter')
    resizePanelEditCanvas()
    return
  }

  if (shapeTool !== 'editPanelTape') return

  if (panelEditTape.value.draft) {
    commitPanelEditTapeGuide()
    return
  }

  const snap = getPanelEditTapeSnap(context, layout, event.clientX - rect.left, event.clientY - rect.top)

  if (!snap) {
    app.setStatus('Thước: rê chuột gần cạnh panel để bắt snap')
    return
  }

  panelEditTape.value = {
    ...panelEditTape.value,
    hoverSnap: snap,
    draft: {
      axis: snap.axis,
      edge: snap.edge,
      baseValue: snap.axis === 'vertical' ? snap.local.x : snap.local.y,
      value: snap.axis === 'vertical' ? snap.local.x : snap.local.y
    },
    inputBuffer: ''
  }
  app.setStatus(`Thước: kéo chuột hoặc nhập số + Enter để cố định guide ${snap.axis === 'vertical' ? 'đứng' : 'ngang'}`)
  resizePanelEditCanvas()
} // End onPanelEditPointerDown

//=================
function onPanelEditPointerMove(event) {
  const context = activePanelEditContext.value
  const canvas = panelEditCanvasRef.value

  if (panelEditPanning && panelEditPanStart && panelEditPanOriginal) {
    panelEditViewport.value = {
      ...panelEditViewport.value,
      panX: panelEditPanOriginal.x + event.clientX - panelEditPanStart.x,
      panY: panelEditPanOriginal.y + event.clientY - panelEditPanStart.y
    }
    resizePanelEditCanvas()
    return
  }

  if (!canvas || !context) return

  const rect = canvas.getBoundingClientRect()
  const layout = getPanelEditLayout(context, rect.width, rect.height)
  const shapeTool = drawing.state.panelEdit?.shapeTool

  if (panelEditRect.value.pendingAction) {
    resizePanelEditCanvas()
    return
  }

  if (!shapeTool || shapeTool === 'editPanelSelect') {
    const currentLocal = getPanelEditPointerLocal(context, layout, event)

    if (panelEditSelectDrag.value.active) {
      const distance = panelEditSelectDrag.value.start && currentLocal
        ? Math.hypot(currentLocal.x - panelEditSelectDrag.value.start.x, currentLocal.y - panelEditSelectDrag.value.start.y)
        : 0

      panelEditSelectDrag.value = {
        ...panelEditSelectDrag.value,
        current: currentLocal,
        moved: panelEditSelectDrag.value.moved || distance > 2
      }
      resizePanelEditCanvas()
      return
    }

    const lineHit = getPanelEditLineHit(context, layout, event.clientX - rect.left, event.clientY - rect.top)

    panelEditLine.value = {
      ...panelEditLine.value,
      hoverLine: lineHit,
      hoverRegion: lineHit ? null : hitPanelEditLineRegion(context, layout, event)
    }
    setPanelEditHoverItem(getPanelEditHoverItem(context, layout, event, lineHit))
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelMove') {
    const point = getPanelEditLinePointFromPointer(context, layout, event, {
      selectedMoveOnly: true,
      useMovePreview: panelEditMove.value.stage === 'target'
    })

    if (panelEditMove.value.stage !== 'target') {
      const lineHit = getPanelEditLineHit(context, layout, event.clientX - rect.left, event.clientY - rect.top)

      panelEditLine.value = {
        ...panelEditLine.value,
        hoverLine: lineHit,
        hoverRegion: null
      }
      setPanelEditHoverItem(getPanelEditHoverItem(context, layout, event, lineHit))
      panelEditMoveController.setHoverSnap(point?.snap || null)
      resizePanelEditCanvas()
      return
    }

    const currentLocal = point?.local
      ? (event.shiftKey ? getPanelEditAxisLockedPoint(panelEditMove.value.start, point.local) : point.local)
      : panelEditMove.value.current

    panelEditMoveController.updateTargetPoint(currentLocal, point?.snap || null)
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelLine') {
    const point = getPanelEditLinePointFromPointer(context, layout, event)
    const currentLocal = panelEditLine.value.draft && point?.local
      ? (event.shiftKey ? getPanelEditAxisLockedPoint(panelEditLine.value.draft.start, point.local) : point.local)
      : panelEditLine.value.draft?.current

    panelEditLine.value = {
      ...panelEditLine.value,
      hoverSnap: point?.snap || null,
      hoverRegion: null,
      hoverLine: null,
      draft: panelEditLine.value.draft
        ? {
          ...panelEditLine.value.draft,
          current: currentLocal
        }
        : null
    }
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelRect') {
    const point = getPanelEditRectPointFromPointer(context, layout, event)

    panelEditRect.value = {
      ...panelEditRect.value,
      hoverSnap: point?.snap || null,
      draft: panelEditRect.value.draft
        ? {
          ...panelEditRect.value.draft,
          current: point?.local || panelEditRect.value.draft.current
        }
        : null
    }
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelArc') {
    const point = getPanelEditArcPointFromPointer(context, layout, event)
    const draft = panelEditArc.value.draft

    panelEditArc.value = {
      ...panelEditArc.value,
      hoverSnap: point?.snap || null,
      hoverPoint: point?.local || panelEditArc.value.hoverPoint,
      draft: draft && point?.local
        ? {
            ...draft,
            current: point.local
          }
        : draft
    }
    resizePanelEditCanvas()
    return
  }

  if (shapeTool === 'editPanelCircle') {
    const point = getPanelEditCirclePointFromPointer(context, layout, event)

    panelEditCircle.value = {
      ...panelEditCircle.value,
      hoverSnap: point?.snap || null,
      draft: panelEditCircle.value.draft
        ? {
          ...panelEditCircle.value.draft,
          current: point?.local || panelEditCircle.value.draft.current
        }
        : null
    }
    resizePanelEditCanvas()
    return
  }

  if (shapeTool !== 'editPanelTape') return

  if (panelEditTape.value.draft) {
    const draft = panelEditTape.value.draft
    const draftResult = getPanelEditTapeDraftValueFromPointer(context, layout, draft, event)

    panelEditTape.value = {
      ...panelEditTape.value,
      hoverSnap: draftResult.snap,
      draft: {
        ...draft,
        value: draftResult.value
      }
    }
    resizePanelEditCanvas()
    return
  }

  panelEditTape.value = {
    ...panelEditTape.value,
    hoverSnap: getPanelEditTapeSnap(context, layout, event.clientX - rect.left, event.clientY - rect.top)
  }
  resizePanelEditCanvas()
} // End onPanelEditPointerMove

//=================
function onPanelEditPointerUp(event = null) {
  const context = activePanelEditContext.value
  const canvas = panelEditCanvasRef.value

  panelEditPanning = false
  panelEditPanStart = null
  panelEditPanOriginal = null

  if (!canvas || !context || !panelEditSelectDrag.value.active) {
    resetPanelEditSelectDrag()
    return
  }

  const rect = canvas.getBoundingClientRect()
  const layout = getPanelEditLayout(context, rect.width, rect.height)
  const drag = panelEditSelectDrag.value

  resetPanelEditSelectDrag()

  if (drawing.state.panelEdit?.shapeTool !== 'editPanelSelect') return

  if (drag.moved) {
    const selectionRect = getPanelEditSelectDragRectFromPoints(drag.start, drag.current)
    const selectedItems = getPanelEditSelectionByRect(selectionRect)

    setPanelEditSelection(selectedItems)
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverLine: null,
      hoverRegion: null
    }
    app.setStatus(selectedItems.length > 0 ? `Select: đã quét chọn ${selectedItems.length} chi tiết` : 'Select: vùng quét không có chi tiết')
    resizePanelEditCanvas()
    return
  }

  if (!event) return

  const lineHit = getPanelEditLineHit(context, layout, event.clientX - rect.left, event.clientY - rect.top)

  if (lineHit) {
    setPanelEditSelection([{ type: 'line', key: getPanelEditLineSelectionKey(lineHit) }])
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverLine: lineHit,
      hoverRegion: null
    }
    app.setStatus(lineHit.groupType === 'arc' ? 'Select: đã chọn toàn bộ arc | Delete để xóa | Move để di chuyển' : 'Select: đã chọn line | Delete để xóa | Move để di chuyển')
    resizePanelEditCanvas()
    return
  }

  const region = hitPanelEditLineRegion(context, layout, event)

  if (!region) {
    clearPanelEditSelection()
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverLine: null,
      hoverRegion: null
    }
    resizePanelEditCanvas()
    return
  }

  clearPanelEditSelection()
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverLine: null,
    hoverRegion: region
  }
  panelEditRect.value = {
    ...panelEditRect.value,
    pendingAction: {
      ...region,
      id: `region-cutout-${Date.now()}`,
      operation: 'none'
    }
  }
  app.setStatus('Select vùng: chọn None hoặc Khấu')
  resizePanelEditCanvas()
} // End onPanelEditPointerUp

//=================
function onPanelEditWheel(event) {
  const canvas = panelEditCanvasRef.value
  const context = activePanelEditContext.value

  if (!canvas || !context) return

  const rect = canvas.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  const oldZoom = getPanelEditZoomClamp(panelEditViewport.value.zoom)
  const nextZoom = getPanelEditZoomClamp(oldZoom * (event.deltaY < 0 ? 1.12 : 0.88))
  const oldLayout = getPanelEditLayout(context, rect.width, rect.height)
  const localX = (screenX - oldLayout.left) / oldLayout.scale
  const localY = (screenY - oldLayout.top) / oldLayout.scale

  panelEditViewport.value = {
    zoom: nextZoom,
    panX: panelEditViewport.value.panX,
    panY: panelEditViewport.value.panY
  }

  const newLayout = getPanelEditLayout(context, rect.width, rect.height)
  panelEditViewport.value = {
    zoom: nextZoom,
    panX: panelEditViewport.value.panX + screenX - (newLayout.left + localX * newLayout.scale),
    panY: panelEditViewport.value.panY + screenY - (newLayout.top + localY * newLayout.scale)
  }

  resizePanelEditCanvas()
} // End onPanelEditWheel


const { applyPanelEdit } = usePanelEditApply({
  activePanelEditContext,
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  drawing,
  app,
  draw,
  clearPanelEditHistory,
  getPanelEditSavedRectanglesForApply,
  getPanelEditSavedLinesForApply,
  getPanelEditSavedCirclesForApply,
  getPanelEditSavedGuidesForApply
})
//=================
function getVisiblePanels() {
  return drawing.state.panels.filter((panel) => panel.hidden !== true)
} // End getVisiblePanels

//=================
function getVisibleBoxes() {
  return box.state.boxes.filter((targetBox) => targetBox.hidden !== true)
} // End getVisibleBoxes

//=================
function getWallSnapResult(local, wallRect, tolerance) {
  if (!local || !wallRect) {
    return {
      active: false,
      point: local,
      snap: null
    }
  }

  const left = wallRect.x
  const right = wallRect.x + wallRect.width
  const bottom = wallRect.y
  const top = wallRect.y + wallRect.height

  const corners = [
    { type: 'corner', key: 'bottom-left', x: left, y: bottom },
    { type: 'corner', key: 'bottom-right', x: right, y: bottom },
    { type: 'corner', key: 'top-right', x: right, y: top },
    { type: 'corner', key: 'top-left', x: left, y: top }
  ]

  let bestCorner = null

  corners.forEach((target) => {
    const distance = getDistance(local, target)

    if (distance > tolerance) return
    if (bestCorner && distance >= bestCorner.distance) return

    bestCorner = {
      ...target,
      distance
    }
  })

  if (bestCorner) {
    return {
      active: true,
      point: {
        x: bestCorner.x,
        y: bestCorner.y
      },
      snap: bestCorner
    }
  }

  const edges = [
    {
      type: 'edge',
      key: 'bottom',
      x: clampValue(local.x, left, right),
      y: bottom
    },
    {
      type: 'edge',
      key: 'top',
      x: clampValue(local.x, left, right),
      y: top
    },
    {
      type: 'edge',
      key: 'left',
      x: left,
      y: clampValue(local.y, bottom, top)
    },
    {
      type: 'edge',
      key: 'right',
      x: right,
      y: clampValue(local.y, bottom, top)
    }
  ]

  let bestEdge = null

  edges.forEach((target) => {
    const distance = getDistance(local, target)

    if (distance > tolerance) return
    if (bestEdge && distance >= bestEdge.distance) return

    bestEdge = {
      ...target,
      distance
    }
  })

  if (!bestEdge) {
    return {
      active: false,
      point: local,
      snap: null
    }
  }

  return {
    active: true,
    point: {
      x: bestEdge.x,
      y: bestEdge.y
    },
    snap: bestEdge
  }
} // End getWallSnapResult
//=================
function getExistingBoxSnapResult(local, tolerance = 18) {
  if (!local || app.state.currentView !== 'top') {
    return null
  }

  const boxes = getVisibleBoxes()

  if (!boxes.length) {
    return null
  }

  const scale = app.state.viewport.localScale * app.state.viewport.zoom
  const toleranceLocal = tolerance / Math.max(0.0001, scale)

  let best = null

  for (const item of boxes) {
    const rect = projectBoxToCameraRect(item, app.state.currentView)

    if (!rect) {
      continue
    }

    const left = rect.x
    const right = rect.x + rect.width
    const bottom = rect.y
    const top = rect.y + rect.height

    const points = [
      { type: 'corner', key: 'box-bottom-left', x: left, y: bottom },
      { type: 'corner', key: 'box-bottom-right', x: right, y: bottom },
      { type: 'corner', key: 'box-top-right', x: right, y: top },
      { type: 'corner', key: 'box-top-left', x: left, y: top }
    ]

    for (const target of points) {
      const distance = getDistance(local, target)

      if (distance > toleranceLocal) continue
      if (best && distance >= best.distance) continue

      best = {
        ...target,
        distance
      }
    }

    const edges = [
      {
        type: 'edge',
        key: 'box-bottom',
        x: clampValue(local.x, left, right),
        y: bottom
      },
      {
        type: 'edge',
        key: 'box-top',
        x: clampValue(local.x, left, right),
        y: top
      },
      {
        type: 'edge',
        key: 'box-left',
        x: left,
        y: clampValue(local.y, bottom, top)
      },
      {
        type: 'edge',
        key: 'box-right',
        x: right,
        y: clampValue(local.y, bottom, top)
      }
    ]

    for (const target of edges) {
      const distance = getDistance(local, target)

      if (distance > toleranceLocal) continue
      if (best && distance >= best.distance) continue

      best = {
        ...target,
        distance
      }
    }
  }

  if (!best) {
    return null
  }

  return {
    active: true,
    point: {
      x: best.x,
      y: best.y
    },
    snap: best
  }
} // End getExistingBoxSnapResult
//=================
function getBoxSnapLocal(local) {
  if (app.state.currentTool !== 'box') return local

  if (app.state.currentView !== 'top') {
    drawing.clearSnapPreview()
    return local
  }

  const wallRect = projectBoxToCameraRect(getWallBox3D(), app.state.currentView)
  const tolerance = 18 / (app.state.viewport.localScale * app.state.viewport.zoom)

  const boxSnapResult = getExistingBoxSnapResult(local, 18)

  if (boxSnapResult && boxSnapResult.active) {
    drawing.setSnapPreview(boxSnapResult.snap)
    return boxSnapResult.point
  }

  const wallSnapResult = getWallSnapResult(local, wallRect, tolerance)

  drawing.setSnapPreview(wallSnapResult.active ? wallSnapResult.snap : null)

  return wallSnapResult.point
} // End getBoxSnapLocal

//=================
function localFromEvent(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const cameraLocal = screenToLocal(app.state.viewport, x, y)
  const worldPoint = cameraLocalToWorldPoint(cameraLocal, app.state.currentView)

  app.setMouse({
    x,
    y,
    localX: cameraLocal.x,
    localY: cameraLocal.y,
    worldX: worldPoint.x,
    worldY: worldPoint.y,
    worldZ: worldPoint.z
  })

  return cameraLocal
} // End localFromEvent
//=================
function zoomAtPoint(screenX, screenY, nextZoom) {
  const viewport = app.state.viewport
  const beforeLocal = screenToLocal(viewport, screenX, screenY)

  app.setZoom(nextZoom)

  const scale = viewport.localScale * viewport.zoom
  const nextPanX = screenX - viewport.localOriginX - beforeLocal.x * scale
  const nextPanY = screenY - viewport.localOriginY + beforeLocal.y * scale

  app.setPan(nextPanX, nextPanY)
} // End zoomAtPoint
//=================
function getPanelAxisMin(panel, axis) {
  if (axis === 'x') return Number(panel.x || 0)
  if (axis === 'y') return Number((panel.y3d ?? panel.worldY ?? panel.depthY ?? panel.y) || 0)
  if (axis === 'z') return Number(panel.z ?? panel.y ?? 0)

  return 0
} // End getPanelAxisMin

//=================
function getPanelAxisSize(panel, axis) {
  if (axis === 'x') return Number(panel.xSize ?? panel.width ?? 0)
  if (axis === 'y') return Number(panel.ySize ?? panel.depth ?? 0)
  if (axis === 'z') return Number(panel.zSize ?? panel.height ?? panel.thickness ?? 0)

  return 0
} // End getPanelAxisSize

//=================
function projectPanelAxisValue(value, size, reverse, origin = 0) {
  if (reverse) return origin - value - size

  return value - origin
} // End projectPanelAxisValue

//=================
function getPanelLocalRect(panel) {
  if (!panel) return null

  const camera = getCameraConfig(app.state.currentView)
  const uMin = getPanelAxisMin(panel, camera.axisU)
  const vMin = getPanelAxisMin(panel, camera.axisV)
  const uSize = getPanelAxisSize(panel, camera.axisU)
  const vSize = getPanelAxisSize(panel, camera.axisV)

  if (uSize <= 0 || vSize <= 0) return null

  return {
    x: projectPanelAxisValue(uMin, uSize, camera.reverseU, camera.originU || 0),
    y: projectPanelAxisValue(vMin, vSize, camera.reverseV, camera.originV || 0),
    width: uSize,
    height: vSize
  }
} // End getPanelLocalRect

//=================
function getPanelSelectRect(panel) {
  return localRectToScreenRect(getPanelLocalRect(panel))
} // End getPanelSelectRect
//=================
function getBoxLocalRect(targetBox) {
  const rect = projectBoxToCameraRect(targetBox, app.state.currentView)

  if (!rect || rect.width <= 0 || rect.height <= 0) return null

  return rect
} // End getBoxLocalRect
//=================
function getBoxSelectRect(targetBox) {
  const rect = getBoxLocalRect(targetBox)

  if (!rect) return null

  return localRectToScreenRect(rect)
} // End getBoxSelectRect
//=================
function getPanelOwnerBoxId(panel) {
  if (!panel) return null

  return panel.linkedFrameId
    || panel.frameId
    || panel.sourceBoxId
    || panel.baseObjectId
    || null
} // End getPanelOwnerBoxId
//=================
function getPanelIdsInBox(boxId) {
  if (!boxId) return []

  return getVisiblePanels()
    .filter((panel) => String(getPanelOwnerBoxId(panel)) === String(boxId))
    .map((panel) => panel.id)
} // End getPanelIdsInBox

//=================
function selectBoxWithPanels(boxId, append = false) {
  if (!boxId) return

  const panelIdsInBox = getPanelIdsInBox(boxId)

  if (append) {
    box.selectBoxes(mergeIds(box.state.selectedBoxIds, boxId))
    drawing.selectPanels([
      ...new Set([
        ...(Array.isArray(drawing.state.selectedPanelIds) ? drawing.state.selectedPanelIds : []),
        ...panelIdsInBox
      ])
    ])
    return
  }

  box.selectBox(boxId)
  drawing.selectPanels(panelIdsInBox)
  drawing.selectDimensions([])
} // End selectBoxWithPanels

//=================
function selectPanelOnly(panelId, append = false) {
  if (!panelId) return

  if (append) {
    drawing.selectPanels(mergeIds(drawing.state.selectedPanelIds, panelId))
    box.clearSelection()
    return
  }

  drawing.selectPanel(panelId)
  drawing.selectDimensions([])
  box.clearSelection()
} // End selectPanelOnly
//=================
function hitTestBoxFill(local) {
  if (!local) return null

  for (let index = getVisibleBoxes().length - 1; index >= 0; index -= 1) {
    const targetBox = getVisibleBoxes()[index]
    const rect = projectBoxToCameraRect(targetBox, app.state.currentView)

    if (!rect) continue

    const insideX = local.x >= rect.x && local.x <= rect.x + rect.width
    const insideY = local.y >= rect.y && local.y <= rect.y + rect.height

    if (insideX && insideY) return targetBox
  }

  return null
} // End hitTestBoxFill

//=================
function hitTestVisiblePanel(local) {
  if (!local) return null

  const hits = []

  getVisiblePanels().forEach((panel, index) => {
    const rect = getPanelLocalRect(panel)

    if (!rect || rect.width <= 0 || rect.height <= 0) return

    const insideX = local.x >= rect.x && local.x <= rect.x + rect.width
    const insideY = local.y >= rect.y && local.y <= rect.y + rect.height

    if (!insideX || !insideY) return

    hits.push({
      type: 'panel',
      panel,
      rect,
      index,
      area: rect.width * rect.height,
      isBackPanel: panel.panelSide === 'back' || panel.cabinetInfoKind === 'back'
    })
  })

  if (!hits.length) return null

  hits.sort((a, b) => {
    if (a.isBackPanel !== b.isBackPanel) return a.isBackPanel ? 1 : -1
    if (a.area !== b.area) return a.area - b.area

    return b.index - a.index
  })

  return hits[0]
} // End hitTestVisiblePanel

//=================
function collectDimensionSnapPoints() {
  const points = []
  const wallRect = projectBoxToCameraRect(getWallBox3D(), app.state.currentView)

  const addRectPoints = (rect, ref) => {
    if (!rect) return

    const left = Number(rect.x || 0)
    const right = left + Number(rect.width || 0)
    const bottom = Number(rect.y || 0)
    const top = bottom + Number(rect.height || 0)
    const midX = (left + right) / 2
    const midY = (bottom + top) / 2

    const makeRef = (snapKey) => ({ ...(ref || {}), snapKey })

    points.push(
      { x: left, y: bottom, type: 'corner', key: 'bottom-left', ref: makeRef('bottom-left') },
      { x: right, y: bottom, type: 'corner', key: 'bottom-right', ref: makeRef('bottom-right') },
      { x: right, y: top, type: 'corner', key: 'top-right', ref: makeRef('top-right') },
      { x: left, y: top, type: 'corner', key: 'top-left', ref: makeRef('top-left') },
      { x: midX, y: bottom, type: 'midpoint', key: 'bottom-mid', ref: makeRef('bottom-mid') },
      { x: right, y: midY, type: 'midpoint', key: 'right-mid', ref: makeRef('right-mid') },
      { x: midX, y: top, type: 'midpoint', key: 'top-mid', ref: makeRef('top-mid') },
      { x: left, y: midY, type: 'midpoint', key: 'left-mid', ref: makeRef('left-mid') }
    )
  }

  addRectPoints(wallRect, { targetType: 'wall', targetId: 'wall' })

  getVisibleBoxes().forEach((targetBox) => {
    addRectPoints(projectBoxToCameraRect(targetBox, app.state.currentView), {
      targetType: 'box',
      targetId: targetBox.id
    })
  })

  getVisiblePanels().forEach((panel) => {
    addRectPoints(getPanelLocalRect(panel), {
      targetType: 'panel',
      targetId: panel.id
    })
  })

  return points
} // End collectDimensionSnapPoints

//=================
function getDimensionSnapResult(local, tolerance = 16) {
  if (!local) {
    return {
      point: local,
      ref: null,
      snap: null
    }
  }

  const scale = app.state.viewport.localScale * app.state.viewport.zoom
  const toleranceLocal = tolerance / Math.max(0.0001, scale)
  let best = null

  collectDimensionSnapPoints().forEach((point) => {
    const distance = getDistance(local, point)

    if (distance > toleranceLocal) return
    if (best && distance >= best.distance) return

    best = {
      ...point,
      distance
    }
  })

  if (!best) {
    return {
      point: local,
      ref: null,
      snap: null
    }
  }

  return {
    point: {
      x: best.x,
      y: best.y
    },
    ref: best.ref || null,
    snap: best
  }
} // End getDimensionSnapResult

//=================
function getDimensionSelectRect(dimension) {
  if (!dimension?.start || !dimension?.end) return null

  const start = localToScreen(app.state.viewport, dimension.start.x, dimension.start.y)
  const end = localToScreen(app.state.viewport, dimension.end.x, dimension.end.y)
  const length = getDistance(dimension.start, dimension.end)

  if (!Number.isFinite(length) || length <= 0.001) return null

  const dx = Number(dimension.end.x || 0) - Number(dimension.start.x || 0)
  const dy = Number(dimension.end.y || 0) - Number(dimension.start.y || 0)
  const nx = -dy / length
  const ny = dx / length
  const mid = {
    x: (Number(dimension.start.x || 0) + Number(dimension.end.x || 0)) / 2,
    y: (Number(dimension.start.y || 0) + Number(dimension.end.y || 0)) / 2
  }
  const offsetDistance = Number.isFinite(Number(dimension.offsetDistance)) ? Number(dimension.offsetDistance) : 28
  const dimStartLocal = {
    x: Number(dimension.start.x || 0) + nx * offsetDistance,
    y: Number(dimension.start.y || 0) + ny * offsetDistance
  }
  const dimEndLocal = {
    x: Number(dimension.end.x || 0) + nx * offsetDistance,
    y: Number(dimension.end.y || 0) + ny * offsetDistance
  }
  const dimStart = localToScreen(app.state.viewport, dimStartLocal.x, dimStartLocal.y)
  const dimEnd = localToScreen(app.state.viewport, dimEndLocal.x, dimEndLocal.y)
  const xs = [start.x, end.x, dimStart.x, dimEnd.x]
  const ys = [start.y, end.y, dimStart.y, dimEnd.y]
  const padding = 10

  return {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...ys) - Math.min(...ys) + padding * 2
  }
} // End getDimensionSelectRect

//=================
function refreshDimensionSnapFromMouse() {
  const mouseLocal = {
    x: Number(app.state.mouse.localX || 0),
    y: Number(app.state.mouse.localY || 0)
  }
  const snapResult = getDimensionSnapResult(mouseLocal)

  drawing.previewDimension(snapResult.point, snapResult.ref)
  drawing.setDimensionHoverSnap(snapResult.ref ? { ...snapResult.point, ...snapResult.ref } : null)
} // End refreshDimensionSnapFromMouse

//=================
function mergeIds(oldIds, newId) {
  const ids = Array.isArray(oldIds) ? oldIds.slice() : []

  if (!newId) return ids
  if (ids.includes(newId)) return ids

  ids.push(newId)

  return ids
} // End mergeIds
//=================
function updateHover(local) {
  const scale = app.state.viewport.localScale * app.state.viewport.zoom
  const toleranceLocal = 18 / scale

  if (app.state.currentTool === 'panel') {
    if (app.state.currentView !== 'front') {
      drawing.setHover(null)
      return
    }

    const zoneHit = hitTestZoneEdge(drawing.state.zones, local, toleranceLocal)

    drawing.setHover(zoneHit)
    draw()
    return
  }

  const panelHit = hitTestVisiblePanel(local)

  if (panelHit) {
    drawing.setHover(panelHit)
    return
  }

  const zoneHit = hitTestZoneEdge(drawing.state.zones, local, toleranceLocal)

  drawing.setHover(zoneHit)
} // End updateHover
//=================
function getWallDimInputInfo(dimKey) {
  const rect = projectBoxToCameraRect(getWallBox3D(), app.state.currentView)
  const viewport = app.state.viewport

  const leftTop = localToScreen(viewport, rect.x, rect.y + rect.height)
  const rightTop = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)
  const leftBottom = localToScreen(viewport, rect.x, rect.y)

  const viewKey = app.state.currentView

  let wallKey = dimKey

  if (viewKey === 'top' || viewKey === 'bottom') {
    wallKey = dimKey === 'width' ? 'width' : 'depth'
  } else if (viewKey === 'front' || viewKey === 'back') {
    wallKey = dimKey === 'width' ? 'width' : 'height'
  } else if (viewKey === 'left' || viewKey === 'right') {
    wallKey = dimKey === 'width' ? 'depth' : 'height'
  }

  if (dimKey === 'width') {
    return {
      key: wallKey,
      editKey: 'width',
      value: String(Math.round(rect.width)),
      x: (leftTop.x + rightTop.x) / 2,
      y: leftTop.y - 46
    }
  }

  if (dimKey === 'height') {
    return {
      key: wallKey,
      editKey: 'height',
      value: String(Math.round(rect.height)),
      x: leftTop.x - 58,
      y: (leftTop.y + leftBottom.y) / 2
    }
  }

  return null
} // End getWallDimInputInfo
//=================
function getBoxViewDimKeys(currentView = 'top') {
  if (currentView === 'front' || currentView === 'back') {
    return {
      horizontal: 'width',
      vertical: 'height'
    }
  }

  if (currentView === 'left' || currentView === 'right') {
    return {
      horizontal: 'depth',
      vertical: 'height'
    }
  }

  return {
    horizontal: 'width',
    vertical: 'depth'
  }
} // End getBoxViewDimKeys
//=================
function getBoxDimInputInfo(dimHit) {
  if (!dimHit) return null

  const targetBox = box.state.boxes.find((item) => item.id === dimHit.boxId)
  if (!targetBox) return null

  const currentView = app.state.currentView
  const viewDim = getBoxViewDimKeys(currentView)
  const boxRect = projectBoxToCameraRect(targetBox, currentView)
  const viewport = app.state.viewport

  const leftTop = localToScreen(viewport, boxRect.x, boxRect.y + boxRect.height)
  const rightTop = localToScreen(viewport, boxRect.x + boxRect.width, boxRect.y + boxRect.height)
  const leftBottom = localToScreen(viewport, boxRect.x, boxRect.y)

  if (dimHit.key === viewDim.horizontal) {
    return {
      target: 'box',
      boxId: targetBox.id,
      key: viewDim.horizontal,
      value: String(Math.round(targetBox[viewDim.horizontal])),
      x: (leftTop.x + rightTop.x) / 2,
      y: leftTop.y - 42
    }
  }

  if (dimHit.key === viewDim.vertical) {
    return {
      target: 'box',
      boxId: targetBox.id,
      key: viewDim.vertical,
      value: String(Math.round(targetBox[viewDim.vertical])),
      x: leftTop.x - 52,
      y: (leftTop.y + leftBottom.y) / 2
    }
  }

  return null
} // End getBoxDimInputInfo
//=================
function exitToSelect() {
  panning = false
  panStart = null
  panOriginal = null

  hoverDim.value = null
  moveCopyMode.value = false

  drawing.resetMoveTool()
  drawing.clearSnapPreview()
  drawing.setHover(null)

  if (boxHeightInput.value) {
    boxHeightInput.value.active = false
    boxHeightInput.value.text = ''
    boxHeightInput.value.anchor = null
  }

  if (typeof box.clearDraft === 'function') {
    box.clearDraft()
  }

  if (typeof box.clearEditingDim === 'function') {
    box.clearEditingDim()
  }

  if (typeof drawing.clearPanelInput === 'function') {
    drawing.clearPanelInput()
  }

  app.setTool('select')
  app.setStatus('Select')

  draw()
} // End exitToSelect

//=================
function onPointerDown(event) {
  viewportRef.value.focus()

  if (drawing.state.panelEdit?.active) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const rawLocal = localFromEvent(event)
  const local = getBoxSnapLocal(rawLocal)

  if (app.state.currentTool === 'dimensions') {
    event.preventDefault()
    event.stopPropagation()

    if (event.button !== 0) {
      return
    }

    const canvasRect = canvasRef.value.getBoundingClientRect()
    const screenX = event.clientX - canvasRect.left
    const screenY = event.clientY - canvasRect.top
    const dimensionHit = getDimensionHit(
      app.state.viewport,
      drawing.getRenderableDimensions(app.state.currentView),
      screenX,
      screenY
    )

    if (dimensionHit) {
      openDimInput(dimensionHit)
      draw()
      return
    }

    const snapResult = getDimensionSnapResult(rawLocal)

    drawing.startOrContinueDimension(
      snapResult.point,
      snapResult.ref,
      app.state.currentView
    )

    draw()
    return
  }

  if (app.state.currentTool === 'box') {
    event.preventDefault()
    event.stopPropagation()

    if (event.button !== 0) {
      return
    }

    if (app.state.currentView !== 'top') {
      app.setStatus('Box chỉ tạo ở mặt Trên')
      draw()
      return
    }

    if (boxHeightInput.value.active) {
      return
    }

    if (!box.state.draft.active) {
      box.startDraft(local)
      app.setStatus('Box: chọn điểm góc thứ hai')
      draw()
      return
    }

    box.updateDraft(local)
    openBoxHeightInput(event)
    app.setStatus('Nhập chiều cao Box rồi nhấn Enter')
    draw()
    return
  }

  const canvasRect = canvasRef.value.getBoundingClientRect()
  const screenX = event.clientX - canvasRect.left
  const screenY = event.clientY - canvasRect.top

  const wallDimHit = getWallDimHit(
    app.state.viewport,
    projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    screenX,
    screenY
  )

  const boxDimHit = getBoxDimHit(
    app.state.viewport,
    getVisibleBoxes(),
    screenX,
    screenY,
    app.state.currentView
  )

  const dimensionHit = getDimensionHit(
    app.state.viewport,
    drawing.getRenderableDimensions(app.state.currentView),
    screenX,
    screenY
  )

  const activeDimHit = dimensionHit || boxDimHit || wallDimHit || hoverDim.value

  if (app.state.currentTool !== 'move' && activeDimHit) {
    event.preventDefault()
    event.stopPropagation()
    openDimInput(activeDimHit)
    return
  }

  if (
    event.button === 1 ||
    event.button === 2 ||
    (event.shiftKey && app.state.currentTool !== 'move' && app.state.currentTool !== 'select')
  ) {
    panning = true
    panStart = { x: event.clientX, y: event.clientY }
    panOriginal = { x: app.state.viewport.panX, y: app.state.viewport.panY }
    return
  }
  const didStartSelectDrag = startSelectDrag(event)

  if (didStartSelectDrag && app.state.currentTool === 'select') {
    box.clearSelection()
  }

  if (app.state.currentTool === 'move') {
    event.preventDefault()
    event.stopPropagation()

    if (event.button !== 0) {
      return
    }

    if (drawing.isCadMovePickingTarget()) {
      drawing.commitCadMove(
        rawLocal,
        app.state.viewport,
        event.shiftKey,
        moveCopyMode.value,
        app.state.currentView
      )

      draw()
      return
    }

    drawing.startCadMoveFromHover(
      rawLocal,
      app.state.viewport,
      app.state.currentView
    )

    draw()
    return
  }

  if (app.state.currentTool === 'panel') {
    if (app.state.currentView !== 'front') {
      app.setStatus('Vẽ Tấm chỉ hoạt động ở mặt Trước')
      draw()
      return
    }

    updateHover(rawLocal)

    if (drawing.state.hover?.type === 'zone-edge') {
      drawing.addPanelFromHover()
      draw()
      return
    }

    draw()
    return
  }

  if (isEditPanelTool(app.state.currentTool) || isEditPanelDrawTool(app.state.currentTool)) {
    const context = drawing.state.panelEdit?.active
      ? drawing.getPanelEditContext()
      : drawing.startPanelEdit(null, app.state.currentTool)

    if (!context) {
      app.setStatus('Edit Panel: chọn 1 tấm trước')
      draw()
      return
    }

    app.setStatus(`Edit Panel: ${context.panelName} | ${context.faceLabel} | ${context.rearLabel}`)
    draw()
    return
  }
  const panelHit = hitTestVisiblePanel(rawLocal)

  if (app.state.currentTool === 'select' && panelHit) {
    selectPanelOnly(panelHit.panel.id, event.shiftKey)

    draw()
    return
  }

  if (app.state.currentTool === 'select' && !event.shiftKey) {
    drawing.clearSelection()
    box.clearSelection()
  }

  draw()
} // End onPointerDown
//=================
function onPointerMove(event) {
  if (drawing.state.panelEdit?.active) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const rawLocal = localFromEvent(event)
  if (app.state.currentTool === 'select' && selectDrag.value.start && event.buttons === 1) {
    const point = getScreenPointFromEvent(event)
    const dx = point.x - selectDrag.value.start.x
    const dy = point.y - selectDrag.value.start.y
    const moved = Math.sqrt(dx * dx + dy * dy) > 4

    selectDrag.value.current = point
    selectDrag.value.moved = moved
    selectDrag.value.active = moved
    selectDrag.value.mode = point.x >= selectDrag.value.start.x ? 'contain' : 'touch'

    if (moved) {
      box.clearSelection()
      event.preventDefault()
      event.stopPropagation()
      draw()
      return
    }
  }
  if (panning && panStart && panOriginal) {
    app.setPan(
      panOriginal.x + event.clientX - panStart.x,
      panOriginal.y + event.clientY - panStart.y
    )
    draw()
    return
  }

  if (app.state.currentTool === 'dimensions') {
    const snapResult = getDimensionSnapResult(rawLocal)

    drawing.previewDimension(snapResult.point, snapResult.ref)
    drawing.setHover(null)
    hoverDim.value = null
    draw()
    return
  }

  if (app.state.currentTool === 'box') {
    const local = getBoxSnapLocal(rawLocal)

    hoverDim.value = null

    if (boxHeightInput.value.active) {
      draw()
      return
    }

    if (box.state.draft.active) {
      box.updateDraft(local)
    }

    draw()
    return
  }

  const canvasRect = canvasRef.value.getBoundingClientRect()
  const screenX = event.clientX - canvasRect.left
  const screenY = event.clientY - canvasRect.top

  const wallDimHit = getWallDimHit(
    app.state.viewport,
    projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    screenX,
    screenY
  )

  const boxDimHit = getBoxDimHit(
    app.state.viewport,
    getVisibleBoxes(),
    screenX,
    screenY,
    app.state.currentView
  )

  hoverDim.value = app.state.currentTool === 'move' ? null : boxDimHit || wallDimHit

  if (app.state.currentTool === 'move') {
    if (drawing.isCadMovePickingTarget()) {
      drawing.previewCadMove(
        rawLocal,
        app.state.viewport,
        event.shiftKey,
        app.state.currentView
      )
    } else {
      drawing.updateMoveToolHover(
        rawLocal,
        app.state.viewport,
        app.state.currentView
      )
    }

    drawing.setHover(null)
    hoverDim.value = null
    draw()
    return
  }

  if (isEditPanelTool(app.state.currentTool) || isEditPanelDrawTool(app.state.currentTool)) {
    drawing.clearSnapPreview()
    drawing.setHover(null)
    draw()
    return
  }

  drawing.clearSnapPreview()
  updateHover(rawLocal)
  draw()
} // End onPointerMove
//=================
function onPointerUp(event) {
  if (selectDrag.value.active) {
    const selectRect = getSelectDragRect()
    const selectedIds = getSelectedIdsByDragRect(selectRect)

    const panelIds = selectedIds.panelIds
    const hasDetailSelection = panelIds.length > 0 || selectedIds.dimensionIds.length > 0

    if (event?.shiftKey) {
      drawing.selectPanels([
        ...new Set([
          ...(Array.isArray(drawing.state.selectedPanelIds) ? drawing.state.selectedPanelIds : []),
          ...panelIds
        ])
      ])

      drawing.selectDimensions([
        ...new Set([
          ...(Array.isArray(drawing.state.selectedDimensionIds) ? drawing.state.selectedDimensionIds : []),
          ...selectedIds.dimensionIds
        ])
      ])

      box.clearSelection()
    } else {
      drawing.selectPanels(panelIds)
      drawing.selectDimensions(selectedIds.dimensionIds)

      box.clearSelection()
    }

    resetSelectDrag()

    if (
      event?.currentTarget &&
      typeof event.currentTarget.releasePointerCapture === 'function' &&
      event.pointerId !== undefined &&
      event.currentTarget.hasPointerCapture?.(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    event?.preventDefault?.()
    event?.stopPropagation?.()

    draw()
    return
  }

  if (selectDrag.value.start) {
    resetSelectDrag()
    draw()
    return
  }

  panning = false
  panStart = null
  panOriginal = null

  if (
    event?.currentTarget &&
    typeof event.currentTarget.releasePointerCapture === 'function' &&
    event.pointerId !== undefined &&
    event.currentTarget.hasPointerCapture?.(event.pointerId)
  ) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (app.state.currentTool !== 'move') {
    drawing.clearSnapPreview()
  }

  draw()
} // End onPointerUp
//=================
function onWheel(event) {
  if (drawing.state.panelEdit?.active) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const rect = canvasRef.value.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  const direction = event.deltaY < 0 ? 1 : -1
  const next = app.state.viewport.zoom * (direction > 0 ? 1.12 : 0.88)

  zoomAtPoint(screenX, screenY, next)

  const cameraLocal = screenToLocal(app.state.viewport, screenX, screenY)
  const worldPoint = cameraLocalToWorldPoint(cameraLocal, app.state.currentView)

  app.setMouse({
    x: screenX,
    y: screenY,
    localX: cameraLocal.x,
    localY: cameraLocal.y,
    worldX: worldPoint.x,
    worldY: worldPoint.y,
    worldZ: worldPoint.z
  })

  draw()
} // End onWheel

//=================
function handlePanelEditHistoryKey(event) {
  if (!activePanelEditContext.value) return false

  const key = event.key
  const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && (key === 'z' || key === 'Z')
  const isRedo = ((event.ctrlKey || event.metaKey) && !event.shiftKey && (key === 'y' || key === 'Y'))
    || ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === 'z' || key === 'Z'))

  if (!isUndo && !isRedo) return false

  event.preventDefault()
  event.stopPropagation()

  if (isUndo) {
    undoPanelEditHistory()
    return true
  }

  redoPanelEditHistory()
  return true
} // End handlePanelEditHistoryKey

//=================
function handlePanelEditTapeKey(event) {
  if (drawing.state.panelEdit?.shapeTool !== 'editPanelTape') return false

  const draft = panelEditTape.value.draft
  const key = event.key

  if (!draft) return false

  if (/^[0-9]$/.test(key) || key === '.' || key === ',') {
    event.preventDefault()
    event.stopPropagation()
    const nextChar = key === ',' ? '.' : key

    panelEditTape.value = {
      ...panelEditTape.value,
      inputBuffer: `${panelEditTape.value.inputBuffer}${nextChar}`
    }
    resizePanelEditCanvas()
    return true
  }

  if (key === 'Backspace') {
    event.preventDefault()
    event.stopPropagation()
    panelEditTape.value = {
      ...panelEditTape.value,
      inputBuffer: panelEditTape.value.inputBuffer.slice(0, -1)
    }
    resizePanelEditCanvas()
    return true
  }

  if (key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    resetPanelEditTapeDraft()
    app.setStatus('Thước: đã hủy guide đang tạo')
    resizePanelEditCanvas()
    return true
  }

  if (key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    const distance = Number(panelEditTape.value.inputBuffer)

    if (Number.isFinite(distance) && panelEditTape.value.inputBuffer !== '') {
      const currentDelta = Number(draft.value || 0) - Number(draft.baseValue || 0)
      const sign = currentDelta < 0 ? -1 : 1

      panelEditTape.value = {
        ...panelEditTape.value,
        draft: {
          ...draft,
          value: Number(draft.baseValue || 0) + (Math.abs(distance) * sign)
        }
      }
    }

    commitPanelEditTapeGuide()
    return true
  }

  return false
} // End handlePanelEditTapeKey

//=================
function handlePanelEditRectKey(event) {
  if (drawing.state.panelEdit?.shapeTool !== 'editPanelRect') return false

  if (event.key !== 'Escape') return false

  event.preventDefault()
  event.stopPropagation()
  resetPanelEditRectDraft()
  app.setStatus('Vẽ hình chữ nhật: đã hủy thao tác đang tạo')
  resizePanelEditCanvas()

  return true
} // End handlePanelEditRectKey


//=================
function handlePanelEditLineKey(event) {
  if (drawing.state.panelEdit?.shapeTool !== 'editPanelLine') return false

  if (event.key !== 'Escape') return false

  event.preventDefault()
  event.stopPropagation()
  resetPanelEditLineDraft()
  app.setStatus('Line: đã hủy thao tác đang tạo')
  resizePanelEditCanvas()

  return true
} // End handlePanelEditLineKey

//=================
function handlePanelEditArcKey(event) {
  if (drawing.state.panelEdit?.shapeTool !== 'editPanelArc') return false

  const draft = panelEditArc.value.draft
  const key = event.key

  if (key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    resetPanelEditArcDraft()
    app.setStatus('Arc: đã hủy thao tác đang tạo')
    resizePanelEditCanvas()
    return true
  }

  if (!draft) return false

  if (/^[0-9]$/.test(key) || key === '.' || key === ',') {
    event.preventDefault()
    event.stopPropagation()

    const nextChar = key === ',' ? '.' : key
    const nextBuffer = `${panelEditArc.value.inputBuffer}${nextChar}`

    panelEditArc.value = {
      ...panelEditArc.value,
      inputBuffer: nextBuffer
    }
    app.setStatus(`Arc: đang nhập R${nextBuffer} mm`)
    resizePanelEditCanvas()
    return true
  }

  if (key === 'Backspace') {
    event.preventDefault()
    event.stopPropagation()
    const nextBuffer = panelEditArc.value.inputBuffer.slice(0, -1)

    panelEditArc.value = {
      ...panelEditArc.value,
      inputBuffer: nextBuffer
    }
    app.setStatus(nextBuffer ? `Arc: đang nhập R${nextBuffer} mm` : 'Arc: nhập bán kính')
    resizePanelEditCanvas()
    return true
  }

  if (key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()

    if (panelEditArc.value.inputBuffer !== '' && draft.stage === 'end') {
      const effectiveDraft = getEffectivePanelEditArcDraft(draft)
      const endPoint = effectiveDraft.end || effectiveDraft.current

      if (!endPoint || endPoint === draft.current) {
        app.setStatus('Arc: nhập bán kính hợp lệ rồi Enter')
        return true
      }

      panelEditArc.value = {
        ...panelEditArc.value,
        draft: {
          ...effectiveDraft,
          stage: 'bulge',
          end: endPoint,
          current: getPanelEditArcDefaultBulge(effectiveDraft.start, endPoint),
          suggested: true
        }
      }
      resizePanelEditCanvas()
      return true
    }

    if (draft.stage === 'bulge') {
      commitPanelEditArc()
      return true
    }

    return true
  }

  return false
} // End handlePanelEditArcKey

//=================
function handlePanelEditMoveKey(event) {
  if (drawing.state.panelEdit?.shapeTool !== 'editPanelMove') return false

  if (event.key !== 'Escape') return false

  event.preventDefault()
  event.stopPropagation()

  if (!cancelPanelEditMove()) {
    exitPanelEditCommandToSelect()
  }

  return true
} // End handlePanelEditMoveKey

//=================
function handlePanelEditCircleKey(event) {
  if (drawing.state.panelEdit?.shapeTool !== 'editPanelCircle') return false

  const draft = panelEditCircle.value.draft
  const key = event.key

  if (key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    resetPanelEditCircleDraft()
    app.setStatus('Vẽ hình tròn: đã hủy thao tác đang tạo')
    resizePanelEditCanvas()
    return true
  }

  if (!draft) return false

  if (/^[0-9]$/.test(key) || key === '.' || key === ',') {
    event.preventDefault()
    event.stopPropagation()

    const nextChar = key === ',' ? '.' : key
    const nextBuffer = `${panelEditCircle.value.inputBuffer}${nextChar}`

    panelEditCircle.value = {
      ...panelEditCircle.value,
      inputBuffer: nextBuffer
    }
    app.setStatus(`Vẽ hình tròn: đang nhập R${nextBuffer} mm`)
    resizePanelEditCanvas()
    return true
  }

  if (key === 'Backspace') {
    event.preventDefault()
    event.stopPropagation()
    const nextBuffer = panelEditCircle.value.inputBuffer.slice(0, -1)

    panelEditCircle.value = {
      ...panelEditCircle.value,
      inputBuffer: nextBuffer
    }
    app.setStatus(nextBuffer ? `Vẽ hình tròn: đang nhập R${nextBuffer} mm` : 'Vẽ hình tròn: nhập bán kính')
    resizePanelEditCanvas()
    return true
  }

  if (key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()

    const radius = Number(panelEditCircle.value.inputBuffer)

    if (!Number.isFinite(radius) || radius <= 0 || panelEditCircle.value.inputBuffer === '') {
      app.setStatus('Vẽ hình tròn: nhập bán kính hợp lệ rồi Enter')
      return true
    }

    commitPanelEditCircle(radius)
    return true
  }

  return false
} // End handlePanelEditCircleKey


//=================
function deleteSelectedPanelEditLine() {
  const selectedItems = panelEditSelection.value.items

  if (!activePanelEditContext.value || selectedItems.length === 0) return false

  const selectedLineKeys = getPanelEditSelectedLineKeySet()
  const selectedRectIds = new Set(selectedItems.filter((item) => item.type === 'rect').map((item) => item.id))
  const selectedCircleIds = new Set(selectedItems.filter((item) => item.type === 'circle').map((item) => item.id))
  const nextLines = panelEditLine.value.lines.filter((line) => !selectedLineKeys.has(getPanelEditLineSelectionKey(line)))
  const nextRectangles = panelEditRect.value.rectangles.filter((rectangle) => !selectedRectIds.has(rectangle.id))
  const nextCircles = panelEditCircle.value.circles.filter((circle) => !selectedCircleIds.has(circle.id))
  const changed = nextLines.length !== panelEditLine.value.lines.length
    || nextRectangles.length !== panelEditRect.value.rectangles.length
    || nextCircles.length !== panelEditCircle.value.circles.length

  if (!changed) return false

  pushPanelEditHistorySnapshot()
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverSnap: null,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null,
    draft: null,
    lines: nextLines
  }
  panelEditRect.value = {
    ...panelEditRect.value,
    rectangles: nextRectangles
  }
  panelEditCircle.value = {
    ...panelEditCircle.value,
    circles: nextCircles
  }
  clearPanelEditSelection()
  resetPanelEditMoveDraft()
  app.setStatus(`Select: đã xóa ${selectedItems.length} chi tiết`)
  resizePanelEditCanvas()

  return true
} // End deleteSelectedPanelEditLine

//=================
function runPanelEditShortcutAction(action) {
  if (!action || action.type !== 'editPanelTool') return false
  if (!activePanelEditContext.value) return false
  if (!panelEditTools.some((tool) => tool.id === action.value)) return false

  selectPanelEditWindowTool(action.value)
  return true
} // End runPanelEditShortcutAction

//=================
function handlePanelEditShortcutKey(event) {
  if (!activePanelEditContext.value) return false
  const shortcutText = shortcutEventToText(event)

  if (shortcutText === 'M') {
    selectPanelEditWindowTool('editPanelMove')
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  const action = findShortcutAction(shortcutText, loadShortcutSettings())

  if (!runPanelEditShortcutAction(action)) return false

  event.preventDefault()
  event.stopPropagation()
  return true
} // End handlePanelEditShortcutKey

//=================
function onKeyDown(event) {
  const key = event.key
  const isSpace = key === ' ' || key === 'Spacebar' || event.code === 'Space'

  if (activePanelEditContext.value && isSpace) {
    event.preventDefault()
    event.stopPropagation()
    exitPanelEditCommandToSelect()
    return
  }

  if (handlePanelEditHistoryKey(event)) return

  if (handlePanelEditTapeKey(event)) return

  if (handlePanelEditRectKey(event)) return

  if (handlePanelEditLineKey(event)) return

  if (handlePanelEditArcKey(event)) return

  if (handlePanelEditMoveKey(event)) return

  if (handlePanelEditCircleKey(event)) return

  if (handlePanelEditShortcutKey(event)) return

  if (activePanelEditContext.value && (event.key === 'Delete' || event.key === 'Backspace')) {
    event.preventDefault()
    event.stopPropagation()
    deleteSelectedPanelEditLine()
    return
  }

  if (activePanelEditContext.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  if (handlePanelToolKey(event)) return

  handleViewportKeyboard(event)
} // End onKeyDown

watch(() => [cabinet.state.width, cabinet.state.depth, cabinet.state.height, cabinet.state.panelThickness, app.state.currentView], () => {
  drawing.rebuildZones()
  draw()
})

watch(() => [
  drawing.state.panels.length,
  drawing.state.zones.length,
  drawing.state.selectedPanelId,
  drawing.state.selectedDimensionIds.length,
  drawing.state.dimensions.length,
  drawing.state.panelInputBuffer,
  app.state.mini3DVisible
], draw)

watch(() => [box.state.boxes.length, box.state.selectedBoxId, box.state.editingDim, box.state.draft.active], () => {
  drawing.rebuildZones()
  draw()
})
watch(() => app.state.currentTool, (tool) => {
  if (tool !== 'panel') {
    drawing.clearPanelInput()
  }

  if (tool !== 'editPanelTape') {
    resetPanelEditTapeDraft()
  }

  if (tool !== 'editPanelRect') {
    resetPanelEditRectDraft()
  }

  if (tool !== 'editPanelLine') {
    resetPanelEditLineDraft()
  }

  if (tool !== 'editPanelArc') {
    resetPanelEditArcDraft()
  }

  if (tool !== 'editPanelCircle') {
    resetPanelEditCircleDraft()
  }

  if (tool !== 'move') {
    moveCopyMode.value = false
  }

  if (tool === 'move') {
    moveCopyMode.value = false
    hoverDim.value = null
    drawing.resetMoveTool()
    app.setStatus('Move: chọn điểm snap của tấm hoặc Box')
    draw()
    return
  }

  drawing.resetMoveTool()
  drawing.clearSnapPreview()
  drawing.setHover(null)
  box.clearSelection()

  if (tool === 'select') {
    app.setStatus('Select')
    draw()
    return
  }

  if (tool === 'box') {
    app.setStatus('Box: chọn điểm góc đầu tiên')
    draw()
    return
  }

  if (tool === 'dimensions') {
    drawing.resetDimensionTool()
    refreshDimensionSnapFromMouse()
    app.setStatus('Dimensions: chọn điểm đầu')
    draw()
    return
  }

  if (tool === 'panel') {
    app.setStatus('Vẽ Tấm: chọn cạnh Zone')
    draw()
  }
})
watch(() => [
  drawing.state.panelEdit?.active,
  drawing.state.panelEdit?.shapeTool,
  drawing.state.panelEdit?.context?.panelId,
  drawing.state.panelEdit?.context?.faceSide,
  drawing.state.panelEdit?.context?.width,
  drawing.state.panelEdit?.context?.height
], (nextValue, oldValue) => {
  if (!nextValue?.[0]) {
    panelEditTape.value = {
      hoverSnap: null,
      draft: null,
      guides: [],
      inputBuffer: ''
    }
    panelEditRect.value = {
      hoverSnap: null,
      draft: null,
      pendingAction: null,
      rectangles: []
    }
    panelEditLine.value = {
      hoverSnap: null,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null,
      lines: []
    }
    clearPanelEditHistory()
  } else if (!oldValue || nextValue[2] !== oldValue[2] || nextValue[3] !== oldValue[3]) {
    loadPanelEditSavedState(drawing.state.panelEdit?.context)
  }

  nextTick(resizePanelEditCanvas)
})

onMounted(() => {
  resizeCanvas()
  drawing.rebuildZones()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('resize', resizePanelEditCanvas)
  window.addEventListener('mn-app-settings-applied', onAppSettingsApplied)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('resize', resizePanelEditCanvas)
  window.removeEventListener('mn-app-settings-applied', onAppSettingsApplied)
})
</script>
