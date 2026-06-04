//=================
export function usePanelEditLineHit({
  panelEditLine,
  getPanelEditPoint,
  getPanelEditLocalFromScreen
}) {
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

    if (lengthSq <= 0.0001) {
      return {
        x: x1,
        y: y1,
        distance: Math.hypot(local.x - x1, local.y - y1)
      }
    }

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
  function getPanelEditLineSelectionKey(line) {
    if (!line) return null

    return line.groupId || line.id || null
  } // End getPanelEditLineSelectionKey

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

  return {
    getClosestPointOnPanelEditLine,
    getPanelEditLineSelectionKey,
    getPanelEditLineHit
  }
} // End usePanelEditLineHit
