//=================
export function getPanelEditArcDefaultBulge(start, end) {
  if (!start || !end) return null

  const dx = Number(end.x || 0) - Number(start.x || 0)
  const dy = Number(end.y || 0) - Number(start.y || 0)
  const length = Math.hypot(dx, dy)

  if (length <= 0.01) return null

  const midX = (Number(start.x || 0) + Number(end.x || 0)) / 2
  const midY = (Number(start.y || 0) + Number(end.y || 0)) / 2
  const sagitta = length * (1 / Math.sqrt(2) - 0.5)

  return {
    x: midX + (dy / length) * sagitta,
    y: midY - (dx / length) * sagitta
  }
} // End getPanelEditArcDefaultBulge

//=================
export function getPanelEditArcEndFromRadius(start, current, radius) {
  if (!start || !current) return null

  const parsedRadius = Number(radius)
  const dx = Number(current.x || 0) - Number(start.x || 0)
  const dy = Number(current.y || 0) - Number(start.y || 0)
  const length = Math.hypot(dx, dy)

  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0 || length <= 0.01) return null

  const chordLength = parsedRadius * Math.sqrt(2)

  return {
    x: Number(start.x || 0) + (dx / length) * chordLength,
    y: Number(start.y || 0) + (dy / length) * chordLength
  }
} // End getPanelEditArcEndFromRadius

//=================
export function getPanelEditArcBulgeFromRadius(start, end, radius, referencePoint = null) {
  if (!start || !end) return null

  const parsedRadius = Number(radius)
  const startX = Number(start.x || 0)
  const startY = Number(start.y || 0)
  const endX = Number(end.x || 0)
  const endY = Number(end.y || 0)
  const dx = endX - startX
  const dy = endY - startY
  const chordLength = Math.hypot(dx, dy)

  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0 || chordLength <= 0.01) return null
  if (parsedRadius < chordLength / 2 - 0.001) return null

  const halfChord = chordLength / 2
  const centerDistance = Math.sqrt(Math.max(0, parsedRadius * parsedRadius - halfChord * halfChord))
  const sagitta = parsedRadius - centerDistance

  if (!Number.isFinite(sagitta) || sagitta <= 0) return null

  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2
  const normalX = dy / chordLength
  const normalY = -dx / chordLength
  let side = 1

  if (referencePoint) {
    const refX = Number(referencePoint.x || 0) - midX
    const refY = Number(referencePoint.y || 0) - midY
    const dot = refX * normalX + refY * normalY

    if (dot < 0) side = -1
  }

  return {
    x: midX + normalX * sagitta * side,
    y: midY + normalY * sagitta * side
  }
} // End getPanelEditArcBulgeFromRadius

//=================
export function getPanelEditArcDraftWithRadiusInput(draft, inputBuffer) {
  if (!draft?.start) return draft

  const radiusText = String(inputBuffer ?? '').trim()

  if (radiusText === '') return draft

  const radius = Number(radiusText)
  const directionPoint = draft.stage === 'bulge'
    ? (draft.end || draft.current)
    : draft.current
  const endPoint = getPanelEditArcEndFromRadius(draft.start, directionPoint, radius)

  if (!endPoint) return draft

  if (draft.stage === 'bulge') {
    const fixedEnd = draft.end || draft.current
    const fixedBulge = getPanelEditArcBulgeFromRadius(draft.start, fixedEnd, radius, draft.current || draft.bulge)

    if (!fixedEnd || !fixedBulge) return draft

    return {
      ...draft,
      end: fixedEnd,
      current: fixedBulge,
      radiusLocked: true
    }
  }

  return {
    ...draft,
    end: endPoint
  }
} // End getPanelEditArcDraftWithRadiusInput

//=================
export function getPanelEditCircleFromThreePoints(pointA, pointB, pointC) {
  if (!pointA || !pointB || !pointC) return null

  const ax = Number(pointA.x || 0)
  const ay = Number(pointA.y || 0)
  const bx = Number(pointB.x || 0)
  const by = Number(pointB.y || 0)
  const cx = Number(pointC.x || 0)
  const cy = Number(pointC.y || 0)
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))

  if (Math.abs(d) <= 0.000001) return null

  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
  const radius = Math.hypot(ax - ux, ay - uy)

  if (!Number.isFinite(radius) || radius <= 0.01) return null

  return { center: { x: ux, y: uy }, radius }
} // End getPanelEditCircleFromThreePoints

//=================
export function normalizePanelEditAngle(angle) {
  const full = Math.PI * 2
  let result = angle % full

  if (result < 0) result += full

  return result
} // End normalizePanelEditAngle

//=================
export function getPanelEditAngleDelta(startAngle, endAngle, clockwise = false) {
  const full = Math.PI * 2
  let delta = normalizePanelEditAngle(endAngle - startAngle)

  if (clockwise) {
    delta = delta === 0 ? full : delta
    return delta - full
  }

  return delta === 0 ? full : delta
} // End getPanelEditAngleDelta

//=================
export function isPanelEditAngleBetween(startAngle, testAngle, endAngle, clockwise = false) {
  if (clockwise) {
    return normalizePanelEditAngle(startAngle - testAngle) <= normalizePanelEditAngle(startAngle - endAngle) + 0.000001
  }

  return normalizePanelEditAngle(testAngle - startAngle) <= normalizePanelEditAngle(endAngle - startAngle) + 0.000001
} // End isPanelEditAngleBetween

//=================
export function getPanelEditArcData(draft) {
  if (!draft?.start) return null

  const start = draft.start
  const end = draft.end || draft.current
  const bulge = draft.stage === 'bulge'
    ? (draft.current || draft.bulge || getPanelEditArcDefaultBulge(start, end))
    : getPanelEditArcDefaultBulge(start, end)

  if (!end || !bulge) return null

  const circle = getPanelEditCircleFromThreePoints(start, bulge, end)

  if (!circle) return null

  const startAngle = Math.atan2(Number(start.y || 0) - circle.center.y, Number(start.x || 0) - circle.center.x)
  const endAngle = Math.atan2(Number(end.y || 0) - circle.center.y, Number(end.x || 0) - circle.center.x)
  const bulgeAngle = Math.atan2(Number(bulge.y || 0) - circle.center.y, Number(bulge.x || 0) - circle.center.x)
  const clockwise = isPanelEditAngleBetween(startAngle, bulgeAngle, endAngle, false) ? false : true
  const delta = getPanelEditAngleDelta(startAngle, endAngle, clockwise)
  const sweep = Math.abs(delta)
  const degree = sweep * 180 / Math.PI
  const isQuarterOrHalf = Math.abs(degree - 90) <= 4 || Math.abs(degree - 180) <= 4

  return {
    ...circle,
    start: { x: Number(start.x || 0), y: Number(start.y || 0) },
    end: { x: Number(end.x || 0), y: Number(end.y || 0) },
    bulge: { x: Number(bulge.x || 0), y: Number(bulge.y || 0) },
    startAngle,
    endAngle,
    clockwise,
    delta,
    sweep,
    isQuarterOrHalf
  }
} // End getPanelEditArcData

//=================
export function getPanelEditArcSegmentCount(arcData, fallbackSegmentCount = 24) {
  if (!arcData || !Number.isFinite(Number(arcData.radius)) || !Number.isFinite(Number(arcData.sweep))) {
    return Math.max(6, Math.ceil(Number(fallbackSegmentCount || 24)))
  }

  const radius = Math.max(0, Number(arcData.radius || 0))
  const sweepRatio = Math.max(0, Math.abs(Number(arcData.sweep || 0)) / Math.PI)
  const smoothCount = radius * 1.2 * sweepRatio
  const fallbackCount = Number(fallbackSegmentCount || 24) * sweepRatio
  const rawCount = Math.max(smoothCount, fallbackCount, 6)

  return Math.ceil(rawCount / 6) * 6
} // End getPanelEditArcSegmentCount

//=================
export function getPanelEditArcPoints(draft, segmentCount = 24) {
  const arcData = getPanelEditArcData(draft)

  if (!arcData) return []

  const count = getPanelEditArcSegmentCount(arcData, segmentCount)
  const points = []

  for (let index = 0; index <= count; index += 1) {
    const ratioValue = index / count
    const angle = arcData.startAngle + arcData.delta * ratioValue

    points.push({
      x: Math.round((arcData.center.x + Math.cos(angle) * arcData.radius) * 1000) / 1000,
      y: Math.round((arcData.center.y + Math.sin(angle) * arcData.radius) * 1000) / 1000
    })
  }

  points[0] = { ...arcData.start }
  points[points.length - 1] = { ...arcData.end }

  return points
} // End getPanelEditArcPoints
