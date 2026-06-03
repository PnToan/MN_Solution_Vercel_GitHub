import { computed, nextTick, ref } from 'vue'

//=================
export function useDimensionInput({
  wall,
  box,
  drawing,
  app,
  draw,
  getWallBox3D,
  getWallDimInputInfo,
  getBoxDimInputInfo
}) {
  const dimInputRef = ref(null)
  const dimInput = ref({
    active: false,
    key: null,
    dimensionId: null,
    x: 0,
    y: 0,
    value: ''
  })

  const dimInputStyle = computed(() => ({
    left: `${dimInput.value.x}px`,
    top: `${dimInput.value.y}px`
  }))

  //=================
  function setDimInputRef(element) {
    dimInputRef.value = element
  } // End setDimInputRef

  //=================
  function updateDimInputValue(value) {
    dimInput.value.value = value
  } // End updateDimInputValue

  //=================
  function openDimInput(dimHit) {
    const info = dimHit?.target === 'dimension'
      ? dimHit
      : typeof dimHit === 'string'
        ? getWallDimInputInfo(dimHit)
        : getBoxDimInputInfo(dimHit)
    if (!info) return
    dimInput.value = {
      active: true,
      target: info.target || 'wall',
      boxId: info.boxId || null,
      dimensionId: info.dimensionId || null,
      key: info.key,
      x: info.x,
      y: info.y,
      value: info.value
    }
    if (dimInput.value.target === 'dimension') {
      wall.clearEditingDim()
      box.clearEditingDim()
    } else if (dimInput.value.target === 'box') {
      box.selectBox(info.boxId)
      box.setEditingDim(info.key)
      wall.clearEditingDim()
      app.setStatus(`Nhập kích thước Box: ${info.key}`)
    } else {
      wall.setEditingDim(info.editKey)
      box.clearEditingDim()
      app.setStatus(`Nhập kích thước Wall: ${info.key}`)
    }
    app.clearCommand()
    nextTick(() => {
      const input = dimInputRef.value
      if (!input) return

      input.focus()
      input.select()

      if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(0, String(dimInput.value.value).length)
      }
    })

    draw()
  } // End openDimInput

  //=================
  function cancelDimInput() {
    dimInput.value.active = false
    wall.clearEditingDim()
    box.clearEditingDim()
    draw()
  } // End cancelDimInput

  //=================
  function commitDimInput() {
    const rawValue = String(dimInput.value.value || '').trim()
    const numberValue = Number(rawValue)

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      cancelDimInput()
      return
    }

    if (dimInput.value.target === 'wall') {
      wall.setSize(dimInput.value.key, numberValue)
      drawing.rebuildZones()
    }

    if (dimInput.value.target === 'dimension') {
      drawing.setDimensionValue(dimInput.value.dimensionId, numberValue)
      wall.clearEditingDim()
      box.clearEditingDim()
    } else if (dimInput.value.target === 'box') {
      box.setBoxSize(
        dimInput.value.boxId,
        dimInput.value.key,
        numberValue,
        getWallBox3D()
      )

      drawing.rebuildZones()
    }

    cancelDimInput()
    draw()
  } // End commitDimInput

  //=================
  function onDimInputKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      commitDimInput()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelDimInput()
    }
  } // End onDimInputKeyDown

  return {
    dimInput,
    dimInputStyle,
    setDimInputRef,
    updateDimInputValue,
    openDimInput,
    cancelDimInput,
    onDimInputKeyDown
  }
} // End useDimensionInput
