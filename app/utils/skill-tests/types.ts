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
  // ★ 新增：允许模块向宿主汇报是否已提前完成流程 (如 Module 5 跑完 5 关)
  isCompleted?: boolean

  init(ctx: SkillGameContext): void
  update(dt: number, now: number, elapsed: number): void
  render(ctx: CanvasRenderingContext2D, now: number): void

  onPointerDown?(x: number, y: number, now: number): void
  // ★ 新增：归一化指针移动与离开事件 (专供 Module 6 跟枪等连续输入场景)
  onPointerMove?(x: number, y: number): void
  onPointerLeave?(): void

  onKeyDown?(code: string, e: KeyboardEvent): void
  onKeyUp?(code: string, e: KeyboardEvent): void
  cleanup?(): void
}