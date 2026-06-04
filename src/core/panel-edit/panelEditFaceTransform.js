//=================
export function getPanelEditCanonicalFaceSide(faceKey) {
  if (faceKey === 'xy') return 'top'
  if (faceKey === 'yz') return 'left'
  if (faceKey === 'xz') return 'front'

  return null
} // End getPanelEditCanonicalFaceSide

//=================
function getPanelEditMirrorAxes(sourceSide, targetSide) {
  if (!sourceSide || !targetSide || sourceSide === targetSide) {
    return {
      mirrorX: false,
      mirrorY: false
    }
  }

  const pairKey = [sourceSide, targetSide].sort().join(':')

  if (pairKey === 'bottom:top') {
    return {
      mirrorX: false,
      mirrorY: true
    }
  }

  if (pairKey === 'left:right') {
    return {
      mirrorX: true,
      mirrorY: false
    }
  }

  if (pairKey === 'back:front') {
    return {
      mirrorX: true,
      mirrorY: false
    }
  }

  return {
    mirrorX: false,
    mirrorY: false
  }
} // End getPanelEditMirrorAxes

//=================
function transformPanelEditPoint(point, context, sourceSide, targetSide) {
  if (!point) return null

  const axes = getPanelEditMirrorAxes(sourceSide, targetSide)
  const width = Number(context?.width || 0)
  const height = Number(context?.height || 0)
  const x = Number(point.x || 0)
  const y = Number(point.y || 0)

  return {
    x: axes.mirrorX ? width - x : x,
    y: axes.mirrorY ? height - y : y
  }
} // End transformPanelEditPoint

//=================
function transformPanelEditGuide(guide, context, sourceSide, targetSide) {
  if (!guide) return guide

  const axes = getPanelEditMirrorAxes(sourceSide, targetSide)
  const width = Number(context?.width || 0)
  const height = Number(context?.height || 0)
  const axis = guide.axis
  const value = Number(guide.value || 0)
  const baseValue = Number(guide.baseValue || 0)

  if (axes.mirrorX && axis === 'vertical') {
    return {
      ...guide,
      baseValue: width - baseValue,
      value: width - value
    }
  }

  if (axes.mirrorY && axis === 'horizontal') {
    return {
      ...guide,
      baseValue: height - baseValue,
      value: height - value
    }
  }

  return {
    ...guide,
    baseValue,
    value
  }
} // End transformPanelEditGuide

//=================
export function transformPanelEditRectangle(rectangle, context, sourceSide, targetSide) {
  if (!rectangle) return rectangle

  return {
    ...rectangle,
    start: transformPanelEditPoint(rectangle.start, context, sourceSide, targetSide),
    end: transformPanelEditPoint(rectangle.end, context, sourceSide, targetSide),
    center: rectangle.center
      ? transformPanelEditPoint(rectangle.center, context, sourceSide, targetSide)
      : null,
    polygon: Array.isArray(rectangle.polygon)
      ? rectangle.polygon.map((point) => transformPanelEditPoint(point, context, sourceSide, targetSide))
      : null
  }
} // End transformPanelEditRectangle

//=================
export function transformPanelEditLine(line, context, sourceSide, targetSide) {
  if (!line) return line

  return {
    ...line,
    start: transformPanelEditPoint(line.start, context, sourceSide, targetSide),
    end: transformPanelEditPoint(line.end, context, sourceSide, targetSide)
  }
} // End transformPanelEditLine

//=================
export function transformPanelEditCircle(circle, context, sourceSide, targetSide) {
  if (!circle) return circle

  return {
    ...circle,
    center: transformPanelEditPoint(circle.center, context, sourceSide, targetSide)
  }
} // End transformPanelEditCircle

//=================
export function transformPanelEditGuides(guides, context, sourceSide, targetSide) {
  return Array.isArray(guides)
    ? guides.map((guide) => transformPanelEditGuide(guide, context, sourceSide, targetSide))
    : []
} // End transformPanelEditGuides

//=================
export function transformPanelEditRectangles(rectangles, context, sourceSide, targetSide) {
  return Array.isArray(rectangles)
    ? rectangles.map((rectangle) => transformPanelEditRectangle(rectangle, context, sourceSide, targetSide))
    : []
} // End transformPanelEditRectangles

//=================
export function transformPanelEditLines(lines, context, sourceSide, targetSide) {
  return Array.isArray(lines)
    ? lines.map((line) => transformPanelEditLine(line, context, sourceSide, targetSide))
    : []
} // End transformPanelEditLines

//=================
export function transformPanelEditCircles(circles, context, sourceSide, targetSide) {
  return Array.isArray(circles)
    ? circles.map((circle) => transformPanelEditCircle(circle, context, sourceSide, targetSide))
    : []
} // End transformPanelEditCircles
