import { computed } from 'vue'

//=================
export function usePanelEditFooterText({
  activePanelEditContext,
  drawing,
  panelEditLine,
  panelEditSelection,
  panelEditSelectDrag,
  panelEditRect,
  panelEditMove,
  panelEditTape,
  panelEditArc,
  panelEditCircle,
  panelEditTools,
  getPanelEditArcData,
  getEffectivePanelEditArcDraft,
  getPanelEditCircleRadius
}) {
  return computed(() => {
  if (!activePanelEditContext.value) return ''

  const shapeTool = drawing.state.panelEdit?.shapeTool

  if (!shapeTool || shapeTool === 'editPanelSelect') {
    const hoverRegion = panelEditLine.value.hoverRegion
    const hoverLine = panelEditLine.value.hoverLine
    const selectedCount = panelEditSelection.value.items.length

    if (panelEditSelectDrag.value.active) {
      return 'Select: thả chuột để chọn toàn bộ line / hình chữ nhật / hình tròn trong vùng quét'
    }

    if (selectedCount > 0) {
      return `Select: đã chọn ${selectedCount} chi tiết | M/Move để di chuyển | Delete để xóa`
    }

    if (hoverLine) {
      return 'Select: đang nhận line | click để chọn toàn bộ line / arc'
    }

    if (panelEditRect.value.pendingAction?.source === 'lineRegion') {
      return 'Select vùng: chọn None để bỏ qua hoặc Khấu để khấu xuyên vùng đã chọn'
    }

    if (hoverRegion) {
      return `Select: vùng ${Math.round(hoverRegion.width * 10) / 10} x ${Math.round(hoverRegion.height * 10) / 10} mm | click để chọn vùng`
    }

    return `Select: ${activePanelEditContext.value.panelName} | ${activePanelEditContext.value.faceLabel} | Space để thoát lệnh hiện tại`
  }

  if (shapeTool === 'editPanelLine') {
    const draft = panelEditLine.value.draft
    const hoverSnap = panelEditLine.value.hoverSnap

    if (draft) {
      const end = draft.current || draft.start
      const length = Math.hypot(Number(end.x || 0) - Number(draft.start.x || 0), Number(end.y || 0) - Number(draft.start.y || 0))
      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''

      return `Line: dài ${Math.round(length * 10) / 10} mm${snapText} | click điểm cuối`
    }

    if (hoverSnap) {
      return `Line: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh/guide'} | click điểm đầu`
    }

    return 'Line: click điểm đầu, rê chuột preview, click điểm cuối để tạo line'
  }

  if (shapeTool === 'editPanelMove') {
    const selectedCount = panelEditSelection.value.items.length

    if (panelEditMove.value.stage === 'target') {
      const snapText = panelEditMove.value.hoverSnap ? ` | Snap: ${panelEditMove.value.hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''

      return `Move: đang preview ${selectedCount} chi tiết${snapText} | click điểm 2 để hoàn tất | Shift khóa trục | Esc hủy`
    }

    if (selectedCount > 0) {
      const snapText = panelEditMove.value.hoverSnap ? ` | Snap: ${panelEditMove.value.hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''

      return `Move: đã chọn ${selectedCount} chi tiết${snapText} | click điểm 1 để bắt đầu di chuyển`
    }

    return 'Move: chọn line / quét chọn hình trước, sau đó click điểm 1 để di chuyển'
  }

  if (shapeTool === 'editPanelTape') {
    const draft = panelEditTape.value.draft
    const hoverSnap = panelEditTape.value.hoverSnap
    const input = panelEditTape.value.inputBuffer

    if (draft) {
      const distance = Math.abs(Number(draft.value || 0) - Number(draft.baseValue || 0))
      const inputText = input ? ` | Nhập: ${input}` : ''

      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'giao/điểm' : 'đường'}` : ''

      return `Thước: ${draft.axis === 'vertical' ? 'Guide đứng' : 'Guide ngang'} | Khoảng cách ${Math.round(distance * 10) / 10} mm${inputText}${snapText} | Enter để cố định hoặc click lần nữa`
    }

    if (hoverSnap) {
      return `Thước: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh'} | click để tạo guide ${hoverSnap.axis === 'vertical' ? 'đứng' : 'ngang'}`
    }

    return 'Thước: rê chuột gần cạnh để bắt snap, click để tạo đường guide'
  }

  if (shapeTool === 'editPanelRect') {
    const draft = panelEditRect.value.draft
    const hoverSnap = panelEditRect.value.hoverSnap

    if (panelEditRect.value.pendingAction) {
      return 'Vẽ hình chữ nhật: chọn None để giữ nét vẽ hoặc Khấu để push thủng panel'
    }

    if (draft) {
      const width = Math.abs(Number(draft.current?.x || 0) - Number(draft.start?.x || 0))
      const height = Math.abs(Number(draft.current?.y || 0) - Number(draft.start?.y || 0))
      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''

      return `Vẽ hình chữ nhật: ${Math.round(width * 10) / 10} x ${Math.round(height * 10) / 10} mm${snapText} | click điểm góc chéo để hoàn tất`
    }

    if (hoverSnap) {
      return `Vẽ hình chữ nhật: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh/guide'} | click điểm đầu`
    }

    return 'Vẽ hình chữ nhật: click điểm đầu, click điểm góc chéo để tạo hình chữ nhật'
  }

  if (shapeTool === 'editPanelArc') {
    const draft = panelEditArc.value.draft
    const hoverSnap = panelEditArc.value.hoverSnap

    if (draft?.stage === 'end') {
      const arcData = getPanelEditArcData(getEffectivePanelEditArcDraft(draft))
      const radiusText = panelEditArc.value.inputBuffer || (arcData ? `${Math.round(arcData.radius * 10) / 10}` : '')
      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''
      const inputText = radiusText ? ` | R: ${radiusText} mm` : ''

      return `Arc: preview cung 1/4${inputText}${snapText} | click điểm 2 hoặc nhập R + Enter`
    }

    if (draft?.stage === 'bulge') {
      const arcData = getPanelEditArcData(getEffectivePanelEditArcDraft(draft))
      const radiusText = panelEditArc.value.inputBuffer || (arcData ? `${Math.round(arcData.radius * 10) / 10}` : '')
      const angleText = arcData ? ` | góc ${Math.round(arcData.sweep * 180 / Math.PI)}°` : ''
      const radiusDisplay = radiusText ? ` | R: ${radiusText} mm` : ''
      const redText = arcData?.isQuarterOrHalf ? ' | đỏ = cung 1/4 hoặc 1/2' : ''

      return `Arc: chọn điểm đỉnh để đổi độ cong${radiusDisplay}${angleText}${redText} | Enter hoặc click đúp điểm 2 để OK | click điểm đỉnh để vẽ`
    }

    if (hoverSnap) {
      return `Arc: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh/guide'} | click điểm 1`
    }

    return 'Arc: click điểm 1, rê chuột preview, click điểm 2, Enter để OK hoặc click điểm đỉnh'
  }

  if (shapeTool === 'editPanelCircle') {
    const draft = panelEditCircle.value.draft
    const hoverSnap = panelEditCircle.value.hoverSnap
    const input = panelEditCircle.value.inputBuffer

    if (draft) {
      const previewRadius = input ? Number(input) : getPanelEditCircleRadius(draft)
      const radiusText = Number.isFinite(previewRadius) && previewRadius > 0
        ? Math.round(previewRadius * 10) / 10
        : input
      const inputText = input ? ` | Nhập R: ${input} mm` : ''
      const snapText = hoverSnap ? ` | Snap: ${hoverSnap.kind === 'circle' ? 'điểm' : 'cạnh/guide'}` : ''

      return `Vẽ hình tròn: R${radiusText} mm${inputText}${snapText} | click điểm bán kính hoặc Enter`
    }

    if (hoverSnap) {
      return `Vẽ hình tròn: snap ${hoverSnap.kind === 'circle' ? 'điểm tròn' : 'cạnh/guide'} | click tâm`
    }

    return 'Vẽ hình tròn: click tâm, rê chuột preview, click điểm bán kính hoặc nhập số + Enter'
  }

  const toolName = panelEditTools.find((tool) => tool.id === shapeTool)?.label || 'Edit Panel'

  return `${toolName}: ${activePanelEditContext.value.panelName} | ${activePanelEditContext.value.faceLabel}`
})
} // End usePanelEditFooterText
