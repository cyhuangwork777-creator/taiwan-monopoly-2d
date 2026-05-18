import Phaser from 'phaser'
import { type Card, CardType } from '../types'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'

/**
 * 卡片彈出展示 UI
 * 以全螢幕遮罩 + 翻牌動畫顯示抽到的卡片內容
 */

// UI 常數
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'
const CARD_WIDTH = 300         // 卡片寬度
const CARD_HEIGHT = 400        // 卡片高度
const CARD_RADIUS = 16         // 卡片圓角

// 各類型卡片配色
const CARD_TYPE_CONFIG: Record<CardType, { color: number; headerColor: number; label: string }> = {
  [CardType.CHANCE]: { color: 0x2c3e7a, headerColor: 0x3498db, label: '機會' },
  [CardType.FATE]: { color: 0x5e1a3a, headerColor: 0xe91e63, label: '命運' },
  [CardType.SPECIAL]: { color: 0x4a3520, headerColor: 0xe67e22, label: '特殊' }
}

export class CardPopup {
  private scene: Phaser.Scene
  /** 整體容器 */
  private container: Phaser.GameObjects.Container | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * 顯示卡片
   * @param card - 要顯示的卡片資料
   * @returns Promise，使用者按下確認後 resolve
   */
  showCard(card: Card, autoClose?: number): Promise<void> {
    // 清除舊的
    this.destroy()

    return new Promise<void>(resolve => {
      const container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      container.setDepth(600)
      this.container = container

      // 全螢幕半透明遮罩
      const overlay = this.scene.add.rectangle(
        0, 0, GAME_WIDTH, GAME_HEIGHT,
        0x000000, 0.7
      )
      overlay.setInteractive() // 阻擋底層互動
      container.add(overlay)

      // 取得卡片類型配色
      const config = CARD_TYPE_CONFIG[card.type] ?? CARD_TYPE_CONFIG[CardType.CHANCE]

      // 卡片框架容器（用於翻牌動畫）
      const cardFrame = this.scene.add.container(0, 0)
      container.add(cardFrame)

      // 卡片背景
      const cardBg = this.scene.add.graphics()
      cardBg.fillStyle(config.color, 1)
      cardBg.fillRoundedRect(
        -CARD_WIDTH / 2, -CARD_HEIGHT / 2,
        CARD_WIDTH, CARD_HEIGHT,
        CARD_RADIUS
      )
      cardBg.lineStyle(3, config.headerColor, 1)
      cardBg.strokeRoundedRect(
        -CARD_WIDTH / 2, -CARD_HEIGHT / 2,
        CARD_WIDTH, CARD_HEIGHT,
        CARD_RADIUS
      )
      cardFrame.add(cardBg)

      // 類型標頭底色
      const headerBg = this.scene.add.graphics()
      headerBg.fillStyle(config.headerColor, 1)
      headerBg.fillRoundedRect(
        -CARD_WIDTH / 2, -CARD_HEIGHT / 2,
        CARD_WIDTH, 60,
        { tl: CARD_RADIUS, tr: CARD_RADIUS, bl: 0, br: 0 }
      )
      cardFrame.add(headerBg)

      // 類型文字
      const typeText = this.scene.add.text(0, -CARD_HEIGHT / 2 + 30, config.label, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      cardFrame.add(typeText)

      // 裝飾分隔線
      const divider = this.scene.add.graphics()
      divider.lineStyle(1, 0xffffff, 0.3)
      divider.lineBetween(
        -CARD_WIDTH / 2 + 20, -CARD_HEIGHT / 2 + 70,
        CARD_WIDTH / 2 - 20, -CARD_HEIGHT / 2 + 70
      )
      cardFrame.add(divider)

      // 卡片名稱（大字）
      const nameText = this.scene.add.text(0, -40, card.name, {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 40 }
      }).setOrigin(0.5)
      cardFrame.add(nameText)

      // 卡片描述
      const descText = this.scene.add.text(0, 30, card.description, {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: FONT_FAMILY,
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 50 },
        lineSpacing: 6
      }).setOrigin(0.5)
      cardFrame.add(descText)

      // 確認按鈕
      const btnY = CARD_HEIGHT / 2 - 50
      const btnW = 120
      const btnH = 40

      const btnBg = this.scene.add.graphics()
      btnBg.fillStyle(config.headerColor, 1)
      btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 8)
      cardFrame.add(btnBg)

      const btnText = this.scene.add.text(0, btnY, '確認', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      cardFrame.add(btnText)

      // 按鈕互動
      const btnHitArea = this.scene.add.rectangle(0, btnY, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      btnHitArea.on('pointerover', () => {
        btnBg.clear()
        btnBg.fillStyle(this.lightenColor(config.headerColor, 1.2), 1)
        btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 8)
      })
      btnHitArea.on('pointerout', () => {
        btnBg.clear()
        btnBg.fillStyle(config.headerColor, 1)
        btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 8)
      })
      btnHitArea.on('pointerdown', () => {
        this.destroy()
        resolve()
      })
      cardFrame.add(btnHitArea)

      // 翻牌動畫：從 0 縮放到 1
      cardFrame.setScale(0)
      this.scene.tweens.add({
        targets: cardFrame,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: 'Back.easeOut'
      })

      // AI 自動確認
      if (autoClose !== undefined) {
        setTimeout(() => {
          if (this.container) {
            this.destroy()
            resolve()
          }
        }, autoClose)
      }
    })
  }

  /**
   * 銷毀彈出視窗
   */
  private destroy(): void {
    if (this.container) {
      this.container.destroy()
      this.container = null
    }
  }

  /**
   * 將顏色調亮
   */
  private lightenColor(color: number, factor: number): number {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor))
    const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor))
    const b = Math.min(255, Math.floor((color & 0xff) * factor))
    return (r << 16) | (g << 8) | b
  }
}
