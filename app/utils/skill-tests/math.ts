// app/utils/skill-tests/math.ts

/**
 * 范围随机浮点数 [min, max)
 */
export function rand(min: number, max: number): number {
    return Math.random() * (max - min) + min
}

/**
 * 范围随机整数 [min, max]
 */
export function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 原地 Fisher-Yates 洗牌算法 (纯算法，零依赖)
 */
export function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = arr[i]
        arr[i] = arr[j]!
        arr[j] = temp!
    }
    return arr
}

/**
 * 标准 AABB 轴对齐矩形碰撞判定
 */
export function checkAABB(
    r1: { x: number; y: number; w: number; h: number },
    r2: { x: number; y: number; w: number; h: number }
): boolean {
    return (
        r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y
    )
}