import { isPanelEditPointInsidePolygon } from './panelEditSegmentGeometry.js'

//=================
export function isPanelEditBoundarySegment(context, pointA, pointB) {
  const edgeA = getPanelEditBoundaryEdge(context, pointA)
  const edgeB = getPanelEditBoundaryEdge(context, pointB)

  return edgeA && edgeA === edgeB
} // End isPanelEditBoundarySegment

//=================
export function isPanelEditCutoutBoundaryOnlySegment(context, pointA, pointB) {
  return isPanelEditSegmentOnPanelBoundaryLine(context, pointA, pointB)
} // End isPanelEditCutoutBoundaryOnlySegment

//=================
export function isPanelEditSegmentOnPanelBoundaryLine(context, pointA, pointB) {
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
export function getPanelEditBoundaryCornerBetweenEdges(context, edgeA, edgeB) {
  if (!context || !edgeA || !edgeB || edgeA === edgeB) return null

  const key = [edgeA, edgeB].sort().join('-')

  if (key === 'left-top') return { x: 0, y: context.height }
  if (key === 'bottom-left') return { x: 0, y: 0 }
  if (key === 'right-top') return { x: context.width, y: context.height }
  if (key === 'bottom-right') return { x: context.width, y: 0 }

  return null
} // End getPanelEditBoundaryCornerBetweenEdges

//=================
export function getPanelEditBoundaryPointCoord(edge, point) {
  if (!edge || !point) return 0

  if (edge === 'left' || edge === 'right') return Number(point.y || 0)

  return Number(point.x || 0)
} // End getPanelEditBoundaryPointCoord

//=================
export function getPanelEditBoundaryEdgeLength(context, edge) {
  if (!context || !edge) return 0

  if (edge === 'left' || edge === 'right') return Number(context.height || 0)

  return Number(context.width || 0)
} // End getPanelEditBoundaryEdgeLength

//=================
export function getPanelEditBoundaryPointFromCoord(context, edge, coord) {
  const value = Number(coord || 0)

  if (edge === 'left') return { x: 0, y: value }
  if (edge === 'right') return { x: context.width, y: value }
  if (edge === 'bottom') return { x: value, y: 0 }
  if (edge === 'top') return { x: value, y: context.height }

  return { x: 0, y: 0 }
} // End getPanelEditBoundaryPointFromCoord

//=================
export function addPanelEditBoundaryEraseSpan(spans, context, edge, pointA, pointB) {
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
export function addPanelEditBoundarySplitCoord(values, coord, length) {
  if (!Array.isArray(values) || !Number.isFinite(coord) || !Number.isFinite(length)) return

  const value = Math.max(0, Math.min(length, coord))

  if (values.some((item) => Math.abs(item - value) <= 0.01)) return

  values.push(value)
} // End addPanelEditBoundarySplitCoord

//=================
export function getPanelEditBoundaryProbePoint(context, edge, coord) {
  const epsilon = 0.25
  const value = Number(coord || 0)

  if (edge === 'left') return { x: epsilon, y: value }
  if (edge === 'right') return { x: Number(context.width || 0) - epsilon, y: value }
  if (edge === 'bottom') return { x: value, y: epsilon }
  if (edge === 'top') return { x: value, y: Number(context.height || 0) - epsilon }

  return { x: 0, y: 0 }
} // End getPanelEditBoundaryProbePoint

//=================
export function addPanelEditBoundarySegmentIntersection(values, context, edge, pointA, pointB) {
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
export function collectPanelEditBoundarySplitCoords(context, edge, polygon) {
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
export function collectPanelEditPolygonBoundaryEraseSpans(context, polygon) {
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
export function mergePanelEditBoundaryEraseSpans(spans) {
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
export function getPanelEditBoundaryEdge(context, point) {
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
export function getPanelEditCornerForEdges(context, edgeA, edgeB) {
  const key = [edgeA, edgeB].sort().join('-')

  if (key === 'left-top') return { x: 0, y: context.height }
  if (key === 'bottom-left') return { x: 0, y: 0 }
  if (key === 'right-top') return { x: context.width, y: context.height }
  if (key === 'bottom-right') return { x: context.width, y: 0 }

  return null
} // End getPanelEditCornerForEdges
