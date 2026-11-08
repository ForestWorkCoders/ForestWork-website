// plugins/chartjs.client.ts
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { Radar } from 'vue-chartjs'



export default defineNuxtPlugin(() => {
  // 在 Vue App 初始化前，强制在全局单例中注册所有雷达图所需模块
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)
})