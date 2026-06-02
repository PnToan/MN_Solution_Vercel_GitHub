//=================
function getPanelEditSavedStateKey(context) {
  if (!context) return null

  return `${context.faceKey || 'face'}:${context.faceSide || 'side'}`
} // End getPanelEditSavedStateKey

//=================
function clonePanelEditPoint(point) {
  return {
    x: Number(point?.x || 0),
    y: Number(point?.y || 0)
  }
} // End clonePanelEditPoint

//=================
export function createEditPanelPersistenceController({
  app,
  drawing,
  activePanelEditContext,
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  panelEditArc,
  clearPanelEditSelection,
  resetPanelEditMoveDraft,
  resetPanelEditSelectDrag,
  clearPanelEditHistory,
  draw
}) {
  //=================
  function resetLoadedState() {
    panelEditTape.value = {
      hoverSnap: null,
      draft: null,
      guides: [],
      inputBuffer: ''
    }
    panelEditRect.value = {
      hoverSnap: null,
      draft: null,
      pendingAction: null,
      rectangles: []
    }
    panelEditLine.value = {
      hoverSnap: null,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null,
      lines: []
    }
    panelEditCircle.value = {
      hoverSnap: null,
      draft: null,
      circles: [],
      inputBuffer: ''
    }
    panelEditArc.value = {
      hoverSnap: null,
      hoverPoint: null,
      draft: null,
      inputBuffer: ''
    }
    clearPanelEditSelection()
    resetPanelEditMoveDraft()
    resetPanelEditSelectDrag()
    clearPanelEditHistory()
  } // End resetLoadedState

  //=================
  function loadSavedState(context) {
    if (!context) {
      resetLoadedState()
      return
    }

    const panel = drawing.state.panels.find((item) => item.id === context.panelId) || null
    const stateKey = getPanelEditSavedStateKey(context)
    const savedState = stateKey ? panel?.editPanelData?.[stateKey] : null

    if (!savedState) {
      resetLoadedState()
      return
    }

    panelEditTape.value = {
      hoverSnap: null,
      draft: null,
      inputBuffer: '',
      guides: Array.isArray(savedState.guides)
        ? savedState.guides.map((guide) => ({
            id: guide.id || `guide-${Date.now()}-${Math.random()}`,
            axis: guide.axis,
            edge: guide.edge || null,
            baseValue: Number(guide.baseValue || 0),
            value: Number(guide.value || 0)
          }))
        : []
    }
    panelEditRect.value = {
      hoverSnap: null,
      draft: null,
      pendingAction: null,
      rectangles: Array.isArray(savedState.rectangles)
        ? savedState.rectangles.map((rectangle) => ({
            id: rectangle.id || `rect-${Date.now()}-${Math.random()}`,
            start: clonePanelEditPoint(rectangle.start),
            end: clonePanelEditPoint(rectangle.end),
            operation: rectangle.operation || 'none',
            source: rectangle.source || 'rectangle',
            regionKind: rectangle.regionKind || 'rect',
            shapeType: rectangle.shapeType || null,
            center: rectangle.center ? clonePanelEditPoint(rectangle.center) : null,
            radius: Number(rectangle.radius || 0),
            polygon: Array.isArray(rectangle.polygon)
              ? rectangle.polygon.map((point) => clonePanelEditPoint(point))
              : null
          }))
        : []
    }
    panelEditLine.value = {
      hoverSnap: null,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null,
      lines: Array.isArray(savedState.lines)
        ? savedState.lines.map((line) => ({
            id: line.id || `line-${Date.now()}-${Math.random()}`,
            groupId: line.groupId || null,
            groupType: line.groupType || null,
            axis: line.axis || 'free',
            start: clonePanelEditPoint(line.start),
            end: clonePanelEditPoint(line.end)
          }))
        : []
    }
    panelEditCircle.value = {
      hoverSnap: null,
      draft: null,
      inputBuffer: '',
      circles: Array.isArray(savedState.circles)
        ? savedState.circles.map((circle) => ({
            id: circle.id || `circle-${Date.now()}-${Math.random()}`,
            center: clonePanelEditPoint(circle.center),
            radius: Number(circle.radius || 0)
          })).filter((circle) => circle.radius > 0)
        : []
    }
    panelEditArc.value = {
      hoverSnap: null,
      hoverPoint: null,
      draft: null,
      inputBuffer: ''
    }
    clearPanelEditSelection()
    resetPanelEditMoveDraft()
    resetPanelEditSelectDrag()
    clearPanelEditHistory()
  } // End loadSavedState

  //=================
  function getSavedRectanglesForApply() {
    return (panelEditRect.value.rectangles || []).map((rectangle) => ({
      id: rectangle.id,
      start: clonePanelEditPoint(rectangle.start),
      end: clonePanelEditPoint(rectangle.end),
      operation: rectangle.operation || 'none',
      source: rectangle.source || 'rectangle',
      regionKind: rectangle.regionKind || 'rect',
      shapeType: rectangle.shapeType || null,
      center: rectangle.center ? clonePanelEditPoint(rectangle.center) : null,
      radius: Number(rectangle.radius || 0),
      polygon: Array.isArray(rectangle.polygon)
        ? rectangle.polygon.map((point) => clonePanelEditPoint(point))
        : null
    }))
  } // End getSavedRectanglesForApply

  //=================
  function getSavedLinesForApply() {
    return (panelEditLine.value.lines || []).map((line) => ({
      id: line.id,
      groupId: line.groupId || null,
      groupType: line.groupType || null,
      axis: line.axis || 'free',
      start: clonePanelEditPoint(line.start),
      end: clonePanelEditPoint(line.end)
    }))
  } // End getSavedLinesForApply

  //=================
  function getSavedCirclesForApply() {
    return (panelEditCircle.value.circles || []).map((circle) => ({
      id: circle.id,
      center: clonePanelEditPoint(circle.center),
      radius: Number(circle.radius || 0)
    })).filter((circle) => circle.radius > 0)
  } // End getSavedCirclesForApply

  //=================
  function getSavedGuidesForApply() {
    return (panelEditTape.value.guides || []).map((guide) => ({
      id: guide.id,
      axis: guide.axis,
      edge: guide.edge || null,
      baseValue: Number(guide.baseValue || 0),
      value: Number(guide.value || 0)
    }))
  } // End getSavedGuidesForApply

  //=================
  function applyPanelEdit() {
    const context = activePanelEditContext.value

    if (!context) return

    drawing.applyPanelEditOperations({
      panelId: context.panelId,
      faceSide: context.faceSide,
      faceKey: context.faceKey,
      axisU: context.axisU,
      axisV: context.axisV,
      thicknessAxis: context.thicknessAxis,
      rectangles: getSavedRectanglesForApply(),
      lines: getSavedLinesForApply(),
      circles: getSavedCirclesForApply(),
      guides: getSavedGuidesForApply()
    })

    panelEditTape.value = {
      hoverSnap: null,
      draft: null,
      guides: [],
      inputBuffer: ''
    }
    panelEditRect.value = {
      hoverSnap: null,
      draft: null,
      pendingAction: null,
      rectangles: []
    }
    panelEditLine.value = {
      hoverSnap: null,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null,
      lines: []
    }
    panelEditCircle.value = {
      hoverSnap: null,
      draft: null,
      circles: [],
      inputBuffer: ''
    }
    clearPanelEditHistory()
    drawing.clearPanelEdit()
    app.setTool('select')
    app.setStatus('Edit Panel: cập nhật thành công')
    draw()
  } // End applyPanelEdit

  return {
    getSavedStateKey: getPanelEditSavedStateKey,
    loadSavedState,
    applyPanelEdit
  }
} // End createEditPanelPersistenceController
