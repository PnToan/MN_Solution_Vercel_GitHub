import { CABINET_INFO_DEFAULTS } from './cabinetInfoDefaults'

let cabinetSeed = 1

//=================
function toNumber(value, fallback = 0) {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.')
    const numberValue = Number(normalized)
    return Number.isFinite(numberValue) ? numberValue : fallback
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
} // End toNumber

//=================
function toPositiveNumber(value, fallback = 1) {
  const numberValue = toNumber(value, fallback)
  return numberValue > 0 ? numberValue : fallback
} // End toPositiveNumber

//=================
function toBoolean(value) {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    if (lower === 'on' || lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'off' || lower === 'false' || lower === '0' || lower === 'no') return false
  }

  return Boolean(value)
} // End toBoolean

//=================
function roundValue(value) {
  return Math.round(value * 1000) / 1000
} // End roundValue

//=================
function clampMin(value, minValue) {
  return value < minValue ? minValue : value
} // End clampMin

//=================
function createId(prefix) {
  return `${prefix}_${Date.now()}_${cabinetSeed++}`
} // End createId

//=================
function readFrameNumber(frame, keys, fallback = 0) {
  for (const key of keys) {
    if (frame && frame[key] !== undefined && frame[key] !== null) {
      const value = toNumber(frame[key], NaN)
      if (Number.isFinite(value)) return value
    }
  }

  return fallback
} // End readFrameNumber

//=================
export function normalizeCabinetInfo(rawInfo = {}, selectedFrame = null) {
  const info = { ...CABINET_INFO_DEFAULTS, ...rawInfo }
  const frameWidth = selectedFrame ? readFrameNumber(selectedFrame, ['width', 'xSize', 'w'], info.width) : info.width
  const frameHeight = selectedFrame ? readFrameNumber(selectedFrame, ['height', 'zSize', 'h'], info.height) : info.height
  const frameDepth = selectedFrame ? readFrameNumber(selectedFrame, ['depth', 'ySize', 'd'], info.depth) : info.depth
  const frameThickness = selectedFrame ? readFrameNumber(selectedFrame, ['panelThickness', 'thickness'], info.thickness) : info.thickness

  return {
    width: toPositiveNumber(frameWidth, CABINET_INFO_DEFAULTS.width),
    height: toPositiveNumber(frameHeight, CABINET_INFO_DEFAULTS.height),
    depth: toPositiveNumber(frameDepth, CABINET_INFO_DEFAULTS.depth),
    thickness: toPositiveNumber(info.thickness || frameThickness, CABINET_INFO_DEFAULTS.thickness),
    leftSide: toBoolean(info.leftSide),
    rightSide: toBoolean(info.rightSide),
    top: toBoolean(info.top),
    bottom: toBoolean(info.bottom),
    topOverlay: toBoolean(info.topOverlay),
    bottomOverlay: toBoolean(info.bottomOverlay),
    back: toBoolean(info.back),
    backGrooveDepth: clampMin(toNumber(info.backGrooveDepth, 0), 0),
    backThickness: toPositiveNumber(info.backThickness, CABINET_INFO_DEFAULTS.backThickness),
    backRetreat: clampMin(toNumber(info.backRetreat, 0), 0),
    backSplitFormula: String(info.backSplitFormula || '').trim(),
    topBackOverlay: toBoolean(info.topBackOverlay),
    bottomBackOverlay: toBoolean(info.bottomBackOverlay),
    topRail: toBoolean(info.topRail),
    topRailInset: toBoolean(info.topRailInset),
    topRailHeight: clampMin(toNumber(info.topRailHeight, 0), 0),
    topRailFaceOffset: toNumber(info.topRailFaceOffset, 0),
    handleRail: toBoolean(info.handleRail),
    handleRailCount: Math.max(0, Math.floor(toNumber(info.handleRailCount, 0))),
    handleRailSize: clampMin(toNumber(info.handleRailSize, 0), 0),
    handleRailFaceOffset: toNumber(info.handleRailFaceOffset, 0),
    handleRailBackCount: Math.max(0, Math.floor(toNumber(info.handleRailBackCount, 0))),
    handleRailSupportCount: Math.max(0, Math.floor(toNumber(info.handleRailSupportCount, 0))),
    doorStop: toBoolean(info.doorStop),
    doorStopFormula: String(info.doorStopFormula || '').trim(),
    doorStopSize: clampMin(toNumber(info.doorStopSize, 0), 0),
    doorStopHorizontal: toBoolean(info.doorStopHorizontal),
    doorStopFaceOffset: toNumber(info.doorStopFaceOffset, 0),
    toeKick: toBoolean(info.toeKick),
    toeKickHeight: clampMin(toNumber(info.toeKickHeight, 0), 0),
    toeKickRetreat: toNumber(info.toeKickRetreat, 0),
    toeKickDetached: toBoolean(info.toeKickDetached),
    toeKickBack: toBoolean(info.toeKickBack),
    toeKickSupportCount: Math.max(0, Math.floor(toNumber(info.toeKickSupportCount, 0))),
    leftScribe: clampMin(toNumber(info.leftScribe, 0), 0),
    leftScribeRotate: toBoolean(info.leftScribeRotate),
    rightScribe: clampMin(toNumber(info.rightScribe, 0), 0),
    rightScribeRotate: toBoolean(info.rightScribeRotate),
    verticalShelfRetreat: clampMin(toNumber(info.verticalShelfRetreat, 0), 0),
    horizontalShelfRetreat: clampMin(toNumber(info.horizontalShelfRetreat, 0), 0)
  }
} // End normalizeCabinetInfo

//=================
export function parseDivisionFormula(formula, totalSize, cutterSize = 0) {
  const value = String(formula || '').trim()
  const safeTotal = clampMin(toNumber(totalSize, 0), 0)
  const safeCutter = clampMin(toNumber(cutterSize, 0), 0)

  if (!value || safeTotal <= 0) return []

  if (value.startsWith('/')) {
    const count = Math.max(0, Math.floor(toNumber(value.slice(1), 0)))
    if (count <= 1) return []

    const gap = safeTotal / count
    return Array.from({ length: count - 1 }, (_, index) => roundValue(gap * (index + 1)))
  }

  const parts = value.split(',').map((item) => toNumber(item, NaN)).filter((item) => Number.isFinite(item) && item > 0)
  const offsets = []
  let cursor = 0

  parts.forEach((part) => {
    cursor += part
    if (cursor > 0 && cursor < safeTotal) {
      offsets.push(roundValue(cursor))
    }
    cursor += safeCutter
  })

  return offsets.filter((offset, index, list) => offset > 0 && offset < safeTotal && list.indexOf(offset) === index)
} // End parseDivisionFormula

//=================
export function normalizeSelectedCabinetFrame(selectedFrame = null, rawInfo = {}) {
  const id = selectedFrame?.id || selectedFrame?.boxId || createId('cabinet_info_box')
  const x = readFrameNumber(selectedFrame, ['x', 'x3d'], 0)
  const y = readFrameNumber(selectedFrame, ['y', 'y3d', 'worldY', 'depthY'], 0)
  const z = readFrameNumber(selectedFrame, ['z', 'z3d'], 0)
  const width = readFrameNumber(selectedFrame, ['width', 'xSize', 'w'], rawInfo.width || CABINET_INFO_DEFAULTS.width)
  const depth = readFrameNumber(selectedFrame, ['depth', 'ySize', 'd'], rawInfo.depth || CABINET_INFO_DEFAULTS.depth)
  const height = readFrameNumber(selectedFrame, ['height', 'zSize', 'h'], rawInfo.height || CABINET_INFO_DEFAULTS.height)

  return {
    id,
    name: selectedFrame?.name || 'Box đang chọn',
    x: roundValue(x),
    y: roundValue(y),
    z: roundValue(z),
    width: roundValue(width),
    depth: roundValue(depth),
    height: roundValue(height),
    panelThickness: roundValue(rawInfo.thickness || selectedFrame?.panelThickness || selectedFrame?.thickness || CABINET_INFO_DEFAULTS.thickness),
    sourceType: selectedFrame?.sourceType || 'selected-box'
  }
} // End normalizeSelectedCabinetFrame

//=================
function createPanelPayload(frameId, data) {
  const id = data.id || createId('cabinet_info_panel')
  const x = roundValue(data.x)
  const y = roundValue(data.y)
  const z = roundValue(data.z)
  const xSize = roundValue(data.xSize)
  const ySize = roundValue(data.ySize)
  const zSize = roundValue(data.zSize)

  return {
    id,
    name: data.name || data.type || id,
    type: data.type || 'panel',
    orientation: data.orientation || 'free',
    panelSide: data.panelSide || data.type || 'free',
    x3d: x,
    x,
    y3d: y,
    worldY: y,
    depthY: y,
    z3d: z,
    z,
    y,
    xSize,
    width: xSize,
    ySize,
    depth: ySize,
    zSize,
    height: zSize,
    panelThickness: roundValue(data.panelThickness),
    thickness: roundValue(data.panelThickness),
    frameId,
    linkedFrameId: frameId,
    sourceBoxId: frameId,
    baseObjectId: frameId,
    color: data.color || 'rgba(255, 255, 255, 0.92)',
    hidden: false,
    sourceType: 'cabinet-info'
  }
} // End createPanelPayload

//=================
function addPanel(list, frameId, data) {
  if (data.xSize <= 0 || data.ySize <= 0 || data.zSize <= 0) return
  list.push(createPanelPayload(frameId, data))
} // End addPanel

//=================
function addScribePanels(list, frameId, info, body) {
  const depthY = info.thickness

  if (info.leftScribe > 0) {
    addPanel(list, frameId, {
      type: 'left_scribe',
      name: 'Nẹp gia giảm trái',
      orientation: 'vertical',
      x: body.frameX,
      y: body.frontY - (info.leftScribeRotate ? info.leftScribe : depthY),
      z: body.z,
      xSize: info.leftScribeRotate ? info.thickness : info.leftScribe,
      ySize: info.leftScribeRotate ? info.leftScribe : depthY,
      zSize: info.height,
      panelThickness: info.thickness
    })
  }

  if (info.rightScribe > 0) {
    addPanel(list, frameId, {
      type: 'right_scribe',
      name: 'Nẹp gia giảm phải',
      orientation: 'vertical',
      x: body.x + body.width,
      y: body.frontY - (info.rightScribeRotate ? info.rightScribe : depthY),
      z: body.z,
      xSize: info.rightScribeRotate ? info.thickness : info.rightScribe,
      ySize: info.rightScribeRotate ? info.rightScribe : depthY,
      zSize: info.height,
      panelThickness: info.thickness
    })
  }
} // End addScribePanels

//=================
function addMainFramePanels(list, frameId, info, body) {
  const t = info.thickness
  const topRailDrop = info.topRail ? info.topRailHeight : 0
  const topLimitZ = body.z + info.height - topRailDrop
  const toeHeight = info.toeKick ? info.toeKickHeight : 0
  const sideZ = info.toeKick && info.toeKickDetached ? body.z + toeHeight : body.z
  const bottomZ = info.toeKick ? body.z + toeHeight : body.z
  const topZ = clampMin(topLimitZ - t, bottomZ + t)
  const sideHeight = clampMin(topLimitZ - sideZ, t)
  const innerX = body.x + (info.leftSide ? t : 0)
  const innerWidth = body.width - (info.leftSide ? t : 0) - (info.rightSide ? t : 0)

  if (info.leftSide) {
    addPanel(list, frameId, {
      type: 'left_side',
      name: 'Hông trái',
      orientation: 'vertical',
      x: body.x,
      y: body.y,
      z: sideZ,
      xSize: t,
      ySize: body.depth,
      zSize: sideHeight,
      panelThickness: t
    })
  }

  if (info.rightSide) {
    addPanel(list, frameId, {
      type: 'right_side',
      name: 'Hông phải',
      orientation: 'vertical',
      x: body.x + body.width - t,
      y: body.y,
      z: sideZ,
      xSize: t,
      ySize: body.depth,
      zSize: sideHeight,
      panelThickness: t
    })
  }

  if (info.bottom) {
    addPanel(list, frameId, {
      type: 'bottom',
      name: 'Đáy',
      orientation: 'horizontal',
      x: info.bottomOverlay ? body.x : innerX,
      y: body.y,
      z: bottomZ,
      xSize: info.bottomOverlay ? body.width : innerWidth,
      ySize: body.depth,
      zSize: t,
      panelThickness: t
    })
  }

  if (info.top) {
    addPanel(list, frameId, {
      type: 'top',
      name: 'Nóc',
      orientation: 'horizontal',
      x: info.topOverlay ? body.x : innerX,
      y: body.y,
      z: topZ,
      xSize: info.topOverlay ? body.width : innerWidth,
      ySize: body.depth,
      zSize: t,
      panelThickness: t
    })
  }

  return {
    innerX,
    innerWidth,
    innerBottomZ: bottomZ + (info.bottom ? t : 0),
    innerTopZ: topZ,
    sideZ,
    sideHeight,
    topZ,
    bottomZ,
    topLimitZ
  }
} // End addMainFramePanels

//=================
function addBackPanels(list, frameId, info, body, frame) {
  if (!info.back) return null

  const t = info.thickness
  const y = body.y + info.backRetreat
  const x = body.x + t - info.backGrooveDepth
  const z = frame.innerBottomZ - (info.bottomBackOverlay ? info.backGrooveDepth : 0)
  const width = body.width - (2 * t) + (2 * info.backGrooveDepth)
  const height = frame.innerTopZ - frame.innerBottomZ + (info.topBackOverlay ? info.backGrooveDepth : 0) + (info.bottomBackOverlay ? info.backGrooveDepth : 0)
  const splitOffsets = parseDivisionFormula(info.backSplitFormula, width, 0)
  const segments = []

  if (!splitOffsets.length) {
    segments.push({ start: 0, width })
  } else {
    let cursor = 0
    splitOffsets.forEach((offset) => {
      segments.push({ start: cursor, width: offset - cursor })
      cursor = offset
    })
    segments.push({ start: cursor, width: width - cursor })
  }

  segments.forEach((segment, index) => {
    addPanel(list, frameId, {
      type: 'back',
      name: `Hậu ${index + 1}`,
      orientation: 'back',
      x: x + segment.start,
      y,
      z,
      xSize: segment.width,
      ySize: info.backThickness,
      zSize: height,
      panelThickness: info.backThickness,
      color: 'rgba(230, 230, 230, 0.92)'
    })
  })

  return {
    x,
    y,
    z,
    width,
    height,
    frontY: y + info.backThickness
  }
} // End addBackPanels

//=================
function addTopRail(list, frameId, info, body) {
  if (!info.topRail || info.topRailHeight <= 0) return

  const t = info.thickness
  const x = info.topRailInset ? body.x + t : body.x
  const xSize = info.topRailInset ? body.width - (2 * t) : body.width
  const y = body.frontY - info.topRailFaceOffset - t

  addPanel(list, frameId, {
    type: 'top_rail',
    name: 'Thanh chỉ nóc',
    orientation: 'rail',
    x,
    y,
    z: body.z + info.height - info.topRailHeight,
    xSize,
    ySize: t,
    zSize: info.topRailHeight,
    panelThickness: t
  })
} // End addTopRail

//=================
function addHandleRails(list, frameId, info, body, frame, backInfo) {
  if (!info.handleRail || info.handleRailSize <= 0) return

  const t = info.thickness
  const railCount = Math.max(0, info.handleRailCount)
  const x = body.x + t
  const xSize = body.width - (2 * t)
  const yFront = body.frontY - info.handleRailFaceOffset - t
  const zStart = frame.innerTopZ - info.handleRailSize

  for (let index = 0; index < railCount; index += 1) {
    addPanel(list, frameId, {
      type: 'handle_rail_front',
      name: `Diềm tay nắm trước ${index + 1}`,
      orientation: 'rail',
      x,
      y: yFront - (index * t),
      z: zStart,
      xSize,
      ySize: t,
      zSize: info.handleRailSize,
      panelThickness: t
    })
  }

  const yBack = backInfo ? backInfo.frontY : body.y + t
  for (let index = 0; index < info.handleRailBackCount; index += 1) {
    addPanel(list, frameId, {
      type: 'handle_rail_back',
      name: `Diềm tay nắm sau ${index + 1}`,
      orientation: 'rail',
      x,
      y: yBack + (index * t),
      z: zStart,
      xSize,
      ySize: t,
      zSize: info.handleRailSize,
      panelThickness: t
    })
  }

  if (info.handleRailSupportCount >= 2) {
    const yA = yBack + t
    const yB = yFront
    const usableY = clampMin(yB - yA, 0)
    const gap = xSize / (info.handleRailSupportCount + 1)

    for (let index = 0; index < info.handleRailSupportCount; index += 1) {
      addPanel(list, frameId, {
        type: 'handle_rail_support',
        name: `Thanh bổ sung tay nắm ${index + 1}`,
        orientation: 'vertical_rail',
        x: x + gap * (index + 1) - (t / 2),
        y: yA,
        z: zStart,
        xSize: t,
        ySize: usableY,
        zSize: info.handleRailSize,
        panelThickness: t
      })
    }
  }
} // End addHandleRails

//=================
function addDoorStops(list, frameId, info, body, frame) {
  if (!info.doorStop || info.doorStopSize <= 0) return

  const t = info.thickness
  const totalHeight = frame.innerTopZ - frame.innerBottomZ
  const offsets = parseDivisionFormula(info.doorStopFormula, totalHeight, info.doorStopSize)
  const y = body.frontY - info.doorStopFaceOffset - (info.doorStopHorizontal ? info.doorStopSize : t)

  offsets.forEach((offset, index) => {
    addPanel(list, frameId, {
      type: 'door_stop',
      name: `Thanh chặn cánh ${index + 1}`,
      orientation: info.doorStopHorizontal ? 'horizontal' : 'vertical_face',
      x: body.x + t,
      y,
      z: frame.innerBottomZ + offset,
      xSize: body.width - (2 * t),
      ySize: info.doorStopHorizontal ? info.doorStopSize : t,
      zSize: info.doorStopHorizontal ? t : info.doorStopSize,
      panelThickness: t
    })
  })
} // End addDoorStops

//=================
function addToeKick(list, frameId, info, body, backInfo) {
  if (!info.toeKick || info.toeKickHeight <= 0) return

  const t = info.thickness
  const frontY = body.frontY - info.toeKickRetreat - t
  const x = info.toeKickDetached ? body.x : body.x + t
  const xSize = info.toeKickDetached ? body.width : body.width - (2 * t)

  addPanel(list, frameId, {
    type: 'toe_kick_front',
    name: 'Len chân trước',
    orientation: 'toe_kick',
    x,
    y: frontY,
    z: body.z,
    xSize,
    ySize: t,
    zSize: info.toeKickHeight,
    panelThickness: t
  })

  if (info.toeKickBack) {
    const backY = backInfo ? backInfo.frontY : body.y + t
    addPanel(list, frameId, {
      type: 'toe_kick_back',
      name: 'Thanh chân sau',
      orientation: 'toe_kick',
      x,
      y: backY,
      z: body.z,
      xSize,
      ySize: t,
      zSize: info.toeKickHeight,
      panelThickness: t
    })

    if (info.toeKickSupportCount > 0) {
      const usableY = clampMin(frontY - backY - t, 0)
      const gap = xSize / (info.toeKickSupportCount + 1)
      for (let index = 0; index < info.toeKickSupportCount; index += 1) {
        addPanel(list, frameId, {
          type: 'toe_kick_support',
          name: `Thanh chân bổ sung ${index + 1}`,
          orientation: 'toe_kick_support',
          x: x + gap * (index + 1) - (t / 2),
          y: backY + t,
          z: body.z,
          xSize: t,
          ySize: usableY,
          zSize: info.toeKickHeight,
          panelThickness: t
        })
      }
    }
  }
} // End addToeKick

//=================
export function buildCabinetInfoLayout(rawInfo = {}, selectedFrame = null) {
  const baseFrame = normalizeSelectedCabinetFrame(selectedFrame, rawInfo)
  const info = normalizeCabinetInfo(rawInfo, baseFrame)
  const frameId = baseFrame.id
  const body = {
    frameX: baseFrame.x,
    x: baseFrame.x + info.leftScribe,
    y: baseFrame.y,
    z: baseFrame.z,
    width: clampMin(baseFrame.width - info.leftScribe - info.rightScribe, info.thickness * 2),
    depth: baseFrame.depth,
    frontY: baseFrame.y + baseFrame.depth
  }
  const panels = []

  addScribePanels(panels, frameId, info, body)
  const frame = addMainFramePanels(panels, frameId, info, body)
  const backInfo = addBackPanels(panels, frameId, info, body, frame)
  addTopRail(panels, frameId, info, body)
  addHandleRails(panels, frameId, info, body, frame, backInfo)
  addDoorStops(panels, frameId, info, body, frame)
  addToeKick(panels, frameId, info, body, backInfo)

  return {
    box: baseFrame,
    panels,
    info,
    meta: {
      frameId,
      panelCount: panels.length,
      body,
      mode: selectedFrame ? 'apply-to-selected-box' : 'standalone-preview'
    }
  }
} // End buildCabinetInfoLayout
