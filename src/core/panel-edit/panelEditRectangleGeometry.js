//=================
export function getPanelEditPolygonBounds(points) {
  const safePoints = Array.isArray(points) ? points : []
  const xs = safePoints.map((point) => Number(point.x || 0))
  const ys = safePoints.map((point) => Number(point.y || 0))
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
export function getPanelEditRectangleRegion(rectangle, index) {
  const bounds = Array.isArray(rectangle?.polygon) && rectangle.polygon.length >= 3
    ? getPanelEditPolygonBounds(rectangle.polygon)
    : getPanelEditRectBounds(rectangle)

  if (bounds.width <= 0.01 || bounds.height <= 0.01) return null

  return {
    id: `rectangle-region-${rectangle.id || index}`,
    source: 'rectangleRegion',
    sourceId: rectangle.id || null,
    regionKind: Array.isArray(rectangle?.polygon) && rectangle.polygon.length >= 3 ? 'polygon' : 'rect',
    polygon: Array.isArray(rectangle?.polygon) && rectangle.polygon.length >= 3
      ? rectangle.polygon.map((point) => ({ x: Number(point.x || 0), y: Number(point.y || 0) }))
      : null,
    start: { x: bounds.x, y: bounds.y },
    end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    operation: rectangle.operation || 'none'
  }
} // End getPanelEditRectangleRegion
