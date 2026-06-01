import { localToScreen, getLocalScale } from './viewport-transform'
import { projectBoxToCameraRect, getCameraConfig } from '../core/view/view-camera'

//=================
function getCanvasBackgroundColor() {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--mn-bg-canvas').trim()
    return value || '#f4f4f4'
  } catch (error) {
    return '#f4f4f4'
  }
} // End getCanvasBackgroundColor


//=================
function hexToRgba(hex, opacity = 1) {
  const text = String(hex || '').trim()
  const match = /^#?([0-9a-fA-F]{6})$/.exec(text)

  if (!match) return `rgba(135, 206, 255, ${opacity})`

  const value = match[1]
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`
} // End hexToRgba

//=================
function getCssVariable(name, fallback) {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()

    return value || fallback
  } catch (error) {
    return fallback
  }
} // End getCssVariable

//=================
function getRuntimePanelFill(panel) {
  const isBackPanel = panel?.panelSide === 'back' || panel?.cabinetInfoKind === 'back'
  const color = isBackPanel
    ? getCssVariable('--mn-back-panel-color', '#87ceff')
    : getCssVariable('--mn-panel-color', '#87ceff')
  const opacity = Number(isBackPanel
    ? getCssVariable('--mn-back-panel-opacity', '0.8')
    : getCssVariable('--mn-panel-opacity', '0.8'))

  return hexToRgba(color, Number.isFinite(opacity) ? opacity : 0.8)
} // End getRuntimePanelFill

//=================
function getRuntimePanelStroke(selected) {
  if (selected) return '#ff9f1a'

  return getCssVariable('--mn-panel-selected-line-color', '#3a8fbd')
} // End getRuntimePanelStroke

//=================
function drawLine(ctx, a, b, color = '#999', width = 1) {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
} // End drawLine

//=================
function drawRectLocal(ctx, viewport, rect, options = {}) {
  if (!rect) return
  const p1 = localToScreen(viewport, rect.x, rect.y)
  const p2 = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)
  const x = Math.min(p1.x, p2.x)
  const y = Math.min(p1.y, p2.y)
  const w = Math.abs(p2.x - p1.x)
  const h = Math.abs(p2.y - p1.y)
  if (options.fill) {
    ctx.fillStyle = options.fill
    ctx.fillRect(x, y, w, h)
  }
  if (options.stroke) {
    ctx.strokeStyle = options.stroke
    ctx.lineWidth = options.lineWidth || 1
    ctx.strokeRect(x, y, w, h)
  }
} // End drawRectLocal

//=================
function getPanelEditCutoutFaceAxes(faceKey) {
  if (faceKey === 'xy') return { axisU: 'x', axisV: 'y' }
  if (faceKey === 'yz') return { axisU: 'y', axisV: 'z' }
  if (faceKey === 'xz') return { axisU: 'x', axisV: 'z' }

  return null
} // End getPanelEditCutoutFaceAxes

//=================
function getPanelEditCutoutBounds(cutout) {
  const x1 = Number(cutout?.start?.x || 0)
  const y1 = Number(cutout?.start?.y || 0)
  const x2 = Number(cutout?.end?.x ?? x1)
  const y2 = Number(cutout?.end?.y ?? y1)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)

  if (width <= 0 || height <= 0) return null

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width,
    height
  }
} // End getPanelEditCutoutBounds

//=================
function getPanelEditCutoutLocalRect(panel, cutout, panelRect, currentView) {
  if (!panel || !cutout || !panelRect) return null

  const camera = getCameraConfig(currentView)
  const axes = getPanelEditCutoutFaceAxes(cutout.faceKey)
  const bounds = getPanelEditCutoutBounds(cutout)

  if (!camera || !axes || !bounds) return null
  if (camera.axisU !== axes.axisU || camera.axisV !== axes.axisV) return null

  const uSize = getPanelAxisSize(panel, camera.axisU)
  const vSize = getPanelAxisSize(panel, camera.axisV)
  const x = camera.reverseU
    ? panelRect.x + uSize - bounds.x - bounds.width
    : panelRect.x + bounds.x
  const y = camera.reverseV
    ? panelRect.y + vSize - bounds.y - bounds.height
    : panelRect.y + bounds.y

  return {
    x,
    y,
    width: bounds.width,
    height: bounds.height
  }
} // End getPanelEditCutoutLocalRect

//=================
function getPanelEditCutoutLocalPolygon(panel, cutout, panelRect, currentView) {
  if (!panel || !cutout || !panelRect || !Array.isArray(cutout.polygon)) return null

  const camera = getCameraConfig(currentView)
  const axes = getPanelEditCutoutFaceAxes(cutout.faceKey)

  if (!camera || !axes) return null
  if (camera.axisU !== axes.axisU || camera.axisV !== axes.axisV) return null

  const uSize = getPanelAxisSize(panel, camera.axisU)
  const vSize = getPanelAxisSize(panel, camera.axisV)

  return cutout.polygon.map((point) => ({
    x: camera.reverseU ? panelRect.x + uSize - Number(point.x || 0) : panelRect.x + Number(point.x || 0),
    y: camera.reverseV ? panelRect.y + vSize - Number(point.y || 0) : panelRect.y + Number(point.y || 0)
  }))
} // End getPanelEditCutoutLocalPolygon

//=================
function getLocalRectPolygon(rect) {
  if (!rect) return []

  const left = Number(rect.x || 0)
  const bottom = Number(rect.y || 0)
  const right = left + Number(rect.width || 0)
  const top = bottom + Number(rect.height || 0)

  return [
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: right, y: top },
    { x: left, y: top }
  ]
} // End getLocalRectPolygon

//=================
function getPanelEditCutoutLocalPolygons(panel, panelRect, currentView) {
  const cutouts = Array.isArray(panel?.editPanelCutouts) ? panel.editPanelCutouts : []

  return cutouts
    .map((cutout) => {
      if (cutout.regionKind === 'polygon' && Array.isArray(cutout.polygon)) {
        return getPanelEditCutoutLocalPolygon(panel, cutout, panelRect, currentView)
      }

      const rect = getPanelEditCutoutLocalRect(panel, cutout, panelRect, currentView)

      return rect ? getLocalRectPolygon(rect) : null
    })
    .filter((polygon) => Array.isArray(polygon) && polygon.length >= 3)
} // End getPanelEditCutoutLocalPolygons

//=================
function clearPanelLayerCutouts(ctx, viewport, cutoutPolygons, panelRect) {
  if (!Array.isArray(cutoutPolygons) || !cutoutPolygons.length) return

  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  cutoutPolygons.forEach((polygon) => {
    drawPolygonLocal(ctx, viewport, polygon, { fill: '#000000' })
    eraseLocalPolygonBoundarySpans(ctx, viewport, polygon, panelRect, '#000000')
  })
  ctx.restore()
} // End clearPanelLayerCutouts

//=================
function getLayerCanvasSize(ctx, width, height) {
  const ratio = Number(ctx.getTransform?.().a || 1)

  return {
    ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : 1,
    width: Math.max(1, Number(width || ctx.canvas?.clientWidth || ctx.canvas?.width || 1)),
    height: Math.max(1, Number(height || ctx.canvas?.clientHeight || ctx.canvas?.height || 1))
  }
} // End getLayerCanvasSize

//=================
function createPanelLayerContext(ctx, width, height) {
  const size = getLayerCanvasSize(ctx, width, height)
  const canvas = document.createElement('canvas')

  canvas.width = Math.max(1, Math.ceil(size.width * size.ratio))
  canvas.height = Math.max(1, Math.ceil(size.height * size.ratio))

  const layerContext = canvas.getContext('2d')
  layerContext.setTransform(size.ratio, 0, 0, size.ratio, 0, 0)

  return { canvas, context: layerContext, width: size.width, height: size.height }
} // End createPanelLayerContext

//=================
function drawPanelLayerWithCutouts(ctx, viewport, panel, rect, selected, currentView, width, height) {
  const cutoutPolygons = getPanelEditCutoutLocalPolygons(panel, rect, currentView)

  if (!cutoutPolygons.length) return false

  const layer = createPanelLayerContext(ctx, width, height)

  drawRectLocal(layer.context, viewport, rect, {
    fill: getRuntimePanelFill(panel),
    stroke: getRuntimePanelStroke(selected),
    lineWidth: selected ? 3 : 2
  })

  drawPanelEditSavedLines(layer.context, viewport, panel, rect, currentView)
  clearPanelLayerCutouts(layer.context, viewport, cutoutPolygons, rect)
  drawPanelEditCutouts(layer.context, viewport, panel, rect, currentView)

  ctx.drawImage(layer.canvas, 0, 0, layer.width, layer.height)

  return true
} // End drawPanelLayerWithCutouts

//=================
function getPanelEditLocalPoint(panel, point, faceKey, panelRect, currentView) {
  if (!panel || !point || !panelRect) return null

  const camera = getCameraConfig(currentView)
  const axes = getPanelEditCutoutFaceAxes(faceKey)

  if (!camera || !axes) return null
  if (camera.axisU !== axes.axisU || camera.axisV !== axes.axisV) return null

  const uSize = getPanelAxisSize(panel, camera.axisU)
  const vSize = getPanelAxisSize(panel, camera.axisV)

  return {
    x: camera.reverseU ? panelRect.x + uSize - Number(point.x || 0) : panelRect.x + Number(point.x || 0),
    y: camera.reverseV ? panelRect.y + vSize - Number(point.y || 0) : panelRect.y + Number(point.y || 0)
  }
} // End getPanelEditLocalPoint

//=================
function getPanelEditFaceSideForView(currentView) {
  if (currentView === 'left') return 'left'
  if (currentView === 'right') return 'right'
  if (currentView === 'top') return 'top'
  if (currentView === 'bottom') return 'bottom'
  if (currentView === 'front') return 'front'
  if (currentView === 'back') return 'back'

  return null
} // End getPanelEditFaceSideForView

//=================
function drawLineLocal(ctx, viewport, pointA, pointB, options = {}) {
  if (!pointA || !pointB) return

  const a = localToScreen(viewport, pointA.x, pointA.y)
  const b = localToScreen(viewport, pointB.x, pointB.y)

  ctx.save()
  ctx.strokeStyle = options.stroke || '#111111'
  ctx.lineWidth = options.lineWidth || 1.5
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
  ctx.restore()
} // End drawLineLocal

//=================
function drawPanelEditSavedLines(ctx, viewport, panel, panelRect, currentView) {
  const data = panel?.editPanelData || {}
  const targetFaceSide = getPanelEditFaceSideForView(currentView)

  Object.values(data).forEach((faceData) => {
    if (!faceData || faceData.faceSide !== targetFaceSide) return

    const lines = Array.isArray(faceData.lines) ? faceData.lines : []

    lines.forEach((line) => {
      const start = getPanelEditLocalPoint(panel, line.start, faceData.faceKey, panelRect, currentView)
      const end = getPanelEditLocalPoint(panel, line.end, faceData.faceKey, panelRect, currentView)

      drawLineLocal(ctx, viewport, start, end, {
        stroke: '#111111',
        lineWidth: 1.5
      })
    })
  })
} // End drawPanelEditSavedLines

//=================
function drawPolygonLocal(ctx, viewport, polygon, options = {}) {
  if (!Array.isArray(polygon) || polygon.length < 3) return

  ctx.beginPath()
  polygon.forEach((point, index) => {
    const screen = localToScreen(viewport, point.x, point.y)

    if (index === 0) {
      ctx.moveTo(screen.x, screen.y)
      return
    }

    ctx.lineTo(screen.x, screen.y)
  })
  ctx.closePath()

  if (options.fill) {
    ctx.fillStyle = options.fill
    ctx.fill()
  }

  if (options.stroke) {
    ctx.strokeStyle = options.stroke
    ctx.lineWidth = options.lineWidth || 1
    ctx.stroke()
  }
} // End drawPolygonLocal


//=================
function isLocalPointOnPanelRectEdge(point, panelRect) {
  if (!point || !panelRect) return null

  const tolerance = 0.5
  const x = Number(point.x || 0)
  const y = Number(point.y || 0)
  const left = Number(panelRect.x || 0)
  const right = left + Number(panelRect.width || 0)
  const bottom = Number(panelRect.y || 0)
  const top = bottom + Number(panelRect.height || 0)

  if (Math.abs(x - left) <= tolerance) return 'left'
  if (Math.abs(x - right) <= tolerance) return 'right'
  if (Math.abs(y - bottom) <= tolerance) return 'bottom'
  if (Math.abs(y - top) <= tolerance) return 'top'

  return null
} // End isLocalPointOnPanelRectEdge

//=================
function isLocalBoundarySegment(pointA, pointB, panelRect) {
  const edgeA = isLocalPointOnPanelRectEdge(pointA, panelRect)
  const edgeB = isLocalPointOnPanelRectEdge(pointB, panelRect)

  return edgeA && edgeA === edgeB
} // End isLocalBoundarySegment

//=================
function isLocalCutoutBoundaryOnlySegment(pointA, pointB, panelRect) {
  return isLocalSegmentOnPanelBoundaryLine(pointA, pointB, panelRect)
} // End isLocalCutoutBoundaryOnlySegment

//=================
function isLocalSegmentOnPanelBoundaryLine(pointA, pointB, panelRect) {
  if (!pointA || !pointB || !panelRect) return false

  const tolerance = 0.75
  const x1 = Number(pointA.x || 0)
  const y1 = Number(pointA.y || 0)
  const x2 = Number(pointB.x || 0)
  const y2 = Number(pointB.y || 0)
  const left = Number(panelRect.x || 0)
  const right = left + Number(panelRect.width || 0)
  const bottom = Number(panelRect.y || 0)
  const top = bottom + Number(panelRect.height || 0)

  if (Math.abs(x1 - left) <= tolerance && Math.abs(x2 - left) <= tolerance) return true
  if (Math.abs(x1 - right) <= tolerance && Math.abs(x2 - right) <= tolerance) return true
  if (Math.abs(y1 - bottom) <= tolerance && Math.abs(y2 - bottom) <= tolerance) return true
  if (Math.abs(y1 - top) <= tolerance && Math.abs(y2 - top) <= tolerance) return true

  return false
} // End isLocalSegmentOnPanelBoundaryLine

//=================
function getLocalBoundaryCornerBetweenEdges(edgeA, edgeB, panelRect) {
  if (!edgeA || !edgeB || edgeA === edgeB || !panelRect) return null

  const left = Number(panelRect.x || 0)
  const right = left + Number(panelRect.width || 0)
  const bottom = Number(panelRect.y || 0)
  const top = bottom + Number(panelRect.height || 0)
  const key = [edgeA, edgeB].sort().join('-')

  if (key === 'left-top') return { x: left, y: top }
  if (key === 'bottom-left') return { x: left, y: bottom }
  if (key === 'right-top') return { x: right, y: top }
  if (key === 'bottom-right') return { x: right, y: bottom }

  return null
} // End getLocalBoundaryCornerBetweenEdges

//=================
function getLocalBoundaryPointCoord(edge, point) {
  if (!edge || !point) return 0

  if (edge === 'left' || edge === 'right') return Number(point.y || 0)

  return Number(point.x || 0)
} // End getLocalBoundaryPointCoord

//=================
function getLocalBoundaryEdgeLength(edge, panelRect) {
  if (!edge || !panelRect) return 0

  if (edge === 'left' || edge === 'right') return Number(panelRect.height || 0)

  return Number(panelRect.width || 0)
} // End getLocalBoundaryEdgeLength

//=================
function getLocalBoundaryPointFromCoord(edge, coord, panelRect) {
  const value = Number(coord || 0)
  const left = Number(panelRect.x || 0)
  const right = left + Number(panelRect.width || 0)
  const bottom = Number(panelRect.y || 0)
  const top = bottom + Number(panelRect.height || 0)

  if (edge === 'left') return { x: left, y: bottom + value }
  if (edge === 'right') return { x: right, y: bottom + value }
  if (edge === 'bottom') return { x: left + value, y: bottom }
  if (edge === 'top') return { x: left + value, y: top }

  return { x: left, y: bottom }
} // End getLocalBoundaryPointFromCoord

//=================
function addLocalBoundaryEraseSpan(spans, edge, pointA, pointB, panelRect) {
  if (!spans || !edge || !pointA || !pointB || !panelRect) return

  const length = getLocalBoundaryEdgeLength(edge, panelRect)
  const rawA = getLocalBoundaryPointCoord(edge, pointA)
  const rawB = getLocalBoundaryPointCoord(edge, pointB)
  const offset = edge === 'left' || edge === 'right' ? Number(panelRect.y || 0) : Number(panelRect.x || 0)
  const coordA = Math.max(0, Math.min(length, rawA - offset))
  const coordB = Math.max(0, Math.min(length, rawB - offset))
  const start = Math.min(coordA, coordB)
  const end = Math.max(coordA, coordB)

  if (end - start <= 0.01) return

  spans[edge].push({ start, end })
} // End addLocalBoundaryEraseSpan

//=================
function isLocalPointOnSegment(point, start, end) {
  if (!point || !start || !end) return false

  const tolerance = 0.5
  const cross = (Number(point.y || 0) - Number(start.y || 0)) * (Number(end.x || 0) - Number(start.x || 0)) - (Number(point.x || 0) - Number(start.x || 0)) * (Number(end.y || 0) - Number(start.y || 0))

  if (Math.abs(cross) > tolerance) return false

  const minX = Math.min(Number(start.x || 0), Number(end.x || 0)) - tolerance
  const maxX = Math.max(Number(start.x || 0), Number(end.x || 0)) + tolerance
  const minY = Math.min(Number(start.y || 0), Number(end.y || 0)) - tolerance
  const maxY = Math.max(Number(start.y || 0), Number(end.y || 0)) + tolerance

  return Number(point.x || 0) >= minX && Number(point.x || 0) <= maxX && Number(point.y || 0) >= minY && Number(point.y || 0) <= maxY
} // End isLocalPointOnSegment

//=================
function isLocalPointInsidePolygon(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]

    if (isLocalPointOnSegment(point, start, end)) return true
  }

  let inside = false
  const x = Number(point.x || 0)
  const y = Number(point.y || 0)

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const pointA = polygon[index]
    const pointB = polygon[previousIndex]
    const xi = Number(pointA.x || 0)
    const yi = Number(pointA.y || 0)
    const xj = Number(pointB.x || 0)
    const yj = Number(pointB.y || 0)
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi)

    if (intersects) inside = !inside
  }

  return inside
} // End isLocalPointInsidePolygon

//=================
function addLocalBoundarySplitCoord(values, coord, length) {
  if (!Array.isArray(values) || !Number.isFinite(coord) || !Number.isFinite(length)) return

  const value = Math.max(0, Math.min(length, coord))

  if (values.some((item) => Math.abs(item - value) <= 0.01)) return

  values.push(value)
} // End addLocalBoundarySplitCoord

//=================
function getLocalBoundaryProbePoint(edge, coord, panelRect) {
  const epsilon = 0.25
  const left = Number(panelRect.x || 0)
  const right = left + Number(panelRect.width || 0)
  const bottom = Number(panelRect.y || 0)
  const top = bottom + Number(panelRect.height || 0)
  const value = Number(coord || 0)

  if (edge === 'left') return { x: left + epsilon, y: bottom + value }
  if (edge === 'right') return { x: right - epsilon, y: bottom + value }
  if (edge === 'bottom') return { x: left + value, y: bottom + epsilon }
  if (edge === 'top') return { x: left + value, y: top - epsilon }

  return { x: left, y: bottom }
} // End getLocalBoundaryProbePoint

//=================
function addLocalBoundarySegmentIntersection(values, edge, pointA, pointB, panelRect) {
  if (!values || !edge || !pointA || !pointB || !panelRect) return

  const x1 = Number(pointA.x || 0)
  const y1 = Number(pointA.y || 0)
  const x2 = Number(pointB.x || 0)
  const y2 = Number(pointB.y || 0)
  const left = Number(panelRect.x || 0)
  const right = left + Number(panelRect.width || 0)
  const bottom = Number(panelRect.y || 0)
  const top = bottom + Number(panelRect.height || 0)
  const length = getLocalBoundaryEdgeLength(edge, panelRect)
  let t = null
  let coord = null

  if (edge === 'left' || edge === 'right') {
    const x = edge === 'left' ? left : right

    if (Math.abs(x2 - x1) <= 1e-9) return

    t = (x - x1) / (x2 - x1)
    if (t < -0.0001 || t > 1.0001) return

    coord = y1 + (y2 - y1) * t - bottom
    if (coord < -0.01 || coord > Number(panelRect.height || 0) + 0.01) return
  } else {
    const y = edge === 'bottom' ? bottom : top

    if (Math.abs(y2 - y1) <= 1e-9) return

    t = (y - y1) / (y2 - y1)
    if (t < -0.0001 || t > 1.0001) return

    coord = x1 + (x2 - x1) * t - left
    if (coord < -0.01 || coord > Number(panelRect.width || 0) + 0.01) return
  }

  addLocalBoundarySplitCoord(values, coord, length)
} // End addLocalBoundarySegmentIntersection

//=================
function collectLocalBoundarySplitCoords(edge, polygon, panelRect) {
  const length = getLocalBoundaryEdgeLength(edge, panelRect)
  const values = [0, length]

  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]

    if (isLocalPointOnPanelRectEdge(point, panelRect) === edge) {
      const rawCoord = getLocalBoundaryPointCoord(edge, point)
      const offset = edge === 'left' || edge === 'right' ? Number(panelRect.y || 0) : Number(panelRect.x || 0)
      addLocalBoundarySplitCoord(values, rawCoord - offset, length)
    }

    addLocalBoundarySegmentIntersection(values, edge, point, nextPoint, panelRect)
  })

  return values.sort((a, b) => a - b)
} // End collectLocalBoundarySplitCoords

//=================
function collectLocalPolygonBoundaryEraseSpans(polygon, panelRect) {
  const spans = {
    left: [],
    right: [],
    bottom: [],
    top: []
  }

  if (!Array.isArray(polygon) || polygon.length < 3 || !panelRect) return spans

  Object.keys(spans).forEach((edge) => {
    const values = collectLocalBoundarySplitCoords(edge, polygon, panelRect)

    for (let index = 0; index < values.length - 1; index += 1) {
      const start = values[index]
      const end = values[index + 1]

      if (end - start <= 0.01) continue

      const mid = (start + end) / 2
      const probe = getLocalBoundaryProbePoint(edge, mid, panelRect)

      if (!isLocalPointInsidePolygon(probe, polygon)) continue

      spans[edge].push({ start, end })
    }
  })

  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]
    const edgeA = isLocalPointOnPanelRectEdge(point, panelRect)
    const edgeB = isLocalPointOnPanelRectEdge(nextPoint, panelRect)

    if (!edgeA || !edgeB || edgeA === edgeB) return

    const corner = getLocalBoundaryCornerBetweenEdges(edgeA, edgeB, panelRect)

    if (!corner) return

    const left = Number(panelRect.x || 0)
    const right = left + Number(panelRect.width || 0)
    const bottom = Number(panelRect.y || 0)
    const top = bottom + Number(panelRect.height || 0)
    const cornerProbe = {
      x: corner.x + (Math.abs(corner.x - left) <= 0.5 ? 0.25 : -0.25),
      y: corner.y + (Math.abs(corner.y - bottom) <= 0.5 ? 0.25 : -0.25)
    }

    if (!isLocalPointInsidePolygon(corner, polygon) && !isLocalPointInsidePolygon(cornerProbe, polygon)) return

    addLocalBoundaryEraseSpan(spans, edgeA, point, corner, panelRect)
    addLocalBoundaryEraseSpan(spans, edgeB, nextPoint, corner, panelRect)
  })

  return spans
} // End collectLocalPolygonBoundaryEraseSpans

//=================
function mergeLocalBoundaryEraseSpans(spans) {
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
} // End mergeLocalBoundaryEraseSpans

//=================
function drawLocalVisibleBoundarySegment(ctx, viewport, edge, startCoord, endCoord, panelRect) {
  if (endCoord - startCoord <= 0.01) return

  const pointA = getLocalBoundaryPointFromCoord(edge, startCoord, panelRect)
  const pointB = getLocalBoundaryPointFromCoord(edge, endCoord, panelRect)
  const p1 = localToScreen(viewport, pointA.x, pointA.y)
  const p2 = localToScreen(viewport, pointB.x, pointB.y)

  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
} // End drawLocalVisibleBoundarySegment

//=================
function redrawLocalVisiblePanelBoundary(ctx, viewport, polygon, panelRect) {
  const spans = collectLocalPolygonBoundaryEraseSpans(polygon, panelRect)
  const edges = ['left', 'right', 'bottom', 'top']

  ctx.save()
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  ctx.setLineDash([])
  ctx.beginPath()

  edges.forEach((edge) => {
    const length = getLocalBoundaryEdgeLength(edge, panelRect)
    const merged = mergeLocalBoundaryEraseSpans(spans[edge] || [])
    let cursor = 0

    merged.forEach((span) => {
      drawLocalVisibleBoundarySegment(ctx, viewport, edge, cursor, span.start, panelRect)
      cursor = Math.max(cursor, span.end)
    })

    drawLocalVisibleBoundarySegment(ctx, viewport, edge, cursor, length, panelRect)
  })

  ctx.stroke()
  ctx.restore()
} // End redrawLocalVisiblePanelBoundary

//=================
function drawLocalEraseSegment(ctx, viewport, pointA, pointB) {
  const p1 = localToScreen(viewport, pointA.x, pointA.y)
  const p2 = localToScreen(viewport, pointB.x, pointB.y)

  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
} // End drawLocalEraseSegment

//=================
function eraseLocalPolygonBoundarySpans(ctx, viewport, polygon, panelRect, background) {
  if (!Array.isArray(polygon) || polygon.length < 3 || !panelRect) return

  const spans = collectLocalPolygonBoundaryEraseSpans(polygon, panelRect)
  const edges = ['left', 'right', 'bottom', 'top']

  ctx.save()
  ctx.strokeStyle = background
  ctx.lineWidth = 8
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  ctx.setLineDash([])
  ctx.beginPath()

  edges.forEach((edge) => {
    const merged = mergeLocalBoundaryEraseSpans(spans[edge] || [])

    merged.forEach((span) => {
      drawLocalVisibleBoundarySegment(ctx, viewport, edge, span.start, span.end, panelRect)
    })
  })

  ctx.stroke()
  ctx.restore()

  redrawLocalVisiblePanelBoundary(ctx, viewport, polygon, panelRect)
} // End eraseLocalPolygonBoundarySpans

//=================
function drawPanelEditCutoutPolygonLocal(ctx, viewport, polygon, panelRect) {
  if (!Array.isArray(polygon) || polygon.length < 3) return

  ctx.beginPath()
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  polygon.forEach((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]

    if (isLocalCutoutBoundaryOnlySegment(point, nextPoint, panelRect)) return

    const p1 = localToScreen(viewport, point.x, point.y)
    const p2 = localToScreen(viewport, nextPoint.x, nextPoint.y)

    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
  })
  ctx.stroke()
  redrawLocalVisiblePanelBoundary(ctx, viewport, polygon, panelRect)
} // End drawPanelEditCutoutPolygonLocal

//=================
function drawPanelEditCutoutRectLocal(ctx, viewport, cutoutRect, panelRect) {
  if (!cutoutRect || !panelRect) return

  const left = Number(cutoutRect.x || 0)
  const bottom = Number(cutoutRect.y || 0)
  const right = left + Number(cutoutRect.width || 0)
  const top = bottom + Number(cutoutRect.height || 0)
  const polygon = getLocalRectPolygon(cutoutRect)
  const edges = [
    { start: { x: left, y: bottom }, end: { x: left, y: top } },
    { start: { x: right, y: bottom }, end: { x: right, y: top } },
    { start: { x: left, y: bottom }, end: { x: right, y: bottom } },
    { start: { x: left, y: top }, end: { x: right, y: top } }
  ]

  ctx.beginPath()
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  edges.forEach((edge) => {
    if (isLocalBoundarySegment(edge.start, edge.end, panelRect)) return

    const p1 = localToScreen(viewport, edge.start.x, edge.start.y)
    const p2 = localToScreen(viewport, edge.end.x, edge.end.y)

    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
  })
  ctx.stroke()
  redrawLocalVisiblePanelBoundary(ctx, viewport, polygon, panelRect)
} // End drawPanelEditCutoutRectLocal

//=================
function drawPanelEditCutouts(ctx, viewport, panel, panelRect, currentView) {
  const cutouts = Array.isArray(panel?.editPanelCutouts) ? panel.editPanelCutouts : []

  if (!cutouts.length) return

  cutouts.forEach((cutout) => {
    if (cutout.regionKind === 'polygon' && Array.isArray(cutout.polygon)) {
      const polygon = getPanelEditCutoutLocalPolygon(panel, cutout, panelRect, currentView)

      if (!polygon) return

      drawPanelEditCutoutPolygonLocal(ctx, viewport, polygon, panelRect)
      return
    }

    const cutoutRect = getPanelEditCutoutLocalRect(panel, cutout, panelRect, currentView)

    if (!cutoutRect) return

    drawPanelEditCutoutRectLocal(ctx, viewport, cutoutRect, panelRect)
  })
} // End drawPanelEditCutouts

//=================
function drawGrid(ctx, viewport, width, height) {
  const scale = getLocalScale(viewport)
  const stepLocal = 100
  const stepScreen = stepLocal * scale

  if (stepScreen < 8) return

  const originX = viewport.localOriginX + viewport.panX
  const originY = viewport.localOriginY + viewport.panY

  const startX = Math.floor((0 - originX) / scale / stepLocal) * stepLocal
  const endX = Math.ceil((width - originX) / scale / stepLocal) * stepLocal
  const startY = Math.floor((originY - height) / scale / stepLocal) * stepLocal
  const endY = Math.ceil(originY / scale / stepLocal) * stepLocal

  ctx.beginPath()
  ctx.strokeStyle = '#e1e1e1'
  ctx.lineWidth = 1

  for (let x = startX; x <= endX; x += stepLocal) {
    const sx = localToScreen(viewport, x, 0).x
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, height)
  }

  for (let y = startY; y <= endY; y += stepLocal) {
    const sy = localToScreen(viewport, 0, y).y
    ctx.moveTo(0, sy)
    ctx.lineTo(width, sy)
  }

  ctx.stroke()
} // End drawGrid

//=================
function drawRulers(ctx, viewport, width, height) {
  const topH = viewport.rulerTopHeight
  const leftW = viewport.rulerLeftWidth
  const scale = getLocalScale(viewport)
  const stepLocal = 500

  ctx.fillStyle = '#eeeeee'
  ctx.fillRect(0, 0, width, topH)
  ctx.fillRect(0, 0, leftW, height)

  ctx.strokeStyle = '#9a9a9a'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, width, topH)
  ctx.strokeRect(0, 0, leftW, height)

  ctx.fillStyle = '#333333'
  ctx.font = '10px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const originX = viewport.localOriginX + viewport.panX
  const originY = viewport.localOriginY + viewport.panY

  const startX = Math.floor((0 - originX) / scale / stepLocal) * stepLocal
  const endX = Math.ceil((width - originX) / scale / stepLocal) * stepLocal
  const startY = Math.floor((originY - height) / scale / stepLocal) * stepLocal
  const endY = Math.ceil(originY / scale / stepLocal) * stepLocal

  for (let x = startX; x <= endX; x += stepLocal) {
    const sx = localToScreen(viewport, x, 0).x
    if (sx < leftW) continue

    drawLine(ctx, { x: sx, y: topH - 6 }, { x: sx, y: topH }, '#777')
    ctx.fillText(String(x), sx, 11)
  }

  ctx.textAlign = 'right'

  for (let y = startY; y <= endY; y += stepLocal) {
    const sy = localToScreen(viewport, 0, y).y
    if (sy < topH) continue

    drawLine(ctx, { x: leftW - 6, y: sy }, { x: leftW, y: sy }, '#777')
    ctx.fillText(String(y), leftW - 8, sy)
  }

  const origin = localToScreen(viewport, 0, 0)

  drawLine(ctx, { x: origin.x, y: 0 }, { x: origin.x, y: height }, '#3fa9f5', 1)
  drawLine(ctx, { x: 0, y: origin.y }, { x: width, y: origin.y }, '#3fa9f5', 1)
} // End drawRulers

//=================
function drawWallHatch(ctx, viewport, rect) {
  if (!rect) return

  const p1 = localToScreen(viewport, rect.x, rect.y)
  const p2 = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)

  const x = Math.min(p1.x, p2.x)
  const y = Math.min(p1.y, p2.y)
  const w = Math.abs(p2.x - p1.x)
  const h = Math.abs(p2.y - p1.y)

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  ctx.strokeStyle = 'rgba(90, 90, 90, 0.35)'
  ctx.lineWidth = 1

  const step = 18

  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath()
    ctx.moveTo(x + i, y + h)
    ctx.lineTo(x + i + h, y)
    ctx.stroke()
  }

  ctx.restore()
} // End drawWallHatch

//=================
function drawWall(ctx, viewport, wallRect) {
  if (!wallRect) return

  drawRectLocal(ctx, viewport, wallRect, {
    fill: '#b8b8b8',
    stroke: '#666666',
    lineWidth: 2
  })

  drawWallHatch(ctx, viewport, wallRect)
} // End drawWall

//=================
function drawWallDims(ctx, viewport, wallRect, editingDim) {
  if (!wallRect) return

  const leftTop = localToScreen(viewport, wallRect.x, wallRect.y + wallRect.height)
  const rightTop = localToScreen(viewport, wallRect.x + wallRect.width, wallRect.y + wallRect.height)
  const leftBottom = localToScreen(viewport, wallRect.x, wallRect.y)

  const topDimY = leftTop.y - 34
  const leftDimX = leftTop.x - 42

  const widthColor = editingDim === 'width' ? '#ff9f1a' : '#333333'
  const heightColor = editingDim === 'height' ? '#ff9f1a' : '#333333'

  drawLine(ctx, { x: leftTop.x, y: topDimY }, { x: rightTop.x, y: topDimY }, widthColor, 2)
  drawLine(ctx, { x: leftDimX, y: leftTop.y }, { x: leftDimX, y: leftBottom.y }, heightColor, 2)

  drawLine(ctx, { x: leftTop.x, y: topDimY - 6 }, { x: leftTop.x, y: topDimY + 6 }, widthColor, 2)
  drawLine(ctx, { x: rightTop.x, y: topDimY - 6 }, { x: rightTop.x, y: topDimY + 6 }, widthColor, 2)
  drawLine(ctx, { x: leftDimX - 6, y: leftTop.y }, { x: leftDimX + 6, y: leftTop.y }, heightColor, 2)
  drawLine(ctx, { x: leftDimX - 6, y: leftBottom.y }, { x: leftDimX + 6, y: leftBottom.y }, heightColor, 2)

  ctx.fillStyle = '#111111'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (editingDim !== 'width') {
    ctx.fillText(String(Math.round(wallRect.width)), (leftTop.x + rightTop.x) / 2, topDimY - 12)
  }

  if (editingDim !== 'height') {
    ctx.save()
    ctx.translate(leftDimX - 16, (leftTop.y + leftBottom.y) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(String(Math.round(wallRect.height)), 0, 0)
    ctx.restore()
  }
} // End drawWallDims

//=================
function hitTestWallDim(viewport, wallRect, screenX, screenY) {
  if (!wallRect) return null

  const leftTop = localToScreen(viewport, wallRect.x, wallRect.y + wallRect.height)
  const rightTop = localToScreen(viewport, wallRect.x + wallRect.width, wallRect.y + wallRect.height)
  const leftBottom = localToScreen(viewport, wallRect.x, wallRect.y)

  const topDimY = leftTop.y - 34
  const leftDimX = leftTop.x - 42

  const widthTextX = (leftTop.x + rightTop.x) / 2
  const widthTextY = topDimY - 12
  const heightTextX = leftDimX - 16
  const heightTextY = (leftTop.y + leftBottom.y) / 2

  const widthTextHit =
    Math.abs(screenX - widthTextX) <= 48 &&
    Math.abs(screenY - widthTextY) <= 18

  if (widthTextHit) return 'width'

  const heightTextHit =
    Math.abs(screenX - heightTextX) <= 28 &&
    Math.abs(screenY - heightTextY) <= 48

  if (heightTextHit) return 'height'

  const widthLineHit =
    screenX >= Math.min(leftTop.x, rightTop.x) - 18 &&
    screenX <= Math.max(leftTop.x, rightTop.x) + 18 &&
    Math.abs(screenY - topDimY) <= 22

  if (widthLineHit) return 'width'

  const heightLineHit =
    Math.abs(screenX - leftDimX) <= 22 &&
    screenY >= Math.min(leftTop.y, leftBottom.y) - 18 &&
    screenY <= Math.max(leftTop.y, leftBottom.y) + 18

  if (heightLineHit) return 'height'

  return null
} // End hitTestWallDim

//=================
function drawZoneOverlay(ctx, viewport, zones = [], hover) {
  zones.forEach((zone) => {
    const isHoverZone = hover?.type === 'zone-edge' && hover.zone?.id === zone.id

    drawRectLocal(ctx, viewport, zone, {
      fill: isHoverZone ? 'rgba(255, 182, 193, 0.28)' : null,
      stroke: isHoverZone ? 'rgba(255, 105, 180, 0.65)' : 'rgba(63, 169, 245, 0.28)',
      lineWidth: isHoverZone ? 2 : 1
    })
  })

  if (hover && hover.type === 'zone-edge') {
    const a = localToScreen(viewport, hover.segment.x1, hover.segment.y1)
    const b = localToScreen(viewport, hover.segment.x2, hover.segment.y2)

    drawLine(ctx, a, b, '#ff2f92', 5)
  }
} // End drawZoneOverlay

//=================
function drawPanelGrip(ctx, viewport, point, active = false) {
  const screenPoint = localToScreen(viewport, point.x, point.y)

  ctx.save()
  ctx.fillStyle = active ? '#ff9f1a' : '#ffffff'
  ctx.strokeStyle = '#0077CC'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(screenPoint.x, screenPoint.y, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
} // End drawPanelGrip

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
function getPanelRect(panel, currentView = 'front') {
  if (!panel) return null

  const camera = getCameraConfig(currentView)
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
} // End getPanelRect

//=================
function drawPanels(ctx, viewport, panels = [], selectedPanelIds = [], currentView = 'front', showIndividualGrips = true, width = null, height = null) {
  const selectedIds = Array.isArray(selectedPanelIds) ? selectedPanelIds : []

  panels.forEach((panel) => {
    const rect = getPanelRect(panel, currentView)

    if (!rect) return

    const selected = selectedIds.includes(panel.id)
    const drewCutoutLayer = drawPanelLayerWithCutouts(ctx, viewport, panel, rect, selected, currentView, width, height)

    if (!drewCutoutLayer) {
      drawRectLocal(ctx, viewport, rect, {
        fill: getRuntimePanelFill(panel),
        stroke: getRuntimePanelStroke(selected),
        lineWidth: selected ? 3 : 2
      })

      drawPanelEditSavedLines(ctx, viewport, panel, rect, currentView)
    }

    if (!selected || !showIndividualGrips) return

    drawPanelGrip(ctx, viewport, { x: rect.x, y: rect.y })
    drawPanelGrip(ctx, viewport, { x: rect.x + rect.width, y: rect.y })
    drawPanelGrip(ctx, viewport, { x: rect.x + rect.width, y: rect.y + rect.height })
    drawPanelGrip(ctx, viewport, { x: rect.x, y: rect.y + rect.height })
  })
} // End drawPanels

//=================
function getUnionRect(rects = []) {
  const validRects = rects.filter((rect) => {
    return rect
      && Number.isFinite(rect.x)
      && Number.isFinite(rect.y)
      && Number.isFinite(rect.width)
      && Number.isFinite(rect.height)
      && rect.width > 0
      && rect.height > 0
  })

  if (!validRects.length) return null

  const left = Math.min(...validRects.map((rect) => rect.x))
  const bottom = Math.min(...validRects.map((rect) => rect.y))
  const right = Math.max(...validRects.map((rect) => rect.x + rect.width))
  const top = Math.max(...validRects.map((rect) => rect.y + rect.height))

  return {
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom
  }
} // End getUnionRect

//=================
function drawSelectionOuterGrips(ctx, viewport, panels = [], selectedPanelIds = [], boxes = [], selectedBoxIds = [], currentView = 'front') {
  const panelIds = Array.isArray(selectedPanelIds) ? selectedPanelIds : []
  const boxIds = Array.isArray(selectedBoxIds) ? selectedBoxIds : []
  const rects = []

  panels.forEach((panel) => {
    if (!panelIds.includes(panel.id)) return

    const rect = getPanelRect(panel, currentView)

    if (rect) rects.push(rect)
  })

  boxes.forEach((box) => {
    if (!boxIds.includes(box.id)) return

    const rect = projectBoxToCameraRect(box, currentView)

    if (rect) rects.push(rect)
  })

  const outerRect = getUnionRect(rects)

  if (!outerRect) return

  drawPanelGrip(ctx, viewport, { x: outerRect.x, y: outerRect.y })
  drawPanelGrip(ctx, viewport, { x: outerRect.x + outerRect.width, y: outerRect.y })
  drawPanelGrip(ctx, viewport, { x: outerRect.x + outerRect.width, y: outerRect.y + outerRect.height })
  drawPanelGrip(ctx, viewport, { x: outerRect.x, y: outerRect.y + outerRect.height })
} // End drawSelectionOuterGrips

//=================
function drawMovePreviewTarget(ctx, viewport, movePreviewTarget, currentView = 'front') {
  if (!movePreviewTarget?.target) return

  const targetType = movePreviewTarget.type
  const target = movePreviewTarget.target

  ctx.save()
  ctx.setLineDash([8, 5])

  if (targetType === 'selection') {
    ;(target.panels || []).forEach((panel) => {
      const panelRect = getPanelRect(panel, currentView)

      if (!panelRect) return

      drawRectLocal(ctx, viewport, panelRect, {
        fill: 'rgba(37, 99, 235, 0.16)',
        stroke: '#2563eb',
        lineWidth: 2
      })
    })

    ;(target.boxes || []).forEach((box) => {
      const boxRect = projectBoxToCameraRect(box, currentView)

      if (!boxRect) return

      drawRectLocal(ctx, viewport, boxRect, {
        fill: 'rgba(37, 99, 235, 0.14)',
        stroke: '#2563eb',
        lineWidth: 2
      })
    })

    if (target.rect) {
      drawRectLocal(ctx, viewport, target.rect, {
        fill: 'rgba(37, 99, 235, 0.05)',
        stroke: '#2563eb',
        lineWidth: 2
      })
    }

    ctx.restore()
    return
  }

  let rect = null

  if (targetType === 'panel') {
    rect = getPanelRect(target, currentView)
  }

  if (targetType === 'box') {
    rect = projectBoxToCameraRect(target, currentView)
  }

  if (
    !rect ||
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    ctx.restore()
    return
  }

  drawRectLocal(ctx, viewport, rect, {
    fill: targetType === 'panel'
      ? 'rgba(37, 99, 235, 0.22)'
      : 'rgba(37, 99, 235, 0.18)',
    stroke: '#2563eb',
    lineWidth: 2
  })

  ctx.restore()
} // End drawMovePreviewTarget

//=================
function drawMoveHoverSnapPoints(ctx, viewport, moveHoverSnapPoints = []) {
  if (!Array.isArray(moveHoverSnapPoints) || moveHoverSnapPoints.length === 0) return

  ctx.save()

  moveHoverSnapPoints.forEach((snapPoint) => {
    const point = localToScreen(viewport, snapPoint.x, snapPoint.y)
    const active = snapPoint.active === true
    const radius = active ? 6 : 3

    ctx.fillStyle = active ? '#ff9f1a' : '#ffffff'
    ctx.strokeStyle = active ? '#ff7a00' : '#2563eb'
    ctx.lineWidth = active ? 2.5 : 1.5

    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })

  ctx.restore()
} // End drawMoveHoverSnapPoints

//=================
function drawPanelPreviewItems(ctx, viewport, previewItems = [], hover, currentView = 'front') {
  if (!Array.isArray(previewItems) || previewItems.length === 0) return

  const firstPreview = previewItems[0]
  const isDividePreview = firstPreview.panelDivideCount && hover?.zone

  ctx.save()
  ctx.setLineDash([8, 5])

  previewItems.forEach((panel) => {
    const rect = getPanelRect(panel, currentView)

    if (!rect) return

    drawRectLocal(ctx, viewport, rect, {
      fill: panel.color || 'rgba(135, 206, 255, 0.8)',
      stroke: '#3a8fbd',
      lineWidth: 2
    })
  })

  ctx.restore()

  if (isDividePreview) {
    drawDivideClearPreview(ctx, viewport, hover.zone, previewItems)
  }
} // End drawPanelPreviewItems
//=================
function drawDivideClearPreview(ctx, viewport, zone, previewItems = []) {
  if (!zone || !Array.isArray(previewItems) || previewItems.length === 0) return

  const firstPreview = previewItems[0]
  const divideCount = Number(firstPreview.panelDivideCount || 0)
  const thickness = Number(firstPreview.thickness || firstPreview.panelThickness || 18)

  if (!Number.isFinite(divideCount) || divideCount < 2) return

  const isVerticalDivide = firstPreview.panelSide === 'split_vertical'
  const zoneX = Number(zone.x || 0)
  const zoneY = Number(zone.y || 0)
  const zoneWidth = Number(zone.width || 0)
  const zoneHeight = Number(zone.height || 0)

  if (zoneWidth <= 0 || zoneHeight <= 0) return

  const clearSize = isVerticalDivide
    ? (zoneWidth - (divideCount - 1) * thickness) / divideCount
    : (zoneHeight - (divideCount - 1) * thickness) / divideCount

  if (!Number.isFinite(clearSize) || clearSize <= 0) return

  ctx.save()

  ctx.fillStyle = '#111111'
  ctx.font = '13px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < divideCount; i += 1) {
    let labelX = zoneX + zoneWidth / 2
    let labelY = zoneY + zoneHeight / 2

    if (isVerticalDivide) {
      labelX = zoneX + clearSize / 2 + i * (clearSize + thickness)
    } else {
      labelY = zoneY + clearSize / 2 + i * (clearSize + thickness)
    }

    const screen = localToScreen(viewport, labelX, labelY)

    ctx.fillText(String(Math.round(clearSize)), screen.x, screen.y)
  }

  ctx.restore()
} // End drawDivideClearPreview

//=================
function drawPanelInputBuffer(ctx, viewport, hover, panelInputBuffer) {
  if (!hover || hover.type !== 'zone-edge') return
  if (!panelInputBuffer) return

  const zone = hover.zone
  const point = localToScreen(viewport, zone.x + zone.width / 2, zone.y + zone.height / 2)

  ctx.save()

  const text = `Vẽ Tấm: ${panelInputBuffer}`
  const paddingX = 10
  const boxWidth = Math.max(96, text.length * 8)
  const boxHeight = 28
  const x = point.x - boxWidth / 2
  const y = point.y - 44

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.strokeStyle = '#ff2f92'
  ctx.lineWidth = 1.5

  ctx.beginPath()
  ctx.roundRect(x, y, boxWidth, boxHeight, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#b0005a'
  ctx.font = '13px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, point.x, y + boxHeight / 2)

  ctx.restore()
} // End drawPanelInputBuffer
//=================
function drawMoveCursorIcon(ctx, viewport, moveCursorLocal, moveCopyMode = false) {
  if (!moveCursorLocal) return

  const point = localToScreen(viewport, moveCursorLocal.x, moveCursorLocal.y)
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return
  const hotspotX = -4
  const hotspotY = -6

  const x = point.x + hotspotX
  const y = point.y + hotspotY

  ctx.save()
  ctx.translate(point.x, point.y)
  ctx.scale(0.4, 0.4)
  ctx.translate(-point.x, -point.y)

  ctx.strokeStyle = moveCopyMode ? '#ff8c00' : '#000000'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = moveCopyMode ? 4 : 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Mouse pointer
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + 15, y + 48)
  ctx.lineTo(x + 29, y + 34)
  ctx.lineTo(x + 50, y + 34)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Move icon center
  const cx = x + 55
  const cy = y + 65
  const arrowLength = 28
  const arrowWidth = 10

  // Up arrow
  ctx.beginPath()
  ctx.moveTo(cx, cy - arrowLength)
  ctx.lineTo(cx - arrowWidth, cy - arrowLength + 14)
  ctx.lineTo(cx - 4, cy - arrowLength + 10)
  ctx.lineTo(cx - 4, cy - 6)
  ctx.lineTo(cx + 4, cy - 6)
  ctx.lineTo(cx + 4, cy - arrowLength + 10)
  ctx.lineTo(cx + arrowWidth, cy - arrowLength + 14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Down arrow
  ctx.beginPath()
  ctx.moveTo(cx, cy + arrowLength)
  ctx.lineTo(cx - arrowWidth, cy + arrowLength - 14)
  ctx.lineTo(cx - 4, cy + arrowLength - 10)
  ctx.lineTo(cx - 4, cy + 6)
  ctx.lineTo(cx + 4, cy + 6)
  ctx.lineTo(cx + 4, cy + arrowLength - 10)
  ctx.lineTo(cx + arrowWidth, cy + arrowLength - 14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Left arrow
  ctx.beginPath()
  ctx.moveTo(cx - arrowLength, cy)
  ctx.lineTo(cx - arrowLength + 14, cy - arrowWidth)
  ctx.lineTo(cx - arrowLength + 10, cy - 4)
  ctx.lineTo(cx - 6, cy - 4)
  ctx.lineTo(cx - 6, cy + 4)
  ctx.lineTo(cx - arrowLength + 10, cy + 4)
  ctx.lineTo(cx - arrowLength + 14, cy + arrowWidth)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Right arrow
  ctx.beginPath()
  ctx.moveTo(cx + arrowLength, cy)
  ctx.lineTo(cx + arrowLength - 14, cy - arrowWidth)
  ctx.lineTo(cx + arrowLength - 10, cy - 4)
  ctx.lineTo(cx + 6, cy - 4)
  ctx.lineTo(cx + 6, cy + 4)
  ctx.lineTo(cx + arrowLength - 10, cy + 4)
  ctx.lineTo(cx + arrowLength - 14, cy + arrowWidth)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()
} // End drawMoveCursorIcon

//=================
function drawMoveTargetSnap(ctx, viewport, moveTargetSnap) {
  if (!moveTargetSnap) return

  const point = localToScreen(viewport, moveTargetSnap.x, moveTargetSnap.y)

  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return

  const isRoundSnap =
    moveTargetSnap.type === 'corner' ||
    moveTargetSnap.type === 'midpoint'

  ctx.save()

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = isRoundSnap ? '#ff7a00' : '#22c55e'
  ctx.lineWidth = 2

  if (isRoundSnap) {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    return
  }

  const size = 10
  const half = size / 2

  ctx.beginPath()
  ctx.rect(point.x - half, point.y - half, size, size)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
} // End drawMoveTargetSnap
//=================
function drawSnapPreview(ctx, viewport, snapPreview) {
  if (!snapPreview) return

  const point = localToScreen(viewport, snapPreview.x, snapPreview.y)

  ctx.save()
  ctx.strokeStyle = '#0077CC'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 2

  if (snapPreview.type === 'corner') {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    return
  }

  if (snapPreview.type === 'edge') {
    ctx.beginPath()
    ctx.rect(point.x - 5, point.y - 5, 10, 10)
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
} // End drawSnapPreview


//=================
function getDimensionGeometry(dimension) {
  if (!dimension?.start || !dimension?.end) return null

  const start = dimension.start
  const end = dimension.end
  const offsetPoint = dimension.offsetPoint || end
  const dx = Number(end.x || 0) - Number(start.x || 0)
  const dy = Number(end.y || 0) - Number(start.y || 0)
  const length = Math.sqrt(dx * dx + dy * dy)

  if (!Number.isFinite(length) || length <= 0.001) return null

  const ux = dx / length
  const uy = dy / length
  const nx = -uy
  const ny = ux
  const mid = {
    x: (Number(start.x || 0) + Number(end.x || 0)) / 2,
    y: (Number(start.y || 0) + Number(end.y || 0)) / 2
  }
  const storedOffset = Number(dimension.offsetDistance)
  const pointOffset = ((Number(offsetPoint.x || 0) - mid.x) * nx) + ((Number(offsetPoint.y || 0) - mid.y) * ny)
  const offsetDistance = Number.isFinite(storedOffset) ? storedOffset : pointOffset
  const finalOffset = Math.abs(offsetDistance) > 0.001 ? offsetDistance : 28
  const dimStart = {
    x: Number(start.x || 0) + nx * finalOffset,
    y: Number(start.y || 0) + ny * finalOffset
  }
  const dimEnd = {
    x: Number(end.x || 0) + nx * finalOffset,
    y: Number(end.y || 0) + ny * finalOffset
  }
  const textPoint = {
    x: (dimStart.x + dimEnd.x) / 2,
    y: (dimStart.y + dimEnd.y) / 2
  }

  return {
    start,
    end,
    dimStart,
    dimEnd,
    textPoint,
    length,
    nx,
    ny,
    ux,
    uy
  }
} // End getDimensionGeometry

//=================
function drawArrowTick(ctx, point, ux, uy, size = 9) {
  const nx = -uy
  const ny = ux

  ctx.beginPath()
  ctx.moveTo(point.x - nx * size, point.y - ny * size)
  ctx.lineTo(point.x + nx * size, point.y + ny * size)
  ctx.stroke()
} // End drawArrowTick

//=================
function drawDimensions(ctx, viewport, dimensions = [], dimensionDraft = null, editingDimensionId = null, selectedDimensionIds = []) {
  const items = Array.isArray(dimensions) ? dimensions.slice() : []

  if (dimensionDraft?.active && dimensionDraft.start && dimensionDraft.end) {
    items.push({
      id: '__draft_dimension__',
      start: dimensionDraft.start,
      end: dimensionDraft.end,
      offsetPoint: dimensionDraft.offsetPoint || dimensionDraft.end,
      draft: true
    })
  }

  if (!items.length) return

  ctx.save()
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  items.forEach((dimension) => {
    const geo = getDimensionGeometry(dimension)

    if (!geo) return

    const start = localToScreen(viewport, geo.start.x, geo.start.y)
    const end = localToScreen(viewport, geo.end.x, geo.end.y)
    const dimStart = localToScreen(viewport, geo.dimStart.x, geo.dimStart.y)
    const dimEnd = localToScreen(viewport, geo.dimEnd.x, geo.dimEnd.y)
    const textPoint = localToScreen(viewport, geo.textPoint.x, geo.textPoint.y)
    const ux = dimEnd.x - dimStart.x
    const uy = dimEnd.y - dimStart.y
    const screenLength = Math.sqrt(ux * ux + uy * uy) || 1
    const sux = ux / screenLength
    const suy = uy / screenLength
    const selected = Array.isArray(selectedDimensionIds) && selectedDimensionIds.includes(dimension.id)
    const color = selected ? '#ff9f1a' : dimension.draft ? '#ff9f1a' : '#0077CC'
    const label = String(Math.round(Number(dimension.value || geo.length)))
    const isEditing = dimension.id === editingDimensionId
    const isVertical = Math.abs(suy) > Math.abs(sux)

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = isEditing || selected ? 2.5 : 2
    ctx.setLineDash(dimension.draft ? [6, 4] : [])

    ctx.setLineDash([5, 4])
    drawLine(ctx, start, dimStart, color, 1.5)
    drawLine(ctx, end, dimEnd, color, 1.5)
    ctx.setLineDash([])
    drawLine(ctx, dimStart, dimEnd, color, isEditing ? 2.5 : 2)
    drawArrowTick(ctx, dimStart, sux, suy, 8)
    drawArrowTick(ctx, dimEnd, sux, suy, 8)

    ctx.setLineDash([])
    ctx.fillStyle = color

    if (isVertical) {
      ctx.save()
      ctx.translate(textPoint.x - 16, textPoint.y)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(label, 0, 0)
      ctx.restore()
    } else {
      ctx.fillText(label, textPoint.x, textPoint.y - 12)
    }
  })

  if (dimensionDraft?.hoverSnap) {
    const point = localToScreen(viewport, dimensionDraft.hoverSnap.x, dimensionDraft.hoverSnap.y)

    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#ff9f1a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
} // End drawDimensions

//=================
function hitTestDimensions(viewport, dimensions = [], screenX, screenY) {
  for (let i = dimensions.length - 1; i >= 0; i -= 1) {
    const dimension = dimensions[i]
    const geo = getDimensionGeometry(dimension)

    if (!geo) continue

    const textPoint = localToScreen(viewport, geo.textPoint.x, geo.textPoint.y)
    const textHit = Math.abs(screenX - textPoint.x) <= 34 && Math.abs(screenY - textPoint.y) <= 16

    if (textHit) {
      return {
        target: 'dimension',
        dimensionId: dimension.id,
        value: Math.round(Number(dimension.value || geo.length)),
        x: textPoint.x,
        y: textPoint.y
      }
    }
  }

  return null
} // End hitTestDimensions

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
function drawBoxDims(ctx, viewport, box, editingDim, currentView = 'top') {
  if (!box) return

  const boxRect = projectBoxToCameraRect(box, currentView)
  const viewDim = getBoxViewDimKeys(currentView)

  const leftTop = localToScreen(viewport, boxRect.x, boxRect.y + boxRect.height)
  const rightTop = localToScreen(viewport, boxRect.x + boxRect.width, boxRect.y + boxRect.height)
  const leftBottom = localToScreen(viewport, boxRect.x, boxRect.y)

  const topDimY = leftTop.y - 30
  const leftDimX = leftTop.x - 36

  const widthColor = editingDim === viewDim.horizontal ? '#ff9f1a' : '#0077CC'
  const heightColor = editingDim === viewDim.vertical ? '#ff9f1a' : '#0077CC'

  drawLine(ctx, { x: leftTop.x, y: topDimY }, { x: rightTop.x, y: topDimY }, widthColor, 2)
  drawLine(ctx, { x: leftDimX, y: leftTop.y }, { x: leftDimX, y: leftBottom.y }, heightColor, 2)

  drawLine(ctx, { x: leftTop.x, y: topDimY - 5 }, { x: leftTop.x, y: topDimY + 5 }, widthColor, 2)
  drawLine(ctx, { x: rightTop.x, y: topDimY - 5 }, { x: rightTop.x, y: topDimY + 5 }, widthColor, 2)
  drawLine(ctx, { x: leftDimX - 5, y: leftTop.y }, { x: leftDimX + 5, y: leftTop.y }, heightColor, 2)
  drawLine(ctx, { x: leftDimX - 5, y: leftBottom.y }, { x: leftDimX + 5, y: leftBottom.y }, heightColor, 2)

  ctx.fillStyle = '#0077CC'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (editingDim !== viewDim.horizontal) {
    ctx.fillText(String(Math.round(box[viewDim.horizontal])), (leftTop.x + rightTop.x) / 2, topDimY - 12)
  }

  if (editingDim !== viewDim.vertical) {
    ctx.save()
    ctx.translate(leftDimX - 16, (leftTop.y + leftBottom.y) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(String(Math.round(box[viewDim.vertical])), 0, 0)
    ctx.restore()
  }
} // End drawBoxDims

//=================
function drawBoxes(ctx, viewport, boxes = [], selectedBoxIds = [], editingDim, currentView = 'top') {
  const selectedIds = Array.isArray(selectedBoxIds) ? selectedBoxIds : []

  boxes.forEach((box) => {
    const boxRect = projectBoxToCameraRect(box, currentView)
    const selected = selectedIds.includes(box.id)

    drawRectLocal(ctx, viewport, boxRect, {
      fill: box.color || 'rgba(0, 119, 204, 0.12)',
      stroke: selected ? '#ff9f1a' : '#0077CC',
      lineWidth: selected ? 3 : 2
    })

    drawBoxDims(ctx, viewport, box, editingDim, currentView)
  })
} // End drawBoxes

//=================
function drawBoxDraft(ctx, viewport, draftRect, currentView = 'top') {
  if (!draftRect) return
  if (currentView !== 'top') return
  if (draftRect.width <= 1 || draftRect.depth <= 1) return

  drawRectLocal(ctx, viewport, {
    x: draftRect.x,
    y: draftRect.y,
    width: draftRect.width,
    height: draftRect.depth
  }, {
    fill: 'rgba(0, 119, 204, 0.12)',
    stroke: '#0077CC',
    lineWidth: 2
  })
} // End drawBoxDraft

//=================
function hitTestBoxDim(viewport, boxes = [], screenX, screenY, currentView = 'top') {
  const viewDim = getBoxViewDimKeys(currentView)

  for (let i = boxes.length - 1; i >= 0; i -= 1) {
    const box = boxes[i]
    const boxRect = projectBoxToCameraRect(box, currentView)

    const leftTop = localToScreen(viewport, boxRect.x, boxRect.y + boxRect.height)
    const rightTop = localToScreen(viewport, boxRect.x + boxRect.width, boxRect.y + boxRect.height)
    const leftBottom = localToScreen(viewport, boxRect.x, boxRect.y)

    const topDimY = leftTop.y - 30
    const leftDimX = leftTop.x - 36

    const horizontalTextX = (leftTop.x + rightTop.x) / 2
    const horizontalTextY = topDimY - 12
    const verticalTextX = leftDimX - 16
    const verticalTextY = (leftTop.y + leftBottom.y) / 2

    const horizontalTextHit =
      Math.abs(screenX - horizontalTextX) <= 48 &&
      Math.abs(screenY - horizontalTextY) <= 18

    if (horizontalTextHit) {
      return {
        boxId: box.id,
        key: viewDim.horizontal
      }
    }

    const verticalTextHit =
      Math.abs(screenX - verticalTextX) <= 28 &&
      Math.abs(screenY - verticalTextY) <= 48

    if (verticalTextHit) {
      return {
        boxId: box.id,
        key: viewDim.vertical
      }
    }

    const horizontalLineHit =
      screenX >= Math.min(leftTop.x, rightTop.x) - 18 &&
      screenX <= Math.max(leftTop.x, rightTop.x) + 18 &&
      Math.abs(screenY - topDimY) <= 22

    if (horizontalLineHit) {
      return {
        boxId: box.id,
        key: viewDim.horizontal
      }
    }

    const verticalLineHit =
      Math.abs(screenX - leftDimX) <= 22 &&
      screenY >= Math.min(leftTop.y, leftBottom.y) - 18 &&
      screenY <= Math.max(leftTop.y, leftBottom.y) + 18

    if (verticalLineHit) {
      return {
        boxId: box.id,
        key: viewDim.vertical
      }
    }
  }

  return null
} // End hitTestBoxDim

//=================
export function getWallDimHit(viewport, wallRect, screenX, screenY) {
  return hitTestWallDim(viewport, wallRect, screenX, screenY)
} // End getWallDimHit

//=================
export function getBoxDimHit(viewport, boxes, screenX, screenY, currentView = 'top') {
  return hitTestBoxDim(viewport, boxes, screenX, screenY, currentView)
} // End getBoxDimHit

//=================
export function getDimensionHit(viewport, dimensions, screenX, screenY) {
  return hitTestDimensions(viewport, dimensions, screenX, screenY)
} // End getDimensionHit
//=================
function drawSelectDragBox(ctx, selectDrag) {
  if (!selectDrag || !selectDrag.active || !selectDrag.start || !selectDrag.current) return
  if (!selectDrag.moved) return

  const x = Math.min(selectDrag.start.x, selectDrag.current.x)
  const y = Math.min(selectDrag.start.y, selectDrag.current.y)
  const width = Math.abs(selectDrag.current.x - selectDrag.start.x)
  const height = Math.abs(selectDrag.current.y - selectDrag.start.y)
  const isTouchMode = selectDrag.mode === 'touch'

  ctx.save()
  ctx.fillStyle = isTouchMode ? 'rgba(0, 160, 255, 0.08)' : 'rgba(0, 120, 255, 0.10)'
  ctx.strokeStyle = '#0078ff'
  ctx.lineWidth = 1

  if (isTouchMode) {
    ctx.setLineDash([6, 4])
  } else {
    ctx.setLineDash([])
  }

  ctx.fillRect(x, y, width, height)
  ctx.strokeRect(x, y, width, height)
  ctx.restore()
} // End drawSelectDragBox
//=================
export function renderCanvas2D(ctx, payload) {
  const {
    width,
    height,
    viewport,
    currentView,
    wallRect,
    wallEditingDim,
    zones,
    panels,
    movePreviewTarget,
    moveHoverSnapPoints,
    moveTargetSnap,
    moveCursorLocal,
    moveCopyMode,
    panelPreviewItems,
    panelInputBuffer,
    boxes,
    boxDraftRect,
    boxEditingDim,
    hover,
    snapPreview,
    selectedPanelId,
    selectedPanelIds,
    selectedBoxId,
    selectedBoxIds,
    selectedDimensionIds,
    selectDrag,
    dimensions,
    dimensionDraft,
    editingDimensionId,
    showGrid
  } = payload

  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = getCanvasBackgroundColor()
  ctx.fillRect(0, 0, width, height)

  if (showGrid) drawGrid(ctx, viewport, width, height)

  if (wallRect) {
    drawWall(ctx, viewport, wallRect)
    drawWallDims(ctx, viewport, wallRect, wallEditingDim)
  }

  const activeSelectedPanelIds = selectedPanelIds || (selectedPanelId ? [selectedPanelId] : [])
  const activeSelectedBoxIds = selectedBoxIds || (selectedBoxId ? [selectedBoxId] : [])
  const selectedCount = activeSelectedPanelIds.length + activeSelectedBoxIds.length

  drawBoxes(ctx, viewport, boxes, activeSelectedBoxIds, boxEditingDim, currentView)
  drawBoxDraft(ctx, viewport, boxDraftRect, currentView)
  drawZoneOverlay(ctx, viewport, zones, hover)
  drawPanels(ctx, viewport, panels, activeSelectedPanelIds, currentView, selectedCount <= 1, width, height)

  if (selectedCount > 1) {
    drawSelectionOuterGrips(ctx, viewport, panels, activeSelectedPanelIds, boxes, activeSelectedBoxIds, currentView)
  }

  drawSelectDragBox(ctx, selectDrag)
  drawMovePreviewTarget(ctx, viewport, movePreviewTarget, currentView)
  drawMoveHoverSnapPoints(ctx, viewport, moveHoverSnapPoints)
  drawMoveTargetSnap(ctx, viewport, moveTargetSnap)
  drawPanelPreviewItems(ctx, viewport, panelPreviewItems, hover, currentView)
  drawPanelInputBuffer(ctx, viewport, hover, panelInputBuffer)
  drawSnapPreview(ctx, viewport, snapPreview)
  drawDimensions(ctx, viewport, dimensions, dimensionDraft, editingDimensionId, selectedDimensionIds)
  drawMoveCursorIcon(ctx, viewport, moveCursorLocal, moveCopyMode)
  drawRulers(ctx, viewport, width, height)
} // End renderCanvas2D