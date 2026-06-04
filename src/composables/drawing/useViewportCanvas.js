import { nextTick, ref } from 'vue'

//=================
export function useViewportCanvas(options = {}) {
  const {
    viewportRef,
    app,
    drawing,
    renderCanvas2D,
    getRenderPayload,
    afterResize = null
  } = options

  const canvasRef = ref(null)
  let ctx = null
  let ratio = 1

  //=================
  function setCanvasRef(element) {
    canvasRef.value = element
  } // End setCanvasRef

  //=================
  function draw() {
    if (!ctx || !canvasRef.value) return

    const canvas = canvasRef.value
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const payload = typeof getRenderPayload === 'function'
      ? getRenderPayload({ width, height })
      : null

    if (!payload) return

    renderCanvas2D(ctx, payload)
  } // End draw

  //=================
  function resizeCanvas() {
    const canvas = canvasRef.value
    const host = viewportRef?.value

    if (!canvas || !host) return

    const rect = host.getBoundingClientRect()
    ratio = window.devicePixelRatio || 1
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    ctx = canvas.getContext('2d')
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    app.setViewportSize(rect.width, rect.height)
    draw()

    if (typeof afterResize === 'function') {
      nextTick(afterResize)
    }
  } // End resizeCanvas

  //=================
  function onAppSettingsApplied() {
    drawing.rebuildZones()
    draw()

    if (typeof afterResize === 'function') {
      nextTick(afterResize)
    }
  } // End onAppSettingsApplied

  return {
    canvasRef,
    setCanvasRef,
    draw,
    resizeCanvas,
    onAppSettingsApplied
  }
} // End useViewportCanvas
