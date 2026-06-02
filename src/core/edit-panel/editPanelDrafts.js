//=================
export function createEditPanelDraftController({
  panelEditTape,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  panelEditArc,
  panelEditSelectDrag,
  panelEditMoveController
}) {
  //=================
  function resetTapeDraft() {
    panelEditTape.value = {
      ...panelEditTape.value,
      draft: null,
      inputBuffer: ''
    }
  } // End resetTapeDraft

  //=================
  function resetRectDraft() {
    panelEditRect.value = {
      ...panelEditRect.value,
      hoverSnap: null,
      draft: null,
      pendingAction: null
    }
  } // End resetRectDraft

  //=================
  function resetLineDraft() {
    panelEditLine.value = {
      ...panelEditLine.value,
      hoverSnap: null,
      hoverRegion: null,
      hoverLine: null,
      selectedLineId: null,
      draft: null
    }
  } // End resetLineDraft

  //=================
  function resetCircleDraft() {
    panelEditCircle.value = {
      ...panelEditCircle.value,
      hoverSnap: null,
      draft: null,
      inputBuffer: ''
    }
  } // End resetCircleDraft

  //=================
  function resetArcDraft() {
    panelEditArc.value = {
      ...panelEditArc.value,
      hoverSnap: null,
      hoverPoint: null,
      draft: null,
      inputBuffer: ''
    }
  } // End resetArcDraft

  //=================
  function resetMoveDraft() {
    panelEditMoveController.reset()
  } // End resetMoveDraft

  //=================
  function resetSelectDrag() {
    panelEditSelectDrag.value = {
      active: false,
      start: null,
      current: null,
      moved: false
    }
  } // End resetSelectDrag

  //=================
  function resetCommandDrafts() {
    resetTapeDraft()
    resetRectDraft()
    resetLineDraft()
    resetCircleDraft()
    resetArcDraft()
    resetMoveDraft()
    resetSelectDrag()
  } // End resetCommandDrafts

  return {
    resetTapeDraft,
    resetRectDraft,
    resetLineDraft,
    resetCircleDraft,
    resetArcDraft,
    resetMoveDraft,
    resetSelectDrag,
    resetCommandDrafts
  }
} // End createEditPanelDraftController
