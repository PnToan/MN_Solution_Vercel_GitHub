import { getPanelEditPolygonBounds } from './panelEditRectangleGeometry'
import {
  getPanelEditPointKey,
  getPanelEditPolygonSignedArea,
  getPanelEditSegmentIntersection,
  getPanelEditSegmentParameter
} from './panelEditSegmentGeometry'

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
export function getPanelEditPlanarSegments(context, lines = []) {
  if (!context) return []

  const userSegments = (lines || []).map((line) => ({
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
export function getPanelEditPlanarRegions(context, lines = []) {
  if (!context || !(lines || []).length) return []

  const segments = getPanelEditPlanarSegments(context, lines)
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
      if (absoluteArea >= panelArea - 0.01 && (lines || []).length) return

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
