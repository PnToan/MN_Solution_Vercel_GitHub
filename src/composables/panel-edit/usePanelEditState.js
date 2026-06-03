import { ref } from 'vue'

//=================
export function usePanelEditState() {
  const panelEditViewport = ref({
    zoom: 1,
    panX: 0,
    panY: 0
  })

  const panelEditTape = ref({
    hoverSnap: null,
    draft: null,
    guides: [],
    inputBuffer: ''
  })

  const panelEditRect = ref({
    hoverSnap: null,
    draft: null,
    pendingAction: null,
    rectangles: []
  })

  const panelEditLine = ref({
    hoverSnap: null,
    hoverRegion: null,
    hoverLine: null,
    selectedLineId: null,
    draft: null,
    lines: []
  })

  const panelEditCircle = ref({
    hoverSnap: null,
    draft: null,
    circles: [],
    inputBuffer: ''
  })

  const panelEditArc = ref({
    hoverSnap: null,
    hoverPoint: null,
    draft: null,
    inputBuffer: ''
  })

  const panelEditSelection = ref({
    items: [],
    hoverItem: null
  })

  const panelEditSelectDrag = ref({
    active: false,
    start: null,
    current: null,
    moved: false
  })

  const panelEditMove = ref({
    stage: 'idle',
    start: null,
    current: null,
    hoverSnap: null,
    baseItems: []
  })

  const panelEditHistory = ref({
    undoStack: [],
    redoStack: [],
    max: 80
  })

  return {
    panelEditViewport,
    panelEditTape,
    panelEditRect,
    panelEditLine,
    panelEditCircle,
    panelEditArc,
    panelEditSelection,
    panelEditSelectDrag,
    panelEditMove,
    panelEditHistory
  }
} // End usePanelEditState
