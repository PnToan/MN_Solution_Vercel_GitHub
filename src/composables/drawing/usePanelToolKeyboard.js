//=================
export function usePanelToolKeyboard({ app, drawing, draw }) {
  //=================
  function handlePanelToolKey(event) {
    if (app.state.currentTool !== 'panel') return false

    const key = event.key
    const isInputKey = /^[0-9]$/.test(key) || key === '/' || key === 'Backspace' || key === 'Enter' || key === 'Escape'

    if (!isInputKey) return false

    event.preventDefault()
    event.stopPropagation()

    if (key === 'Escape') {
      drawing.clearPanelInput()
      app.clearCommand()
      app.setStatus('Vẽ Tấm: đã hủy nhập số')
      draw()
      return true
    }

    if (key === 'Backspace') {
      drawing.backspacePanelInput()
      const nextBuffer = drawing.state.panelInputBuffer
      app.setStatus(nextBuffer ? `Vẽ Tấm: ${nextBuffer}` : 'Vẽ Tấm: chọn cạnh Zone')
      draw()
      return true
    }

    if (key === 'Enter') {
      const input = drawing.getPanelInputMode()

      if (input.mode === 'divide' && !input.value) {
        app.setStatus('Vẽ Tấm: nhập /N hợp lệ, ví dụ /2 hoặc /3')
        draw()
        return true
      }

      if (!drawing.state.hover || drawing.state.hover.type !== 'zone-edge') {
        app.setStatus('Vẽ Tấm: rê chuột vào cạnh Zone để tạo tấm')
        draw()
        return true
      }

      drawing.addPanelFromHover()
      draw()
      return true
    }

    drawing.appendPanelInput(key)
    const nextBuffer = drawing.state.panelInputBuffer
    const input = drawing.getPanelInputMode()

    if (input.mode === 'divide') {
      app.setStatus(nextBuffer ? `Vẽ Tấm: chia zone ${nextBuffer}` : 'Vẽ Tấm: nhập /N')
    } else {
      app.setStatus(nextBuffer ? `Vẽ Tấm: offset ${nextBuffer}mm` : 'Vẽ Tấm: chọn cạnh Zone')
    }

    draw()
    return true
  } // End handlePanelToolKey

  return {
    handlePanelToolKey
  }
} // End usePanelToolKeyboard
