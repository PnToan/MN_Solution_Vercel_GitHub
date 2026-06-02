//=================
export function clonePanelEditHistoryData(value) {
  return JSON.parse(JSON.stringify(value || null))
} // End clonePanelEditHistoryData

//=================
export function createEditPanelHistoryController(options = {}) {
  const {
    app,
    nextTick,
    panelEditTape,
    panelEditRect,
    panelEditLine,
    panelEditCircle,
    panelEditArc,
    panelEditHistory,
    resizePanelEditCanvas,
    clearPanelEditSelection,
    resetPanelEditMoveDraft,
    resetPanelEditSelectDrag
  } = options

  //=================
  function createSnapshot() {
    return {
      guides: clonePanelEditHistoryData(panelEditTape.value.guides || []),
      rectangles: clonePanelEditHistoryData(panelEditRect.value.rectangles || []),
      lines: clonePanelEditHistoryData(panelEditLine.value.lines || []),
      circles: clonePanelEditHistoryData(panelEditCircle.value.circles || [])
    }
  } // End createSnapshot

  //=================
  function restoreSnapshot(snapshot) {
    panelEditTape.value = {
      ...panelEditTape.value,
      hoverSnap: null,
      draft: null,
      inputBuffer: '',
      guides: clonePanelEditHistoryData(snapshot?.guides || [])
    }
    panelEditRect.value = {
      ...panelEditRect.value,
      hoverSnap: null,
      draft: null,
      pendingAction: null,
      rectangles: clonePanelEditHistoryData(snapshot?.rectangles || [])
    }
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverSnap: null,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null,
      lines: clonePanelEditHistoryData(snapshot?.lines || [])
    }
    panelEditCircle.value = {
      ...panelEditCircle.value,
      hoverSnap: null,
      draft: null,
      inputBuffer: '',
      circles: clonePanelEditHistoryData(snapshot?.circles || [])
    }
    panelEditArc.value = {
      ...panelEditArc.value,
      hoverSnap: null,
      hoverPoint: null,
      draft: null,
      inputBuffer: ''
    }
    clearPanelEditSelection()
    resetPanelEditMoveDraft()
    resetPanelEditSelectDrag()
  } // End restoreSnapshot

  //=================
  function pushSnapshot() {
    const history = panelEditHistory.value

    history.undoStack.push(createSnapshot())

    if (history.undoStack.length > history.max) {
      history.undoStack.shift()
    }

    history.redoStack = []
  } // End pushSnapshot

  //=================
  function clearHistory() {
    panelEditHistory.value = {
      undoStack: [],
      redoStack: [],
      max: panelEditHistory.value.max || 80
    }
  } // End clearHistory

  //=================
  function undoHistory() {
    const history = panelEditHistory.value
    const snapshot = history.undoStack.pop()

    if (!snapshot) {
      app.setStatus('Edit Panel: không còn bước để Undo')
      return false
    }

    history.redoStack.push(createSnapshot())
    restoreSnapshot(snapshot)
    app.setStatus('Edit Panel: Undo')
    nextTick(resizePanelEditCanvas)

    return true
  } // End undoHistory

  //=================
  function redoHistory() {
    const history = panelEditHistory.value
    const snapshot = history.redoStack.pop()

    if (!snapshot) {
      app.setStatus('Edit Panel: không còn bước để Redo')
      return false
    }

    history.undoStack.push(createSnapshot())
    restoreSnapshot(snapshot)
    app.setStatus('Edit Panel: Redo')
    nextTick(resizePanelEditCanvas)

    return true
  } // End redoHistory

  return {
    createSnapshot,
    restoreSnapshot,
    pushSnapshot,
    clearHistory,
    undoHistory,
    redoHistory
  }
} // End createEditPanelHistoryController
