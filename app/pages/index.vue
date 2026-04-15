<template>
  <div class="relative min-h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center overflow-hidden">
    
    <div 
      class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
      style="background-image: url('/images/hero-bg.jpg'); filter: brightness(0.4);"
    ></div>

    <div class="relative z-10 flex flex-col items-center px-4 text-center">
      <img 
        src="~/assets/images/forestwork-logo-white.png" 
        alt="林間小鎮 ForestWork" 
        class="w-48 md:w-64 lg:w-80 h-auto drop-shadow-2xl"
      >
      
      </div>

    <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-gray-950 to-transparent"></div>
  </div>
</template>