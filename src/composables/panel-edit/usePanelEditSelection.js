//=================
export function usePanelEditSelection(options = {}) {
  const {
    panelEditCanvasRef,
    panelEditSelection,
    panelEditSelectDrag,
    panelEditLine,
    panelEditRect,
    panelEditCircle,
    getPanelEditLocalFromScreen,
    getPanelEditLineSelectionKey,
    getPanelEditPolygonBounds,
    getPanelEditRectBounds,
    getPanelEditCircleRadius,
    getPanelEditCircleBounds
  } = options

  //=================
  function getPanelEditSelectionItemKey(item) {
    if (!item) return null

    return `${item.type}:${item.key || item.id}`
  } // End getPanelEditSelectionItemKey

  //=================
  function normalizePanelEditSelectionItems(items = []) {
    const seen = new Set()
    const output = []

    items.forEach((item) => {
      const key = getPanelEditSelectionItemKey(item)

      if (!key || seen.has(key)) return

      seen.add(key)
      output.push({ ...item })
    })

    return output
  } // End normalizePanelEditSelectionItems

  //=================
  function setPanelEditSelection(items = []) {
    const nextItems = normalizePanelEditSelectionItems(items)
    const firstLine = nextItems.find((item) => item.type === 'line')

    panelEditSelection.value = {
      ...panelEditSelection.value,
      items: nextItems
    }
    panelEditLine.value = {
      ...panelEditLine.value,
      selectedLineId: firstLine?.key || null
    }
  } // End setPanelEditSelection

  //=================
  function clearPanelEditSelection() {
    panelEditSelection.value = {
      ...panelEditSelection.value,
      items: []
    }
    panelEditLine.value = {
      ...panelEditLine.value,
      selectedLineId: null
    }
  } // End clearPanelEditSelection

  //=================
  function getPanelEditSelectedLineKeySet() {
    return new Set(
      panelEditSelection.value.items
        .filter((item) => item.type === 'line')
        .map((item) => item.key)
    )
  } // End getPanelEditSelectedLineKeySet

  //=================
  function isPanelEditRectangleSelected(rectangle) {
    return panelEditSelection.value.items.some((item) => item.type === 'rect' && item.id === rectangle?.id)
  } // End isPanelEditRectangleSelected

  //=================
  function isPanelEditCircleSelected(circle) {
    return panelEditSelection.value.items.some((item) => item.type === 'circle' && item.id === circle?.id)
  } // End isPanelEditCircleSelected

  //=================
  function isPanelEditSelectionItemEqual(a, b) {
    if (!a || !b || a.type !== b.type) return false

    if (a.type === 'line') return a.key === b.key

    return a.id === b.id
  } // End isPanelEditSelectionItemEqual

  //=================
  function isPanelEditRectangleHovered(rectangle) {
    return isPanelEditSelectionItemEqual(panelEditSelection.value.hoverItem, { type: 'rect', id: rectangle?.id })
  } // End isPanelEditRectangleHovered

  //=================
  function isPanelEditCircleHovered(circle) {
    return isPanelEditSelectionItemEqual(panelEditSelection.value.hoverItem, { type: 'circle', id: circle?.id })
  } // End isPanelEditCircleHovered

  //=================
  function setPanelEditHoverItem(item = null) {
    panelEditSelection.value = {
      ...panelEditSelection.value,
      hoverItem: item ? { ...item } : null
    }
  } // End setPanelEditHoverItem

  //=================
  function getPanelEditRectangleHit(local) {
    if (!local) return null

    for (let index = panelEditRect.value.rectangles.length - 1; index >= 0; index -= 1) {
      const rectangle = panelEditRect.value.rectangles[index]
      const bounds = Array.isArray(rectangle?.polygon) && rectangle.polygon.length >= 3
        ? getPanelEditPolygonBounds(rectangle.polygon)
        : getPanelEditRectBounds(rectangle)

      if (!bounds) continue

      const inside = local.x >= bounds.x
        && local.x <= bounds.x + bounds.width
        && local.y >= bounds.y
        && local.y <= bounds.y + bounds.height

      if (inside) return { type: 'rect', id: rectangle.id }
    }

    return null
  } // End getPanelEditRectangleHit

  //=================
  function getPanelEditCircleHit(local) {
    if (!local) return null

    for (let index = panelEditCircle.value.circles.length - 1; index >= 0; index -= 1) {
      const circle = panelEditCircle.value.circles[index]
      const radius = getPanelEditCircleRadius(circle)

      if (!circle?.center || radius <= 0) continue

      const distance = Math.hypot(local.x - Number(circle.center.x || 0), local.y - Number(circle.center.y || 0))

      if (distance <= radius) return { type: 'circle', id: circle.id }
    }

    return null
  } // End getPanelEditCircleHit

  //=================
  function getPanelEditPointerLocal(context, layout, event) {
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
  function getPanelEditHoverItem(context, layout, event, lineHit = null) {
    if (lineHit) return { type: 'line', key: getPanelEditLineSelectionKey(lineHit) }

    const local = getPanelEditPointerLocal(context, layout, event)

    return getPanelEditCircleHit(local) || getPanelEditRectangleHit(local)
  } // End getPanelEditHoverItem

  //=================
  function getPanelEditSelectDragRectFromPoints(start, current) {
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
  function getPanelEditSelectDragRect() {
    const drag = panelEditSelectDrag.value

    return getPanelEditSelectDragRectFromPoints(drag.start, drag.current)
  } // End getPanelEditSelectDragRect

  //=================
  function panelEditBoundsTouch(boundsA, boundsB) {
    if (!boundsA || !boundsB) return false

    return boundsA.x <= boundsB.x + boundsB.width
      && boundsA.x + boundsA.width >= boundsB.x
      && boundsA.y <= boundsB.y + boundsB.height
      && boundsA.y + boundsA.height >= boundsB.y
  } // End panelEditBoundsTouch

  //=================
  function getPanelEditLineBounds(line) {
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
  function getPanelEditSelectionByRect(selectionRect) {
    if (!selectionRect || selectionRect.width <= 0.01 || selectionRect.height <= 0.01) return []

    const items = []

    panelEditLine.value.lines.forEach((line) => {
      const lineBounds = getPanelEditLineBounds(line)

      if (!panelEditBoundsTouch(selectionRect, lineBounds)) return

      items.push({
        type: 'line',
        key: getPanelEditLineSelectionKey(line)
      })
    })

    panelEditRect.value.rectangles.forEach((rectangle) => {
      const bounds = Array.isArray(rectangle?.polygon) && rectangle.polygon.length >= 3
        ? getPanelEditPolygonBounds(rectangle.polygon)
        : getPanelEditRectBounds(rectangle)

      if (!panelEditBoundsTouch(selectionRect, bounds)) return

      items.push({ type: 'rect', id: rectangle.id })
    })

    panelEditCircle.value.circles.forEach((circle) => {
      const bounds = getPanelEditCircleBounds(circle)

      if (!panelEditBoundsTouch(selectionRect, bounds)) return

      items.push({ type: 'circle', id: circle.id })
    })

    return normalizePanelEditSelectionItems(items)
  } // End getPanelEditSelectionByRect

  return {
    getPanelEditSelectionItemKey,
    normalizePanelEditSelectionItems,
    setPanelEditSelection,
    clearPanelEditSelection,
    getPanelEditSelectedLineKeySet,
    isPanelEditRectangleSelected,
    isPanelEditCircleSelected,
    isPanelEditSelectionItemEqual,
    isPanelEditRectangleHovered,
    isPanelEditCircleHovered,
    setPanelEditHoverItem,
    getPanelEditRectangleHit,
    getPanelEditCircleHit,
    getPanelEditHoverItem,
    getPanelEditPointerLocal,
    getPanelEditSelectDragRectFromPoints,
    getPanelEditSelectDragRect,
    panelEditBoundsTouch,
    getPanelEditLineBounds,
    getPanelEditSelectionByRect
  }
} // End usePanelEditSelection
