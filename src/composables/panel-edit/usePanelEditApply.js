//=================
export function usePanelEditApply(options) {
  const activePanelEditContext = options.activePanelEditContext
  const panelEditTape = options.panelEditTape
  const panelEditRect = options.panelEditRect
  const panelEditLine = options.panelEditLine
  const panelEditCircle = options.panelEditCircle
  const drawing = options.drawing
  const app = options.app
  const draw = options.draw
  const clearPanelEditHistory = options.clearPanelEditHistory
  const getPanelEditSavedRectanglesForApply = options.getPanelEditSavedRectanglesForApply
  const getPanelEditSavedLinesForApply = options.getPanelEditSavedLinesForApply
  const getPanelEditSavedCirclesForApply = options.getPanelEditSavedCirclesForApply
  const getPanelEditSavedGuidesForApply = options.getPanelEditSavedGuidesForApply

  //=================
  function applyPanelEdit() {
    const context = activePanelEditContext.value

    if (!context) return

    const savedRectangles = getPanelEditSavedRectanglesForApply()
    const savedLines = getPanelEditSavedLinesForApply()
    const savedCircles = getPanelEditSavedCirclesForApply()
    const savedGuides = getPanelEditSavedGuidesForApply()

    drawing.applyPanelEditOperations({
      panelId: context.panelId,
      faceSide: context.faceSide,
      faceKey: context.faceKey,
      axisU: context.axisU,
      axisV: context.axisV,
      thicknessAxis: context.thicknessAxis,
      rectangles: savedRectangles,
      lines: savedLines,
      circles: savedCircles,
      guides: savedGuides
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
    applyPanelEdit
  }
} // End usePanelEditApply
