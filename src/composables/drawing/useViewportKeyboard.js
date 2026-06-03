import { handleViewportKey } from '../../commands/keyboard-controller'

//=================
export function useViewportKeyboard({
  app,
  drawing,
  box,
  wall,
  draw,
  moveCopyMode,
  dimInput,
  boxHeightInput,
  exitToSelect
}) {
  //=================
  function deleteCurrentSelection() {
    const hasPanels = Array.isArray(drawing.state.selectedPanelIds) && drawing.state.selectedPanelIds.length > 0
    const hasBoxes = Array.isArray(box.state.selectedBoxIds) && box.state.selectedBoxIds.length > 0
    const hasDimensions = Array.isArray(drawing.state.selectedDimensionIds) && drawing.state.selectedDimensionIds.length > 0

    if (!hasPanels && !hasBoxes && !hasDimensions) return false

    drawing.pushHistorySnapshot('Xóa selection')
    drawing.deleteSelectedPanels()
    drawing.deleteSelectedDimensions()
    box.deleteSelectedBoxes()
    drawing.rebuildZones()
    draw()

    return true
  } // End deleteCurrentSelection

  //=================
  function handleViewportKeyboard(event) {
    const key = event.key
    const isSpace = key === ' ' || key === 'Spacebar' || event.code === 'Space'

    if (event.key === 'Delete') {
      if (deleteCurrentSelection()) {
        event.preventDefault()
        event.stopPropagation()
      }

      return true
    }

    if (isSpace) {
      event.preventDefault()
      event.stopPropagation()
      exitToSelect()
      return true
    }

    if (dimInput.value.active || boxHeightInput.value.active) {
      return true
    }

    if (event.ctrlKey && !event.shiftKey && (key === 'z' || key === 'Z')) {
      event.preventDefault()
      event.stopPropagation()
      drawing.undo()
      draw()
      return true
    }

    if (event.ctrlKey && !event.shiftKey && (key === 'y' || key === 'Y')) {
      event.preventDefault()
      event.stopPropagation()
      drawing.redo()
      draw()
      return true
    }

    if (app.state.currentTool === 'move' && event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      event.stopPropagation()
      moveCopyMode.value = !moveCopyMode.value
      app.setStatus(moveCopyMode.value ? 'Move Copy: ON' : 'Move Copy: OFF')
      draw()
      return true
    }

    if (key === 'Escape') {
      exitToSelect()
      return true
    }

    handleViewportKey(event, { app, drawing, box, wall, draw })
    return true
  } // End handleViewportKeyboard

  return {
    deleteCurrentSelection,
    handleViewportKeyboard
  }
} // End useViewportKeyboard
//=================
