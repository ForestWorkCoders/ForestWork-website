<script setup>
import { ref, computed } from 'vue'
// 如果你是自动导入 components，这里不需要手动 import。
// 但为了语义清晰，我们假设有这两个子组件：
import GroupStage from './GroupStage.vue'
import Playoffs from './Playoffs.vue' // 你之后再去做这个

const props = defineProps({
  tournamentId: {
    type: [String, Number],
    required: true
  }
})

// 极简状态管理
const stages = [
  { id: 'group', label: 'Group Stage', component: GroupStage },
  { id: 'playoffs', label: 'Playoffs', component: Playoffs }
]

const activeStageId = ref('group')

const activeComponent = computed(() => {
  return stages.find(s => s.id === activeStageId.value)?.component
})
</script>

<template>
  <div class="space-y-6">
    
    <div class="flex justify-center">
      <div class="inline-flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          v-for="stage in stages"
          :key="stage.id"
          @click="activeStageId = stage.id"
          class="px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200"
          :class="[
            activeStageId === stage.id 
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          {{ stage.label }}
        </button>
      </div>
    </div>

    <Transition name="fade" mode="out-in">
      <component 
        :is="activeComponent" 
        :tournament-id="props.tournamentId" 
      />
    </Transition>

  </div>
</template>

<style scoped>
/* 一点点斯巴达式的过渡动画，不要太花哨 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>