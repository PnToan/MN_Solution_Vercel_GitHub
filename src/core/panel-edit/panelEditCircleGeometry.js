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
