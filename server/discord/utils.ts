// server/discord/utils.ts
export function getInteractionOption<T = any>(interaction: any, name: string): T | undefined {
  const options = interaction.data?.options
  if (!Array.isArray(options)) return undefined
  const target = options.find((opt: any) => opt.name === name)
  return target ? (target.value as T) : undefined
}