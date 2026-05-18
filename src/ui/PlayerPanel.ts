import Phaser from 'phaser'
import { type Player } from '../types'
import { CHARACTERS } from '../config/gameConfig'

/**
 * 玩家資訊面板
 * 在畫面頂端水平排列顯示 4 位玩家的狀態資訊
 */

// 面板常數
const PANEL_WIDTH = 320       // 每個面板寬度
const PANEL_HEIGHT = 80       // 面板高度
const PANEL_Y = 0             // 面板 Y 起始位置
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'
const TOKEN_RADIUS = 14       // 角色圓形圖示半徑
const HIGHLIGHT_COLOR = 0xf1c40f  // 高亮邊框色

export class PlayerPanel {
  private scene: Phaser.Scene
  /** 各玩家面板容器 */
  private panels: Map<number, Phaser.GameObjects.Container> = new Map()
  /** 金額文字（需動態更新） */
  private moneyTexts: Map<number, Phaser.GameObjects.Text> = new Map()
  /** 地產數量文字 */
  private propertyTexts: Map<number, Phaser.GameObjects.Text> = new Map()
  /** 高亮邊框 */
  private highlightBorders: Map<number, Phaser.GameObjects.Rectangle> = new Map()
  /** 高亮補間 */
  private highlightTweens: Map<number, Phaser.Tweens.Tween> = new Map()
  /** 破產遮罩 */
  private bankruptOverlays: Map<number, Phaser.GameObjects.Container> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * 建立所有玩家面板
   */
  create(players: Player[]): void {
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const x = i * PANEL_WIDTH
      this.createSinglePanel(player, x)
    }
  }

  /**
   * 更新所有玩家的金額與地產數量
   */
  update(players: Player[]): void {
    for (const player of players) {
      const moneyText = this.moneyTexts.get(player.id)
      if (moneyText) {
        moneyText.setText(`$${player.money.toLocaleString()}`)
      }

      const propText = this.propertyTexts.get(player.id)
      if (propText) {
        propText.setText(`${player.properties.length} 筆`)
      }
    }
  }

  /**
   * 高亮顯示當前回合玩家
   */
  highlightCurrentPlayer(playerId: number): void {
    // 先清除所有高亮
    for (const [id, border] of this.highlightBorders) {
      border.setVisible(false)
      const tween = this.highlightTweens.get(id)
      if (tween) {
        tween.stop()
        this.highlightTweens.delete(id)
      }
    }

    // 顯示指定玩家的高亮邊框
    const border = this.highlightBorders.get(playerId)
    if (border) {
      border.setVisible(true)
      const tween = this.scene.tweens.add({
        targets: border,
        alpha: { from: 1, to: 0.4 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
      this.highlightTweens.set(playerId, tween)
    }
  }

  /**
   * 顯示金額變動浮動文字
   * @param playerId - 玩家 ID
   * @param amount - 變動金額（正數為增加、負數為減少）
   */
  showMoneyChange(playerId: number, amount: number): void {
    const panel = this.panels.get(playerId)
    if (!panel) return

    const isGain = amount > 0
    const text = isGain ? `+$${amount.toLocaleString()}` : `-$${Math.abs(amount).toLocaleString()}`
    const color = isGain ? '#2ecc71' : '#e74c3c'

    const floatText = this.scene.add.text(
      panel.x + PANEL_WIDTH / 2,
      panel.y + PANEL_HEIGHT / 2,
      text,
      {
        fontSize: '20px',
        color,
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(300)

    // 浮動向上並淡出（用 rAF 避免 Phaser tween onComplete 問題）
    const startY = floatText.y
    const startTime = performance.now()
    const duration = 1200
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = t * (2 - t)
      floatText.setPosition(floatText.x, startY - 40 * eased)
      floatText.setAlpha(1 - eased)
      if (t < 1) requestAnimationFrame(animate)
      else floatText.destroy()
    }
    requestAnimationFrame(animate)
  }

  /**
   * 標記玩家破產
   */
  markBankrupt(playerId: number): void {
    const panel = this.panels.get(playerId)
    if (!panel) return

    // 移除高亮
    const border = this.highlightBorders.get(playerId)
    if (border) border.setVisible(false)
    const tween = this.highlightTweens.get(playerId)
    if (tween) {
      tween.stop()
      this.highlightTweens.delete(playerId)
    }

    // 半透明灰色遮罩
    const overlay = this.scene.add.container(panel.x, panel.y)
    const bg = this.scene.add.rectangle(
      PANEL_WIDTH / 2, PANEL_HEIGHT / 2,
      PANEL_WIDTH, PANEL_HEIGHT,
      0x000000, 0.6
    )
    overlay.add(bg)

    // 破產文字
    const bankruptText = this.scene.add.text(
      PANEL_WIDTH / 2, PANEL_HEIGHT / 2,
      '破產',
      {
        fontSize: '28px',
        color: '#e74c3c',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5)
    overlay.add(bankruptText)

    overlay.setDepth(250)
    this.bankruptOverlays.set(playerId, overlay)
  }

  /**
   * 建立單一玩家面板
   */
  private createSinglePanel(player: Player, x: number): void {
    const container = this.scene.add.container(x, PANEL_Y)
    container.setDepth(200)

    // 面板背景
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x1a1a2e, 0.9)
    bg.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT)
    bg.lineStyle(1, 0x3a3a5e, 0.8)
    bg.strokeRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT)
    container.add(bg)

    // 角色圓形圖示
    const charInfo = CHARACTERS[player.character]
    const tokenG = this.scene.add.graphics()
    tokenG.fillStyle(charInfo.color, 1)
    tokenG.fillCircle(30, PANEL_HEIGHT / 2, TOKEN_RADIUS)
    tokenG.lineStyle(2, 0xffffff, 0.6)
    tokenG.strokeCircle(30, PANEL_HEIGHT / 2, TOKEN_RADIUS)
    container.add(tokenG)

    // 角色首字
    const initial = this.scene.add.text(30, PANEL_HEIGHT / 2, charInfo.name.charAt(0), {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(initial)

    // 玩家名稱
    const nameText = this.scene.add.text(55, 12, player.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    })
    container.add(nameText)

    // AI 標籤
    if (player.isAI) {
      const aiBadge = this.scene.add.text(55 + nameText.width + 8, 13, 'AI', {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        backgroundColor: '#e67e22',
        padding: { x: 4, y: 2 }
      })
      container.add(aiBadge)
    }

    // 金額
    const moneyText = this.scene.add.text(55, 32, `$${player.money.toLocaleString()}`, {
      fontSize: '16px',
      color: '#f1c40f',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    })
    container.add(moneyText)
    this.moneyTexts.set(player.id, moneyText)

    // 地產數量
    const propText = this.scene.add.text(55, 54, `${player.properties.length} 筆`, {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: FONT_FAMILY
    })
    container.add(propText)
    this.propertyTexts.set(player.id, propText)

    // 地產圖示標籤
    const propLabel = this.scene.add.text(55 + propText.width + 4, 54, '地產', {
      fontSize: '12px',
      color: '#777777',
      fontFamily: FONT_FAMILY
    })
    container.add(propLabel)

    // 角色圖片（右側）
    if (this.scene.textures.exists(charInfo.imageKey)) {
      const charImg = this.scene.add.image(PANEL_WIDTH - 36, PANEL_HEIGHT / 2, charInfo.imageKey)
      charImg.setDisplaySize(62, 62)
      container.add(charImg)
    }

    // 高亮邊框（預設隱藏）
    const highlightBorder = this.scene.add.rectangle(
      x + PANEL_WIDTH / 2, PANEL_Y + PANEL_HEIGHT / 2,
      PANEL_WIDTH - 2, PANEL_HEIGHT - 2
    )
    highlightBorder.setStrokeStyle(3, HIGHLIGHT_COLOR)
    highlightBorder.setFillStyle(0x000000, 0)
    highlightBorder.setVisible(false)
    highlightBorder.setDepth(210)
    this.highlightBorders.set(player.id, highlightBorder)

    this.panels.set(player.id, container)
  }
}
