import { computed } from 'vue'

//=================
export function useViewportCursor({
  app,
  hoverDim,
  isEditPanelTool,
  isEditPanelDrawTool
}) {
  const canvasCursorClass = computed(() => {
    if (app.state.currentTool === 'move') return 'mn-cursor-move'
    if (app.state.currentTool === 'dimensions') return 'mn-cursor-dimensions'
    if (hoverDim.value && app.state.currentTool === 'select') return 'mn-cursor-pointer'
    if (app.state.currentTool === 'box') return 'mn-cursor-box'
    if (app.state.currentTool === 'panel') return 'mn-cursor-crosshair'
    if (isEditPanelTool(app.state.currentTool) || isEditPanelDrawTool(app.state.currentTool)) return 'mn-cursor-crosshair'
    if (app.state.currentTool === 'select') return 'mn-cursor-select'

    return 'mn-cursor-default'
  })

  return {
    canvasCursorClass
  }
} // End useViewportCursor
