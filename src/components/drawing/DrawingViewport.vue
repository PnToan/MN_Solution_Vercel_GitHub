<template>
  <main class="mn-canvas-area" ref="viewportRef" tabindex="0" @keydown="onKeyDown">
    <canvas
      ref="canvasRef"
      class="mn-draw-canvas"
      :class="canvasCursorClass"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @wheel.prevent="onWheel"
      @contextmenu.prevent
    />
    <input
      v-if="dimInput.active"
      ref="dimInputRef"
      type="text"
      inputmode="decimal"
      class="mn-dim-input"
      :style="dimInputStyle"
      v-model="dimInput.value"
      @pointerdown.stop
      @click.stop
      @keydown.stop="onDimInputKeyDown"
      @blur="cancelDimInput"
    />

    <input
      v-if="boxHeightInput.active"
      ref="boxHeightInputRef"
      type="number"
      class="mn-dim-input"
      :style="boxHeightInputStyle"
      v-model="boxHeightInput.value"
      placeholder="Cao Box"
      @keydown="onBoxHeightInputKeyDown"
      @blur="cancelBoxHeightInput"
    />

    <section v-if="activePanelEditContext" class="mn-panel-edit-window">
      <header class="mn-panel-edit-header">
        <div class="mn-panel-edit-tools">
          <button
            v-for="tool in panelEditTools"
            :key="tool.id"
            type="button"
            class="mn-panel-edit-tool-btn"
            :class="{ active: drawing.state.panelEdit.shapeTool === tool.id || app.state.currentTool === tool.id }"
            :title="tool.label"
            @pointerdown.stop.prevent="selectPanelEditWindowTool(tool.id)"
            @click.stop.prevent="selectPanelEditWindowTool(tool.id)"
          >
            <img :src="tool.icon" :alt="tool.label" class="mn-panel-edit-tool-icon" />
          </button>
        </div>
        <div class="mn-panel-edit-face-switch">
          <button
            v-for="face in activePanelEditContext.faceOptions"
            :key="face.id"
            type="button"
            class="mn-panel-edit-face-btn"
            :class="{ active: activePanelEditContext.faceSide === face.id }"
            @pointerdown.stop.prevent="selectPanelEditFace(face.id)"
            @click.stop.prevent="selectPanelEditFace(face.id)"
          >
            {{ face.label }}
          </button>
        </div>
        <div class="mn-panel-edit-title">
          {{ activePanelEditContext.panelName }} · {{ activePanelEditContext.faceLabel }} · {{ activePanelEditContext.axesText }} · {{ activePanelEditContext.rearLabel }}
        </div>
        <button type="button" class="mn-panel-edit-apply" @click.stop.prevent="applyPanelEdit">Áp dụng</button>
      </header>
      <canvas
        ref="panelEditCanvasRef"
        tabindex="0"
        class="mn-panel-edit-canvas"
        :class="panelEditCanvasCursorClass"
        @pointerdown.stop.prevent="onPanelEditPointerDown"
        @pointermove.stop.prevent="onPanelEditPointerMove"
        @pointerup.stop.prevent="onPanelEditPointerUp"
        @pointerleave.stop.prevent="onPanelEditPointerUp"
        @wheel.stop.prevent="onPanelEditWheel"
        @contextmenu.prevent
      />
      <div
        v-if="panelEditRect.pendingAction"
        class="mn-panel-edit-action-dialog"
        @pointerdown.stop.prevent
        @click.stop.prevent
      >
        <button type="button" class="mn-panel-edit-action-btn" @click.stop.prevent="confirmPanelEditRectangleAction('none')">None</button>
        <button type="button" class="mn-panel-edit-action-btn danger" @click.stop.prevent="confirmPanelEditRectangleAction('cutout')">Khấu</button>
      </div>
      <footer class="mn-panel-edit-footer">
        {{ panelEditFooterText }}
      </footer>
    </section>

  <Mini3DPreview v-if="app.state.mini3DVisible" />
  <button class="mn-preview-toggle" @click="app.toggleMini3D">{{ app.state.mini3DVisible ? 'Ẩn 3D' : 'Hiện 3D' }}</button>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Mini3DPreview from '../preview/Mini3DPreview.vue'
import { useAppStore } from '../../stores/useAppStore'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useWallStore } from '../../stores/useWallStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { useBoxStore } from '../../stores/useBoxStore'
import { renderCanvas2D, getWallDimHit, getBoxDimHit, getDimensionHit } from '../../renderers/canvas-2d-renderer'
import { screenToLocal, localToScreen } from '../../renderers/viewport-transform'
import { projectBoxToCameraRect, cameraLocalToWorldPoint } from '../../core/view/view-camera'
import { hitTestPanel, hitTestZoneEdge } from '../../core/snap/snap-engine'
import { handleViewportKey } from '../../commands/keyboard-controller'
import { createPanelEditRectangleRecord, getEditPanelToolCursorClass, isEditPanelDrawTool, isEditPanelTool } from '../../core/tools/editPanelTool'

const app = useAppStore()
const cabinet = useCabinetStore()
const wall = useWallStore()
const drawing = useDrawingStore()
const box = useBoxStore()
const viewportRef = ref(null)
const canvasRef = ref(null)
const panelEditCanvasRef = ref(null)
const dimInputRef = ref(null)
const boxHeightInputRef = ref(null)

const dimInput = ref({
  active: false,
  key: null,
  dimensionId: null,
  x: 0,
  y: 0,
  value: ''
})

const boxHeightInput = ref({
  active: false,
  x: 0,
  y: 0,
  value: ''
})

const hoverDim = ref(null)
const moveCopyMode = ref(false)
let ctx = null
let ratio = 1
let panning = false
let panStart = null
let panOriginal = null
let panelEditPanning = false
let panelEditPanStart = null
let panelEditPanOriginal = null

const panelEditViewport = ref({
  zoom: 1,
  panX: 0,
  panY: 0
})

const panelEditTape = ref({
  hoverSnap: null,
  draft: null,
  guides: [],
  inputBuffer: ''
})

const panelEditRect = ref({
  hoverSnap: null,
  draft: null,
  pendingAction: null,
  rectangles: []
})

const panelEditLine = ref({
  hoverSnap: null,
  hoverRegion: null,
  hoverLine: null,
  selectedLineId: null,
  draft: null,
  lines: []
})

const panelEditHistory = ref({
  undoStack: [],
  redoStack: [],
  max: 80
})

const selectDrag = ref({
  active: false,
  start: null,
  current: null,
  moved: false,
  mode: 'contain'
})

const views = [
  { id: 'front', label: 'Trước' }, { id: 'back', label: 'Sau' }, { id: 'left', label: 'Trái' },
  { id: 'right', label: 'Phải' }, { id: 'top', label: 'Trên' }, { id: 'bottom', label: 'Dưới' }
]

const panelEditTools = [
  { id: 'editPanelSelect', label: 'Select', icon: '/icons/toolbar/select.svg' },
  { id: 'editPanelLine', label: 'Line', icon: '/icons/toolbar/line.svg' },
  { id: 'editPanelRect', label: 'Vẽ hình chữ nhật', icon: '/icons/toolbar/rect.svg' },
  { id: 'editPanelArc', label: 'Arc', icon: '/icons/toolbar/arc.svg' },
  { id: 'editPanelCircle', label: 'Circle', icon: '/icons/toolbar/circle.svg' },
  { id: 'editPanelTape', label: 'Thước', icon: '/icons/toolbar/tape.svg' }
]
const zoomLabel = computed(() => `${Math.round(app.state.viewport.zoom * 100)}%`)
const localX = computed(() => Math.round(app.state.mouse.localX))
const localY = computed(() => Math.round(app.state.mouse.localY))
const activePanelEditContext = computed(() => drawing.state.panelEdit?.active ? drawing.state.panelEdit.context : null)
const panelEditCanvasCursorClass = computed(() => getEditPanelToolCursorClass(drawing.state.panelEdit?.shapeTool))
const panelEditFooterText = computed(() => {
  if (!activePanelEditContext.value) return ''

  const shapeTool = drawing.state.panelEdit?.shapeTool

  if (!shapeTool || shapeTool === 'editPanelSelect') {
    const hoverRegion = panelEditLine.value.hoverRegion
    const hoverLine = panelEditLine.value.hoverLine
    const selectedLineId = panelEditLine.value.selectedLineId

    if (selectedLineId) {
      return 'Select: line đã chọn | Delete để xóa line'
    }

    if (hoverLine) {
      return 'Select: đang nhận line | click để chọn line'
    }

    if (panelEditRect.value.pendingAction?.source === 'lineRegion') {
      return 'Select vùng: chọn None để bỏ qua hoặc Khấu để khấu xuyên vùng đã chọn'
    }

    if (hoverRegion) {
      return `Select: vùng ${Math.round(hoverRegion.width * 10) / 10} x ${Math.round(hoverRegion.height * 10) / 10} mm | click để chọn vùng`
    }

    return `Select: ${activePanelEditContext.value.panelName} | ${activePanelEditContext.value.faceLabel} | Space để thoát lệnh hiện tại`
  }

  if (shapeTool === 'editPanelLine') {
    const draft = panelEditLine.value.draft
    const hoverSnap = panelEditLine.value.hoverSnap

    if (draft) {
      const end = draft.current || draft.start
      const length = Math.hypot(Number(end.x || 0) - Number(draft.start.x || 0), Number(end.y || 0) - Number(draft.start.y || 0))
      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''

      return `Line: dài ${Math.round(length * 10) / 10} mm${snapText} | click điểm cuối`
    }

    if (hoverSnap) {
      return `Line: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh/guide'} | click điểm đầu`
    }

    return 'Line: click điểm đầu, rê chuột preview, click điểm cuối để tạo line'
  }

  if (shapeTool === 'editPanelTape') {
    const draft = panelEditTape.value.draft
    const hoverSnap = panelEditTape.value.hoverSnap
    const input = panelEditTape.value.inputBuffer

    if (draft) {
      const distance = Math.abs(Number(draft.value || 0) - Number(draft.baseValue || 0))
      const inputText = input ? ` | Nhập: ${input}` : ''

      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'giao/điểm' : 'đường'}` : ''

      return `Thước: ${draft.axis === 'vertical' ? 'Guide đứng' : 'Guide ngang'} | Khoảng cách ${Math.round(distance * 10) / 10} mm${inputText}${snapText} | Enter để cố định hoặc click lần nữa`
    }

    if (hoverSnap) {
      return `Thước: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh'} | click để tạo guide ${hoverSnap.axis === 'vertical' ? 'đứng' : 'ngang'}`
    }

    return 'Thước: rê chuột gần cạnh để bắt snap, click để tạo đường guide'
  }

  if (shapeTool === 'editPanelRect') {
    const draft = panelEditRect.value.draft
    const hoverSnap = panelEditRect.value.hoverSnap

    if (panelEditRect.value.pendingAction) {
      return 'Vẽ hình chữ nhật: chọn None để giữ nét vẽ hoặc Khấu để push thủng panel'
    }

    if (draft) {
      const width = Math.abs(Number(draft.current?.x || 0) - Number(draft.start?.x || 0))
      const height = Math.abs(Number(draft.current?.y || 0) - Number(draft.start?.y || 0))
      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''

      return `Vẽ hình chữ nhật: ${Math.round(width * 10) / 10} x ${Math.round(height * 10) / 10} mm${snapText} | click điểm góc chéo để hoàn tất`
    }

    if (hoverSnap) {
      return `Vẽ hình chữ nhật: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh/guide'} | click điểm đầu`
    }

    return 'Vẽ hình chữ nhật: click điểm đầu, click điểm góc chéo để tạo hình chữ nhật'
  }

  const toolName = panelEditTools.find((tool) => tool.id === shapeTool)?.label || 'Edit Panel'

  return `${toolName}: ${activePanelEditContext.value.panelName} | ${activePanelEditContext.value.faceLabel}`
})

//=================
function getWallBox3D() {
  return wall.getBox3D()
} // End getWallBox3D
const activeViewConfig = computed(() => app.getViewConfig(app.state.currentView))
const axisHorizontal = computed(() => activeViewConfig.value.axisA || 'X')
const axisVertical = computed(() => activeViewConfig.value.axisB || 'Y')

const dimInputStyle = computed(() => ({
  left: `${dimInput.value.x}px`,
  top: `${dimInput.value.y}px`
}))

const boxHeightInputStyle = computed(() => ({
  left: `${boxHeightInput.value.x}px`,
  top: `${boxHeightInput.value.y}px`
}))
//=================
const canvasCursorClass = computed(() => {
  if (app.state.currentTool === 'move') return 'mn-cursor-move'
  if (app.state.currentTool === 'dimensions') return 'mn-cursor-dimensions'
  if (hoverDim.value && app.state.currentTool === 'select') return 'mn-cursor-pointer'
  if (app.state.currentTool === 'box') return 'mn-cursor-box'
  if (app.state.currentTool === 'panel') return 'mn-cursor-crosshair'
  if (isEditPanelTool(app.state.currentTool) || isEditPanelDrawTool(app.state.currentTool)) return 'mn-cursor-crosshair'
  if (app.state.currentTool === 'select') return 'mn-cursor-select'

  return 'mn-cursor-default'
}) // End canvasCursorClass
function resizeCanvas() {
  const canvas = canvasRef.value
  const host = viewportRef.value
  if (!canvas || !host) return
  const rect = host.getBoundingClientRect()
  ratio = window.devicePixelRatio || 1
  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  app.setViewportSize(rect.width, rect.height)
  draw()
  nextTick(resizePanelEditCanvas)
}

//=================
//=================
function onAppSettingsApplied() {
  drawing.rebuildZones()
  draw()
  nextTick(resizePanelEditCanvas)
} // End onAppSettingsApplied

function draw() {
  if (!ctx || !canvasRef.value) return

  const canvas = canvasRef.value
  const width = canvas.clientWidth
  const height = canvas.clientHeight

  renderCanvas2D(ctx, {
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
    selectedBoxId: box.state.selectedBoxId,
    selectedBoxIds: box.state.selectedBoxIds,
    selectDrag: selectDrag.value,
    dimensions: drawing.getRenderableDimensions(app.state.currentView),
    selectedDimensionIds: drawing.state.selectedDimensionIds,
    dimensionDraft: drawing.getDimensionDraft(),
    editingDimensionId: dimInput.value.target === 'dimension' ? dimInput.value.dimensionId : null,
    showGrid: app.state.showGrid
  })
} // End draw

//=================
function getCssVariable(variableName, fallback) {
  if (typeof window === 'undefined') return fallback

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()

  return value || fallback
} // End getCssVariable

//=================
function getPanelEditPoint(context, offsetX, offsetY, scale, x, y) {
  return {
    x: offsetX + x * scale,
    y: offsetY + (context.height - y) * scale
  }
} // End getPanelEditPoint

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
function getPanelEditZoomClamp(value) {
  return Math.min(Math.max(value, 0.2), 8)
} // End getPanelEditZoomClamp

//=================
function getPanelEditLayout(context, canvasWidth, canvasHeight) {
  const marginLeft = 110
  const marginRight = 72
  const marginTop = 82
  const marginBottom = 96
  const availableWidth = Math.max(1, canvasWidth - marginLeft - marginRight)
  const availableHeight = Math.max(1, canvasHeight - marginTop - marginBottom)
  const baseScale = Math.min(
    availableWidth / Math.max(1, context.width),
    availableHeight / Math.max(1, context.height)
  )
  const zoom = getPanelEditZoomClamp(panelEditViewport.value.zoom)
  const scale = baseScale * zoom
  const faceWidth = context.width * scale
  const faceHeight = context.height * scale
  const offsetX = marginLeft + (availableWidth - faceWidth) / 2 + panelEditViewport.value.panX
  const offsetY = marginTop + (availableHeight - faceHeight) / 2 + panelEditViewport.value.panY

  return {
    scale,
    faceWidth,
    faceHeight,
    left: offsetX,
    right: offsetX + faceWidth,
    top: offsetY,
    bottom: offsetY + faceHeight
  }
} // End getPanelEditLayout


//=================
function getPanelEditLocalFromScreen(context, layout, screenX, screenY) {
  return {
    x: (screenX - layout.left) / layout.scale,
    y: context.height - ((screenY - layout.top) / layout.scale)
  }
} // End getPanelEditLocalFromScreen


//=================
function getClosestPointOnPanelEditLine(line, local) {
  if (!line || !local) return null

  const x1 = Number(line.start?.x || 0)
  const y1 = Number(line.start?.y || 0)
  const x2 = Number(line.end?.x || 0)
  const y2 = Number(line.end?.y || 0)
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy

  if (lengthSq <= 0.0001) return { x: x1, y: y1, distance: Math.hypot(local.x - x1, local.y - y1) }

  const t = Math.max(0, Math.min(1, ((local.x - x1) * dx + (local.y - y1) * dy) / lengthSq))
  const x = x1 + dx * t
  const y = y1 + dy * t

  return {
    x,
    y,
    distance: Math.hypot(local.x - x, local.y - y)
  }
} // End getClosestPointOnPanelEditLine

//=================
function getPanelEditLineHit(context, layout, screenX, screenY) {
  if (!context || !layout) return null

  const tolerance = 8
  const local = getPanelEditLocalFromScreen(context, layout, screenX, screenY)
  let best = null

  panelEditLine.value.lines.forEach((line) => {
    const closest = getClosestPointOnPanelEditLine(line, local)

    if (!closest) return

    const screenPoint = getPanelEditPoint(context, layout.left, layout.top, layout.scale, closest.x, closest.y)
    const screenDistance = Math.hypot(screenPoint.x - screenX, screenPoint.y - screenY)

    if (screenDistance > tolerance) return
    if (best && screenDistance >= best.distance) return

    best = {
      ...line,
      distance: screenDistance,
      local: { x: closest.x, y: closest.y },
      screen: screenPoint
    }
  })

  return best
} // End getPanelEditLineHit


//=================
function getPanelEditSegmentIntersection(segmentA, segmentB) {
  if (!segmentA || !segmentB) return null

  const x1 = Number(segmentA.start?.x || 0)
  const y1 = Number(segmentA.start?.y || 0)
  const x2 = Number(segmentA.end?.x || 0)
  const y2 = Number(segmentA.end?.y || 0)
  const x3 = Number(segmentB.start?.x || 0)
  const y3 = Number(segmentB.start?.y || 0)
  const x4 = Number(segmentB.end?.x || 0)
  const y4 = Number(segmentB.end?.y || 0)
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  const tolerance = 0.001

  if (Math.abs(denominator) <= tolerance) return null

  const px = (((x1 * y2 - y1 * x2) * (x3 - x4)) - ((x1 - x2) * (x3 * y4 - y3 * x4))) / denominator
  const py = (((x1 * y2 - y1 * x2) * (y3 - y4)) - ((y1 - y2) * (x3 * y4 - y3 * x4))) / denominator
  const withinA = px >= Math.min(x1, x2) - tolerance
    && px <= Math.max(x1, x2) + tolerance
    && py >= Math.min(y1, y2) - tolerance
    && py <= Math.max(y1, y2) + tolerance
  const withinB = px >= Math.min(x3, x4) - tolerance
    && px <= Math.max(x3, x4) + tolerance
    && py >= Math.min(y3, y4) - tolerance
    && py <= Math.max(y3, y4) + tolerance

  if (!withinA || !withinB) return null

  return { x: px, y: py }
} // End getPanelEditSegmentIntersection

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
function getPanelEditLineSegmentsForSnap(context) {
  if (!context) return []

  return (panelEditLine.value.lines || []).map((line) => ({
    id: line.id,
    type: 'line',
    axis: line.axis,
    start: { x: Number(line.start?.x || 0), y: Number(line.start?.y || 0) },
    end: { x: Number(line.end?.x || 0), y: Number(line.end?.y || 0) }
  }))
} // End getPanelEditLineSegmentsForSnap

//=================
function getPanelEditTapeSnap(context, layout, screenX, screenY, options = {}) {
  if (!context || !layout) return null

  const tolerance = 12
  const local = getPanelEditLocalFromScreen(context, layout, screenX, screenY)
  const clampedLocal = {
    x: Math.max(0, Math.min(context.width, local.x)),
    y: Math.max(0, Math.min(context.height, local.y))
  }
  const includeGuides = options.includeGuides !== false
  const includePanel = options.includePanel !== false
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
  const editLines = Array.isArray(panelEditLine.value.lines) ? panelEditLine.value.lines : []
  const verticalLines = editLines.filter((line) => line.axis === 'vertical')
  const horizontalLines = editLines.filter((line) => line.axis === 'horizontal')

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
    ...getPanelEditLineSegmentsForSnap(context),
    ...getPanelEditGuideSegments(context),
    ...getPanelEditPanelBoundarySegments(context)
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
function resetPanelEditTapeDraft() {
  panelEditTape.value = {
    ...panelEditTape.value,
    draft: null,
    inputBuffer: ''
  }
} // End resetPanelEditTapeDraft

//=================
function resetPanelEditRectDraft() {
  panelEditRect.value = {
    ...panelEditRect.value,
    hoverSnap: null,
    draft: null,
    pendingAction: null
  }
} // End resetPanelEditRectDraft

//=================
function resetPanelEditLineDraft() {
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverSnap: null,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null,
    draft: null
  }
} // End resetPanelEditLineDraft

//=================
function resetPanelEditCommandDrafts() {
  resetPanelEditTapeDraft()
  resetPanelEditRectDraft()
  resetPanelEditLineDraft()
} // End resetPanelEditCommandDrafts

//=================
function clonePanelEditHistoryData(value) {
  return JSON.parse(JSON.stringify(value || null))
} // End clonePanelEditHistoryData

//=================
function createPanelEditHistorySnapshot() {
  return {
    guides: clonePanelEditHistoryData(panelEditTape.value.guides || []),
    rectangles: clonePanelEditHistoryData(panelEditRect.value.rectangles || []),
    lines: clonePanelEditHistoryData(panelEditLine.value.lines || [])
  }
} // End createPanelEditHistorySnapshot

//=================
function restorePanelEditHistorySnapshot(snapshot) {
  panelEditTape.value = {
    ...panelEditTape.value,
    hoverSnap: null,
    draft: null,
    inputBuffer: '',
    guides: clonePanelEditHistoryData(snapshot?.guides || [])
  }
  panelEditRect.value = {
    ...panelEditRect.value,
    hoverSnap: null,
    draft: null,
    pendingAction: null,
    rectangles: clonePanelEditHistoryData(snapshot?.rectangles || [])
  }
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverSnap: null,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null,
    draft: null,
    lines: clonePanelEditHistoryData(snapshot?.lines || [])
  }
} // End restorePanelEditHistorySnapshot

//=================
function pushPanelEditHistorySnapshot() {
  const history = panelEditHistory.value

  history.undoStack.push(createPanelEditHistorySnapshot())

  if (history.undoStack.length > history.max) {
    history.undoStack.shift()
  }

  history.redoStack = []
} // End pushPanelEditHistorySnapshot

//=================
function clearPanelEditHistory() {
  panelEditHistory.value = {
    undoStack: [],
    redoStack: [],
    max: panelEditHistory.value.max || 80
  }
} // End clearPanelEditHistory

//=================
function undoPanelEditHistory() {
  const history = panelEditHistory.value
  const snapshot = history.undoStack.pop()

  if (!snapshot) {
    app.setStatus('Edit Panel: không còn bước để Undo')
    return false
  }

  history.redoStack.push(createPanelEditHistorySnapshot())
  restorePanelEditHistorySnapshot(snapshot)
  app.setStatus('Edit Panel: Undo')
  nextTick(resizePanelEditCanvas)

  return true
} // End undoPanelEditHistory

//=================
function redoPanelEditHistory() {
  const history = panelEditHistory.value
  const snapshot = history.redoStack.pop()

  if (!snapshot) {
    app.setStatus('Edit Panel: không còn bước để Redo')
    return false
  }

  history.undoStack.push(createPanelEditHistorySnapshot())
  restorePanelEditHistorySnapshot(snapshot)
  app.setStatus('Edit Panel: Redo')
  nextTick(resizePanelEditCanvas)

  return true
} // End redoPanelEditHistory

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
function getPanelEditRectBounds(rectangle) {
  const x1 = Number(rectangle?.start?.x || 0)
  const y1 = Number(rectangle?.start?.y || 0)
  const x2 = Number(rectangle?.end?.x ?? rectangle?.current?.x ?? x1)
  const y2 = Number(rectangle?.end?.y ?? rectangle?.current?.y ?? y1)

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
} // End getPanelEditRectBounds

//=================
function drawPanelEditRectangle(targetContext, context, layout, rectangle, options = {}) {
  if (!rectangle) return

  const isDraft = options.draft === true
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
      }
      targetContext.restore()
      return
    }

    targetContext.strokeStyle = isDraft ? '#ff7a00' : '#111111'
    targetContext.fillStyle = isDraft ? 'rgba(255, 122, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)'
    targetContext.lineWidth = isDraft ? 2 : 1.5
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
    targetContext.restore()
    return
  }

  targetContext.strokeStyle = isDraft ? '#ff7a00' : '#111111'
  targetContext.fillStyle = isDraft ? 'rgba(255, 122, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)'
  targetContext.lineWidth = isDraft ? 2 : 1.5
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
  targetContext.lineCap = 'square'
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
function erasePanelEditPolygonBoundarySegments(targetContext, context, layout, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return

  targetContext.save()
  targetContext.strokeStyle = getCssVariable('--mn-bg-canvas', '#f4f4f4')
  targetContext.lineWidth = 5
  targetContext.lineCap = 'square'
  targetContext.setLineDash([])
  targetContext.beginPath()
  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]

    if (!isPanelEditBoundarySegment(context, point, nextPoint)) return

    const p1 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, point.x, point.y)
    const p2 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, nextPoint.x, nextPoint.y)

    targetContext.moveTo(p1.x, p1.y)
    targetContext.lineTo(p2.x, p2.y)
  })
  targetContext.stroke()
  targetContext.restore()
} // End erasePanelEditPolygonBoundarySegments

//=================
function drawPanelEditPolygonCutoutEdges(targetContext, context, layout, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return

  targetContext.beginPath()
  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]

    if (isPanelEditBoundarySegment(context, point, nextPoint)) return

    const p1 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, point.x, point.y)
    const p2 = getPanelEditPoint(context, layout.left, layout.top, layout.scale, nextPoint.x, nextPoint.y)

    targetContext.moveTo(p1.x, p1.y)
    targetContext.lineTo(p2.x, p2.y)
  })
  targetContext.stroke()
} // End drawPanelEditPolygonCutoutEdges

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

  if (pending.source === 'lineRegion' && !isCutout) {
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
    polygon: Array.isArray(pending.polygon) ? pending.polygon.map((point) => ({ ...point })) : null,
    operation: isCutout ? 'cutout' : 'none'
  }

  panelEditRect.value = {
    ...panelEditRect.value,
    hoverSnap: null,
    draft: null,
    pendingAction: null,
    rectangles: [
      ...panelEditRect.value.rectangles,
      rectangle
    ]
  }
  panelEditLine.value = {
    ...panelEditLine.value,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null
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
function getPanelEditLinePointFromPointer(context, layout, event) {
  const canvas = panelEditCanvasRef.value

  if (!canvas || !context || !layout) return null

  const rect = canvas.getBoundingClientRect()
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  const snap = getPanelEditTapeSnap(context, layout, screenX, screenY)
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
    axis,
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 }
  }
} // End normalizePanelEditLine

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

  const tolerance = 0.5
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
function getPanelEditPolygonBounds(points) {
  const xs = points.map((point) => Number(point.x || 0))
  const ys = points.map((point) => Number(point.y || 0))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
} // End getPanelEditPolygonBounds

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
function getPanelEditPointKey(point) {
  return `${Math.round(Number(point.x || 0) * 1000) / 1000},${Math.round(Number(point.y || 0) * 1000) / 1000}`
} // End getPanelEditPointKey

//=================
function getPanelEditPolygonSignedArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0

  let area = 0

  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length]

    area += Number(point.x || 0) * Number(nextPoint.y || 0) - Number(nextPoint.x || 0) * Number(point.y || 0)
  })

  return area / 2
} // End getPanelEditPolygonSignedArea

//=================
function getPanelEditSegmentParameter(segment, point) {
  const dx = Number(segment.end.x || 0) - Number(segment.start.x || 0)
  const dy = Number(segment.end.y || 0) - Number(segment.start.y || 0)
  const lengthSq = dx * dx + dy * dy

  if (lengthSq <= 0.000001) return 0

  return (((Number(point.x || 0) - Number(segment.start.x || 0)) * dx) + ((Number(point.y || 0) - Number(segment.start.y || 0)) * dy)) / lengthSq
} // End getPanelEditSegmentParameter

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
  return getPanelEditPlanarRegions(context)
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

  panelEditTape.value.guides.forEach((guide) => {
    drawPanelEditGuideLine(targetContext, context, layout, guide)
  })

  if (panelEditTape.value.draft) {
    drawPanelEditGuideLine(targetContext, context, layout, panelEditTape.value.draft, { draft: true })
  }

  drawPanelEditLineRegions(targetContext, context, layout)

  panelEditLine.value.lines.forEach((line) => {
    drawPanelEditLine(targetContext, context, layout, line, {
      hover: panelEditLine.value.hoverLine?.id === line.id,
      selected: panelEditLine.value.selectedLineId === line.id
    })
  })

  if (panelEditLine.value.draft) {
    drawPanelEditLine(targetContext, context, layout, panelEditLine.value.draft, { draft: true })
  }

  panelEditRect.value.rectangles.forEach((rectangle) => {
    drawPanelEditRectangle(targetContext, context, layout, rectangle)
  })

  if (panelEditRect.value.pendingAction) {
    drawPanelEditRectangle(targetContext, context, layout, panelEditRect.value.pendingAction, { draft: true })
  }

  if (panelEditRect.value.draft) {
    drawPanelEditRectangle(targetContext, context, layout, panelEditRect.value.draft, { draft: true })
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

  if (event.button === 1 || event.button === 2 || event.shiftKey) {
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
    const lineHit = getPanelEditLineHit(context, layout, event.clientX - rect.left, event.clientY - rect.top)

    if (lineHit) {
      panelEditLine.value = {
        ...panelEditLine.value,
        hoverLine: lineHit,
        hoverRegion: null,
        selectedLineId: lineHit.id
      }
      app.setStatus('Select: đã chọn line | Delete để xóa')
      resizePanelEditCanvas()
      return
    }

    const region = hitPanelEditLineRegion(context, layout, event)

    if (!region) {
      panelEditLine.value = {
        ...panelEditLine.value,
        hoverLine: null,
        hoverRegion: null,
        selectedLineId: null
      }
      resizePanelEditCanvas()
      return
    }

    panelEditLine.value = {
      ...panelEditLine.value,
      hoverLine: null,
      selectedLineId: null,
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
    const lineHit = getPanelEditLineHit(context, layout, event.clientX - rect.left, event.clientY - rect.top)

    panelEditLine.value = {
      ...panelEditLine.value,
      hoverLine: lineHit,
      hoverRegion: lineHit ? null : hitPanelEditLineRegion(context, layout, event)
    }
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
function onPanelEditPointerUp() {
  panelEditPanning = false
  panelEditPanStart = null
  panelEditPanOriginal = null
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


//=================
function clonePanelEditApplyPoint(point) {
  return {
    x: Number(point?.x || 0),
    y: Number(point?.y || 0)
  }
} // End clonePanelEditApplyPoint

//=================
function getPanelEditSavedRectanglesForApply() {
  return (panelEditRect.value.rectangles || []).map((rectangle) => ({
    id: rectangle.id,
    start: clonePanelEditApplyPoint(rectangle.start),
    end: clonePanelEditApplyPoint(rectangle.end),
    operation: rectangle.operation || 'none',
    source: rectangle.source || 'rectangle',
    regionKind: rectangle.regionKind || 'rect',
    polygon: Array.isArray(rectangle.polygon)
      ? rectangle.polygon.map((point) => clonePanelEditApplyPoint(point))
      : null
  }))
} // End getPanelEditSavedRectanglesForApply

//=================
function getPanelEditSavedLinesForApply() {
  return (panelEditLine.value.lines || []).map((line) => ({
    id: line.id,
    axis: line.axis || 'free',
    start: clonePanelEditApplyPoint(line.start),
    end: clonePanelEditApplyPoint(line.end)
  }))
} // End getPanelEditSavedLinesForApply

//=================
function getPanelEditSavedGuidesForApply() {
  return (panelEditTape.value.guides || []).map((guide) => ({
    id: guide.id,
    axis: guide.axis,
    edge: guide.edge || null,
    baseValue: Number(guide.baseValue || 0),
    value: Number(guide.value || 0)
  }))
} // End getPanelEditSavedGuidesForApply

//=================
function applyPanelEdit() {
  const context = activePanelEditContext.value

  if (!context) return

  const savedRectangles = getPanelEditSavedRectanglesForApply()
  const savedLines = getPanelEditSavedLinesForApply()
  const savedGuides = getPanelEditSavedGuidesForApply()

  drawing.applyPanelEditOperations({
    panelId: context.panelId,
    faceSide: context.faceSide,
    faceKey: context.faceKey,
    axisU: context.axisU,
    axisV: context.axisV,
    thicknessAxis: context.thicknessAxis,
    rectangles: savedRectangles,
    lines: savedLines,
    guides: savedGuides
  })

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
  drawing.clearPanelEdit()
  app.setTool('select')
  app.setStatus('Edit Panel: cập nhật thành công')
  draw()
} // End applyPanelEdit
//=================
function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max)
} // End clampValue

//=================
function getDistance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y

  return Math.sqrt(dx * dx + dy * dy)
} // End getDistance

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
function getScreenPointFromEvent(event) {
  const rect = canvasRef.value.getBoundingClientRect()

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
} // End getScreenPointFromEvent

//=================
function startSelectDrag(event) {
  if (app.state.currentTool !== 'select') return false
  if (event.button !== 0) return false
  if (event.shiftKey) return false

  const point = getScreenPointFromEvent(event)

  selectDrag.value = {
    active: false,
    start: point,
    current: point,
    moved: false,
    mode: 'contain'
  }

  return true
} // End startSelectDrag
//=================
function resetSelectDrag() {
  selectDrag.value = {
    active: false,
    start: null,
    current: null,
    moved: false,
    mode: 'contain'
  }

  draw()
} // End resetSelectDrag
//=================
function getSelectDragRect() {
  if (!selectDrag.value.start || !selectDrag.value.current) return null

  const start = selectDrag.value.start
  const current = selectDrag.value.current

  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
    mode: selectDrag.value.mode
  }
} // End getSelectDragRect
//=================
function localRectToScreenRect(rect) {
  if (!rect) return null

  const viewport = app.state.viewport
  const p1 = localToScreen(viewport, rect.x, rect.y)
  const p2 = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)

  return {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    width: Math.abs(p2.x - p1.x),
    height: Math.abs(p2.y - p1.y)
  }
} // End localRectToScreenRect
//=================
function getRectRight(rect) {
  return rect.x + rect.width
} // End getRectRight

//=================
function getRectBottom(rect) {
  return rect.y + rect.height
} // End getRectBottom

//=================
function rectContainsRect(outer, inner) {
  return (
    inner.x >= outer.x &&
    getRectRight(inner) <= getRectRight(outer) &&
    inner.y >= outer.y &&
    getRectBottom(inner) <= getRectBottom(outer)
  )
} // End rectContainsRect

//=================
function rectTouchesRect(a, b) {
  return !(
    getRectRight(a) < b.x ||
    getRectRight(b) < a.x ||
    getRectBottom(a) < b.y ||
    getRectBottom(b) < a.y
  )
} // End rectTouchesRect
//=================
function getPanelSelectRect(panel) {
  if (!panel) return null

  const view = app.getViewConfig(app.state.currentView)
  const axisU = String(view.axisA || 'X').toLowerCase()
  const axisV = String(view.axisB || 'Z').toLowerCase()

  const getAxisMin = (target, axis) => {
    if (axis === 'x') return Number(target.x || 0)
    if (axis === 'y') return Number((target.y3d ?? target.worldY ?? target.depthY ?? target.y) || 0)
    if (axis === 'z') return Number(target.z ?? target.y ?? 0)

    return 0
  }

  const getAxisSize = (target, axis) => {
    if (axis === 'x') return Number(target.xSize ?? target.width ?? 0)
    if (axis === 'y') return Number(target.ySize ?? target.depth ?? 0)
    if (axis === 'z') return Number(target.zSize ?? target.height ?? target.thickness ?? 0)

    return 0
  }

  const projectAxisValue = (value, size, reverse) => {
    if (reverse) return -(value + size)

    return value
  }

  const uMin = getAxisMin(panel, axisU)
  const vMin = getAxisMin(panel, axisV)
  const uSize = getAxisSize(panel, axisU)
  const vSize = getAxisSize(panel, axisV)

  if (uSize <= 0 || vSize <= 0) return null

  return localRectToScreenRect({
    x: projectAxisValue(uMin, uSize, view.reverseHorizontal),
    y: projectAxisValue(vMin, vSize, view.reverseVertical),
    width: uSize,
    height: vSize
  })
} // End getPanelSelectRect
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
    .filter((panel) => getPanelOwnerBoxId(panel) === boxId)
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
function getPanelLocalRect(panel) {
  if (!panel) return null

  const view = app.getViewConfig(app.state.currentView)
  const axisU = String(view.axisA || 'X').toLowerCase()
  const axisV = String(view.axisB || 'Z').toLowerCase()

  const getAxisMin = (target, axis) => {
    if (axis === 'x') return Number(target.x || 0)
    if (axis === 'y') return Number((target.y3d ?? target.worldY ?? target.depthY ?? target.y) || 0)
    if (axis === 'z') return Number(target.z ?? target.y ?? 0)

    return 0
  }

  const getAxisSize = (target, axis) => {
    if (axis === 'x') return Number(target.xSize ?? target.width ?? 0)
    if (axis === 'y') return Number(target.ySize ?? target.depth ?? 0)
    if (axis === 'z') return Number(target.zSize ?? target.height ?? target.thickness ?? 0)

    return 0
  }

  const projectAxisValue = (value, size, reverse) => {
    if (reverse) return -(value + size)

    return value
  }

  const uMin = getAxisMin(panel, axisU)
  const vMin = getAxisMin(panel, axisV)
  const uSize = getAxisSize(panel, axisU)
  const vSize = getAxisSize(panel, axisV)

  if (uSize <= 0 || vSize <= 0) return null

  return {
    x: projectAxisValue(uMin, uSize, view.reverseHorizontal),
    y: projectAxisValue(vMin, vSize, view.reverseVertical),
    width: uSize,
    height: vSize
  }
} // End getPanelLocalRect

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
function getSelectedIdsByDragRect(selectRect) {
  if (!selectRect) {
    return {
      panelIds: [],
      boxIds: [],
      dimensionIds: []
    }
  }

  const checkRect = selectRect.mode === 'touch'
    ? rectTouchesRect
    : rectContainsRect

  const panelHits = getVisiblePanels()
    .map((panel) => {
      const rect = getPanelSelectRect(panel)

      if (!rect || rect.width <= 0 || rect.height <= 0) return null
      if (!checkRect(selectRect, rect)) return null

      return {
        panel,
        rect,
        isBackPanel: panel.panelSide === 'back' || panel.cabinetInfoKind === 'back'
      }
    })
    .filter(Boolean)
  const hasNonBackPanelHit = panelHits.some((hit) => !hit.isBackPanel)
  const panelIds = panelHits
    .filter((hit) => !(hasNonBackPanelHit && hit.isBackPanel))
    .map((hit) => hit.panel.id)

  const dimensionIds = drawing.getRenderableDimensions(app.state.currentView)
    .filter((dimension) => {
      const rect = getDimensionSelectRect(dimension)

      if (!rect || rect.width <= 0 || rect.height <= 0) return false

      return checkRect(selectRect, rect)
    })
    .map((dimension) => dimension.id)

  return {
    panelIds,
    boxIds: [],
    dimensionIds
  }
} // End getSelectedIdsByDragRect
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
function openDimInput(dimHit) {
  const info = dimHit?.target === 'dimension'
    ? dimHit
    : typeof dimHit === 'string'
      ? getWallDimInputInfo(dimHit)
      : getBoxDimInputInfo(dimHit)
  if (!info) return
  dimInput.value = {
    active: true,
    target: info.target || 'wall',
    boxId: info.boxId || null,
    dimensionId: info.dimensionId || null,
    key: info.key,
    x: info.x,
    y: info.y,
    value: info.value
  }
  if (dimInput.value.target === 'dimension') {
    drawing.setDimensionValue(dimInput.value.dimensionId, numberValue)
    wall.clearEditingDim()
    box.clearEditingDim()
  } else if (dimInput.value.target === 'box') {
    box.selectBox(info.boxId)
    box.setEditingDim(info.key)
    wall.clearEditingDim()
    app.setStatus(`Nhập kích thước Box: ${info.key}`)
  } else {
    wall.setEditingDim(info.editKey)
    box.clearEditingDim()
    app.setStatus(`Nhập kích thước Wall: ${info.key}`)
  }
  app.clearCommand()
  nextTick(() => {
    const input = dimInputRef.value
    if (!input) return

    input.focus()
    input.select()

    if (typeof input.setSelectionRange === 'function') {
      input.setSelectionRange(0, String(dimInput.value.value).length)
    }
  })

  draw()
} // End openDimInput
//=================
function cancelDimInput() {
  dimInput.value.active = false
  wall.clearEditingDim()
  box.clearEditingDim()
  draw()
} // End cancelDimInput
//=================
function openBoxHeightInput(event) {
  const rect = canvasRef.value.getBoundingClientRect()

  boxHeightInput.value.active = true
  boxHeightInput.value.x = event.clientX - rect.left + 12
  boxHeightInput.value.y = event.clientY - rect.top + 12
  boxHeightInput.value.value = String(wall.state.height || 600)

  nextTick(() => {
    boxHeightInputRef.value?.focus()
    boxHeightInputRef.value?.select()
  })
} // End openBoxHeightInput
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

  if (typeof drawing.clearPanelInputBuffer === 'function') {
    drawing.clearPanelInputBuffer()
  }

  app.setTool('select')
  app.setStatus('Select')

  draw()
} // End exitToSelect

//=================
function cancelBoxHeightInput() {
  if (!boxHeightInput.value.active) {
    return
  }

  exitToSelect()
} // End cancelBoxHeightInput

//=================
function commitBoxHeightInput() {
  const height = Number(boxHeightInput.value.value)

  if (!Number.isFinite(height) || height <= 0) {
    cancelBoxHeightInput()
    return
  }

  const newBox = box.commitDraft(height)

  boxHeightInput.value.active = false
  boxHeightInput.value.value = ''

  if (newBox) {
    drawing.rebuildZones()
    app.setStatus(`Đã tạo ${newBox.name}`)
  } else {
    app.setStatus('Box quá nhỏ, chưa tạo')
  }

  draw()
} // End commitBoxHeightInput
// End commitBoxHeightInput

//=================
function onBoxHeightInputKeyDown(event) {
  const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space'

  if (isSpace) {
    event.preventDefault()
    event.stopPropagation()
    exitToSelect()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    commitBoxHeightInput()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    exitToSelect()
  }
} // End onBoxHeightInputKeyDown
//=================
function commitDimInput() {
  const rawValue = String(dimInput.value.value || '').trim()
  const numberValue = Number(rawValue)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    cancelDimInput()
    return
  }

  if (dimInput.value.target === 'wall') {
    wall.setSize(dimInput.value.key, numberValue)
    drawing.rebuildZones()
  }

  if (dimInput.value.target === 'dimension') {
    wall.clearEditingDim()
    box.clearEditingDim()
  } else if (dimInput.value.target === 'box') {
    box.setBoxSize(
      dimInput.value.boxId,
      dimInput.value.key,
      numberValue,
      getWallBox3D()
    )

    drawing.rebuildZones()
  }

  cancelDimInput()
  draw()
} // End commitDimInput
//=================
function onDimInputKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    commitDimInput()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    cancelDimInput()
  }
} // End onDimInputKeyDown
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
  startSelectDrag(event)
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

  const boxFillHit = app.state.currentTool === 'select' ? hitTestBoxFill(rawLocal) : null

  if (app.state.currentTool === 'select' && boxFillHit) {
    selectBoxWithPanels(boxFillHit.id, event.shiftKey)

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

    if (event?.shiftKey) {
      drawing.selectPanels([
        ...new Set([
          ...(Array.isArray(drawing.state.selectedPanelIds) ? drawing.state.selectedPanelIds : []),
          ...selectedIds.panelIds
        ])
      ])

      drawing.selectDimensions([
        ...new Set([
          ...(Array.isArray(drawing.state.selectedDimensionIds) ? drawing.state.selectedDimensionIds : []),
          ...selectedIds.dimensionIds
        ])
      ])
    } else {
      drawing.selectPanels(selectedIds.panelIds)
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
function deleteSelectedPanelEditLine() {
  const selectedLineId = panelEditLine.value.selectedLineId

  if (!activePanelEditContext.value || !selectedLineId) return false

  const nextLines = panelEditLine.value.lines.filter((line) => line.id !== selectedLineId)

  if (nextLines.length === panelEditLine.value.lines.length) return false

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
  app.setStatus('Select: đã xóa line')
  resizePanelEditCanvas()

  return true
} // End deleteSelectedPanelEditLine

//=================
function deleteCurrentSelection() {
  const hasPanels = Array.isArray(drawing.state.selectedPanelIds) && drawing.state.selectedPanelIds.length > 0
  const hasBoxes = Array.isArray(box.state.selectedBoxIds) && box.state.selectedBoxIds.length > 0
  const hasDimensions = Array.isArray(drawing.state.selectedDimensionIds) && drawing.state.selectedDimensionIds.length > 0

  if (!hasPanels && !hasBoxes && !hasDimensions) return false

  drawing.pushHistorySnapshot('Xóa selection')
  drawing.deleteSelectedPanels()
  drawing.deleteSelectedDimensions()
  box.deleteSelectedBoxes()
  drawing.rebuildZones()
  draw()

  return true
} // End deleteCurrentSelection
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

  if (activePanelEditContext.value && event.key === 'Delete') {
    event.preventDefault()
    event.stopPropagation()
    deleteSelectedPanelEditLine()
    return
  }

  if (handlePanelEditHistoryKey(event)) return

  if (handlePanelEditTapeKey(event)) return

  if (handlePanelEditRectKey(event)) return

  if (handlePanelEditLineKey(event)) return

  if (activePanelEditContext.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  if (event.key === 'Delete') {
    if (deleteCurrentSelection()) {
      event.preventDefault()
      event.stopPropagation()
    }

    return
  }

  if (isSpace) {
    event.preventDefault()
    event.stopPropagation()
    exitToSelect()
    return
  }

  if (dimInput.value.active || boxHeightInput.value.active) {
    return
  }

  if (event.ctrlKey && !event.shiftKey && (key === 'z' || key === 'Z')) {
    event.preventDefault()
    event.stopPropagation()
    drawing.undo()
    draw()
    return
  }

  if (event.ctrlKey && !event.shiftKey && (key === 'y' || key === 'Y')) {
    event.preventDefault()
    event.stopPropagation()
    drawing.redo()
    draw()
    return
  }

  if (app.state.currentTool === 'move' && event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    event.stopPropagation()
    moveCopyMode.value = !moveCopyMode.value
    app.setStatus(moveCopyMode.value ? 'Move Copy: ON' : 'Move Copy: OFF')
    draw()
    return
  }

  if (key === 'Escape') {
    exitToSelect()
    return
  }

  handleViewportKey(event, { app, drawing, box, wall, draw })
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
  if (tool !== 'editPanelTape') {
    resetPanelEditTapeDraft()
  }

  if (tool !== 'editPanelRect') {
    resetPanelEditRectDraft()
  }

  if (tool !== 'editPanelLine') {
    resetPanelEditLineDraft()
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
<style scoped>

.mn-cursor-move {
  cursor: none;
}

.mn-cursor-dimensions {
  cursor: url("data:image/svg+xml,%3Csvg width='34' height='34' viewBox='0 0 34 34' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 2 L3 23 L8 18 L12 29 L16 27 L12 16 L20 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cline x1='17' y1='24' x2='31' y2='24' stroke='%230077CC' stroke-width='2'/%3E%3Cline x1='17' y1='20' x2='17' y2='28' stroke='%230077CC' stroke-width='2'/%3E%3Cline x1='31' y1='20' x2='31' y2='28' stroke='%230077CC' stroke-width='2'/%3E%3Ctext x='24' y='19' font-size='8' text-anchor='middle' fill='%230077CC'%3EDIM%3C/text%3E%3C/svg%3E") 3 2, crosshair;
}
.mn-cursor-box {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Crect x='13' y='21' width='14' height='8' rx='1.5' fill='%23dbefff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-select {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 23 L9 18 L13 29 L17 27 L13 16 L21 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='23' cy='24' r='4' fill='%23ffffff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, default;
}

.mn-cursor-crosshair {
  cursor: crosshair;
}

.mn-cursor-default {
  cursor: default;
}
.mn-cursor-pointer {
  cursor: pointer;
}
.mn-dim-input {
  position: absolute;
  width: 72px;
  height: 26px;
  transform: translate(-50%, -50%);
  z-index: 20;
  border: 1px solid #1a73e8;
  border-radius: 3px;
  background: #ffffff;
  color: #111111;
  font-size: 13px;
  text-align: center;
  outline: none;
  box-shadow: none;
}

.mn-panel-edit-window {
  position: absolute;
  inset: 18px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mn-border-main);
  border-radius: 8px;
  background: var(--mn-bg-panel);
  box-shadow: 0 12px 36px rgba(0, 0, 0, .32);
  overflow: hidden;
}

.mn-panel-edit-header {
  height: 42px;
  display: grid;
  grid-template-columns: auto auto 1fr 92px;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--mn-border-main);
  background: var(--mn-bg-top);
}

.mn-panel-edit-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.mn-panel-edit-tool-btn {
  width: 32px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--mn-border-main);
  border-radius: 5px;
  background: var(--mn-bg-panel-soft);
  color: var(--mn-text-main);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.mn-panel-edit-tool-btn:hover,
.mn-panel-edit-tool-btn.active {
  border-color: var(--mn-accent);
  color: var(--mn-accent);
}

.mn-panel-edit-tool-icon {
  width: 15px;
  height: 15px;
  object-fit: contain;
  pointer-events: none;
}

.mn-panel-edit-face-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mn-panel-edit-face-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--mn-border-main);
  border-radius: 5px;
  background: var(--mn-bg-panel-soft);
  color: var(--mn-text-main);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.mn-panel-edit-face-btn:hover,
.mn-panel-edit-face-btn.active {
  border-color: var(--mn-accent);
  color: var(--mn-accent);
}

.mn-panel-edit-title {
  min-width: 0;
  overflow: hidden;
  color: var(--mn-text-sub);
  font-size: 11px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mn-panel-edit-apply {
  height: 28px;
  border: 1px solid var(--mn-accent);
  border-radius: 5px;
  background: var(--mn-accent);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mn-panel-edit-canvas {
  width: 100%;
  height: calc(100% - 72px);
  display: block;
  background: var(--mn-bg-canvas);
  touch-action: none;
  cursor: crosshair;
}

.mn-cursor-panel-tape {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 23 L9 18 L13 29 L17 27 L13 16 L21 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cg transform='translate(15 21) rotate(-18)'%3E%3Crect x='0' y='0' width='15' height='5' rx='1' fill='%23fff7c2' stroke='%23111111' stroke-width='1'/%3E%3Cpath d='M3 0 L3 3 M6 0 L6 2 M9 0 L9 3 M12 0 L12 2' stroke='%23111111' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-panel-rect {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Crect x='13' y='21' width='14' height='8' rx='1.5' fill='%23dbefff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-panel-line {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cline x1='14' y1='27' x2='28' y2='20' stroke='%230077CC' stroke-width='2.4' stroke-linecap='round'/%3E%3Ccircle cx='14' cy='27' r='2' fill='%23ffffff' stroke='%230077CC' stroke-width='1.4'/%3E%3Ccircle cx='28' cy='20' r='2' fill='%23ffffff' stroke='%230077CC' stroke-width='1.4'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-panel-edit-action-dialog {
  position: absolute;
  left: 50%;
  top: 58px;
  z-index: 30;
  width: 150px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--mn-border-main);
  border-radius: 7px;
  background: var(--mn-bg-panel);
  box-shadow: 0 10px 24px rgba(0, 0, 0, .24);
}

.mn-panel-edit-action-btn {
  height: 32px;
  border: 0;
  border-bottom: 1px solid var(--mn-border-main);
  background: var(--mn-bg-panel);
  color: var(--mn-text-main);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mn-panel-edit-action-btn:last-child {
  border-bottom: 0;
}

.mn-panel-edit-action-btn:hover {
  background: var(--mn-bg-panel-soft);
}

.mn-panel-edit-action-btn.danger {
  color: #d90000;
}

.mn-panel-edit-footer {
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-top: 1px solid var(--mn-border-main);
  background: var(--mn-bg-top);
  color: var(--mn-text-main);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mn-panel-edit-canvas.mn-cursor-select {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 23 L9 18 L13 29 L17 27 L13 16 L21 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='23' cy='24' r='4' fill='%23ffffff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, default;
}

</style>