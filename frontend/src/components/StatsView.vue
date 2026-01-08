<template>
  <div class="stats-view">
    <div class="stats-grid">
      <div class="stat-card stat-card-1">
        <div class="stat-label">总里程</div>
        <div class="stat-value">{{ stats.total_mileage }}</div>
        <div class="stat-unit">km</div>
      </div>
      <div class="stat-card stat-card-2">
        <div class="stat-label">平均续航</div>
        <div class="stat-value">{{ stats.avg_mileage_per_charge }}</div>
        <div class="stat-unit">km/次</div>
      </div>
      <div class="stat-card stat-card-3">
        <div class="stat-label">总花费</div>
        <div class="stat-value">¥{{ stats.total_cost }}</div>
        <div class="stat-unit">元</div>
      </div>
      <div class="stat-card stat-card-4">
        <div class="stat-label">平均花费</div>
        <div class="stat-value">¥{{ stats.avg_cost_per_charge }}</div>
        <div class="stat-unit">元/次</div>
      </div>
    </div>
    
    <van-cell-group inset style="margin-top: 16px;">
      <van-cell title="充电次数" :value="stats.charge_count + ' 次'" />
      <van-cell 
        v-if="stats.avg_charge_minutes" 
        title="平均充电时长" 
        :value="formatMinutes(stats.avg_charge_minutes)" 
      />
    </van-cell-group>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    required: true
  }
})

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
</script>

<style scoped>
.stats-view {
  padding: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  border-radius: 12px;
  padding: 20px;
  color: white;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-card-1 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card-2 {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card-3 {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card-4 {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  margin: 8px 0;
  line-height: 1.2;
}

.stat-unit {
  font-size: 12px;
  opacity: 0.9;
}
</style>
