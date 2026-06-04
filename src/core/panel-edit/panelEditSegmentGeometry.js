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
