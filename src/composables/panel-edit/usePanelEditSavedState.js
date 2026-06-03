//=================
function getPanelEditSavedStateKey(context) {
  if (!context) return null

  return `${context.faceKey || 'face'}:${context.faceSide || 'side'}`
} // End getPanelEditSavedStateKey

//=================
function clonePanelEditSavedPoint(point) {
  return {
    x: Number(point?.x || 0),
    y: Number(point?.y || 0)
  }
} // End clonePanelEditSavedPoint

//=================
export function usePanelEditSavedState(options = {}) {
  const {
    drawing,
    panelEditTape,
    panelEditRect,
    panelEditLine,
    panelEditCircle,
    panelEditArc,
    clearPanelEditSelection,
    resetPanelEditMoveDraft,
    resetPanelEditSelectDrag,
    clearPanelEditHistory
  } = options

  //=================
  function resetPanelEditSavedState() {
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
  } // End resetPanelEditSavedState

  //=================
  function loadPanelEditSavedState(context) {
    if (!context) {
      resetPanelEditSavedState()
      return
    }

    const panel = drawing.state.panels.find((item) => item.id === context.panelId) || null
    const stateKey = getPanelEditSavedStateKey(context)
    const savedState = stateKey ? panel?.editPanelData?.[stateKey] : null

    if (!savedState) {
      resetPanelEditSavedState()
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
            start: clonePanelEditSavedPoint(rectangle.start),
            end: clonePanelEditSavedPoint(rectangle.end),
            operation: rectangle.operation || 'none',
            source: rectangle.source || 'rectangle',
            regionKind: rectangle.regionKind || 'rect',
            shapeType: rectangle.shapeType || null,
            center: rectangle.center ? clonePanelEditSavedPoint(rectangle.center) : null,
            radius: Number(rectangle.radius || 0),
            polygon: Array.isArray(rectangle.polygon)
              ? rectangle.polygon.map((point) => clonePanelEditSavedPoint(point))
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
            start: clonePanelEditSavedPoint(line.start),
            end: clonePanelEditSavedPoint(line.end)
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
            center: clonePanelEditSavedPoint(circle.center),
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
  } // End loadPanelEditSavedState

  return {
    loadPanelEditSavedState
  }
} // End usePanelEditSavedState
