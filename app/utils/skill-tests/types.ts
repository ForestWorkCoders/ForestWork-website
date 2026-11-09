// app/utils/skill-tests/types.ts

// ==========================================
// 1. 全局舞台物理常量 (SSOT：消灭全模块 800x600 硬编码魔数)
// ==========================================
export const STAGE_WIDTH = 800
export const STAGE_HEIGHT = 600
export const STAGE_CENTER_X = STAGE_WIDTH / 2  // 400
export const STAGE_CENTER_Y = STAGE_HEIGHT / 2 // 300

// ==========================================
// 2. 核心基础几何图元 (Primitives)
// ==========================================
export interface Point {
  x: number
  y: number
}

export interface Circle extends Point {
  r: number
}

export interface Rect extends Point {
  w: number
  h: number
}

// 粒子浮动文字
export interface FloatingText extends Point {
  text: string
  color: string
  startTime: number
  duration: number
}

// ==========================================
// 3. 宿主上下文契约 (消除双胞胎克隆定义，完全向后兼容)
// ==========================================
export interface SkillGameContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  addScore: (delta: number, x?: number, y?: number, color?: string) => void
}

// ★ 核心好品味：以类型别名合二为一，Module 8 与老模块互不打架！
export type SkillModuleInitParams = SkillGameContext

// ==========================================
// 4. 战术结算与排位契约
// ==========================================
export type TacticalRating =
  | 'FLAWLESS ACE'
  | 'TACTICAL APEX'
  | 'COMBAT READY'
  | 'BURST CADENCE'
  | 'TACTICAL LOCK'
  | 'STANDARD CADENCE'
  | 'REFLEX COMPLIANT'
  | 'TEST COMPLETED'
  | (string & {}) // 保持开放扩展性，同时给 IDE 智能提示提供一等公民候选

export interface ResultMetric {
  value: string | number
  label: string
  badge?: string // 金色徽标胶囊 (如 "x2.00", "PEAK", "👑 #1 GLOBAL")
}

export interface ModuleResultSummary {
  rating: TacticalRating
  metrics: ResultMetric[]
}

// ==========================================
// 5. 测验子模块微内核生命周期规范
// ==========================================
export interface SkillModuleInstance {
  readonly id: number
  readonly title: string
  readonly durationMs?: number
  isCompleted?: boolean

  init(context: SkillGameContext): void
  update(dt: number, now: number, elapsed: number): void
  render(ctx: CanvasRenderingContext2D, now: number, elapsed?: number): void

  getResultSummary?(): ModuleResultSummary
  cleanup?(): void

  // 输入事件总线 (按需实现)
  onPointerDown?(x: number, y: number, now: number, button?: number): void
  onPointerMove?(x: number, y: number): void
  onPointerLeave?(): void

  onKeyDown?(code: string, e: KeyboardEvent): void
  onKeyUp?(code: string, e: KeyboardEvent): void
}