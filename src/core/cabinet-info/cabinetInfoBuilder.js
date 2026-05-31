let cabinetInfoPanelSeed = 1

//=================
function toNumber(value, fallback = 0) {
  const numberValue = typeof value === 'string'
    ? Number(value.replace(',', '.'))
    : Number(value)

  if (!Number.isFinite(numberValue)) return fallback

  return numberValue
} // End toNumber

//=================
function toPositiveNumber(value, fallback = 1) {
  const numberValue = toNumber(value, fallback)

  if (numberValue <= 0) return fallback

  return numberValue
} // End toPositiveNumber

//=================
function toNonNegativeNumber(value, fallback = 0) {
  const numberValue = toNumber(value, fallback)

  if (numberValue < 0) return fallback

  return numberValue
} // End toNonNegativeNumber

//=================
function toInteger(value, fallback = 0) {
  const numberValue = Math.floor(toNumber(value, fallback))

  if (!Number.isFinite(numberValue)) return fallback

  return numberValue
} // End toInteger

//=================
function nextCabinetInfoPanelId(kind) {
  const id = `cabinet_info_${kind}_${String(cabinetInfoPanelSeed).padStart(4, '0')}`

  cabinetInfoPanelSeed += 1

  return id
} // End nextCabinetInfoPanelId

//=================
function normalizeBoolean(value) {
  return value === true
} // End normalizeBoolean

//=================
function getBodyRect(sourceBox, info) {
  const thickness = toPositiveNumber(info?.general?.panelThickness, 18)
  const leftFiller = normalizeBoolean(info?.filler?.enabled) ? toNonNegativeNumber(info?.filler?.left, 0) : 0
  const rightFiller = normalizeBoolean(info?.filler?.enabled) ? toNonNegativeNumber(info?.filler?.right, 0) : 0
  const x = toNumber(sourceBox.x, 0) + leftFiller
  const width = Math.max(thickness * 2, toPositiveNumber(sourceBox.width, 1) - leftFiller - rightFiller)

  return {
    x,
    y: toNumber(sourceBox.y, 0),
    z: toNumber(sourceBox.z, 0),
    width,
    depth: toPositiveNumber(info?.general?.cabinetDepth, toPositiveNumber(sourceBox.depth, 1)),
    height: toPositiveNumber(sourceBox.height, 1),
    thickness
  }
} // End getBodyRect

//=================
function withFrontRect(panel) {
  return {
    ...panel,
    x: panel.x3d,
    y: panel.z3d,
    z: panel.z3d,
    width: panel.xSize,
    depth: panel.ySize,
    height: panel.zSize
  }
} // End withFrontRect

//=================
function createPanel(sourceBox, kind, name, x3d, y3d, z3d, xSize, ySize, zSize, meta = {}) {
  const safeX = toNumber(x3d, 0)
  const safeY = toNumber(y3d, 0)
  const safeZ = toNumber(z3d, 0)
  const safeXSize = Math.max(0, toNumber(xSize, 0))
  const safeYSize = Math.max(0, toNumber(ySize, 0))
  const safeZSize = Math.max(0, toNumber(zSize, 0))

  if (safeXSize <= 0 || safeYSize <= 0 || safeZSize <= 0) return null

  return withFrontRect({
    id: nextCabinetInfoPanelId(kind),
    name,
    type: 'panel_box',
    material: 'Nhựa rỗng',
    sourceType: 'cabinet-info',
    cabinetInfoKind: kind,
    frameId: sourceBox.id,
    sourceBoxId: sourceBox.id,
    linkedFrameId: sourceBox.id,
    frameId: sourceBox.id,
    baseObjectId: sourceBox.id,
    panelThickness: meta.panelThickness || safeYSize,
    thickness: meta.panelThickness || safeYSize,
    orientation: meta.orientation || (safeZSize >= safeXSize ? 'vertical' : 'horizontal'),
    panelKind: kind,
    panelSide: meta.panelSide || kind,
    panelOffsetFrom: meta.panelOffsetFrom || kind,
    panelOffset: meta.panelOffset || 0,
    ...meta,
    dimEnabled: false,
    x3d: safeX,
    y3d: safeY,
    z3d: safeZ,
    xSize: safeXSize,
    ySize: safeYSize,
    zSize: safeZSize,
    color: meta.color || 'rgba(135, 206, 255, 0.8)'
  })
} // End createPanel

//=================
function parseBackSplitFormula(formula, totalSize, thickness) {
  const raw = String(formula || '').trim()
  const safeTotal = Math.max(0, toNumber(totalSize, 0))
  const safeThickness = Math.max(0, toNumber(thickness, 0))

  if (!raw || safeTotal <= 0) {
    return { mode: 'none', widths: [safeTotal], offsets: [] }
  }

  if (raw.startsWith('/')) {
    const count = toInteger(raw.slice(1), 0)

    if (count < 2) return { mode: 'none', widths: [safeTotal], offsets: [] }

    const clearSize = (safeTotal - ((count - 1) * safeThickness)) / count

    if (clearSize <= 0) return { mode: 'none', widths: [safeTotal], offsets: [] }

    const widths = Array.from({ length: count }, () => clearSize)
    const offsets = Array.from({ length: count - 1 }, (_, index) => clearSize + index * (clearSize + safeThickness))

    return { mode: 'ratio', widths, offsets }
  }

  const fixedParts = raw
    .split(',')
    .map((item) => toNumber(item.trim(), NaN))
    .filter((item) => Number.isFinite(item) && item > 0)

  if (!fixedParts.length) return { mode: 'none', widths: [safeTotal], offsets: [] }

  const widths = []
  const offsets = []
  let cursor = 0

  fixedParts.forEach((part) => {
    if (cursor + part >= safeTotal) return

    widths.push(part)
    cursor += part

    if (cursor > 0 && cursor < safeTotal - safeThickness) {
      offsets.push(cursor)
      cursor += safeThickness
    }
  })

  const restWidth = Math.max(1, safeTotal - cursor)
  widths.push(restWidth)

  if (widths.length <= 1) return { mode: 'none', widths: [safeTotal], offsets: [] }

  return { mode: 'fixed', widths, offsets }
} // End parseBackSplitFormula

//=================
function parseDivisionFormula(formula, totalSize, thickness) {
  return parseBackSplitFormula(formula, totalSize, thickness).offsets
} // End parseDivisionFormula

//=================
function pushPanel(panels, panel) {
  if (!panel) return

  panels.push(panel)
} // End pushPanel

//=================
function getBackStopDepth(info, body) {
  if (!normalizeBoolean(info?.back?.enabled)) return body.depth

  const backThickness = toPositiveNumber(info.back.thickness, Math.max(1, body.thickness / 3))
  const inset = toNonNegativeNumber(info.back.inset, 0)
  const stopDepth = body.depth - backThickness - inset

  return Math.max(1, stopDepth)
} // End getBackStopDepth

//=================
function getBackBuildMeta(info, body) {
  return {
    bodyThickness: body.thickness,
    grooveDepth: toNonNegativeNumber(info?.back?.grooveDepth, 0),
    backThickness: toPositiveNumber(info?.back?.thickness, Math.max(1, body.thickness / 3)),
    inset: toNonNegativeNumber(info?.back?.inset, 0),
    overlayBack: normalizeBoolean(info?.back?.overlayBack),
    topCoverBack: normalizeBoolean(info?.back?.topCoverBack),
    bottomCoverBack: normalizeBoolean(info?.back?.bottomCoverBack),
    splitFormula: String(info?.back?.splitFormula || '').trim(),
    hasLeftSide: normalizeBoolean(info?.general?.leftSide),
    hasRightSide: normalizeBoolean(info?.general?.rightSide),
    hasTop: normalizeBoolean(info?.general?.top),
    hasBottom: normalizeBoolean(info?.general?.bottom)
  }
} // End getBackBuildMeta

//=================
function getBackGeometry(body, meta) {
  const t = toPositiveNumber(meta.bodyThickness, body.thickness)
  const grooveDepth = toNonNegativeNumber(meta.grooveDepth, 0)
  const backThickness = toPositiveNumber(meta.backThickness, Math.max(1, t / 3))
  const inset = toNonNegativeNumber(meta.inset, 0)
  const backFaceY = body.y + body.depth
  const y = backFaceY - inset - backThickness

  if (normalizeBoolean(meta.overlayBack)) {
    return {
      x: body.x,
      y,
      z: body.z,
      width: body.width,
      depth: backThickness,
      height: body.height
    }
  }

  const hasLeftSide = normalizeBoolean(meta.hasLeftSide)
  const hasRightSide = normalizeBoolean(meta.hasRightSide)
  const hasTop = normalizeBoolean(meta.hasTop)
  const hasBottom = normalizeBoolean(meta.hasBottom)
  const topCoverBack = normalizeBoolean(meta.topCoverBack)
  const bottomCoverBack = normalizeBoolean(meta.bottomCoverBack)
  const leftInset = hasLeftSide ? t : 0
  const rightInset = hasRightSide ? t : 0
  const bottomInset = hasBottom && !bottomCoverBack ? t : 0
  const topInset = hasTop && !topCoverBack ? t : 0
  const x = body.x + leftInset - (hasLeftSide ? grooveDepth : 0)
  const width = Math.max(
    1,
    body.width
      - leftInset
      - rightInset
      + (hasLeftSide ? grooveDepth : 0)
      + (hasRightSide ? grooveDepth : 0)
  )
  const z = body.z + bottomInset - (hasBottom && !bottomCoverBack ? grooveDepth : 0)
  const height = Math.max(
    1,
    body.height
      - bottomInset
      - topInset
      + (hasBottom && !bottomCoverBack ? grooveDepth : 0)
      + (hasTop && !topCoverBack ? grooveDepth : 0)
  )

  return {
    x,
    y,
    z,
    width,
    depth: backThickness,
    height
  }
} // End getBackGeometry

//=================
function buildFramePanels(sourceBox, info, body, panels) {
  const t = body.thickness
  const topShift = normalizeBoolean(info?.topStrip?.enabled) ? toNonNegativeNumber(info.topStrip.size, 0) : 0
  const toeHeight = normalizeBoolean(info?.toeKick?.enabled) ? toNonNegativeNumber(info.toeKick.height, 0) : 0
  const detachedToe = normalizeBoolean(info?.toeKick?.detached)
  const backEnabled = normalizeBoolean(info?.back?.enabled)
  const overlayBack = backEnabled && normalizeBoolean(info?.back?.overlayBack)
  const topCoverBack = backEnabled && normalizeBoolean(info?.back?.topCoverBack)
  const bottomCoverBack = backEnabled && normalizeBoolean(info?.back?.bottomCoverBack)
  const backStopDepth = getBackStopDepth(info, body)
  const bodyTop = body.z + body.height - topShift
  const bottomZ = body.z + toeHeight
  const sideBottom = normalizeBoolean(info?.general?.bottomOverlap) ? bottomZ + t : bottomZ
  const sideTop = normalizeBoolean(info?.general?.topOverlap) ? bodyTop - t : bodyTop
  const sideZ = detachedToe ? body.z + toeHeight : sideBottom
  const sideHeight = Math.max(t, sideTop - sideZ)
  const innerX = body.x + t
  const innerWidth = Math.max(t, body.width - (2 * t))
  const topBottomX = normalizeBoolean(info?.general?.topOverlap) ? body.x : innerX
  const topBottomWidth = normalizeBoolean(info?.general?.topOverlap) ? body.width : innerWidth
  const bottomX = normalizeBoolean(info?.general?.bottomOverlap) ? body.x : innerX
  const bottomWidth = normalizeBoolean(info?.general?.bottomOverlap) ? body.width : innerWidth
  const sideDepth = overlayBack ? backStopDepth : body.depth
  const topDepth = (overlayBack || topCoverBack) ? backStopDepth : body.depth
  const bottomDepth = (overlayBack || bottomCoverBack) ? backStopDepth : body.depth
  const frameMeta = {
    overlayBack,
    topCoverBack,
    bottomCoverBack,
    backThickness: backEnabled ? toPositiveNumber(info.back.thickness, Math.max(1, t / 3)) : 0,
    backInset: backEnabled ? toNonNegativeNumber(info.back.inset, 0) : 0
  }

  if (normalizeBoolean(info?.general?.leftSide)) {
    pushPanel(panels, createPanel(sourceBox, 'left_side', 'Hông trái', body.x, body.y, sideZ, t, sideDepth, sideHeight, {
      panelThickness: t,
      orientation: 'vertical',
      panelSide: 'left',
      panelOffsetFrom: 'left',
      cabinetInfoFrame: frameMeta
    }))
  }

  if (normalizeBoolean(info?.general?.rightSide)) {
    pushPanel(panels, createPanel(sourceBox, 'right_side', 'Hông phải', body.x + body.width - t, body.y, sideZ, t, sideDepth, sideHeight, {
      panelThickness: t,
      orientation: 'vertical',
      panelSide: 'right',
      panelOffsetFrom: 'right',
      cabinetInfoFrame: frameMeta
    }))
  }

  if (normalizeBoolean(info?.general?.top)) {
    pushPanel(panels, createPanel(sourceBox, 'top', 'Tấm nóc', topBottomX, body.y, bodyTop - t, topBottomWidth, topDepth, t, {
      panelThickness: t,
      orientation: 'horizontal',
      panelSide: 'top',
      panelOffsetFrom: 'top',
      cabinetInfoFrame: frameMeta
    }))
  }

  if (normalizeBoolean(info?.general?.bottom)) {
    pushPanel(panels, createPanel(sourceBox, 'bottom', 'Tấm đáy', bottomX, body.y, bottomZ, bottomWidth, bottomDepth, t, {
      panelThickness: t,
      orientation: 'horizontal',
      panelSide: 'bottom',
      panelOffsetFrom: 'bottom',
      cabinetInfoFrame: frameMeta
    }))
  }
} // End buildFramePanels

//=================
function buildBackPanels(sourceBox, info, body, panels) {
  if (!normalizeBoolean(info?.back?.enabled)) return

  const meta = getBackBuildMeta(info, body)
  const backGeometry = getBackGeometry(body, meta)
  const splitInfo = parseBackSplitFormula(info.back.splitFormula, backGeometry.width, meta.backThickness)
  let startX = backGeometry.x

  const createBackPanel = (name, panelX, panelWidth, panelIndex, panelCount) => createPanel(sourceBox, 'back', name, panelX, backGeometry.y, backGeometry.z, panelWidth, backGeometry.depth, backGeometry.height, {
    panelThickness: backGeometry.depth,
    orientation: 'vertical',
    panelSide: 'back',
    panelOffsetFrom: 'back',
    cabinetInfoBack: meta,
    backBaseX: backGeometry.x,
    backBaseWidth: backGeometry.width,
    backSplitFormula: meta.splitFormula,
    backSplitMode: splitInfo.mode,
    backPanelIndex: panelIndex,
    backPanelCount: panelCount
  })

  if (splitInfo.widths.length <= 1) {
    pushPanel(panels, createBackPanel('Tấm hậu', backGeometry.x, backGeometry.width, 0, 1))
    return
  }

  splitInfo.widths.forEach((panelWidth, index) => {
    pushPanel(panels, createBackPanel(`Tấm hậu ${index + 1}`, startX, panelWidth, index, splitInfo.widths.length))

    startX += panelWidth + meta.backThickness
  })
} // End buildBackPanels

//=================
function buildTopStripPanels(sourceBox, info, body, panels) {
  if (!normalizeBoolean(info?.topStrip?.enabled)) return

  const t = body.thickness
  const size = toPositiveNumber(info.topStrip.size, 50)
  const frontY = body.y + body.depth
  const faceOffset = toNumber(info.topStrip.faceOffset, 0)
  const y = frontY - faceOffset - t
  const useFullWidth = !normalizeBoolean(info.topStrip.inset) || faceOffset < 0
  const x = useFullWidth ? body.x : body.x + t
  const width = useFullWidth ? body.width : Math.max(1, body.width - (2 * t))

  pushPanel(panels, createPanel(sourceBox, 'top_strip', 'Thanh chỉ nóc', x, y, body.z + body.height - size, width, t, size, {
    panelThickness: t,
    orientation: 'horizontal',
    panelSide: 'top_strip'
  }))
} // End buildTopStripPanels

//=================
function buildHandleRailPanels(sourceBox, info, body, panels) {
  if (!normalizeBoolean(info?.handleRail?.enabled)) return

  const t = body.thickness
  const size = toPositiveNumber(info.handleRail.size, 50)
  const frontY = body.y + body.depth
  const faceOffset = toNumber(info.handleRail.faceOffset, 0)
  const frontCount = Math.max(0, toInteger(info.handleRail.frontCount, 0))
  const rearCount = Math.max(0, toInteger(info.handleRail.rearCount, 0))
  const middleCount = Math.max(0, toInteger(info.handleRail.middleCount, 0))
  const x = body.x + t
  const width = Math.max(1, body.width - (2 * t))
  const topZ = body.z + body.height - size
  const frontRailY = frontY - faceOffset - t
  const backReference = normalizeBoolean(info?.back?.enabled)
    ? body.y + toNumber(info.back.inset, 0) + toPositiveNumber(info.back.thickness, 1)
    : body.y

  for (let index = 0; index < frontCount; index += 1) {
    pushPanel(panels, createPanel(sourceBox, 'handle_front', `Diềm tay nắm trước ${index + 1}`, x, frontRailY - (index * t), topZ - (index * size), width, t, size, {
      panelThickness: t,
      orientation: 'horizontal',
      panelSide: 'handle_front'
    }))
  }

  for (let index = 0; index < rearCount; index += 1) {
    pushPanel(panels, createPanel(sourceBox, 'handle_rear', `Diềm tay nắm sau ${index + 1}`, x, backReference, topZ - (index * size), width, t, size, {
      panelThickness: t,
      orientation: 'horizontal',
      panelSide: 'handle_rear'
    }))
  }

  if (middleCount >= 2) {
    const yStart = backReference + t
    const yEnd = frontRailY
    const gap = Math.max(0, yEnd - yStart)
    const step = gap / (middleCount + 1)

    for (let index = 0; index < middleCount; index += 1) {
      const railX = x + ((index + 1) * (width / (middleCount + 1)))

      pushPanel(panels, createPanel(sourceBox, 'handle_middle', `Diềm tay nắm bổ sung ${index + 1}`, railX, yStart + ((index + 1) * step), topZ, t, Math.max(1, gap), size, {
        panelThickness: t,
        orientation: 'vertical',
        panelSide: 'handle_middle'
      }))
    }
  }
} // End buildHandleRailPanels

//=================
function buildDoorStopPanels(sourceBox, info, body, panels) {
  if (!normalizeBoolean(info?.doorStop?.enabled)) return

  const t = body.thickness
  const size = toPositiveNumber(info.doorStop.size, 50)
  const frontY = body.y + body.depth
  const y = frontY - toNumber(info.doorStop.faceOffset, 0) - (normalizeBoolean(info.doorStop.horizontal) ? size : t)
  const x = body.x + t
  const width = Math.max(1, body.width - (2 * t))
  const clearHeight = Math.max(1, body.height - (2 * t))
  const offsets = parseDivisionFormula(info.doorStop.formula, clearHeight, t)

  offsets.forEach((offset, index) => {
    const z = body.z + t + offset

    pushPanel(panels, createPanel(sourceBox, 'door_stop', `Thanh chặn cánh ${index + 1}`, x, y, z, width, normalizeBoolean(info.doorStop.horizontal) ? size : t, normalizeBoolean(info.doorStop.horizontal) ? t : size, {
      panelThickness: t,
      orientation: 'horizontal',
      panelSide: 'door_stop'
    }))
  })
} // End buildDoorStopPanels

//=================
function buildToeKickPanels(sourceBox, info, body, panels) {
  if (!normalizeBoolean(info?.toeKick?.enabled)) return

  const t = body.thickness
  const height = toPositiveNumber(info.toeKick.height, 100)
  const inset = toNumber(info.toeKick.inset, t)
  const frontY = body.y + body.depth
  const y = frontY - inset - t
  const detached = normalizeBoolean(info.toeKick.detached)
  const x = detached ? body.x : body.x + t
  const width = detached ? body.width : Math.max(1, body.width - (2 * t))

  pushPanel(panels, createPanel(sourceBox, 'toe_kick_front', 'Len chân trước', x, y, body.z, width, t, height, {
    panelThickness: t,
    orientation: 'horizontal',
    panelSide: 'toe_kick_front'
  }))

  if (normalizeBoolean(info.toeKick.rear)) {
    const rearY = normalizeBoolean(info?.back?.enabled)
      ? body.y + toNumber(info.back.inset, 0) + toPositiveNumber(info.back.thickness, 1)
      : body.y

    pushPanel(panels, createPanel(sourceBox, 'toe_kick_rear', 'Thanh chân sau', x, rearY, body.z, width, t, height, {
      panelThickness: t,
      orientation: 'horizontal',
      panelSide: 'toe_kick_rear'
    }))
  }

  const middleCount = Math.max(0, toInteger(info.toeKick.middleCount, 0))

  if (middleCount > 0) {
    const rearY = normalizeBoolean(info?.back?.enabled)
      ? body.y + toNumber(info.back.inset, 0) + toPositiveNumber(info.back.thickness, 1)
      : body.y
    const depth = Math.max(1, y - rearY)

    for (let index = 0; index < middleCount; index += 1) {
      const railX = body.x + t + ((index + 1) * ((body.width - (2 * t)) / (middleCount + 1)))

      pushPanel(panels, createPanel(sourceBox, 'toe_kick_middle', `Thanh chân bổ sung ${index + 1}`, railX, rearY, body.z, t, depth, height, {
        panelThickness: t,
        orientation: 'vertical',
        panelSide: 'toe_kick_middle'
      }))
    }
  }
} // End buildToeKickPanels

//=================
function buildFillerPanels(sourceBox, info, body, panels) {
  if (!normalizeBoolean(info?.filler?.enabled)) return

  const t = body.thickness
  const sourceX = toNumber(sourceBox.x, 0)
  const sourceY = toNumber(sourceBox.y, 0)
  const depth = toPositiveNumber(sourceBox.depth, 1)
  const height = toPositiveNumber(sourceBox.height, 1)
  const left = toNonNegativeNumber(info.filler.left, 0)
  const right = toNonNegativeNumber(info.filler.right, 0)

  if (left > 0) {
    const rotate = normalizeBoolean(info.filler.leftRotate)

    pushPanel(panels, createPanel(sourceBox, 'filler_left', 'Nẹp trái', sourceX, sourceY + depth - (rotate ? left : t), toNumber(sourceBox.z, 0), rotate ? t : left, rotate ? left : t, height, {
      panelThickness: t,
      orientation: 'vertical',
      panelSide: 'filler_left'
    }))
  }

  if (right > 0) {
    const rotate = normalizeBoolean(info.filler.rightRotate)
    const x = sourceX + toPositiveNumber(sourceBox.width, 1) - right

    pushPanel(panels, createPanel(sourceBox, 'filler_right', 'Nẹp phải', rotate ? sourceX + toPositiveNumber(sourceBox.width, 1) - t : x, sourceY + depth - (rotate ? right : t), toNumber(sourceBox.z, 0), rotate ? t : right, rotate ? right : t, height, {
      panelThickness: t,
      orientation: 'vertical',
      panelSide: 'filler_right'
    }))
  }
} // End buildFillerPanels

//=================
export function buildCabinetInfoPanels(sourceBox, info) {
  if (!sourceBox || !info) return []

  const body = getBodyRect(sourceBox, info)
  const panels = []

  buildBackPanels(sourceBox, info, body, panels)
  buildFillerPanels(sourceBox, info, body, panels)
  buildFramePanels(sourceBox, info, body, panels)
  buildTopStripPanels(sourceBox, info, body, panels)
  buildHandleRailPanels(sourceBox, info, body, panels)
  buildDoorStopPanels(sourceBox, info, body, panels)
  buildToeKickPanels(sourceBox, info, body, panels)

  return panels
} // End buildCabinetInfoPanels
