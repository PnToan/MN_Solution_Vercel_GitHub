//=================
// Pure geometry helpers for DrawingViewport and edit_panel.
//=================

//=================
export function getPanelEditPoint(context, offsetX, offsetY, scale, x, y) {
  return {
    x: offsetX + x * scale,
    y: offsetY + (context.height - y) * scale
  }
} // End getPanelEditPoint

//=================
export function getPanelEditZoomClamp(value) {
  return Math.min(Math.max(value, 0.2), 8)
} // End getPanelEditZoomClamp

//=================
export function getPanelEditLayout(context, canvasWidth, canvasHeight) {
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
export function getPanelEditLocalFromScreen(context, layout, screenX, screenY) {
  return {
    x: (screenX - layout.left) / layout.scale,
    y: context.height - ((screenY - layout.top) / layout.scale)
  }
} // End getPanelEditLocalFromScreen

//=================
export function getClosestPointOnPanelEditLine(line, local) {
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
export function getPanelEditSegmentIntersection(segmentA, segmentB) {
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
export function getPanelEditCircleRadius(circle) {
  if (!circle?.center) return 0

  if (Number.isFinite(Number(circle.radius)) && Number(circle.radius) > 0) {
    return Number(circle.radius)
  }

  const current = circle.current || circle.center

  return Math.hypot(
    Number(current.x || 0) - Number(circle.center.x || 0),
    Number(current.y || 0) - Number(circle.center.y || 0)
  )
} // End getPanelEditCircleRadius

//=================
export function getClosestPointOnPanelEditCircleEdge(circle, local) {
  if (!circle?.center || !local) return null

  const radius = getPanelEditCircleRadius(circle)

  if (radius <= 0) return null

  const centerX = Number(circle.center.x || 0)
  const centerY = Number(circle.center.y || 0)
  const dx = Number(local.x || 0) - centerX
  const dy = Number(local.y || 0) - centerY
  const length = Math.hypot(dx, dy)
  const unitX = length <= 0.0001 ? 1 : dx / length
  const unitY = length <= 0.0001 ? 0 : dy / length
  const x = centerX + unitX * radius
  const y = centerY + unitY * radius

  return {
    x,
    y,
    distance: Math.hypot(Number(local.x || 0) - x, Number(local.y || 0) - y)
  }
} // End getClosestPointOnPanelEditCircleEdge

//=================
export function getPanelEditRectBounds(rectangle) {
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
export function isPanelEditPointOnSegment(point, start, end) {
  if (!point || !start || !end) return false

  const tolerance = 0.5
  const cross = (Number(point.y || 0) - Number(start.y || 0)) * (Number(end.x || 0) - Number(start.x || 0)) - (Number(point.x || 0) - Number(start.x || 0)) * (Number(end.y || 0) - Number(start.y || 0))

  if (Math.abs(cross) > tolerance) return false

  const minX = Math.min(Number(start.x || 0), Number(end.x || 0)) - tolerance
  const maxX = Math.max(Number(start.x || 0), Number(end.x || 0)) + tolerance
  const minY = Math.min(Number(start.y || 0), Number(end.y || 0)) - tolerance
  const maxY = Math.max(Number(start.y || 0), Number(end.y || 0)) + tolerance

  return Number(point.x || 0) >= minX && Number(point.x || 0) <= maxX && Number(point.y || 0) >= minY && Number(point.y || 0) <= maxY
} // End isPanelEditPointOnSegment

//=================
export function isPanelEditPointInsidePolygon(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]

    if (isPanelEditPointOnSegment(point, start, end)) return true
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
} // End isPanelEditPointInsidePolygon

//=================
export function addPanelEditBoundarySplitCoord(values, coord, length) {
  if (!Array.isArray(values) || !Number.isFinite(coord) || !Number.isFinite(length)) return

  const value = Math.max(0, Math.min(length, coord))

  if (values.some((item) => Math.abs(item - value) <= 0.01)) return

  values.push(value)
} // End addPanelEditBoundarySplitCoord

//=================
export function getPanelEditAxisLockedPoint(start, current) {
  if (!start || !current) return current

  const dx = Number(current.x || 0) - Number(start.x || 0)
  const dy = Number(current.y || 0) - Number(start.y || 0)

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: Number(current.x || 0), y: Number(start.y || 0) }
  }

  return { x: Number(start.x || 0), y: Number(current.y || 0) }
} // End getPanelEditAxisLockedPoint

//=================
export function getPanelEditPolygonBounds(points) {
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
export function getPanelEditRectPolygon(rectangle) {
  const bounds = getPanelEditRectBounds(rectangle)

  if (bounds.width <= 0.01 || bounds.height <= 0.01) return []

  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ]
} // End getPanelEditRectPolygon

//=================
export function getPanelEditCircleBounds(circle) {
  const radius = getPanelEditCircleRadius(circle)

  if (!circle?.center || radius <= 0) return null

  return {
    x: Number(circle.center.x || 0) - radius,
    y: Number(circle.center.y || 0) - radius,
    width: radius * 2,
    height: radius * 2
  }
} // End getPanelEditCircleBounds

//=================
export function getPanelEditCirclePolygon(circle, segmentCount = 72) {
  const radius = getPanelEditCircleRadius(circle)

  if (!circle?.center || radius <= 0) return []

  const centerX = Number(circle.center.x || 0)
  const centerY = Number(circle.center.y || 0)
  const count = Math.max(24, Number(segmentCount || 72))
  const points = []

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count

    points.push({
      x: Math.round((centerX + Math.cos(angle) * radius) * 1000) / 1000,
      y: Math.round((centerY + Math.sin(angle) * radius) * 1000) / 1000
    })
  }

  return points
} // End getPanelEditCirclePolygon

//=================
export function isPointInPanelEditPolygon(point, polygon) {
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
export function getPanelEditPointKey(point) {
  return `${Math.round(Number(point.x || 0) * 1000) / 1000},${Math.round(Number(point.y || 0) * 1000) / 1000}`
} // End getPanelEditPointKey

//=================
export function getPanelEditPolygonSignedArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0

  let area = 0

  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length]

    area += Number(point.x || 0) * Number(nextPoint.y || 0) - Number(nextPoint.x || 0) * Number(point.y || 0)
  })

  return area / 2
} // End getPanelEditPolygonSignedArea

//=================
export function getPanelEditSegmentParameter(segment, point) {
  const dx = Number(segment.end.x || 0) - Number(segment.start.x || 0)
  const dy = Number(segment.end.y || 0) - Number(segment.start.y || 0)
  const lengthSq = dx * dx + dy * dy

  if (lengthSq <= 0.000001) return 0

  return (((Number(point.x || 0) - Number(segment.start.x || 0)) * dx) + ((Number(point.y || 0) - Number(segment.start.y || 0)) * dy)) / lengthSq
} // End getPanelEditSegmentParameter

//=================
export function addPanelEditUniquePoint(points, point) {
  const key = getPanelEditPointKey(point)

  if (points.some((item) => getPanelEditPointKey(item) === key)) return

  points.push({
    x: Math.round(Number(point.x || 0) * 1000) / 1000,
    y: Math.round(Number(point.y || 0) * 1000) / 1000
  })
} // End addPanelEditUniquePoint

//=================
export function getPanelEditPointerLocal(context, layout, event) {
  const canvas = panelEditCanvasRef.value

  if (!canvas || !context || !layout || !event) return null

  const rect = canvas.getBoundingClientRect()
  const rawLocal = getPanelEditLocalFromScreen(context, layout, event.clientX - rect.left, event.clientY - rect.top)

  return {
    x: Math.max(0, Math.min(context.width, rawLocal.x)),
    y: Math.max(0, Math.min(context.height, rawLocal.y))
  }
} // End getPanelEditPointerLocal

//=================
export function getPanelEditSelectDragRectFromPoints(start, current) {
  if (!start || !current) return null

  const x1 = Number(start.x || 0)
  const y1 = Number(start.y || 0)
  const x2 = Number(current.x || 0)
  const y2 = Number(current.y || 0)

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
} // End getPanelEditSelectDragRectFromPoints

//=================
export function panelEditBoundsTouch(boundsA, boundsB) {
  if (!boundsA || !boundsB) return false

  return boundsA.x <= boundsB.x + boundsB.width
    && boundsA.x + boundsA.width >= boundsB.x
    && boundsA.y <= boundsB.y + boundsB.height
    && boundsA.y + boundsA.height >= boundsB.y
} // End panelEditBoundsTouch

//=================
export function getPanelEditLineBounds(line) {
  if (!line?.start || !line?.end) return null

  const x1 = Number(line.start.x || 0)
  const y1 = Number(line.start.y || 0)
  const x2 = Number(line.end.x || 0)
  const y2 = Number(line.end.y || 0)

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
} // End getPanelEditLineBounds

//=================
export function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max)
} // End clampValue

//=================
export function getDistance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y

  return Math.sqrt(dx * dx + dy * dy)
} // End getDistance

