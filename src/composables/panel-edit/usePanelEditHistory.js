import { nextTick } from 'vue'

//=================
export function usePanelEditHistory(options) {
  const {
    app,
    panelEditTape,
    panelEditRect,
    panelEditLine,
    panelEditCircle,
    panelEditArc,
    panelEditHistory,
    clearPanelEditSelection,
    resetPanelEditMoveDraft,
    resetPanelEditSelectDrag,
    resizePanelEditCanvas
  } = options

  //=================
  function clonePanelEditHistoryData(value) {
    return JSON.parse(JSON.stringify(value || null))
  } // End clonePanelEditHistoryData

  //=================
  function createPanelEditHistorySnapshot() {
    return {
      guides: clonePanelEditHistoryData(panelEditTape.value.guides || []),
      rectangles: clonePanelEditHistoryData(panelEditRect.value.rectangles || []),
      lines: clonePanelEditHistoryData(panelEditLine.value.lines || []),
      circles: clonePanelEditHistoryData(panelEditCircle.value.circles || [])
    }
  } // End createPanelEditHistorySnapshot

  //=================
  function restorePanelEditHistorySnapshot(snapshot) {
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
  } // End restorePanelEditHistorySnapshot

  //=================
  function pushPanelEditHistorySnapshot() {
    const history = panelEditHistory.value

    history.undoStack.push(createPanelEditHistorySnapshot())

    if (history.undoStack.length > history.max) {
      history.undoStack.shift()
    }

    history.redoStack = []
  } // End pushPanelEditHistorySnapshot

  //=================
  function clearPanelEditHistory() {
    panelEditHistory.value = {
      undoStack: [],
      redoStack: [],
      max: panelEditHistory.value.max || 80
    }
  } // End clearPanelEditHistory

  //=================
  function undoPanelEditHistory() {
    const history = panelEditHistory.value
    const snapshot = history.undoStack.pop()

    if (!snapshot) {
      app.setStatus('Edit Panel: không còn bước để Undo')
      return false
    }

    history.redoStack.push(createPanelEditHistorySnapshot())
    restorePanelEditHistorySnapshot(snapshot)
    app.setStatus('Edit Panel: Undo')
    nextTick(resizePanelEditCanvas)

    return true
  } // End undoPanelEditHistory

  //=================
  function redoPanelEditHistory() {
    const history = panelEditHistory.value
    const snapshot = history.redoStack.pop()

    if (!snapshot) {
      app.setStatus('Edit Panel: không còn bước để Redo')
      return false
    }

    history.undoStack.push(createPanelEditHistorySnapshot())
    restorePanelEditHistorySnapshot(snapshot)
    app.setStatus('Edit Panel: Redo')
    nextTick(resizePanelEditCanvas)

    return true
  } // End redoPanelEditHistory

  return {
    clonePanelEditHistoryData,
    createPanelEditHistorySnapshot,
    restorePanelEditHistorySnapshot,
    pushPanelEditHistorySnapshot,
    clearPanelEditHistory,
    undoPanelEditHistory,
    redoPanelEditHistory
  }
} // End usePanelEditHistory
