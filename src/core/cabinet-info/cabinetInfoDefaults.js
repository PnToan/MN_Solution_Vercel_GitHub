//=================
export function createDefaultCabinetInfoState() {
  return {
    groupName: 'Box 1',
    general: {
      cabinetDepth: 500,
      panelThickness: 17.4,
      leftSide: false,
      rightSide: false,
      top: false,
      bottom: false,
      topOverlap: true,
      bottomOverlap: true
    },
    back: {
      enabled: false,
      grooveDepth: 10,
      thickness: 5,
      inset: 10,
      splitFormula: '',
      topCoverBack: false,
      bottomCoverBack: false
    },
    topStrip: {
      enabled: false,
      inset: false,
      size: 50,
      faceOffset: 0
    },
    handleRail: {
      enabled: false,
      frontCount: 1,
      size: 50,
      faceOffset: 0,
      rearCount: 0,
      middleCount: 0
    },
    doorStop: {
      enabled: false,
      formula: '/2',
      size: 50,
      horizontal: false,
      faceOffset: 0
    },
    toeKick: {
      enabled: false,
      height: 100,
      inset: 17.4,
      detached: false,
      rear: false,
      middleCount: 0
    },
    filler: {
      enabled: false,
      left: 0,
      leftRotate: false,
      right: 0,
      rightRotate: false
    },
    shelfInset: {
      enabled: false,
      vertical: 0,
      horizontal: 0
    }
  }
} // End createDefaultCabinetInfoState
