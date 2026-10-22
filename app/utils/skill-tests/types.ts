// app/utils/skill-tests/types.ts

export interface FloatingText {
  x: number
  y: number
  text: string
  color: string
  startTime: number
  duration: number
}

export interface SkillGameContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  addScore: (delta: number, x?: number, y?: number, color?: string) => void
}

export interface SkillModuleInstance {
  id: number
  title: string
  readonly durationMs?: number
  isCompleted?: boolean

  init(ctx: SkillGameContext): void
  update(dt: number, now: number, elapsed: number): void
  // ★ 核心升级：render 允许直接接收 elapsed（从对局开始计算的绝对毫秒数）
  render(ctx: CanvasRenderingContext2D, now: number, elapsed?: number): void

  onPointerDown?(x: number, y: number, now: number): void
  onPointerMove?(x: number, y: number): void
  onPointerLeave?(): void

  onKeyDown?(code: string, e: KeyboardEvent): void
  onKeyUp?(code: string, e: KeyboardEvent): void
  cleanup?(): void
}