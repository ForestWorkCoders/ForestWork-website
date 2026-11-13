<template>
  <div class="min-h-screen flex flex-col bg-[#F7F9FC] dark:bg-default text-gray-900 dark:text-gray-100">
    <LayoutHeader />
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
    <LayoutFooter />
  </div>
</template>