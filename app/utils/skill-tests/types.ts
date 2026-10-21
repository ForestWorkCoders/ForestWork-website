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
  // 初始化（重置内部状态机）
  init(ctx: SkillGameContext): void
  // 每帧状态演进
  update(dt: number, now: number, elapsed: number): void
  // 每帧绘制（基于 800x600 逻辑坐标）
  render(ctx: CanvasRenderingContext2D, now: number): void
  // 鼠标/触控交互（已自动归一化为 800x600 逻辑坐标）
  onPointerDown?(x: number, y: number, now: number): void
  // 按键交互 (如 Module 2)
  onKeyDown?(code: string, e: KeyboardEvent): void
  onKeyUp?(code: string, e: KeyboardEvent): void
  // 卸载清理
  cleanup?(): void
}