import Phaser from 'phaser'
import { BOARD_TILES, PROPERTIES, TIER_COLORS } from '../config/boardData'
import { TileType, type BoardTile } from '../types'

/**
 * 棋盤繪製器
 * 負責繪製 32 格矩形棋盤，包含地產顏色、文字標籤、擁有者標示與建築圖示
 */

// 特殊格子顏色定義
const SPECIAL_TILE_COLORS: Record<string, number> = {
  [TileType.START]: 0xf1c40f,   // 起點：金色
  [TileType.CHANCE]: 0x3498db,  // 機會：淺藍
  [TileType.FATE]: 0xe91e63,    // 命運：粉紅
  [TileType.BANK]: 0x27ae60,    // 銀行：綠色
  [TileType.REST]: 0x95a5a6     // 休息站：灰色
}

// 棋盤佈局常數
const BOARD_LEFT = 20       // 棋盤左上角 X
const BOARD_TOP = 88        // 棋盤左上角 Y（留空間給玩家面板）
const TILE_W = 155          // 格子寬度
const TILE_H = 76           // 格子高度
const TILES_PER_SIDE = 8    // 每邊 8 格
const BOARD_W = TILE_W * TILES_PER_SIDE   // 棋盤寬度 1240
const BOARD_H = TILE_H * TILES_PER_SIDE   // 棋盤高度 608
const CORNER_RADIUS = 8     // 圓角半徑

// 字型設定
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'

export class BoardRenderer {
  private scene: Phaser.Scene
  /** 所有格子的中心座標快取 */
  private tilePositions: Map<number, { x: number; y: number }> = new Map()
  /** 所有格子的 Phaser 容器 */
  private tileContainers: Map<number, Phaser.GameObjects.Container> = new Map()
  /** 擁有者指示器（每格一個彩色底條） */
  private ownerIndicators: Map<number, Phaser.GameObjects.Rectangle> = new Map()
  /** 建築圖示容器 */
  private buildingContainers: Map<number, Phaser.GameObjects.Container> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * 繪製完整棋盤
   * 計算每格位置，繪製背景色、文字標籤
   */
  create(): void {
    // 先計算所有格子的中心位置
    this.calculateTilePositions()

    // 繪製棋盤底板（深色背景）
    const boardBg = this.scene.add.rectangle(
      BOARD_LEFT + BOARD_W / 2,
      BOARD_TOP + BOARD_H / 2,
      BOARD_W + 12,
      BOARD_H + 12,
      0x1a1a2e
    )
    boardBg.setStrokeStyle(2, 0x3a3a5e)

    // 棋盤中央背景圖（填滿內圈空白區域）
    const innerW = BOARD_W - 2 * TILE_W
    const innerH = BOARD_H - 2 * TILE_H
    const bgImg = this.scene.add.image(
      BOARD_LEFT + BOARD_W / 2,
      BOARD_TOP + BOARD_H / 2,
      'board-bg'
    )
    bgImg.setDisplaySize(innerW, innerH)

    // 繪製中央裝飾文字
    this.scene.add.text(
      BOARD_LEFT + BOARD_W / 2,
      BOARD_TOP + BOARD_H / 2 - 20,
      '台灣大富翁',
      {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5).setAlpha(0.3)

    this.scene.add.text(
      BOARD_LEFT + BOARD_W / 2,
      BOARD_TOP + BOARD_H / 2 + 20,
      'Taiwan Monopoly',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        align: 'center'
      }
    ).setOrigin(0.5).setAlpha(0.2)

    // 逐格繪製
    for (const tile of BOARD_TILES) {
      this.drawTile(tile)
    }
  }

  /**
   * 取得指定格子的中心座標
   */
  getTilePosition(tileId: number): { x: number; y: number } {
    const pos = this.tilePositions.get(tileId)
    if (!pos) {
      // 預設回傳起點座標
      return { x: BOARD_LEFT + TILE_W / 2, y: BOARD_TOP + BOARD_H - TILE_H / 2 }
    }
    return pos
  }

  /**
   * 顯示格子擁有者指示
   * @param tileId - 格子 ID
   * @param color - 擁有者顏色，null 表示清除
   */
  updateTileOwner(tileId: number, color: number | null): void {
    // 移除舊的指示器
    const existing = this.ownerIndicators.get(tileId)
    if (existing) {
      existing.destroy()
      this.ownerIndicators.delete(tileId)
    }

    if (color === null) return

    const pos = this.getTilePosition(tileId)
    // 在格子底部畫一條擁有者色帶
    const indicator = this.scene.add.rectangle(
      pos.x, pos.y + TILE_H / 2 - 4,
      TILE_W - 8, 6,
      color
    )
    indicator.setAlpha(0.9)
    this.ownerIndicators.set(tileId, indicator)
  }

  /**
   * 更新格子上的建築圖示
   * @param tileId - 格子 ID
   * @param level - 建築等級 (0-4)
   */
  updateTileBuilding(tileId: number, level: number): void {
    // 移除舊的建築容器
    const existing = this.buildingContainers.get(tileId)
    if (existing) {
      existing.destroy()
      this.buildingContainers.delete(tileId)
    }

    if (level <= 0) return

    const pos = this.getTilePosition(tileId)
    const container = this.scene.add.container(pos.x, pos.y - TILE_H / 2 + 10)

    if (level <= 3) {
      // 畫 1~3 棟小房子
      const totalWidth = level * 12
      const startX = -totalWidth / 2 + 6
      for (let i = 0; i < level; i++) {
        const house = this.scene.add.rectangle(
          startX + i * 12, 0,
          8, 8,
          0x2ecc71
        )
        house.setStrokeStyle(1, 0x27ae60)
        container.add(house)
      }
    } else {
      // 畫旅館（較大金色方塊 + H 字）
      const hotel = this.scene.add.rectangle(0, 0, 14, 14, 0xf1c40f)
      hotel.setStrokeStyle(1, 0xe67e22)
      const hotelText = this.scene.add.text(0, 0, 'H', {
        fontSize: '9px',
        color: '#000000',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      container.add([hotel, hotelText])
    }

    this.buildingContainers.set(tileId, container)
  }

  /**
   * 計算 32 格的中心座標
   *
   * 排列方式（順時針）：
   * - 底邊（左→右）：格子 0~7
   * - 右邊（下→上）：格子 8~15
   * - 上邊（右→左）：格子 16~23
   * - 左邊（上→下）：格子 24~31
   */
  private calculateTilePositions(): void {
    for (let i = 0; i < 32; i++) {
      let x: number
      let y: number

      if (i < 8) {
        // 底邊：從左到右
        x = BOARD_LEFT + i * TILE_W + TILE_W / 2
        y = BOARD_TOP + BOARD_H - TILE_H / 2
      } else if (i < 16) {
        // 右邊：從下到上
        const idx = i - 8
        x = BOARD_LEFT + BOARD_W - TILE_W / 2
        y = BOARD_TOP + BOARD_H - idx * TILE_H - TILE_H / 2
      } else if (i < 24) {
        // 上邊：從右到左
        const idx = i - 16
        x = BOARD_LEFT + BOARD_W - idx * TILE_W - TILE_W / 2
        y = BOARD_TOP + TILE_H / 2
      } else {
        // 左邊：從上到下
        const idx = i - 24
        x = BOARD_LEFT + TILE_W / 2
        y = BOARD_TOP + idx * TILE_H + TILE_H / 2
      }

      this.tilePositions.set(i, { x, y })
    }
  }

  /**
   * 繪製單一格子
   */
  private drawTile(tile: BoardTile): void {
    const pos = this.getTilePosition(tile.id)
    const container = this.scene.add.container(pos.x, pos.y)

    // 決定格子背景顏色
    const bgColor = this.getTileColor(tile)

    // 繪製圓角背景
    const bg = this.scene.add.graphics()
    bg.fillStyle(bgColor, 1)
    bg.fillRoundedRect(
      -TILE_W / 2 + 2, -TILE_H / 2 + 2,
      TILE_W - 4, TILE_H - 4,
      CORNER_RADIUS
    )
    bg.lineStyle(1, 0xffffff, 0.3)
    bg.strokeRoundedRect(
      -TILE_W / 2 + 2, -TILE_H / 2 + 2,
      TILE_W - 4, TILE_H - 4,
      CORNER_RADIUS
    )
    container.add(bg)

    // 地產格子額外加一條頂部色帶（用等級色標示）
    if (tile.type === TileType.PROPERTY && tile.propertyId !== undefined) {
      const prop = PROPERTIES.find(p => p.id === tile.propertyId)
      if (prop) {
        const tierBar = this.scene.add.graphics()
        tierBar.fillStyle(prop.color, 1)
        tierBar.fillRoundedRect(
          -TILE_W / 2 + 4, -TILE_H / 2 + 3,
          TILE_W - 8, 8,
          { tl: CORNER_RADIUS, tr: CORNER_RADIUS, bl: 0, br: 0 }
        )
        container.add(tierBar)
      }
    }

    // 格子名稱文字
    const fontSize = tile.label.length > 3 ? '13px' : '16px'
    const nameText = this.scene.add.text(0, 2, tile.label, {
      fontSize,
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5)
    container.add(nameText)

    // 地產格顯示價格
    if (tile.type === TileType.PROPERTY && tile.propertyId !== undefined) {
      const prop = PROPERTIES.find(p => p.id === tile.propertyId)
      if (prop) {
        const priceText = this.scene.add.text(0, TILE_H / 2 - 12, `$${prop.price}`, {
          fontSize: '11px',
          color: '#cccccc',
          fontFamily: FONT_FAMILY,
          align: 'center'
        }).setOrigin(0.5)
        container.add(priceText)
      }
    }

    // 特殊格子加圖示符號
    if (tile.type !== TileType.PROPERTY) {
      const icon = this.getSpecialTileIcon(tile.type)
      if (icon) {
        const iconText = this.scene.add.text(0, -TILE_H / 2 + 12, icon, {
          fontSize: '15px',
          color: '#ffffff',
          fontFamily: FONT_FAMILY
        }).setOrigin(0.5)
        container.add(iconText)
      }
    }

    this.tileContainers.set(tile.id, container)
  }

  /**
   * 根據格子類型取得背景顏色
   */
  private getTileColor(tile: BoardTile): number {
    if (tile.type === TileType.PROPERTY && tile.propertyId !== undefined) {
      const prop = PROPERTIES.find(p => p.id === tile.propertyId)
      if (prop) {
        // 地產格使用較暗的等級色作為底色
        return this.darkenColor(TIER_COLORS[prop.tier], 0.4)
      }
    }
    return SPECIAL_TILE_COLORS[tile.type] ?? 0x333333
  }

  /**
   * 將顏色調暗
   */
  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor)
    const g = Math.floor(((color >> 8) & 0xff) * factor)
    const b = Math.floor((color & 0xff) * factor)
    return (r << 16) | (g << 8) | b
  }

  /**
   * 取得特殊格子的圖示文字
   */
  private getSpecialTileIcon(type: TileType): string | null {
    switch (type) {
      case TileType.START: return '★'    // ★
      case TileType.CHANCE: return '?'
      case TileType.FATE: return '❖'     // ❖
      case TileType.BANK: return '$'
      case TileType.REST: return '☺'     // ☺
      default: return null
    }
  }
}
