//=================
function translateEditPanelMovePoint(point, delta) {
  return {
    x: Number(point?.x || 0) + Number(delta.x || 0),
    y: Number(point?.y || 0) + Number(delta.y || 0)
  }
} // End translateEditPanelMovePoint

//=================
function translateEditPanelMoveRectangle(rectangle, delta) {
  return {
    ...rectangle,
    start: translateEditPanelMovePoint(rectangle.start, delta),
    end: translateEditPanelMovePoint(rectangle.end, delta),
    polygon: Array.isArray(rectangle.polygon)
      ? rectangle.polygon.map((point) => translateEditPanelMovePoint(point, delta))
      : null
  }
} // End translateEditPanelMoveRectangle

//=================
function translateEditPanelMoveLine(line, delta) {
  return {
    ...line,
    start: translateEditPanelMovePoint(line.start, delta),
    end: translateEditPanelMovePoint(line.end, delta)
  }
} // End translateEditPanelMoveLine

//=================
function translateEditPanelMoveCircle(circle, delta) {
  return {
    ...circle,
    center: translateEditPanelMovePoint(circle.center, delta)
  }
} // End translateEditPanelMoveCircle

//=================
export function createEditPanelMoveController(deps = {}) {
  const {
    panelEditMove,
    panelEditSelection,
    panelEditLine,
    panelEditRect,
    panelEditCircle,
    drawing,
    app,
    nextTick,
    resizePanelEditCanvas,
    getPanelEditSelectedLineKeySet,
    getPanelEditLineSelectionKey,
    clonePanelEditHistoryData,
    pushPanelEditHistorySnapshot,
    drawPanelEditLine,
    drawPanelEditRectangle,
    drawPanelEditCircle
  } = deps

  //=================
  function reset() {
    panelEditMove.value = {
      stage: 'idle',
      start: null,
      current: null,
      hoverSnap: null,
      baseItems: []
    }
  } // End reset

  //=================
  function setHoverSnap(snap = null) {
    panelEditMove.value = {
      ...panelEditMove.value,
      hoverSnap: snap || null
    }
  } // End setHoverSnap

  //=================
  function getDelta() {
    const move = panelEditMove.value

    if (!move.start || !move.current) return { x: 0, y: 0 }

    return {
      x: Number(move.current.x || 0) - Number(move.start.x || 0),
      y: Number(move.current.y || 0) - Number(move.start.y || 0)
    }
  } // End getDelta

  //=================
  function getPreviewItems() {
    const delta = getDelta()
    const selectedLineKeys = getPanelEditSelectedLineKeySet()
    const selectedRectIds = new Set(panelEditSelection.value.items.filter((item) => item.type === 'rect').map((item) => item.id))
    const selectedCircleIds = new Set(panelEditSelection.value.items.filter((item) => item.type === 'circle').map((item) => item.id))

    return {
      lines: panelEditLine.value.lines
        .filter((line) => selectedLineKeys.has(getPanelEditLineSelectionKey(line)))
        .map((line) => translateEditPanelMoveLine(line, delta)),
      rectangles: panelEditRect.value.rectangles
        .filter((rectangle) => selectedRectIds.has(rectangle.id))
        .map((rectangle) => translateEditPanelMoveRectangle(rectangle, delta)),
      circles: panelEditCircle.value.circles
        .filter((circle) => selectedCircleIds.has(circle.id))
        .map((circle) => translateEditPanelMoveCircle(circle, delta))
    }
  } // End getPreviewItems

  //=================
  function isPreviewActive() {
    return drawing.state.panelEdit?.shapeTool === 'editPanelMove' && panelEditMove.value.stage === 'target'
  } // End isPreviewActive

  //=================
  function drawPreview(targetContext, context, layout) {
    if (!isPreviewActive()) return

    const preview = getPreviewItems()

    preview.lines.forEach((line) => drawPanelEditLine(targetContext, context, layout, line, { draft: true }))
    preview.rectangles.forEach((rectangle) => drawPanelEditRectangle(targetContext, context, layout, rectangle, { draft: true }))
    preview.circles.forEach((circle) => drawPanelEditCircle(targetContext, context, layout, circle, { draft: true }))
  } // End drawPreview

  //=================
  function updateTargetPoint(point, snap = null) {
    if (panelEditMove.value.stage !== 'target' || !point) return false

    panelEditMove.value = {
      ...panelEditMove.value,
      current: { ...point },
      hoverSnap: snap || null
    }

    return true
  } // End updateTargetPoint

  //=================
  function commit() {
    if (!isPreviewActive()) return false

    const delta = getDelta()

    if (Math.abs(delta.x) <= 0.001 && Math.abs(delta.y) <= 0.001) {
      reset()
      app.setStatus('Move: khoảng di chuyển bằng 0')
      resizePanelEditCanvas()
      return false
    }

    const selectedLineKeys = getPanelEditSelectedLineKeySet()
    const selectedRectIds = new Set(panelEditSelection.value.items.filter((item) => item.type === 'rect').map((item) => item.id))
    const selectedCircleIds = new Set(panelEditSelection.value.items.filter((item) => item.type === 'circle').map((item) => item.id))

    pushPanelEditHistorySnapshot()
    panelEditLine.value = {
      ...panelEditLine.value,
      lines: panelEditLine.value.lines.map((line) => selectedLineKeys.has(getPanelEditLineSelectionKey(line)) ? translateEditPanelMoveLine(line, delta) : line),
      hoverLine: null,
      hoverRegion: null
    }
    panelEditRect.value = {
      ...panelEditRect.value,
      rectangles: panelEditRect.value.rectangles.map((rectangle) => selectedRectIds.has(rectangle.id) ? translateEditPanelMoveRectangle(rectangle, delta) : rectangle)
    }
    panelEditCircle.value = {
      ...panelEditCircle.value,
      circles: panelEditCircle.value.circles.map((circle) => selectedCircleIds.has(circle.id) ? translateEditPanelMoveCircle(circle, delta) : circle)
    }
    reset()
    app.setStatus(`Move: đã di chuyển ${panelEditSelection.value.items.length} chi tiết`)
    nextTick(resizePanelEditCanvas)

    return true
  } // End commit

  //=================
  function cancel() {
    if (panelEditMove.value.stage !== 'target') return false

    reset()
    app.setStatus('Move: đã hủy di chuyển')
    resizePanelEditCanvas()

    return true
  } // End cancel

  //=================
  function start(point, snap = null) {
    if (!point || panelEditSelection.value.items.length === 0) return false

    panelEditMove.value = {
      stage: 'target',
      start: { ...point },
      current: { ...point },
      hoverSnap: snap || null,
      baseItems: clonePanelEditHistoryData(panelEditSelection.value.items)
    }
    app.setStatus('Move: rê chuột preview, click điểm 2 để hoàn tất | Shift khóa trục')
    resizePanelEditCanvas()

    return true
  } // End start

  return {
    reset,
    setHoverSnap,
    getDelta,
    getPreviewItems,
    isPreviewActive,
    drawPreview,
    updateTargetPoint,
    commit,
    cancel,
    start
  }
} // End createEditPanelMoveController
