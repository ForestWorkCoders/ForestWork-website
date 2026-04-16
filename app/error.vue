<script setup>
// Nuxt 會自動將錯誤資訊封裝成 error prop 傳給這個元件
const props = defineProps({
  error: Object
})

// ★ 好品味：必須給使用者一個「清除錯誤並回首頁」的逃生按鈕
const handleError = () => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="relative flex items-center justify-center w-full h-screen overflow-hidden bg-black">
    
    <video 
      autoplay 
      muted 
      loop 
      playsinline
      class="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
    >
      <source src="/images/404/404.mp4" type="video/mp4">
      Your browser does not support the video tag.
    </video>

    <div class="relative z-10 flex flex-col items-center justify-center w-full px-4 text-center">
      
      <img 
        src="/images/404/404.svg" 
        alt="404 Not Found"
        class="w-[90%] max-w-3xl max-h-[500px] object-contain drop-shadow-2xl mb-8"
      />

      <UButton 
        size="xl"
        color="error"
        variant="solid"
        icon="i-lucide-house"
        class="shadow-2xl transition-transform hover:scale-105"
        @click="handleError"
      >
        返回林間小鎮首頁
      </UButton>

      <p v-if="error?.statusCode !== 404" class="text-white/60 mt-4 text-sm font-mono">
        Error Code: {{ error?.statusCode }} - {{ error?.message }}
      </p>

    </div>
  </div>
</template>