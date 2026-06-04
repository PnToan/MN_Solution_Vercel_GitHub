const CAMERA_CONFIG = {
  top: {
    key: 'top',
    label: 'Trên',
    axisU: 'x',
    axisV: 'y',
    reverseU: false,
    reverseV: false
  },

  bottom: {
    key: 'bottom',
    label: 'Dưới',
    axisU: 'x',
    axisV: 'y',
    reverseU: true,
    reverseV: false
  },

  front: {
    key: 'front',
    label: 'Trước',
    axisU: 'x',
    axisV: 'z',
    reverseU: false,
    reverseV: false
  },

  back: {
    key: 'back',
    label: 'Sau',
    axisU: 'x',
    axisV: 'z',
    reverseU: true,
    reverseV: false
  },

  left: {
    key: 'left',
    label: 'Trái',
    axisU: 'y',
    axisV: 'z',
    reverseU: true,
    reverseV: false,
    originU: 1100
  },

  right: {
    key: 'right',
    label: 'Phải',
    axisU: 'y',
    axisV: 'z',
    reverseU: false,
    reverseV: false
  }
}

//=================
export function getCameraConfig(viewKey = 'top') {
  return CAMERA_CONFIG[viewKey] || CAMERA_CONFIG.top
} // End getCameraConfig

//=================
function getBoxAxisMin(box, axis) {
  if (axis === 'x') return box.x
  if (axis === 'y') return box.y
  if (axis === 'z') return box.z

  return 0
} // End getBoxAxisMin

//=================
function getBoxAxisSize(box, axis) {
  if (axis === 'x') return box.width
  if (axis === 'y') return box.depth
  if (axis === 'z') return box.height

  return 0
} // End getBoxAxisSize

//=================
function projectAxisValue(value, size, reverse, origin = 0) {
  if (reverse) return origin - value - size

  return value - origin
} // End projectAxisValue

//=================
export function projectBoxToCameraRect(box, viewKey = 'top') {
  const camera = getCameraConfig(viewKey)

  const uMin = getBoxAxisMin(box, camera.axisU)
  const vMin = getBoxAxisMin(box, camera.axisV)

  const uSize = getBoxAxisSize(box, camera.axisU)
  const vSize = getBoxAxisSize(box, camera.axisV)

  return {
    id: box.id,
    x: projectAxisValue(uMin, uSize, camera.reverseU, camera.originU || 0),
    y: projectAxisValue(vMin, vSize, camera.reverseV, camera.originV || 0),
    width: uSize,
    height: vSize,
    source: box
  }
} // End projectBoxToCameraRect

//=================
export function cameraLocalToWorldPoint(local, viewKey = 'top') {
  const camera = getCameraConfig(viewKey)

  const point = {
    x: 0,
    y: 0,
    z: 0
  }

  point[camera.axisU] = camera.reverseU ? (camera.originU || 0) - local.x : local.x + (camera.originU || 0)
  point[camera.axisV] = camera.reverseV ? (camera.originV || 0) - local.y : local.y + (camera.originV || 0)

  return point
} // End cameraLocalToWorldPoint