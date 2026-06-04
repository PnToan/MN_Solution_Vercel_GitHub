//=================
export function usePanelEditGuideDrawing({
  panelEditCanvasRef,
  getPanelEditPoint
}) {
  //=================
  function drawPanelEditGuideLine(targetContext, context, layout, guide, options = {}) {
    if (!guide) return

    const value = Number(guide.value || 0)
    const isDraft = options.draft === true
    const color = isDraft ? '#ff7a00' : '#006eff'

    targetContext.save()
    targetContext.strokeStyle = color
    targetContext.fillStyle = color
    targetContext.lineWidth = isDraft ? 2 : 1.5
    targetContext.setLineDash(isDraft ? [8, 5] : [12, 5])
    targetContext.beginPath()

    const canvasWidth = panelEditCanvasRef.value?.clientWidth || targetContext.canvas?.width || 0
    const canvasHeight = panelEditCanvasRef.value?.clientHeight || targetContext.canvas?.height || 0

    if (guide.axis === 'vertical') {
      const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, value, 0)
      targetContext.moveTo(point.x, 0)
      targetContext.lineTo(point.x, canvasHeight)
    } else {
      const point = getPanelEditPoint(context, layout.left, layout.top, layout.scale, 0, value)
      targetContext.moveTo(0, point.y)
      targetContext.lineTo(canvasWidth, point.y)
    }

    targetContext.stroke()
    targetContext.setLineDash([])
    targetContext.restore()
  } // End drawPanelEditGuideLine

  //=================
  function drawPanelEditTapeSnap(targetContext, snap) {
    if (!snap?.screen) return

    const size = snap.kind === 'circle' ? 6 : 7

    targetContext.save()
    targetContext.strokeStyle = '#ff7a00'
    targetContext.fillStyle = '#ffffff'
    targetContext.lineWidth = 2
    targetContext.beginPath()

    if (snap.kind === 'circle') {
      targetContext.arc(snap.screen.x, snap.screen.y, size, 0, Math.PI * 2)
    } else {
      targetContext.rect(snap.screen.x - size / 2, snap.screen.y - size / 2, size, size)
    }

    targetContext.fill()
    targetContext.stroke()
    targetContext.restore()
  } // End drawPanelEditTapeSnap

  return {
    drawPanelEditGuideLine,
    drawPanelEditTapeSnap
  }
} // End usePanelEditGuideDrawing
