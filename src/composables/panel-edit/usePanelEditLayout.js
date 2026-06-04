//=================
function getPanelEditPoint(context, offsetX, offsetY, scale, x, y) {
  return {
    x: offsetX + x * scale,
    y: offsetY + (context.height - y) * scale
  }
} // End getPanelEditPoint

//=================
function getPanelEditZoomClamp(value) {
  return Math.min(Math.max(value, 0.2), 8)
} // End getPanelEditZoomClamp

//=================
function createPanelEditLayout(context, canvasWidth, canvasHeight, viewportState) {
  const marginLeft = 110
  const marginRight = 72
  const marginTop = 82
  const marginBottom = 96
  const availableWidth = Math.max(1, canvasWidth - marginLeft - marginRight)
  const availableHeight = Math.max(1, canvasHeight - marginTop - marginBottom)
  const baseScale = Math.min(
    availableWidth / Math.max(1, context.width),
    availableHeight / Math.max(1, context.height)
  )
  const zoom = getPanelEditZoomClamp(viewportState?.zoom)
  const scale = baseScale * zoom
  const faceWidth = context.width * scale
  const faceHeight = context.height * scale
  const offsetX = marginLeft + (availableWidth - faceWidth) / 2 + Number(viewportState?.panX || 0)
  const offsetY = marginTop + (availableHeight - faceHeight) / 2 + Number(viewportState?.panY || 0)

  return {
    scale,
    faceWidth,
    faceHeight,
    left: offsetX,
    right: offsetX + faceWidth,
    top: offsetY,
    bottom: offsetY + faceHeight
  }
} // End createPanelEditLayout

//=================
function getPanelEditLocalFromScreen(context, layout, screenX, screenY) {
  return {
    x: (screenX - layout.left) / layout.scale,
    y: context.height - ((screenY - layout.top) / layout.scale)
  }
} // End getPanelEditLocalFromScreen

//=================
export function usePanelEditLayout({ panelEditViewport }) {
  function getPanelEditLayout(context, canvasWidth, canvasHeight) {
    return createPanelEditLayout(context, canvasWidth, canvasHeight, panelEditViewport.value)
  } // End getPanelEditLayout

  return {
    getPanelEditPoint,
    getPanelEditZoomClamp,
    getPanelEditLayout,
    getPanelEditLocalFromScreen
  }
} // End usePanelEditLayout
