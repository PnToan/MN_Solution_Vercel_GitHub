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
function getFaceOptions(face) {
  if (face.key === 'yz') {
    return [
      { id: 'left', label: 'Mặt trái', viewKey: 'left', rearEdge: 'left', rearLabel: 'Cạnh Sau' },
      { id: 'right', label: 'Mặt phải', viewKey: 'right', rearEdge: 'left', rearLabel: 'Cạnh Sau' }
    ]
  }

  if (face.key === 'xy') {
    return [
      { id: 'top', label: 'Mặt trên', viewKey: 'top', rearEdge: 'top', rearLabel: 'Cạnh Sau' },
      { id: 'bottom', label: 'Mặt dưới', viewKey: 'bottom', rearEdge: 'bottom', rearLabel: 'Cạnh Sau' }
    ]
  }

  return [
    { id: 'front', label: 'Mặt trước', viewKey: 'front', rearEdge: 'bottom', rearLabel: 'Cạnh Sau' },
    { id: 'back', label: 'Mặt sau', viewKey: 'back', rearEdge: 'top', rearLabel: 'Cạnh Sau' }
  ]
} // End getFaceOptions

//=================
function getFaceOption(face, faceSide = null) {
  const options = getFaceOptions(face)
  const matched = options.find((option) => option.id === faceSide)

  return matched || options[0]
} // End getFaceOption

//=================
export function buildPanelEditContext(panel, faceSide = null) {
  if (!panel) return null

  const face = getPanelMajorFace(panel)
  const option = getFaceOption(face, faceSide)
  const width = Math.abs(getPanelAxisSize(panel, face.axisU))
  const height = Math.abs(getPanelAxisSize(panel, face.axisV))
  const thickness = Math.abs(getPanelAxisSize(panel, face.thicknessAxis))

  if (width <= 0 || height <= 0) return null

  return {
    panelId: panel.id,
    panelName: panel.name || panel.label || panel.id,
    viewKey: option.viewKey,
    axesText: face.label,
    axisU: face.axisU,
    axisV: face.axisV,
    thicknessAxis: face.thicknessAxis,
    faceKey: face.key,
    faceSide: option.id,
    faceLabel: option.label,
    faceOptions: getFaceOptions(face),
    rearEdge: option.rearEdge,
    rearLabel: option.rearLabel,
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
  return ['editPanelSelect', 'editPanelLine', 'editPanelRect', 'editPanelArc', 'editPanelCircle', 'editPanelTape'].includes(toolId)
} // End isEditPanelDrawTool


//=================
export function getEditPanelToolCursorClass(toolId) {
  if (toolId === 'editPanelTape') return 'mn-cursor-panel-tape'
  if (toolId === 'editPanelRect') return 'mn-cursor-panel-rect'
  if (!toolId || toolId === 'editPanelSelect') return 'mn-cursor-pointer'

  return 'mn-cursor-crosshair'
} // End getEditPanelToolCursorClass

//=================
export function createPanelEditRectangleRecord(draft, options = {}) {
  if (!draft?.start || !draft?.current) return null

  const x1 = Number(draft.start.x || 0)
  const y1 = Number(draft.start.y || 0)
  const x2 = Number(draft.current.x || 0)
  const y2 = Number(draft.current.y || 0)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)

  if (width <= 0 || height <= 0) return null

  return {
    id: options.id || `rect-${Date.now()}`,
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    operation: options.operation || 'none'
  }
} // End createPanelEditRectangleRecord
