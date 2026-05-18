import Phaser from 'phaser'
import { type DiceResult } from '../types'

/**
 * 骰子 UI 元件
 * 負責顯示兩顆骰子的擲骰動畫及結果
 */

// 骰子常數
const DIE_SIZE = 50          // 骰子邊長
const DIE_GAP = 16           // 兩顆骰子間距
const DOT_RADIUS = 4         // 骰子點數半徑
const DOT_COLOR = 0x333333   // 點數顏色
const DIE_BG_COLOR = 0xffffff // 骰子背景色
const DIE_STROKE_COLOR = 0x999999
const CORNER_RADIUS = 8      // 圓角
const ROLL_DURATION = 1000   // 搖骰動畫時長（毫秒）
const ROLL_INTERVAL = 80     // 點數切換間隔（毫秒）

// 字型設定
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'

/**
 * 骰子點數位置對照表
 * 根據數值 1-6，回傳各點在骰子面上的相對座標
 */
const DOT_POSITIONS: Record<number, Array<{ x: number; y: number }>> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -12, y: -12 }, { x: 12, y: 12 }],
  3: [{ x: -12, y: -12 }, { x: 0, y: 0 }, { x: 12, y: 12 }],
  4: [{ x: -12, y: -12 }, { x: 12, y: -12 }, { x: -12, y: 12 }, { x: 12, y: 12 }],
  5: [
    { x: -12, y: -12 }, { x: 12, y: -12 },
    { x: 0, y: 0 },
    { x: -12, y: 12 }, { x: 12, y: 12 }
  ],
  6: [
    { x: -12, y: -12 }, { x: 12, y: -12 },
    { x: -12, y: 0 }, { x: 12, y: 0 },
    { x: -12, y: 12 }, { x: 12, y: 12 }
  ]
}

export class Dice {
  private scene: Phaser.Scene
  /** 整體容器 */
  private container!: Phaser.GameObjects.Container
  /** 兩顆骰子各自的 Graphics */
  private dieGraphics: Phaser.GameObjects.Graphics[] = []
  /** 合計文字 */
  private totalText!: Phaser.GameObjects.Text
  /** 雙數特效容器 */
  private doubleEffect: Phaser.GameObjects.Text | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * 建立骰子顯示物件
   * @param x - 中心 X 座標
   * @param y - 中心 Y 座標
   */
  create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y)
    this.container.setDepth(200)

    // 建立兩顆骰子的 Graphics
    const die1X = -(DIE_SIZE / 2 + DIE_GAP / 2)
    const die2X = DIE_SIZE / 2 + DIE_GAP / 2

    const g1 = this.scene.add.graphics()
    const g2 = this.scene.add.graphics()
    this.dieGraphics = [g1, g2]
    this.container.add([g1, g2])

    // 初始繪製（顯示 1, 1）
    this.drawDieFace(g1, die1X, 0, 1)
    this.drawDieFace(g2, die2X, 0, 1)

    // 合計文字
    this.totalText = this.scene.add.text(0, DIE_SIZE / 2 + 16, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5)
    this.container.add(this.totalText)

    // 預設隱藏
    this.container.setVisible(false)
  }

  /**
   * 播放擲骰動畫並顯示結果
   * @param result - 骰子結果
   * @returns Promise，動畫完成時 resolve
   */
  roll(result: DiceResult): Promise<void> {
    this.container.setVisible(true)
    this.totalText.setText('')

    // 清除舊的雙數特效
    if (this.doubleEffect) {
      this.doubleEffect.destroy()
      this.doubleEffect = null
    }

    const die1X = -(DIE_SIZE / 2 + DIE_GAP / 2)
    const die2X = DIE_SIZE / 2 + DIE_GAP / 2

    return new Promise<void>(resolve => {
      // 使用原生 setInterval 確保可靠的計時（不依賴 Phaser 時間系統）
      let elapsed = 0
      const intervalId = setInterval(() => {
        elapsed += ROLL_INTERVAL

        // 隨機切換點數
        const randomValue1 = Math.floor(Math.random() * 6) + 1
        const randomValue2 = Math.floor(Math.random() * 6) + 1
        this.dieGraphics[0].clear()
        this.dieGraphics[1].clear()
        this.drawDieFace(this.dieGraphics[0], die1X, 0, randomValue1)
        this.drawDieFace(this.dieGraphics[1], die2X, 0, randomValue2)

        // 搖晃效果
        this.container.setRotation((Math.random() - 0.5) * 0.2)

        // 動畫結束
        if (elapsed >= ROLL_DURATION) {
          clearInterval(intervalId)
          this.container.setRotation(0)

          // 顯示最終結果
          this.dieGraphics[0].clear()
          this.dieGraphics[1].clear()
          this.drawDieFace(this.dieGraphics[0], die1X, 0, result.die1)
          this.drawDieFace(this.dieGraphics[1], die2X, 0, result.die2)

          // 顯示合計
          this.totalText.setText(`合計: ${result.total}`)

          // 雙數特效
          if (result.isDouble) {
            this.showDoubleEffect()
          }

          resolve()
        }
      }, ROLL_INTERVAL)
    })
  }

  /**
   * 繪製單顆骰子的面
   * @param graphics - Phaser Graphics 物件
   * @param x - 骰子中心 X（相對容器）
   * @param y - 骰子中心 Y（相對容器）
   * @param value - 點數 (1-6)
   */
  drawDieFace(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    value: number
  ): void {
    // 白色圓角背景
    graphics.fillStyle(DIE_BG_COLOR, 1)
    graphics.fillRoundedRect(
      x - DIE_SIZE / 2,
      y - DIE_SIZE / 2,
      DIE_SIZE,
      DIE_SIZE,
      CORNER_RADIUS
    )
    graphics.lineStyle(2, DIE_STROKE_COLOR, 1)
    graphics.strokeRoundedRect(
      x - DIE_SIZE / 2,
      y - DIE_SIZE / 2,
      DIE_SIZE,
      DIE_SIZE,
      CORNER_RADIUS
    )

    // 繪製點數
    const dots = DOT_POSITIONS[value]
    if (dots) {
      graphics.fillStyle(DOT_COLOR, 1)
      for (const dot of dots) {
        graphics.fillCircle(x + dot.x, y + dot.y, DOT_RADIUS)
      }
    }
  }

  /**
   * 顯示雙數特效（閃爍文字）
   */
  showDoubleEffect(): void {
    this.doubleEffect = this.scene.add.text(0, -(DIE_SIZE / 2 + 20), 'DOUBLE!', {
      fontSize: '18px',
      color: '#f1c40f',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)
    this.container.add(this.doubleEffect)

    // 閃爍動畫
    this.scene.tweens.add({
      targets: this.doubleEffect,
      alpha: { from: 1, to: 0.3 },
      duration: 300,
      yoyo: true,
      repeat: 3
    })
  }

  /**
   * 隱藏骰子
   */
  hide(): void {
    this.container.setVisible(false)
  }

  /**
   * 顯示骰子
   */
  show(): void {
    this.container.setVisible(true)
  }
}
