<template>
  <section class="mn-info-panel">
    <div class="mn-info-title">Thông Tin Tủ</div>

    <label class="mn-info-row">
      <span>Tên Nhóm</span>
      <input :value="info.groupName" @input="setValue('groupName', $event.target.value)" />
    </label>

    <div v-if="!selectedBox" class="mn-info-target-empty">Chọn Box để điều chỉnh</div>

    <template v-else>
      <div class="mn-info-selected">Box đang chọn: {{ selectedBoxName }}</div>

      <div class="mn-info-actions">
      <button type="button" @click="cabinetInfo.applyToSelectedBox(true)">Cập nhật</button>
      <button type="button" @click="cabinetInfo.clearSelectedBoxInfoPanels()">Xóa Info</button>
      </div>

      <label class="mn-info-check auto">
      <input type="checkbox" :checked="cabinetInfo.state.autoApply" @change="cabinetInfo.setAutoApply($event.target.checked)" />
      <span>Tick là tạo/cập nhật</span>
      </label>

      <InfoSection title="Thông tin chung" section-key="general">
      <InfoNumber label="Sâu Tủ" path="general.cabinetDepth" />
      <InfoNumber label="Độ dày tấm" path="general.panelThickness" />
      <InfoCheck label="Hông trái" path="general.leftSide" />
      <InfoCheck label="Hông phải" path="general.rightSide" />
      <InfoCheck label="Nóc" path="general.top" />
      <InfoCheck label="Đáy" path="general.bottom" />
      <InfoCheck label="Nóc trùm" path="general.topOverlap" />
      <InfoCheck label="Đáy trùm" path="general.bottomOverlap" />
    </InfoSection>

    <InfoSection title="Hậu" section-key="back">
      <InfoCheck label="Tạo hậu" path="back.enabled" />
      <InfoNumber label="Độ sâu rãnh hậu" path="back.grooveDepth" />
      <InfoNumber label="Dày hậu" path="back.thickness" />
      <InfoNumber label="Lùi hậu" path="back.inset" />
      <InfoText label="Công thức chia" path="back.splitFormula" placeholder="/2 hoặc 400,300" />
      <InfoCheck label="Nóc trùm hậu" path="back.topCoverBack" />
      <InfoCheck label="Đáy trùm hậu" path="back.bottomCoverBack" />
    </InfoSection>

    <InfoSection title="Thanh Chỉ Nóc" section-key="topStrip">
      <InfoCheck label="Tạo chỉ nóc" path="topStrip.enabled" />
      <InfoCheck label="Nóc lọt" path="topStrip.inset" />
      <InfoNumber label="Kích thước" path="topStrip.size" />
      <InfoNumber label="Âm mặt" path="topStrip.faceOffset" />
    </InfoSection>

    <InfoSection title="Diềm Tay Nắm" section-key="handleRail">
      <InfoCheck label="Tạo diềm" path="handleRail.enabled" />
      <InfoNumber label="Số lượng trước" path="handleRail.frontCount" />
      <InfoNumber label="Kích thước" path="handleRail.size" />
      <InfoNumber label="Âm mặt" path="handleRail.faceOffset" />
      <InfoNumber label="Số lượng thanh sau" path="handleRail.rearCount" />
      <InfoNumber label="Số lượng bổ sung" path="handleRail.middleCount" />
    </InfoSection>

    <InfoSection title="Thanh Chặn Cánh" section-key="doorStop">
      <InfoCheck label="Tạo thanh" path="doorStop.enabled" />
      <InfoText label="Công thức chia" path="doorStop.formula" placeholder="/2 hoặc 300,200" />
      <InfoNumber label="Kích thước" path="doorStop.size" />
      <InfoCheck label="Ngang" path="doorStop.horizontal" />
      <InfoNumber label="Âm mặt" path="doorStop.faceOffset" />
    </InfoSection>

    <InfoSection title="Len Chân" section-key="toeKick">
      <InfoCheck label="Tạo len chân" path="toeKick.enabled" />
      <InfoNumber label="Cao len chân" path="toeKick.height" />
      <InfoNumber label="Lùi len chân" path="toeKick.inset" />
      <InfoCheck label="Len chân rời" path="toeKick.detached" />
      <InfoCheck label="Thanh chân sau" path="toeKick.rear" />
      <InfoNumber label="Thanh chân bổ sung" path="toeKick.middleCount" />
    </InfoSection>

    <InfoSection title="Nẹp Gia Giảm" section-key="filler">
      <InfoCheck label="Tạo nẹp" path="filler.enabled" />
      <InfoNumber label="Nẹp trái" path="filler.left" />
      <InfoCheck label="Xoay trái" path="filler.leftRotate" />
      <InfoNumber label="Nẹp phải" path="filler.right" />
      <InfoCheck label="Xoay phải" path="filler.rightRotate" />
    </InfoSection>

      <InfoSection title="Lùi Đợt" section-key="shelfInset">
      <InfoCheck label="Bật lùi đợt" path="shelfInset.enabled" />
      <InfoNumber label="Lùi đợt đứng" path="shelfInset.vertical" />
      <InfoNumber label="Lùi đợt nằm" path="shelfInset.horizontal" />
      </InfoSection>
    </template>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, watch } from 'vue'
import { useBoxStore } from '../../stores/useBoxStore'
import { useCabinetInfoStore } from '../../stores/useCabinetInfoStore'

const cabinetInfo = useCabinetInfoStore()
const boxStore = useBoxStore()
const info = cabinetInfo.state.info

const selectedBox = computed(() => boxStore.getSelectedBox ? boxStore.getSelectedBox() : null)

const selectedBoxName = computed(() => selectedBox.value?.name || selectedBox.value?.id || 'Chưa chọn')

watch(() => selectedBox.value?.id, () => {
  cabinetInfo.syncSelectedBoxToInfo()
}, { immediate: true })

//=================
function getPathValue(path) {
  return String(path || '').split('.').filter(Boolean).reduce((value, key) => {
    return value?.[key]
  }, cabinetInfo.state.info)
} // End getPathValue

//=================
function setValue(path, value) {
  cabinetInfo.setValue(path, value)
} // End setValue

const InfoSection = defineComponent({
  props: {
    title: { type: String, required: true },
    sectionKey: { type: String, required: true }
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'mn-info-section' }, [
      h('button', {
        class: 'mn-info-section-title',
        type: 'button',
        onClick: () => cabinetInfo.toggleSection(props.sectionKey)
      }, [
        h('span', { class: ['mn-info-triangle', cabinetInfo.state.openSections[props.sectionKey] ? 'open' : ''] }, '▶'),
        h('span', props.title)
      ]),
      cabinetInfo.state.openSections[props.sectionKey]
        ? h('div', { class: 'mn-info-section-body' }, slots.default ? slots.default() : [])
        : null
    ])
  }
})

const InfoNumber = defineComponent({
  props: {
    label: { type: String, required: true },
    path: { type: String, required: true }
  },
  setup(props) {
    return () => h('label', { class: 'mn-info-row' }, [
      h('span', props.label),
      h('input', {
        type: 'number',
        step: '0.1',
        value: getPathValue(props.path),
        onInput: (event) => setValue(props.path, event.target.value)
      })
    ])
  }
})

const InfoText = defineComponent({
  props: {
    label: { type: String, required: true },
    path: { type: String, required: true },
    placeholder: { type: String, default: '' }
  },
  setup(props) {
    return () => h('label', { class: 'mn-info-row' }, [
      h('span', props.label),
      h('input', {
        type: 'text',
        value: getPathValue(props.path),
        placeholder: props.placeholder,
        onInput: (event) => setValue(props.path, event.target.value)
      })
    ])
  }
})

const InfoCheck = defineComponent({
  props: {
    label: { type: String, required: true },
    path: { type: String, required: true }
  },
  setup(props) {
    return () => h('label', { class: 'mn-info-check' }, [
      h('input', {
        type: 'checkbox',
        checked: getPathValue(props.path) === true,
        onChange: (event) => setValue(props.path, event.target.checked)
      }),
      h('span', props.label)
    ])
  }
})
</script>
