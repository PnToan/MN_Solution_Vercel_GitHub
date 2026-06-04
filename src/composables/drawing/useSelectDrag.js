import { ref } from 'vue'
import { localToScreen, screenToLocal } from '../../renderers/viewport-transform'

//=================
export function useSelectDrag({
  canvasRef,
  app,
  drawing,
  draw,
  getVisiblePanels,
  getVisibleBoxes,
  getPanelLocalRect,
  getPanelSelectRect,
  getBoxLocalRect,
  getBoxSelectRect,
  getDimensionSelectRect,
  hitTestVisiblePanel
}) {
  const selectDrag = ref({
    active: false,
    start: null,
    current: null,
    moved: false,
    mode: 'contain'
  })

  //=================
  function getScreenPointFromEvent(event) {
    const rect = canvasRef.value.getBoundingClientRect()

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  } // End getScreenPointFromEvent

  //=================
  function startSelectDrag(event) {
    if (app.state.currentTool !== 'select') return false
    if (event.button !== 0) return false

    const point = getScreenPointFromEvent(event)

    selectDrag.value = {
      active: false,
      start: point,
      current: point,
      moved: false,
      mode: 'contain'
    }

    return true
  } // End startSelectDrag

  //=================
  function resetSelectDrag() {
    selectDrag.value = {
      active: false,
      start: null,
      current: null,
      moved: false,
      mode: 'contain'
    }

    draw()
  } // End resetSelectDrag

  //=================
  function getSelectDragRect() {
    if (!selectDrag.value.start || !selectDrag.value.current) return null

    const start = selectDrag.value.start
    const current = selectDrag.value.current

    return {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
      mode: selectDrag.value.mode
    }
  } // End getSelectDragRect


  //=================
  function getSelectDragLocalRect() {
    if (!selectDrag.value.start || !selectDrag.value.current) return null

    const viewport = app.state.viewport
    const start = screenToLocal(viewport, selectDrag.value.start.x, selectDrag.value.start.y)
    const current = screenToLocal(viewport, selectDrag.value.current.x, selectDrag.value.current.y)

    return {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
      mode: selectDrag.value.mode
    }
  } // End getSelectDragLocalRect

  //=================
  function localRectToScreenRect(rect) {
    if (!rect) return null

    const viewport = app.state.viewport
    const p1 = localToScreen(viewport, rect.x, rect.y)
    const p2 = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)

    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.abs(p2.x - p1.x),
      height: Math.abs(p2.y - p1.y)
    }
  } // End localRectToScreenRect

  //=================
  function getRectRight(rect) {
    return rect.x + rect.width
  } // End getRectRight

  //=================
  function getRectBottom(rect) {
    return rect.y + rect.height
  } // End getRectBottom

  //=================
  function rectContainsRect(outer, inner) {
    return (
      inner.x >= outer.x &&
      getRectRight(inner) <= getRectRight(outer) &&
      inner.y >= outer.y &&
      getRectBottom(inner) <= getRectBottom(outer)
    )
  } // End rectContainsRect

  //=================
  function rectTouchesRect(a, b) {
    return !(
      getRectRight(a) < b.x ||
      getRectRight(b) < a.x ||
      getRectBottom(a) < b.y ||
      getRectBottom(b) < a.y
    )
  } // End rectTouchesRect



  //=================
  function getPanelHitsByDragSampling(selectRect) {
    if (!selectRect || typeof hitTestVisiblePanel !== 'function') return []

    const hitsById = new Map()
    const step = 8
    const maxSamplesPerAxis = 90
    const cols = Math.max(1, Math.min(maxSamplesPerAxis, Math.ceil(selectRect.width / step)))
    const rows = Math.max(1, Math.min(maxSamplesPerAxis, Math.ceil(selectRect.height / step)))

    for (let col = 0; col <= cols; col += 1) {
      const x = selectRect.x + (selectRect.width * col) / cols

      for (let row = 0; row <= rows; row += 1) {
        const y = selectRect.y + (selectRect.height * row) / rows
        const local = screenToLocal(app.state.viewport, x, y)
        const hit = hitTestVisiblePanel(local)
        const panel = hit?.panel

        if (!panel?.id) continue

        hitsById.set(panel.id, {
          panel,
          rect: hit.rect || getPanelSelectRect(panel),
          isBackPanel: panel.panelSide === 'back' || panel.cabinetInfoKind === 'back'
        })
      }
    }

    return Array.from(hitsById.values())
  } // End getPanelHitsByDragSampling

  //=================
  function getSelectedIdsByDragRect(selectRect) {
    if (!selectRect) {
      return {
        panelIds: [],
        boxIds: [],
        dimensionIds: []
      }
    }

    const checkRect = selectRect.mode === 'touch'
      ? rectTouchesRect
      : rectContainsRect

    const sampledPanelHits = getPanelHitsByDragSampling(selectRect)
    const rectPanelHits = getVisiblePanels()
      .map((panel) => {
        const rect = getPanelSelectRect(panel)

        if (!rect || rect.width <= 0 || rect.height <= 0) return null
        if (!checkRect(selectRect, rect)) return null

        return {
          panel,
          rect,
          isBackPanel: panel.panelSide === 'back' || panel.cabinetInfoKind === 'back'
        }
      })
      .filter(Boolean)
    const panelHits = sampledPanelHits.length ? sampledPanelHits : rectPanelHits
    const hasNonBackPanelHit = panelHits.some((hit) => !hit.isBackPanel)
    const panelIds = panelHits
      .filter((hit) => !(hasNonBackPanelHit && hit.isBackPanel))
      .map((hit) => hit.panel.id)

    const dimensionIds = drawing.getRenderableDimensions(app.state.currentView)
      .filter((dimension) => {
        const rect = getDimensionSelectRect(dimension)

        if (!rect || rect.width <= 0 || rect.height <= 0) return false

        return checkRect(selectRect, rect)
      })
      .map((dimension) => dimension.id)

    return {
      panelIds,
      boxIds: [],
      dimensionIds
    }
  } // End getSelectedIdsByDragRect

  return {
    selectDrag,
    getScreenPointFromEvent,
    startSelectDrag,
    resetSelectDrag,
    getSelectDragRect,
    getSelectDragLocalRect,
    localRectToScreenRect,
    getSelectedIdsByDragRect
  }
} // End useSelectDrag
