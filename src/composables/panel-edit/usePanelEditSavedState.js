import {
  transformPanelEditCircles,
  transformPanelEditGuides,
  transformPanelEditLines,
  transformPanelEditRectangles
} from '../../core/panel-edit/panelEditFaceTransform'

//=================
function getPanelEditSavedStateKey(context) {
  if (!context) return null

  return `${context.faceKey || 'face'}:physical`
} // End getPanelEditSavedStateKey

//=================
function getPanelEditLegacyStateKeys(context) {
  if (!context) return []

  const faceKey = context.faceKey || 'face'
  const faceSide = context.faceSide || 'side'
  const oppositeMap = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
    front: 'back',
    back: 'front'
  }
  const oppositeSide = oppositeMap[faceSide] || null
  const keys = [`${faceKey}:${faceSide}`]

  if (oppositeSide) keys.push(`${faceKey}:${oppositeSide}`)

  return keys
} // End getPanelEditLegacyStateKeys

//=================
function getPanelEditSavedState(panel, context) {
  const data = panel?.editPanelData || {}
  const stateKey = getPanelEditSavedStateKey(context)
  const canonicalState = stateKey ? data[stateKey] : null

  if (canonicalState) return canonicalState

  const legacyKeys = getPanelEditLegacyStateKeys(context)

  for (const legacyKey of legacyKeys) {
    if (data[legacyKey]) return data[legacyKey]
  }

  return null
} // End getPanelEditSavedState

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
    const savedState = getPanelEditSavedState(panel, context)

    if (!savedState) {
      resetPanelEditSavedState()
      return
    }

    const sourceFaceSide = savedState.faceSide || context.faceSide
    const targetFaceSide = context.faceSide
    const transformedGuides = transformPanelEditGuides(savedState.guides, context, sourceFaceSide, targetFaceSide)
    const transformedRectangles = transformPanelEditRectangles(savedState.rectangles, context, sourceFaceSide, targetFaceSide)
    const transformedLines = transformPanelEditLines(savedState.lines, context, sourceFaceSide, targetFaceSide)
    const transformedCircles = transformPanelEditCircles(savedState.circles, context, sourceFaceSide, targetFaceSide)

    panelEditTape.value = {
      hoverSnap: null,
      draft: null,
      inputBuffer: '',
      guides: Array.isArray(transformedGuides)
        ? transformedGuides.map((guide) => ({
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
      rectangles: Array.isArray(transformedRectangles)
        ? transformedRectangles.map((rectangle) => ({
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
      lines: Array.isArray(transformedLines)
        ? transformedLines.map((line) => ({
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
      circles: Array.isArray(transformedCircles)
        ? transformedCircles.map((circle) => ({
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
