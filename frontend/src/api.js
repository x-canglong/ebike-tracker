import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:5000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
})

// 添加记录
export const addRecord = (data) => {
  return api.post('/add_record', data)
}

// 获取所有记录
export const getRecords = () => {
  return api.get('/records')
}

// 获取统计信息
export const getStats = () => {
  return api.get('/stats')
}

// 更新记录
export const updateRecord = (id, data) => {
  return api.put(`/update_record/${id}`, data)
}
