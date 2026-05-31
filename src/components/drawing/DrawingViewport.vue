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
        <div class="mn-panel-edit-title">
          {{ activePanelEditContext.panelName }} · {{ activePanelEditContext.axesText }} · 0,0 trái dưới
        </div>
        <button type="button" class="mn-panel-edit-apply" @click.stop.prevent="applyPanelEdit">Áp dụng</button>
      </header>
      <canvas ref="panelEditCanvasRef" class="mn-panel-edit-canvas" />
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
import { isEditPanelDrawTool, isEditPanelTool } from '../../core/tools/editPanelTool'

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
  { id: 'editPanelLine', label: 'Line', icon: '/icons/toolbar/line.svg' },
  { id: 'editPanelRect', label: 'Rectangle', icon: '/icons/toolbar/rect.svg' },
  { id: 'editPanelArc', label: 'Arc', icon: '/icons/toolbar/arc.svg' },
  { id: 'editPanelCircle', label: 'Circle', icon: '/icons/toolbar/circle.svg' },
  { id: 'editPanelTape', label: 'Tape Measure', icon: '/icons/toolbar/tape.svg' }
]
const zoomLabel = computed(() => `${Math.round(app.state.viewport.zoom * 100)}%`)
const localX = computed(() => Math.round(app.state.mouse.localX))
const localY = computed(() => Math.round(app.state.mouse.localY))
const activePanelEditContext = computed(() => drawing.state.panelEdit?.active ? drawing.state.panelEdit.context : null)

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
  const originColor = '#ff0000'
  const extensionColor = getCssVariable('--mn-border-main', '#d7dbe0')
  const marginLeft = 92
  const marginRight = 56
  const marginTop = 64
  const marginBottom = 76
  const dimOffset = 24
  const tickSize = 7
  const availableWidth = Math.max(1, canvasWidth - marginLeft - marginRight)
  const availableHeight = Math.max(1, canvasHeight - marginTop - marginBottom)
  const scale = Math.min(
    availableWidth / Math.max(1, context.width),
    availableHeight / Math.max(1, context.height)
  )
  const faceWidth = context.width * scale
  const faceHeight = context.height * scale
  const offsetX = marginLeft + (availableWidth - faceWidth) / 2
  const offsetY = marginTop + (availableHeight - faceHeight) / 2
  const left = offsetX
  const right = offsetX + faceWidth
  const top = offsetY
  const bottom = offsetY + faceHeight
  const dimTopY = top - dimOffset
  const dimLeftX = left - dimOffset
  const originX = left - 34
  const originY = bottom + 22

  targetContext.clearRect(0, 0, canvasWidth, canvasHeight)
  targetContext.fillStyle = backgroundColor
  targetContext.fillRect(0, 0, canvasWidth, canvasHeight)

  targetContext.save()
  targetContext.fillStyle = panelColor
  targetContext.globalAlpha = 0.8
  targetContext.fillRect(left, top, faceWidth, faceHeight)
  targetContext.restore()

  targetContext.strokeStyle = borderColor
  targetContext.lineWidth = 2
  targetContext.strokeRect(left, top, faceWidth, faceHeight)

  targetContext.strokeStyle = extensionColor
  targetContext.lineWidth = 1
  targetContext.setLineDash([4, 4])
  targetContext.beginPath()
  targetContext.moveTo(left, bottom)
  targetContext.lineTo(originX, originY)
  targetContext.stroke()
  targetContext.setLineDash([])

  targetContext.fillStyle = originColor
  targetContext.font = '12px Arial, Helvetica, sans-serif'
  targetContext.textAlign = 'left'
  targetContext.textBaseline = 'middle'
  targetContext.fillText('0,0', originX, originY)

  targetContext.strokeStyle = dimColor
  targetContext.fillStyle = dimColor
  targetContext.lineWidth = 1.5
  targetContext.font = '12px Arial, Helvetica, sans-serif'

  targetContext.beginPath()
  targetContext.moveTo(left, dimTopY)
  targetContext.lineTo(right, dimTopY)
  targetContext.moveTo(left, dimTopY - tickSize)
  targetContext.lineTo(left, dimTopY + tickSize)
  targetContext.moveTo(right, dimTopY - tickSize)
  targetContext.lineTo(right, dimTopY + tickSize)
  targetContext.stroke()
  targetContext.textAlign = 'center'
  targetContext.textBaseline = 'bottom'
  targetContext.fillText(`${Math.round(context.width)} mm`, left + faceWidth / 2, dimTopY - 8)

  targetContext.beginPath()
  targetContext.moveTo(dimLeftX, top)
  targetContext.lineTo(dimLeftX, bottom)
  targetContext.moveTo(dimLeftX - tickSize, top)
  targetContext.lineTo(dimLeftX + tickSize, top)
  targetContext.moveTo(dimLeftX - tickSize, bottom)
  targetContext.lineTo(dimLeftX + tickSize, bottom)
  targetContext.stroke()
  targetContext.save()
  targetContext.translate(dimLeftX - 12, top + faceHeight / 2)
  targetContext.rotate(-Math.PI / 2)
  targetContext.textAlign = 'center'
  targetContext.textBaseline = 'bottom'
  targetContext.fillText(`${Math.round(context.height)} mm`, 0, 0)
  targetContext.restore()

  targetContext.textAlign = 'center'
  targetContext.textBaseline = 'top'
  targetContext.fillText(`${Math.round(context.width)} x ${Math.round(context.height)} mm`, left + faceWidth / 2, bottom + 12)
} // End drawPanelEditCanvas

//=================
function selectPanelEditWindowTool(toolId) {
  const context = drawing.setPanelEditShapeTool(toolId)

  if (!context) {
    app.setStatus('Edit Panel: chọn 1 tấm trước')
    return
  }

  app.setTool(toolId)
  app.setView(context.viewKey)
  app.setStatus(`${toolId.replace('editPanel', '')}: ${context.panelName} | ${context.axesText}`)
  nextTick(resizePanelEditCanvas)
} // End selectPanelEditWindowTool

//=================
function applyPanelEdit() {
  const context = activePanelEditContext.value

  if (!context) return

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

  const panelIds = getVisiblePanels()
    .filter((panel) => {
      const rect = getPanelSelectRect(panel)

      if (!rect || rect.width <= 0 || rect.height <= 0) return false

      return checkRect(selectRect, rect)
    })
    .map((panel) => panel.id)

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

  const panelHit = hitTestPanel(getVisiblePanels(), local)

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

    app.setView(context.viewKey)
    app.setStatus(`Edit Panel: ${context.panelName} | ${context.axesText} | gốc 0,0 trái dưới`)
    draw()
    return
  }
  const panelHit = hitTestPanel(getVisiblePanels(), rawLocal)

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
    if (event.key === 'Delete') {
    if (deleteCurrentSelection()) {
      event.preventDefault()
      event.stopPropagation()
    }

    return
  }
  const key = event.key
  const isSpace = key === ' ' || key === 'Spacebar' || event.code === 'Space'

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

  if (!event.ctrlKey && key === 'H' && event.shiftKey) {
    event.preventDefault()
    event.stopPropagation()
    drawing.unhideAll()
    draw()
    return
  }

  if (!event.ctrlKey && !event.shiftKey && (key === 'h' || key === 'H')) {
    event.preventDefault()
    event.stopPropagation()
    drawing.hideSelected()
    draw()
    return
  }

  if (key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    exitToSelect()
    return
  }

  if (app.state.currentTool === 'move' && (key === 'Control' || event.code === 'ControlLeft' || event.code === 'ControlRight')) {
    event.preventDefault()
    event.stopPropagation()

    if (event.repeat) return

    moveCopyMode.value = !moveCopyMode.value
    app.setStatus(moveCopyMode.value ? 'Move: Copy đang bật' : 'Move: Copy đã tắt')
    draw()
    return
  }

  if (app.state.currentTool === 'panel') {
    if (app.state.currentView !== 'front') {
      return
    }

    if (/^[0-9]$/.test(key)) {
      event.preventDefault()
      drawing.appendPanelInput(key)
      app.setStatus(`Vẽ Tấm: ${drawing.state.panelInputBuffer}`)
      draw()
      return
    }

    if (key === '/') {
      event.preventDefault()
      drawing.appendPanelInput(key)
      app.setStatus(`Vẽ Tấm: ${drawing.state.panelInputBuffer}`)
      draw()
      return
    }

    if (key === 'Backspace') {
      event.preventDefault()
      drawing.backspacePanelInput()
      app.setStatus(drawing.state.panelInputBuffer ? `Vẽ Tấm: ${drawing.state.panelInputBuffer}` : 'Vẽ Tấm')
      draw()
      return
    }

    if (key === 'Enter') {
      event.preventDefault()
      drawing.addPanelFromHover()
      draw()
      return
    }
  }

  if (key === 'd' || key === 'D') {
    event.preventDefault()
    app.setTool('dimensions')
    drawing.resetDimensionTool()
    refreshDimensionSnapFromMouse()
    app.setStatus('Dimensions: chọn điểm đầu')
    draw()
    return
  }

  if (key === 'm' || key === 'M') {
    event.preventDefault()
    moveCopyMode.value = false
    app.setTool('move')
    drawing.resetMoveTool()
    app.setStatus('Move: chọn điểm snap của tấm hoặc Box')
    draw()
    return
  }

  handleViewportKey(event)
  draw()
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
  drawing.state.panelEdit?.context?.width,
  drawing.state.panelEdit?.context?.height
], () => {
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
  cursor: default;
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
  grid-template-columns: 1fr auto 92px;
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

.mn-panel-edit-title {
  max-width: 360px;
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
  height: calc(100% - 42px);
  display: block;
  background: var(--mn-bg-canvas);
}

</style>