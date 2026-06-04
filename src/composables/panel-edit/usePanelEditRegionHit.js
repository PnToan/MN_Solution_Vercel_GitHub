import { getPanelEditRectangleRegion } from '../../core/panel-edit/panelEditRectangleGeometry'
import { getPanelEditCircleBounds, getPanelEditCirclePolygon, getPanelEditCircleRadius } from '../../core/panel-edit/panelEditCircleGeometry'
import { getPanelEditPlanarRegions, isPointInPanelEditPolygon } from '../../core/panel-edit/panelEditPlanarRegionGeometry'

//=================
export function usePanelEditRegionHit({
  panelEditCanvasRef,
  panelEditRect,
  panelEditLine,
  panelEditCircle,
  getPanelEditLocalFromScreen
}) {
  //=================
  function getPanelEditCircleRegion(circle, index) {
    const bounds = getPanelEditCircleBounds(circle)

    if (!bounds) return null

    return {
      id: `circle-region-${circle.id || index}`,
      source: 'circleRegion',
      sourceId: circle.id || null,
      regionKind: 'polygon',
      shapeType: 'circle',
      polygon: getPanelEditCirclePolygon(circle),
      start: { x: bounds.x, y: bounds.y },
      end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      center: { x: Number(circle.center.x || 0), y: Number(circle.center.y || 0) },
      radius: getPanelEditCircleRadius(circle),
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      operation: 'none'
    }
  } // End getPanelEditCircleRegion

  //=================
  function getPanelEditClosedShapeRegions() {
    const rectangleRegions = (panelEditRect.value.rectangles || [])
      .map((rectangle, index) => getPanelEditRectangleRegion(rectangle, index))
      .filter(Boolean)
    const circleRegions = (panelEditCircle.value.circles || [])
      .map((circle, index) => getPanelEditCircleRegion(circle, index))
      .filter(Boolean)

    return [
      ...rectangleRegions,
      ...circleRegions
    ]
  } // End getPanelEditClosedShapeRegions

  //=================
  function getPanelEditLineRegions(context) {
    return [
      ...getPanelEditClosedShapeRegions(context),
      ...getPanelEditPlanarRegions(context, panelEditLine.value.lines || [])
    ]
  } // End getPanelEditLineRegions

  //=================
  function hitPanelEditLineRegion(context, layout, event) {
    const canvas = panelEditCanvasRef.value

    if (!canvas || !context || !layout) return null

    const rect = canvas.getBoundingClientRect()
    const local = getPanelEditLocalFromScreen(context, layout, event.clientX - rect.left, event.clientY - rect.top)
    const regions = getPanelEditLineRegions(context)

    return regions.find((region) => {
      if (region.regionKind === 'polygon') {
        return isPointInPanelEditPolygon(local, region.polygon)
      }

      return local.x >= region.x
        && local.x <= region.x + region.width
        && local.y >= region.y
        && local.y <= region.y + region.height
    }) || null
  } // End hitPanelEditLineRegion

  return {
    getPanelEditCircleRegion,
    getPanelEditClosedShapeRegions,
    getPanelEditLineRegions,
    hitPanelEditLineRegion
  }
} // End usePanelEditRegionHit
