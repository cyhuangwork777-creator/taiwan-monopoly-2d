import Phaser from 'phaser'
import { type Player, Character } from '../types'
import { CHARACTERS, TOTAL_TILES } from '../config/gameConfig'
import { BoardRenderer } from './BoardRenderer'

/**
 * 玩家棋子繪製器
 * 負責建立、移動、高亮、破產等玩家棋子的視覺效果
 */

// 棋子常數
const TOKEN_RADIUS = 15     // 棋子半徑（直徑 30px）
const TOKEN_FONT_SIZE = '14px'
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'
const STEP_DURATION = 250   // 單步移動時間（毫秒）
const BOUNCE_Y = -8         // 彈跳高度

export class PlayerRenderer {
  private scene: Phaser.Scene
  private boardRenderer: BoardRenderer
  /** 玩家棋子容器：playerId -> Container */
  private tokens: Map<number, Phaser.GameObjects.Container> = new Map()
  /** 各格子上的玩家數量追蹤（用於計算偏移） */
  private tileOccupants: Map<number, number[]> = new Map()
  /** 高亮補間動畫參考 */
  private highlightTweens: Map<number, Phaser.Tweens.Tween> = new Map()

  constructor(scene: Phaser.Scene, boardRenderer: BoardRenderer) {
    this.scene = scene
    this.boardRenderer = boardRenderer
  }

  /**
   * 為所有玩家建立棋子
   * 每個棋子是一個彩色圓形 + 角色名稱首字母
   */
  createPlayerTokens(players: Player[]): void {
    for (const player of players) {
      const charInfo = CHARACTERS[player.character]
      const container = this.scene.add.container(0, 0)

      // 圓形底色
      const circle = this.scene.add.graphics()
      circle.fillStyle(charInfo.color, 1)
      circle.fillCircle(0, 0, TOKEN_RADIUS)
      circle.lineStyle(2, 0xffffff, 0.8)
      circle.strokeCircle(0, 0, TOKEN_RADIUS)
      container.add(circle)

      // 角色名稱首字母
      const initial = charInfo.name.charAt(0)
      const text = this.scene.add.text(0, 0, initial, {
        fontSize: TOKEN_FONT_SIZE,
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      container.add(text)

      // 設定深度，確保棋子在最上層
      container.setDepth(100 + player.id)

      this.tokens.set(player.id, container)

      // 初始位置放到起點
      this.placeTokenOnTile(player.id, player.position)
    }
  }

  /**
   * 更新玩家棋子位置（可選動畫）
   * @param playerId - 玩家 ID
   * @param tileId - 目標格子 ID
   * @param animate - 是否播放移動動畫
   */
  updatePlayerPosition(playerId: number, tileId: number, animate: boolean): void {
    if (animate) {
      // 動畫由 animateMovement 負責
      return
    }
    this.placeTokenOnTile(playerId, tileId)
  }

  /**
   * 逐格動畫移動
   * 從 fromTile 一步步移動到 toTile（支援繞圈）
   * @returns Promise，動畫完成時 resolve
   */
  async animateMovement(
    playerId: number,
    fromTile: number,
    toTile: number,
    steps: number
  ): Promise<void> {
    const token = this.tokens.get(playerId)
    if (!token) return

    // 先將棋子從舊格子移除佔位
    this.removeFromTile(playerId, fromTile)

    // 逐步移動
    let currentTile = fromTile
    for (let i = 0; i < steps; i++) {
      currentTile = (currentTile + 1) % TOTAL_TILES
      const targetPos = this.boardRenderer.getTilePosition(currentTile)

      // 播放一步的補間動畫（含小彈跳效果）
      await this.tweenStep(token, targetPos.x, targetPos.y)
    }

    // 最終定位（含多人偏移）
    this.placeTokenOnTile(playerId, toTile)
  }

  /**
   * 取得玩家棋子的目前螢幕座標
   */
  getTokenPosition(playerId: number): { x: number; y: number } | null {
    const token = this.tokens.get(playerId)
    if (!token) return null
    return { x: token.x, y: token.y }
  }

  /**
   * 高亮顯示當前玩家（脈衝呼吸效果）
   */
  highlightPlayer(playerId: number): void {
    const token = this.tokens.get(playerId)
    if (!token) return

    // 先清除舊的高亮
    this.unhighlightPlayer(playerId)

    const tween = this.scene.tweens.add({
      targets: token,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })

    this.highlightTweens.set(playerId, tween)
  }

  /**
   * 移除所有玩家的高亮效果
   */
  unhighlightAll(): void {
    for (const [playerId] of this.highlightTweens) {
      this.unhighlightPlayer(playerId)
    }
  }

  /**
   * 將玩家棋子灰階化（表示破產）
   */
  setBankrupt(playerId: number): void {
    const token = this.tokens.get(playerId)
    if (!token) return

    // 移除高亮
    this.unhighlightPlayer(playerId)

    // 設定半透明 + 灰色色調
    token.setAlpha(0.4)

    // 加上 X 標記
    const xMark = this.scene.add.text(0, 0, 'X', {
      fontSize: '24px',
      color: '#ff0000',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    token.add(xMark)
  }

  /**
   * 移除單一玩家的高亮效果
   */
  private unhighlightPlayer(playerId: number): void {
    const tween = this.highlightTweens.get(playerId)
    if (tween) {
      tween.stop()
      this.highlightTweens.delete(playerId)
    }
    const token = this.tokens.get(playerId)
    if (token) {
      token.setScale(1)
    }
  }

  /**
   * 將棋子放到指定格子（含多人偏移計算）
   */
  private placeTokenOnTile(playerId: number, tileId: number): void {
    const token = this.tokens.get(playerId)
    if (!token) return

    // 先從所有格子中移除此玩家
    for (const [tid, occupants] of this.tileOccupants) {
      const idx = occupants.indexOf(playerId)
      if (idx !== -1) {
        occupants.splice(idx, 1)
        if (occupants.length === 0) {
          this.tileOccupants.delete(tid)
        }
      }
    }

    // 加入新格子
    if (!this.tileOccupants.has(tileId)) {
      this.tileOccupants.set(tileId, [])
    }
    const occupants = this.tileOccupants.get(tileId)!
    occupants.push(playerId)

    // 計算偏移（多人同格時錯開位置）
    const pos = this.boardRenderer.getTilePosition(tileId)
    const offset = this.calculateOffset(occupants.indexOf(playerId), occupants.length)
    token.setPosition(pos.x + offset.x, pos.y + offset.y)

    // 同步更新同格其他棋子的位置
    for (let i = 0; i < occupants.length; i++) {
      if (occupants[i] !== playerId) {
        const otherToken = this.tokens.get(occupants[i])
        if (otherToken) {
          const otherOffset = this.calculateOffset(i, occupants.length)
          otherToken.setPosition(pos.x + otherOffset.x, pos.y + otherOffset.y)
        }
      }
    }
  }

  /**
   * 從指定格子移除玩家佔位
   */
  private removeFromTile(playerId: number, tileId: number): void {
    const occupants = this.tileOccupants.get(tileId)
    if (!occupants) return

    const idx = occupants.indexOf(playerId)
    if (idx !== -1) {
      occupants.splice(idx, 1)
      if (occupants.length === 0) {
        this.tileOccupants.delete(tileId)
      }
    }
  }

  /**
   * 計算同格多人時的偏移量
   * 最多 4 人，分佈在格子中心的四個方向
   */
  private calculateOffset(
    index: number,
    total: number
  ): { x: number; y: number } {
    if (total <= 1) return { x: 0, y: 0 }

    // 2~4 人的偏移分佈
    const offsets = [
      { x: -10, y: -8 },
      { x: 10, y: -8 },
      { x: -10, y: 8 },
      { x: 10, y: 8 }
    ]
    return offsets[index] ?? { x: 0, y: 0 }
  }

  /**
   * 單步動畫 — 瞬間跳至目標位置後等待間隔
   */
  private tweenStep(
    target: Phaser.GameObjects.Container,
    x: number,
    y: number
  ): Promise<void> {
    target.setPosition(x, y)
    return new Promise<void>(resolve => setTimeout(resolve, STEP_DURATION))
  }
}
