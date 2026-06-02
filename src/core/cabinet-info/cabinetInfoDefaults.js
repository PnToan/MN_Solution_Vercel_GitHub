//=================
export function createDefaultCabinetInfoState() {
  return {
    groupName: 'Box 1',
    general: {
      cabinetDepth: 600,
      panelThickness: 17.4,
      leftSide: true,
      rightSide: true,
      top: true,
      bottom: true,
      topOverlap: false,
      bottomOverlap: false
    },
    back: {
      enabled: true,
      grooveDepth: 10,
      thickness: 10,
      inset: 10,
      splitFormula: '',
      topCoverBack: false,
      bottomCoverBack: false,
      overlayBack: false
    },
    topStrip: {
      enabled: true,
      inset: true,
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
      enabled: true,
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
      rightRotate: false,
      faceOffset: 0
    },
    shelfInset: {
      enabled: false,
      vertical: 0,
      horizontal: 0
    }
  }
} // End createDefaultCabinetInfoState
