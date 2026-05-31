//=================
function toNumber(value, fallback = 0) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return fallback

  return numberValue
} // End toNumber

//=================
function getPanelAxisSize(panel, axis) {
  if (axis === 'x') return toNumber(panel.xSize ?? panel.width, 0)
  if (axis === 'y') return toNumber(panel.ySize ?? panel.depth ?? panel.thickness, 0)
  if (axis === 'z') return toNumber(panel.zSize ?? panel.height ?? panel.thickness, 0)

  return 0
} // End getPanelAxisSize

//=================
function getPanelAxisMin(panel, axis) {
  if (axis === 'x') return toNumber(panel.x3d ?? panel.x, 0)
  if (axis === 'y') return toNumber(panel.y3d ?? panel.worldY ?? panel.depthY ?? panel.y, 0)
  if (axis === 'z') return toNumber(panel.z3d ?? panel.z ?? panel.y, 0)

  return 0
} // End getPanelAxisMin

//=================
function getPanelMajorFace(panel) {
  const xSize = Math.abs(getPanelAxisSize(panel, 'x'))
  const ySize = Math.abs(getPanelAxisSize(panel, 'y'))
  const zSize = Math.abs(getPanelAxisSize(panel, 'z'))

  const candidates = [
    { key: 'xy', viewKey: 'top', label: 'X0Y', axisU: 'x', axisV: 'y', thicknessAxis: 'z', area: xSize * ySize },
    { key: 'yz', viewKey: 'left', label: 'Y0Z', axisU: 'y', axisV: 'z', thicknessAxis: 'x', area: ySize * zSize },
    { key: 'xz', viewKey: 'front', label: 'X0Z', axisU: 'x', axisV: 'z', thicknessAxis: 'y', area: xSize * zSize }
  ]

  candidates.sort((a, b) => b.area - a.area)

  return candidates[0]
} // End getPanelMajorFace

//=================
export function buildPanelEditContext(panel) {
  if (!panel) return null

  const face = getPanelMajorFace(panel)
  const width = Math.abs(getPanelAxisSize(panel, face.axisU))
  const height = Math.abs(getPanelAxisSize(panel, face.axisV))
  const thickness = Math.abs(getPanelAxisSize(panel, face.thicknessAxis))

  if (width <= 0 || height <= 0) return null

  return {
    panelId: panel.id,
    panelName: panel.name || panel.label || panel.id,
    viewKey: face.viewKey,
    axesText: face.label,
    axisU: face.axisU,
    axisV: face.axisV,
    thicknessAxis: face.thicknessAxis,
    originCorner: 'bottom-left',
    origin: { x: 0, y: 0 },
    width,
    height,
    thickness,
    worldOrigin: {
      x: getPanelAxisMin(panel, 'x'),
      y: getPanelAxisMin(panel, 'y'),
      z: getPanelAxisMin(panel, 'z')
    },
    localRect: {
      x: 0,
      y: 0,
      width,
      height
    }
  }
} // End buildPanelEditContext

//=================
export function isEditPanelTool(toolId) {
  return toolId === 'editPanel'
} // End isEditPanelTool

//=================
export function isEditPanelDrawTool(toolId) {
  return ['editPanelLine', 'editPanelRect', 'editPanelArc', 'editPanelCircle', 'editPanelTape'].includes(toolId)
} // End isEditPanelDrawTool
