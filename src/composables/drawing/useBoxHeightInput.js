import { computed, nextTick, ref } from 'vue'

//=================
export function useBoxHeightInput({
  canvasRef,
  wall,
  box,
  drawing,
  app,
  draw,
  exitToSelect
}) {
  const boxHeightInputRef = ref(null)
  const boxHeightInput = ref({
    active: false,
    x: 0,
    y: 0,
    value: ''
  })

  const boxHeightInputStyle = computed(() => ({
    left: `${boxHeightInput.value.x}px`,
    top: `${boxHeightInput.value.y}px`
  }))

  //=================
  function setBoxHeightInputRef(element) {
    boxHeightInputRef.value = element
  } // End setBoxHeightInputRef

  //=================
  function updateBoxHeightInputValue(value) {
    boxHeightInput.value.value = value
  } // End updateBoxHeightInputValue

  //=================
  function openBoxHeightInput(event) {
    const rect = canvasRef.value.getBoundingClientRect()

    boxHeightInput.value.active = true
    boxHeightInput.value.x = event.clientX - rect.left + 12
    boxHeightInput.value.y = event.clientY - rect.top + 12
    boxHeightInput.value.value = String(wall.state.height || 600)

    nextTick(() => {
      boxHeightInputRef.value?.focus()
      boxHeightInputRef.value?.select()
    })
  } // End openBoxHeightInput

  //=================
  function cancelBoxHeightInput() {
    if (!boxHeightInput.value.active) {
      return
    }

    exitToSelect()
  } // End cancelBoxHeightInput

  //=================
  function commitBoxHeightInput() {
    const height = Number(boxHeightInput.value.value)

    if (!Number.isFinite(height) || height <= 0) {
      cancelBoxHeightInput()
      return
    }

    const newBox = box.commitDraft(height)

    boxHeightInput.value.active = false
    boxHeightInput.value.value = ''

    if (newBox) {
      drawing.rebuildZones()
      app.setStatus(`Đã tạo ${newBox.name}`)
    } else {
      app.setStatus('Box quá nhỏ, chưa tạo')
    }

    draw()
  } // End commitBoxHeightInput

  //=================
  function onBoxHeightInputKeyDown(event) {
    const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space'

    if (isSpace) {
      event.preventDefault()
      event.stopPropagation()
      exitToSelect()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      commitBoxHeightInput()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      exitToSelect()
    }
  } // End onBoxHeightInputKeyDown

  return {
    boxHeightInput,
    boxHeightInputStyle,
    setBoxHeightInputRef,
    updateBoxHeightInputValue,
    openBoxHeightInput,
    cancelBoxHeightInput,
    commitBoxHeightInput,
    onBoxHeightInputKeyDown
  }
} // End useBoxHeightInput
