//=================
function clonePanelEditApplyPoint(point) {
  return {
    x: Number(point?.x || 0),
    y: Number(point?.y || 0)
  }
} // End clonePanelEditApplyPoint

//=================
export function usePanelEditApplyData(options = {}) {
  const {
    panelEditTape,
    panelEditRect,
    panelEditLine,
    panelEditCircle
  } = options

  //=================
  function getPanelEditSavedRectanglesForApply() {
    return (panelEditRect.value.rectangles || []).map((rectangle) => ({
      id: rectangle.id,
      start: clonePanelEditApplyPoint(rectangle.start),
      end: clonePanelEditApplyPoint(rectangle.end),
      operation: rectangle.operation || 'none',
      source: rectangle.source || 'rectangle',
      regionKind: rectangle.regionKind || 'rect',
      shapeType: rectangle.shapeType || null,
      center: rectangle.center ? clonePanelEditApplyPoint(rectangle.center) : null,
      radius: Number(rectangle.radius || 0),
      polygon: Array.isArray(rectangle.polygon)
        ? rectangle.polygon.map((point) => clonePanelEditApplyPoint(point))
        : null
    }))
  } // End getPanelEditSavedRectanglesForApply

  //=================
  function getPanelEditSavedLinesForApply() {
    return (panelEditLine.value.lines || []).map((line) => ({
      id: line.id,
      groupId: line.groupId || null,
      groupType: line.groupType || null,
      axis: line.axis || 'free',
      start: clonePanelEditApplyPoint(line.start),
      end: clonePanelEditApplyPoint(line.end)
    }))
  } // End getPanelEditSavedLinesForApply

  //=================
  function getPanelEditSavedCirclesForApply() {
    return (panelEditCircle.value.circles || []).map((circle) => ({
      id: circle.id,
      center: clonePanelEditApplyPoint(circle.center),
      radius: Number(circle.radius || 0)
    })).filter((circle) => circle.radius > 0)
  } // End getPanelEditSavedCirclesForApply

  //=================
  function getPanelEditSavedGuidesForApply() {
    return (panelEditTape.value.guides || []).map((guide) => ({
      id: guide.id,
      axis: guide.axis,
      edge: guide.edge || null,
      baseValue: Number(guide.baseValue || 0),
      value: Number(guide.value || 0)
    }))
  } // End getPanelEditSavedGuidesForApply

  return {
    getPanelEditSavedRectanglesForApply,
    getPanelEditSavedLinesForApply,
    getPanelEditSavedCirclesForApply,
    getPanelEditSavedGuidesForApply
  }
} // End usePanelEditApplyData
