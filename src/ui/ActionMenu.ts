import Phaser from 'phaser'
import { type Card } from '../types'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'

/**
 * 動作選單 UI
 * 負責顯示購買、升級、付租金、卡片選擇等互動提示
 */

// UI 常數
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'
const OVERLAY_COLOR = 0x000000
const OVERLAY_ALPHA = 0.6
const DIALOG_BG = 0x1e2d3d
const DIALOG_BORDER = 0x3498db
const BUTTON_BG = 0x2980b9
const BUTTON_HOVER = 0x3498db
const BUTTON_CANCEL_BG = 0x7f8c8d
const BUTTON_CANCEL_HOVER = 0x95a5a6
const BUTTON_HEIGHT = 40
const BUTTON_RADIUS = 8

export class ActionMenu {
  private scene: Phaser.Scene
  /** 所有 UI 元素的容器（方便一次清除） */
  private container: Phaser.GameObjects.Container | null = null
  /** 暫時訊息的計時器 */
  private messageTimer: ReturnType<typeof setTimeout> | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * 顯示購買地產提示
   */
  showBuyPrompt(
    propertyName: string,
    price: number,
    onBuy: () => void,
    onPass: () => void
  ): void {
    this.hide()

    const container = this.createOverlayContainer()

    // 對話框
    const dialogW = 360
    const dialogH = 180
    this.drawDialogBox(container, dialogW, dialogH)

    // 標題
    this.addText(container, 0, -50, '購買地產', '20px', '#ffffff', 'bold')

    // 描述
    this.addText(container, 0, -15, `是否購買「${propertyName}」？`, '16px', '#cccccc')
    this.addText(container, 0, 12, `價格：$${price.toLocaleString()}`, '18px', '#f1c40f', 'bold')

    // 按鈕
    const buttonY = 55
    this.createButton(container, -80, buttonY, 130, '購買', BUTTON_BG, BUTTON_HOVER, () => {
      this.hide()
      onBuy()
    })
    this.createButton(container, 80, buttonY, 130, '放棄', BUTTON_CANCEL_BG, BUTTON_CANCEL_HOVER, () => {
      this.hide()
      onPass()
    })

    this.container = container
  }

  /**
   * 顯示升級提示
   */
  showUpgradePrompt(
    propertyName: string,
    cost: number,
    onUpgrade: () => void,
    onSkip: () => void
  ): void {
    this.hide()

    const container = this.createOverlayContainer()
    const dialogW = 360
    const dialogH = 180
    this.drawDialogBox(container, dialogW, dialogH)

    this.addText(container, 0, -50, '升級建築', '20px', '#ffffff', 'bold')
    this.addText(container, 0, -15, `是否升級「${propertyName}」？`, '16px', '#cccccc')
    this.addText(container, 0, 12, `費用：$${cost.toLocaleString()}`, '18px', '#f1c40f', 'bold')

    const buttonY = 55
    this.createButton(container, -80, buttonY, 130, '升級', BUTTON_BG, BUTTON_HOVER, () => {
      this.hide()
      onUpgrade()
    })
    this.createButton(container, 80, buttonY, 130, '跳過', BUTTON_CANCEL_BG, BUTTON_CANCEL_HOVER, () => {
      this.hide()
      onSkip()
    })

    this.container = container
  }

  /**
   * 顯示過路費通知
   */
  showRentPayment(
    propertyName: string,
    ownerName: string,
    rent: number,
    onConfirm: () => void
  ): void {
    this.hide()

    const container = this.createOverlayContainer()
    const dialogW = 380
    const dialogH = 180
    this.drawDialogBox(container, dialogW, dialogH)

    this.addText(container, 0, -50, '支付過路費', '20px', '#e74c3c', 'bold')
    this.addText(container, 0, -15, `「${propertyName}」屬於 ${ownerName}`, '14px', '#cccccc')
    this.addText(container, 0, 12, `需支付：$${rent.toLocaleString()}`, '18px', '#e74c3c', 'bold')

    this.createButton(container, 0, 55, 140, '確認', BUTTON_BG, BUTTON_HOVER, () => {
      this.hide()
      onConfirm()
    })

    this.container = container
  }

  /**
   * 顯示卡片選擇介面
   * @param cards - 可選卡片陣列
   * @param onSelect - 選擇卡片回呼
   * @param onCancel - 取消回呼
   */
  showCardSelection(
    cards: Card[],
    onSelect: (card: Card) => void,
    onCancel: () => void
  ): void {
    this.hide()

    const container = this.createOverlayContainer()

    // 根據卡片數量計算對話框高度
    const cardRows = Math.ceil(cards.length / 2)
    const dialogW = 440
    const dialogH = 100 + cardRows * 70
    this.drawDialogBox(container, dialogW, dialogH)

    this.addText(container, 0, -dialogH / 2 + 25, '選擇卡片', '20px', '#ffffff', 'bold')

    // 卡片列表
    const startY = -dialogH / 2 + 60
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const col = i % 2
      const row = Math.floor(i / 2)
      const cardX = col === 0 ? -100 : 100
      const cardY = startY + row * 65

      // 卡片按鈕
      const cardBg = this.scene.add.graphics()
      cardBg.fillStyle(0x2c3e50, 1)
      cardBg.fillRoundedRect(cardX - 90, cardY - 25, 180, 50, 6)
      cardBg.lineStyle(1, 0x5dade2, 0.8)
      cardBg.strokeRoundedRect(cardX - 90, cardY - 25, 180, 50, 6)
      container.add(cardBg)

      // 卡片名稱
      const cardName = this.scene.add.text(cardX, cardY - 8, card.name, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5)
      container.add(cardName)

      // 卡片描述
      const cardDesc = this.scene.add.text(cardX, cardY + 10, card.description, {
        fontSize: '10px',
        color: '#aaaaaa',
        fontFamily: FONT_FAMILY,
        align: 'center',
        wordWrap: { width: 170 }
      }).setOrigin(0.5)
      container.add(cardDesc)

      // 互動區域
      const hitArea = this.scene.add.rectangle(cardX, cardY, 180, 50, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      hitArea.on('pointerover', () => {
        cardBg.clear()
        cardBg.fillStyle(0x34495e, 1)
        cardBg.fillRoundedRect(cardX - 90, cardY - 25, 180, 50, 6)
        cardBg.lineStyle(2, 0x3498db, 1)
        cardBg.strokeRoundedRect(cardX - 90, cardY - 25, 180, 50, 6)
      })
      hitArea.on('pointerout', () => {
        cardBg.clear()
        cardBg.fillStyle(0x2c3e50, 1)
        cardBg.fillRoundedRect(cardX - 90, cardY - 25, 180, 50, 6)
        cardBg.lineStyle(1, 0x5dade2, 0.8)
        cardBg.strokeRoundedRect(cardX - 90, cardY - 25, 180, 50, 6)
      })
      hitArea.on('pointerdown', () => {
        this.hide()
        onSelect(card)
      })
      container.add(hitArea)
    }

    // 取消按鈕
    const cancelY = dialogH / 2 - 30
    this.createButton(container, 0, cancelY, 120, '取消', BUTTON_CANCEL_BG, BUTTON_CANCEL_HOVER, () => {
      this.hide()
      onCancel()
    })

    this.container = container
  }

  /**
   * 顯示玩家選擇介面，回傳被選玩家的 id，取消則回傳 null
   */
  showPlayerSelector(
    players: Array<{ id: number; name: string }>,
    title: string
  ): Promise<number | null> {
    return new Promise(resolve => {
      this.hide()
      const dialogW = 340
      const dialogH = 80 + players.length * 55
      const container = this.createOverlayContainer()
      this.drawDialogBox(container, dialogW, dialogH)
      this.addText(container, 0, -dialogH / 2 + 28, title, '18px', '#ffffff', 'bold')

      players.forEach((p, i) => {
        const y = -dialogH / 2 + 68 + i * 52
        this.createButton(container, 0, y, 260, p.name, BUTTON_BG, BUTTON_HOVER, () => {
          this.hide(); resolve(p.id)
        })
      })

      this.createButton(container, 0, dialogH / 2 - 28, 120, '取消', BUTTON_CANCEL_BG, BUTTON_CANCEL_HOVER, () => {
        this.hide(); resolve(null)
      })
      this.container = container
    })
  }

  /**
   * 顯示地產選擇介面，回傳被選地產的 id，取消則回傳 null
   */
  showPropertySelector(
    properties: Array<{ id: number; name: string; buildingLevel: number }>,
    title: string
  ): Promise<number | null> {
    return new Promise(resolve => {
      this.hide()
      const dialogW = 380
      const dialogH = Math.min(80 + properties.length * 52, 480)
      const container = this.createOverlayContainer()
      this.drawDialogBox(container, dialogW, dialogH)
      this.addText(container, 0, -dialogH / 2 + 28, title, '18px', '#ffffff', 'bold')

      const visibleCount = Math.floor((dialogH - 80) / 52)
      const shown = properties.slice(0, visibleCount)
      shown.forEach((prop, i) => {
        const y = -dialogH / 2 + 68 + i * 52
        const label = `${prop.name}（Lv.${prop.buildingLevel}）`
        this.createButton(container, 0, y, 300, label, 0x6c3483, 0x9b59b6, () => {
          this.hide(); resolve(prop.id)
        })
      })

      this.createButton(container, 0, dialogH / 2 - 28, 120, '取消', BUTTON_CANCEL_BG, BUTTON_CANCEL_HOVER, () => {
        this.hide(); resolve(null)
      })
      this.container = container
    })
  }

  /**
   * 顯示格子選擇介面（4 欄排列），回傳被選格子的 id，取消則回傳 null
   */
  showTileSelector(
    tiles: Array<{ id: number; label: string }>,
    title: string
  ): Promise<number | null> {
    return new Promise(resolve => {
      this.hide()
      const cols = 4
      const rows = Math.ceil(tiles.length / cols)
      const dialogW = 520
      const cellW = 110
      const dialogH = 80 + rows * 50
      const container = this.createOverlayContainer()
      this.drawDialogBox(container, dialogW, dialogH)
      this.addText(container, 0, -dialogH / 2 + 26, title, '17px', '#ffffff', 'bold')

      const startX = -(cols - 1) * (cellW + 8) / 2
      tiles.forEach((tile, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = startX + col * (cellW + 8)
        const y = -dialogH / 2 + 64 + row * 50
        this.createButton(container, x, y, cellW, tile.label, BUTTON_BG, BUTTON_HOVER, () => {
          this.hide(); resolve(tile.id)
        })
      })

      this.createButton(container, 0, dialogH / 2 - 28, 120, '取消', BUTTON_CANCEL_BG, BUTTON_CANCEL_HOVER, () => {
        this.hide(); resolve(null)
      })
      this.container = container
    })
  }

  /**
   * 顯示骰子點數選擇介面（1–6），回傳選擇的點數，取消則回傳 null
   */
  showDiceSelector(title: string): Promise<number | null> {
    return new Promise(resolve => {
      this.hide()
      const container = this.createOverlayContainer()
      this.drawDialogBox(container, 420, 170)
      this.addText(container, 0, -58, title, '18px', '#ffffff', 'bold')

      const values = [1, 2, 3, 4, 5, 6]
      const cellW = 52
      const startX = -(values.length - 1) * 60 / 2
      values.forEach((v, i) => {
        const x = startX + i * 60
        this.createButton(container, x, -4, cellW, `${v}`, BUTTON_BG, BUTTON_HOVER, () => {
          this.hide(); resolve(v)
        })
      })

      this.createButton(container, 0, 50, 120, '取消', BUTTON_CANCEL_BG, BUTTON_CANCEL_HOVER, () => {
        this.hide(); resolve(null)
      })
      this.container = container
    })
  }

  /**
   * 顯示暫時訊息
   * @param text - 訊息文字
   * @param duration - 顯示時間（毫秒），預設 2000
   */
  showMessage(text: string, duration: number = 2000): void {
    // 清除舊訊息
    if (this.messageTimer) {
      clearTimeout(this.messageTimer)
      this.messageTimer = null
    }
    this.hide()

    const container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    container.setDepth(500)

    // 訊息背景
    const bg = this.scene.add.graphics()
    const textObj = this.scene.add.text(0, 0, text, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 400 }
    }).setOrigin(0.5)

    const padX = 30
    const padY = 16
    bg.fillStyle(0x1a1a2e, 0.9)
    bg.fillRoundedRect(
      -textObj.width / 2 - padX,
      -textObj.height / 2 - padY,
      textObj.width + padX * 2,
      textObj.height + padY * 2,
      10
    )
    bg.lineStyle(2, 0x3498db, 0.8)
    bg.strokeRoundedRect(
      -textObj.width / 2 - padX,
      -textObj.height / 2 - padY,
      textObj.width + padX * 2,
      textObj.height + padY * 2,
      10
    )

    container.add([bg, textObj])
    this.container = container

    // 自動消失
    this.messageTimer = setTimeout(() => {
      this.hide()
      this.messageTimer = null
    }, duration)
  }

  /**
   * 隱藏所有提示
   */
  hide(): void {
    if (this.container) {
      this.container.destroy()
      this.container = null
    }
  }

  // ====== 私有輔助方法 ======

  /**
   * 建立含半透明遮罩的容器
   */
  private createOverlayContainer(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    container.setDepth(500)

    // 全畫面半透明遮罩
    const overlay = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, OVERLAY_COLOR, OVERLAY_ALPHA)
    overlay.setInteractive() // 阻擋底層點擊
    container.add(overlay)

    return container
  }

  /**
   * 繪製對話框背景
   */
  private drawDialogBox(
    container: Phaser.GameObjects.Container,
    width: number,
    height: number
  ): void {
    const bg = this.scene.add.graphics()
    bg.fillStyle(DIALOG_BG, 0.95)
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12)
    bg.lineStyle(2, DIALOG_BORDER, 0.8)
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12)
    container.add(bg)
  }

  /**
   * 新增置中文字
   */
  private addText(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    fontSize: string,
    color: string,
    fontStyle: string = 'normal'
  ): Phaser.GameObjects.Text {
    const textObj = this.scene.add.text(x, y, text, {
      fontSize,
      color,
      fontFamily: FONT_FAMILY,
      fontStyle,
      align: 'center'
    }).setOrigin(0.5)
    container.add(textObj)
    return textObj
  }

  /**
   * 建立互動按鈕
   */
  private createButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    label: string,
    bgColor: number,
    hoverColor: number,
    onClick: () => void
  ): void {
    // 按鈕背景
    const btnBg = this.scene.add.graphics()
    this.drawButtonBg(btnBg, x, y, width, bgColor)
    container.add(btnBg)

    // 按鈕文字
    const btnText = this.scene.add.text(x, y, label, {
      fontSize: '15px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(btnText)

    // 互動區域
    const hitArea = this.scene.add.rectangle(x, y, width, BUTTON_HEIGHT, 0x000000, 0)
      .setInteractive({ useHandCursor: true })

    hitArea.on('pointerover', () => {
      btnBg.clear()
      this.drawButtonBg(btnBg, x, y, width, hoverColor)
    })
    hitArea.on('pointerout', () => {
      btnBg.clear()
      this.drawButtonBg(btnBg, x, y, width, bgColor)
    })
    hitArea.on('pointerdown', onClick)

    container.add(hitArea)
  }

  /**
   * 繪製按鈕圓角背景
   */
  private drawButtonBg(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    color: number
  ): void {
    graphics.fillStyle(color, 1)
    graphics.fillRoundedRect(
      x - width / 2, y - BUTTON_HEIGHT / 2,
      width, BUTTON_HEIGHT,
      BUTTON_RADIUS
    )
  }
}
