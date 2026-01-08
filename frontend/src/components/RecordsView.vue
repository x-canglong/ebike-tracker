<template>
  <van-pull-refresh 
    :model-value="refreshing" 
    @update:model-value="$emit('update:refreshing', $event)"
    @refresh="$emit('refresh')"
  >
    <div v-if="records.length === 0" class="empty-state">
      <van-empty description="暂无充电记录" />
    </div>
    
    <div v-else class="records-list">
      <van-card
        v-for="rec in records"
        :key="rec.id"
        class="record-item"
        :title="rec.mileage + ' km'"
      >
        <template #desc>
          <div class="record-header">
            <span class="record-time">{{ formatTime(rec.timestamp) }}</span>
            <van-button 
              size="mini" 
              type="primary" 
              plain
              @click="openEditDialog(rec)"
            >
              编辑
            </van-button>
          </div>
          
          <div class="record-content">
            <van-tag v-if="rec.charge_type" type="default" class="record-tag">
              {{ getChargeTypeName(rec.charge_type) }}
            </van-tag>
            <van-tag v-if="rec.diff !== null" type="primary" class="record-tag">
              <van-icon name="location-o" /> 续航 {{ rec.diff }} km
            </van-tag>
            <van-tag v-if="rec.charge_minutes" type="success" class="record-tag">
              <van-icon name="clock-o" /> {{ formatMinutes(rec.charge_minutes) }}
            </van-tag>
            <van-tag v-if="rec.cost" type="warning" class="record-tag">
              <van-icon name="gold-coin-o" /> ¥{{ rec.cost }}
            </van-tag>
          </div>
          
          <div v-if="rec.note" class="record-note">
            <van-icon name="notes-o" /> {{ rec.note }}
          </div>
        </template>
      </van-card>
    </div>
    
    <!-- 编辑弹窗 -->
    <van-popup
      v-model:show="showEditDialog"
      position="bottom"
      :style="{ height: '70%' }"
      round
    >
      <div class="edit-dialog">
        <div class="edit-header">
          <h3>编辑记录</h3>
          <van-button size="small" @click="showEditDialog = false">取消</van-button>
        </div>
        <van-form @submit="handleUpdate">
          <van-cell-group inset>
            <van-field
              v-model="editForm.mileage"
              name="mileage"
              label="当前里程"
              type="number"
              required
            >
              <template #right-icon>
                <span style="color: #969799;">km</span>
              </template>
            </van-field>
            
            <van-field
              v-model="editForm.charge_minutes"
              name="charge_minutes"
              label="充电时长"
              type="number"
            >
              <template #right-icon>
                <span style="color: #969799;">分钟</span>
              </template>
            </van-field>
            
            <van-field
              v-model="editForm.cost"
              name="cost"
              label="花费"
              type="number"
            >
              <template #right-icon>
                <span style="color: #969799;">元</span>
              </template>
            </van-field>
            
            <van-cell title="充电方式">
              <template #value>
                <van-radio-group v-model="editForm.charge_type" direction="horizontal">
                  <van-radio name="jinqiao">金桥智电</van-radio>
                  <van-radio name="fulian">富联e充</van-radio>
                  <van-radio name="manual">手动投币</van-radio>
                </van-radio-group>
              </template>
            </van-cell>
            
            <van-field
              v-model="editForm.note"
              name="note"
              label="备注"
              type="textarea"
              rows="3"
              maxlength="100"
              show-word-limit
            />
          </van-cell-group>
          
          <div class="edit-actions">
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              :loading="updating"
              loading-text="更新中..."
            >
              保存
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </van-pull-refresh>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { showSuccessToast, showFailToast } from 'vant'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { updateRecord } from '../api'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const props = defineProps({
  records: {
    type: Array,
    required: true
  },
  refreshing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['refresh', 'update:refreshing', 'updated'])

const showEditDialog = ref(false)
const updating = ref(false)
const editForm = ref({
  id: null,
  mileage: '',
  charge_minutes: '',
  cost: '',
  charge_type: '',
  note: ''
})

const formatTime = (timestamp) => {
  const date = dayjs(timestamp)
  const now = dayjs()
  const diff = now.diff(date, 'day')
  
  if (diff === 0) {
    return '今天 ' + date.format('HH:mm')
  } else if (diff === 1) {
    return '昨天 ' + date.format('HH:mm')
  } else if (diff < 7) {
    return diff + '天前'
  } else {
    return date.format('MM-DD HH:mm')
  }
}

const formatMinutes = (minutes) => {
  if (!minutes) return ''
  const mins = Math.floor(minutes)
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return remainingMins > 0 ? `${hours}小时${remainingMins}分钟` : `${hours}小时`
  }
  return `${mins}分钟`
}

const getChargeTypeName = (type) => {
  const typeMap = {
    'jinqiao': '金桥智电',
    'fulian': '富联e充',
    'manual': '手动投币'
  }
  return typeMap[type] || type
}

const openEditDialog = (record) => {
  editForm.value = {
    id: record.id,
    mileage: record.mileage.toString(),
    charge_minutes: record.charge_minutes ? record.charge_minutes.toString() : '',
    cost: record.cost ? record.cost.toString() : '',
    charge_type: record.charge_type || 'jinqiao',
    note: record.note || ''
  }
  showEditDialog.value = true
}

const handleUpdate = async () => {
  updating.value = true
  try {
    const data = {
      mileage: parseFloat(editForm.value.mileage),
      charge_minutes: editForm.value.charge_minutes ? parseFloat(editForm.value.charge_minutes) : null,
      cost: editForm.value.cost ? parseFloat(editForm.value.cost) : null,
      charge_type: editForm.value.charge_type || null,
      note: editForm.value.note || ''
    }
    
    await updateRecord(editForm.value.id, data)
    showSuccessToast('更新成功')
    showEditDialog.value = false
    emit('updated')
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message
    showFailToast('更新失败：' + errorMsg)
  } finally {
    updating.value = false
  }
}
</script>

<style scoped>
.empty-state {
  padding: 60px 20px;
}

.records-list {
  padding: 8px;
}

.record-item {
  margin-bottom: 8px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-time {
  font-size: 12px;
  color: #969799;
}

.record-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.record-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.record-note {
  margin-top: 8px;
  color: #646566;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.edit-dialog {
  padding: 16px;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.edit-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.edit-actions {
  margin-top: 24px;
  padding: 0 16px;
}
</style>
