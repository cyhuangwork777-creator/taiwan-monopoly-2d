import Phaser from 'phaser'
import { BuildingLevel } from '../types'
import { BoardRenderer } from './BoardRenderer'

/**
 * 建築繪製器
 * 負責在地產格子上繪製房屋（1~3 棟）或旅館圖示
 */

// 字型設定
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'

// 建築繪製常數
const HOUSE_SIZE = 13       // 小房子尺寸
const HOUSE_GAP = 17        // 房子間距
const HOUSE_COLOR = 0x2ecc71  // 房子顏色（綠色）
const HOUSE_STROKE = 0x1a9c4e // 房子邊框色
const HOTEL_SIZE = 20       // 旅館尺寸
const HOTEL_COLOR = 0xf1c40f  // 旅館顏色（金色）
const HOTEL_STROKE = 0xe67e22 // 旅館邊框色

export class BuildingRenderer {
  private scene: Phaser.Scene
  private boardRenderer: BoardRenderer
  /** 各格子的建築容器，用於更新時清除舊圖示 */
  private buildingContainers: Map<number, Phaser.GameObjects.Container> = new Map()

  constructor(scene: Phaser.Scene, boardRenderer: BoardRenderer) {
    this.scene = scene
    this.boardRenderer = boardRenderer
  }

  /**
   * 更新指定格子的建築顯示
   * @param tileId - 格子 ID
   * @param level - 建築等級
   */
  updateBuilding(tileId: number, level: BuildingLevel): void {
    // 清除該格子舊的建築圖示
    this.clearBuilding(tileId)

    // 空地不需要繪製
    if (level === BuildingLevel.EMPTY) return

    const pos = this.boardRenderer.getTilePosition(tileId)
    // 建築顯示在格子上方偏移
    const container = this.scene.add.container(pos.x, pos.y - 16)

    if (level === BuildingLevel.HOTEL) {
      // 旅館：一個較大的金色方塊加 H 字樣
      this.drawHotel(container)
    } else {
      // 房屋：1~3 棟小方塊
      this.drawHouses(container, level)
    }

    this.buildingContainers.set(tileId, container)

    // 建築升起動畫
    container.setScale(1, 0.01)
    this.scene.tweens.add({
      targets: container,
      scaleY: 1,
      duration: 350,
      ease: 'Back.easeOut'
    })
  }

  /**
   * 清除指定格子的建築圖示
   */
  private clearBuilding(tileId: number): void {
    const existing = this.buildingContainers.get(tileId)
    if (existing) {
      existing.destroy()
      this.buildingContainers.delete(tileId)
    }
  }

  /**
   * 繪製 1~3 棟小房子
   */
  private drawHouses(container: Phaser.GameObjects.Container, count: number): void {
    const totalWidth = count * HOUSE_GAP
    const startX = -totalWidth / 2 + HOUSE_GAP / 2

    for (let i = 0; i < count; i++) {
      const x = startX + i * HOUSE_GAP

      // 房子主體
      const house = this.scene.add.rectangle(x, 0, HOUSE_SIZE, HOUSE_SIZE, HOUSE_COLOR)
      house.setStrokeStyle(1, HOUSE_STROKE)
      container.add(house)

      // 三角形屋頂
      const roof = this.scene.add.graphics()
      roof.fillStyle(HOUSE_STROKE, 1)
      roof.fillTriangle(
        x - HOUSE_SIZE / 2 - 1, -HOUSE_SIZE / 2,
        x + HOUSE_SIZE / 2 + 1, -HOUSE_SIZE / 2,
        x, -HOUSE_SIZE
      )
      container.add(roof)
    }
  }

  /**
   * 繪製旅館
   */
  private drawHotel(container: Phaser.GameObjects.Container): void {
    // 旅館主體
    const hotel = this.scene.add.rectangle(0, 0, HOTEL_SIZE, HOTEL_SIZE, HOTEL_COLOR)
    hotel.setStrokeStyle(2, HOTEL_STROKE)
    container.add(hotel)

    // H 字標記
    const label = this.scene.add.text(0, 0, 'H', {
      fontSize: '10px',
      color: '#000000',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(label)

    // 三角形屋頂
    const roof = this.scene.add.graphics()
    roof.fillStyle(HOTEL_STROKE, 1)
    roof.fillTriangle(
      -HOTEL_SIZE / 2 - 2, -HOTEL_SIZE / 2,
      HOTEL_SIZE / 2 + 2, -HOTEL_SIZE / 2,
      0, -HOTEL_SIZE - 2
    )
    container.add(roof)
  }
}
