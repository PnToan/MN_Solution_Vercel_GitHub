import { getClosestPointOnPanelEditCircleEdge } from '../../core/panel-edit/panelEditCircleGeometry'
import { getPanelEditSegmentIntersection } from '../../core/panel-edit/panelEditSegmentGeometry'

//=================
export function usePanelEditSnap(options) {
  const {
    panelEditTape,
    panelEditRect,
    panelEditLine,
    panelEditCircle,
    panelEditSelection,
    getPanelEditPoint,
    getPanelEditLocalFromScreen,
    getClosestPointOnPanelEditLine,
    getPanelEditLineSelectionKey,
    getPanelEditSelectedLineKeySet,
    getPanelEditMovePreviewItems,
    getPanelEditRectPolygon,
    getPanelEditCircleRadius
  } = options

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

  return {
    getPanelEditGuideSegments,
    getPanelEditPanelBoundarySegments,
    getPanelEditLineSegmentsForSnap,
    getPanelEditRectangleSegmentsForSnap,
    getPanelEditMoveSelectedSnapSource,
    getPanelEditCircleSnapCandidates,
    getPanelEditTapeSnap
  }
} // End usePanelEditSnap
