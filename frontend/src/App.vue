<template>
  <div id="app">
    <van-nav-bar title="电瓶车充电记录" fixed placeholder />
    
    <van-tabs v-model:active="activeTab" sticky offset-top="46">
      <!-- 统计标签页 -->
      <van-tab title="统计" name="stats">
        <StatsView :stats="stats" />
      </van-tab>
      
      <!-- 记录标签页 -->
      <van-tab title="记录" name="records">
        <RecordsView 
          :records="records" 
          :refreshing="refreshing"
          @update:refreshing="refreshing = $event"
          @refresh="onRefresh"
          @updated="onRefresh"
        />
      </van-tab>
      
      <!-- 添加记录标签页 -->
      <van-tab title="添加" name="add">
        <AddRecordView 
          :submitting="submitting"
          @submit="handleAddRecord"
        />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showSuccessToast, showFailToast } from 'vant'
import { getRecords, getStats, addRecord } from './api'
import StatsView from './components/StatsView.vue'
import RecordsView from './components/RecordsView.vue'
import AddRecordView from './components/AddRecordView.vue'

const activeTab = ref('stats')
const refreshing = ref(false)
const submitting = ref(false)
const records = ref([])
const stats = ref({
  total_mileage: 0,
  avg_mileage_per_charge: 0,
  total_cost: 0,
  avg_cost_per_charge: 0,
  charge_count: 0
})

// 获取记录
const fetchRecords = async () => {
  try {
    const response = await getRecords()
    records.value = response.data
  } catch (error) {
    showFailToast('加载记录失败')
    console.error('加载记录失败:', error)
  }
}

// 获取统计
const fetchStats = async () => {
  try {
    const response = await getStats()
    stats.value = response.data
  } catch (error) {
    showFailToast('加载统计失败')
    console.error('加载统计失败:', error)
  }
}

// 下拉刷新
const onRefresh = async () => {
  refreshing.value = true
  await Promise.all([fetchRecords(), fetchStats()])
  refreshing.value = false
}

// 添加记录
const handleAddRecord = async (formData) => {
  submitting.value = true
  try {
    await addRecord(formData)
    showSuccessToast('记录成功')
    
    // 刷新数据
    await Promise.all([fetchRecords(), fetchStats()])
    
    // 切换到记录标签页
    activeTab.value = 'records'
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message
    showFailToast('记录失败：' + errorMsg)
  } finally {
    submitting.value = false
  }
}

// 初始化数据
onMounted(() => {
  fetchRecords()
  fetchStats()
})
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f7f8fa;
}

body {
  margin: 0;
  padding: 0;
}
</style>
