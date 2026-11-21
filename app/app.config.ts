export default defineAppConfig({
  ui: {
    colors: {
      // Brand colours (see /brand). forest is defined in main.css; Amber Gold #D97706 is Tailwind amber-600.
      primary: 'forest',
      secondary: 'amber',
      neutral: 'slate'
    },
    // Placeholders: text-dimmed (Nuxt UI default) is under 4.5:1 in both modes; text-muted passes
    input: { slots: { base: 'placeholder:text-muted' } },
    textarea: { slots: { base: 'placeholder:text-muted' } },
    select: { slots: { placeholder: 'text-muted' } },
    selectMenu: { slots: { placeholder: 'text-muted' } }
  }
})
