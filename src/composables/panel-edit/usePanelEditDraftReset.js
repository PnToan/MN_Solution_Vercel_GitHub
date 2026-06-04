//=================
export function usePanelEditDraftReset(options) {
  const {
    panelEditTape,
    panelEditRect,
    panelEditLine,
    panelEditCircle,
    panelEditArc,
    panelEditSelectDrag,
    resetPanelEditMoveDraft
  } = options

  //=================
  function resetPanelEditTapeDraft() {
    panelEditTape.value = {
      ...panelEditTape.value,
      draft: null,
      inputBuffer: ''
    }
  } // End resetPanelEditTapeDraft

  //=================
  function resetPanelEditRectDraft() {
    panelEditRect.value = {
      ...panelEditRect.value,
      hoverSnap: null,
      draft: null,
      pendingAction: null
    }
  } // End resetPanelEditRectDraft

  //=================
  function resetPanelEditLineDraft() {
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverSnap: null,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null
    }
  } // End resetPanelEditLineDraft

  //=================
  function resetPanelEditCircleDraft() {
    panelEditCircle.value = {
      ...panelEditCircle.value,
      hoverSnap: null,
      draft: null,
      inputBuffer: ''
    }
  } // End resetPanelEditCircleDraft

  //=================
  function resetPanelEditArcDraft() {
    panelEditArc.value = {
      ...panelEditArc.value,
      hoverSnap: null,
      hoverPoint: null,
      draft: null,
      inputBuffer: ''
    }
  } // End resetPanelEditArcDraft

  //=================
  function resetPanelEditSelectDrag() {
    panelEditSelectDrag.value = {
      active: false,
      start: null,
      current: null,
      moved: false
    }
  } // End resetPanelEditSelectDrag

  //=================
  function resetPanelEditCommandDrafts() {
    resetPanelEditTapeDraft()
    resetPanelEditRectDraft()
    resetPanelEditLineDraft()
    resetPanelEditCircleDraft()
    resetPanelEditArcDraft()
    resetPanelEditMoveDraft()
    resetPanelEditSelectDrag()
  } // End resetPanelEditCommandDrafts

  return {
    resetPanelEditTapeDraft,
    resetPanelEditRectDraft,
    resetPanelEditLineDraft,
    resetPanelEditCircleDraft,
    resetPanelEditArcDraft,
    resetPanelEditSelectDrag,
    resetPanelEditCommandDrafts
  }
} // End usePanelEditDraftReset
