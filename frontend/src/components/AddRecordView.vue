<template>
  <div class="add-record-view">
    <van-form @submit="handleSubmit">
      <van-cell-group inset>
        <van-field
          v-model="form.mileage"
          name="mileage"
          label="当前里程"
          placeholder="请输入当前里程"
          type="number"
          required
          :rules="[{ required: true, message: '请输入当前里程' }]"
        >
          <template #right-icon>
            <span style="color: #969799;">km</span>
          </template>
        </van-field>
        
        <van-field
          :model-value="chargeTypeDisplay"
          name="chargeType"
          label="充电方式"
          is-link
          readonly
          placeholder="请选择充电方式"
          @click="showChargeTypePicker = true"
        />
        <van-popup v-model:show="showChargeTypePicker" position="bottom">
          <van-picker
            v-model="chargeTypePickerIndex"
            :columns="chargeTypeOptions"
            @confirm="onChargeTypeConfirm"
            @cancel="showChargeTypePicker = false"
          />
        </van-popup>
        
        <van-field
          v-model="form.charge_minutes"
          name="charge_minutes"
          label="充电时长"
          placeholder="分钟"
          type="number"
        >
          <template #right-icon>
            <span style="color: #969799;">分钟</span>
          </template>
        </van-field>
        
        <van-field
          v-model="form.cost"
          name="cost"
          label="花费"
          placeholder="元"
          type="number"
        >
          <template #right-icon>
            <span style="color: #969799;">元</span>
          </template>
        </van-field>
        
        <van-field
          v-model="form.note"
          name="note"
          label="备注"
          placeholder="可选"
          type="textarea"
          rows="3"
          maxlength="100"
          show-word-limit
        />
      </van-cell-group>
      
      <div class="submit-button">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="submitting"
          loading-text="提交中..."
        >
          <van-icon name="add-o" /> 记录充电
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const chargeTypeOptions = [
  { text: '金桥智电', value: 'jinqiao' },
  { text: '富联e充', value: 'fulian' },
  { text: '手动投币', value: 'manual' }
]

const showChargeTypePicker = ref(false)

// 从localStorage读取上次选择的充电方式
const getLastChargeType = () => {
  const lastType = localStorage.getItem('lastChargeType')
  return lastType || 'jinqiao'
}

const getChargeTypeIndex = (type) => {
  const index = chargeTypeOptions.findIndex(opt => opt.value === type)
  return index >= 0 ? index : 0
}

const form = ref({
  mileage: '',
  chargeType: getLastChargeType(),
  charge_minutes: '480', // 默认480分钟
  cost: '2', // 默认2元
  note: ''
})

const chargeTypePickerIndex = ref([getChargeTypeIndex(getLastChargeType())])

// 计算充电方式显示文本
const chargeTypeDisplay = computed(() => {
  const option = chargeTypeOptions.find(opt => opt.value === form.value.chargeType)
  return option ? option.text : ''
})

// 充电方式确认时的处理
const onChargeTypeConfirm = ({ selectedOptions }) => {
  const selected = selectedOptions[0]
  form.value.chargeType = selected.value
  chargeTypePickerIndex.value = [getChargeTypeIndex(selected.value)]
  // 保存到localStorage
  localStorage.setItem('lastChargeType', selected.value)
  // 所有充电方式都默认2元480分钟
  form.value.cost = '2'
  form.value.charge_minutes = '480'
  showChargeTypePicker.value = false
}

// 初始化时设置默认值
onMounted(() => {
  const lastType = getLastChargeType()
  form.value.chargeType = lastType
  chargeTypePickerIndex.value = [getChargeTypeIndex(lastType)]
  form.value.charge_minutes = '480'
  form.value.cost = '2'
})

const handleSubmit = () => {
  const data = {
    mileage: parseFloat(form.value.mileage),
    charge_minutes: form.value.charge_minutes ? parseFloat(form.value.charge_minutes) : null,
    cost: form.value.cost ? parseFloat(form.value.cost) : null,
    note: form.value.note || '',
    charge_type: form.value.chargeType
  }
  
  emit('submit', data)
  
  // 保存当前充电方式到localStorage
  localStorage.setItem('lastChargeType', form.value.chargeType)
  
  // 清空表单，但保留默认值
  form.value = {
    mileage: '',
    chargeType: form.value.chargeType, // 保留充电方式
    charge_minutes: '480',
    cost: '2',
    note: ''
  }
}
</script>

<style scoped>
.add-record-view {
  padding: 16px;
}

.submit-button {
  margin-top: 24px;
  padding: 0 16px;
}
</style>
