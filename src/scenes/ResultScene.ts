import Phaser from 'phaser'
import { type Player, type Property, BuildingLevel } from '../types'
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT, BUILDING_COST_RATIO, HOTEL_COST_RATIO } from '../config/gameConfig'

const FONT = 'Arial, "Microsoft JhengHei"'

interface ResultData {
  players?: Player[]
  properties?: Property[]
  winner?: Player
  round?: number
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' })
  }

  init(data: ResultData): void {
    this._data = data
  }

  private _data: ResultData = {}

  create(): void {
    const { players = [], properties = [], winner, round = 0 } = this._data
    const cx = GAME_WIDTH / 2

    // 深色背景
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0d1a)

    // 標題
    this.add.text(cx, 70, '遊戲結束', {
      fontSize: '56px', color: '#FFD700', fontFamily: FONT,
      fontStyle: 'bold', stroke: '#8B6914', strokeThickness: 4
    }).setOrigin(0.5)

    // 冠軍宣告
    if (winner) {
      const ci = CHARACTERS[winner.character]
      this.add.text(cx, 140, `🏆 ${winner.name} 獲勝！`, {
        fontSize: '28px', color: ci.colorHex, fontFamily: FONT, fontStyle: 'bold'
      }).setOrigin(0.5)
    }

    this.add.text(cx, 185, `共進行了 ${round} 回合`, {
      fontSize: '16px', color: '#888888', fontFamily: FONT
    }).setOrigin(0.5)

    // 計算每位玩家的房產價值
    const propertyValues = this.calcPropertyValues(players, properties)

    // 排名表（依總資產排序）
    const sorted = [...players].sort((a, b) => {
      const aTotal = a.isBankrupt ? -1 : a.money + a.bankDeposit + (propertyValues.get(a.id) ?? 0)
      const bTotal = b.isBankrupt ? -1 : b.money + b.bankDeposit + (propertyValues.get(b.id) ?? 0)
      return bTotal - aTotal
    })

    const tableY = 230
    const rowH = 52
    const colW = [50, 140, 110, 100, 110, 130]
    const headers = ['名次', '角色', '現金', '存款', '房產', '合計']
    const startX = cx - (colW.reduce((a, b) => a + b) / 2)

    // 表頭
    let xOff = startX
    headers.forEach((h, i) => {
      this.add.text(xOff + colW[i] / 2, tableY, h, {
        fontSize: '14px', color: '#aaaaaa', fontFamily: FONT, fontStyle: 'bold'
      }).setOrigin(0.5)
      xOff += colW[i]
    })

    // 分隔線
    const line = this.add.graphics()
    line.lineStyle(1, 0x444444)
    line.lineBetween(startX, tableY + 18, startX + colW.reduce((a, b) => a + b), tableY + 18)

    // 各玩家行
    sorted.forEach((p, rank) => {
      const rowY = tableY + 28 + rank * rowH
      const ci = CHARACTERS[p.character]
      const isWinner = winner && p.id === winner.id
      const pv = propertyValues.get(p.id) ?? 0
      const total = p.money + p.bankDeposit + pv

      const rowBg = this.add.graphics()
      rowBg.fillStyle(isWinner ? 0x1a3a1a : p.isBankrupt ? 0x1a1a1a : 0x141428, 0.8)
      rowBg.fillRoundedRect(startX - 8, rowY - 18, colW.reduce((a, b) => a + b) + 16, rowH - 4, 6)

      const cols = [
        `${rank + 1}`,
        p.name + (p.isBankrupt ? ' 💀' : ''),
        `$${p.money.toLocaleString()}`,
        `$${p.bankDeposit.toLocaleString()}`,
        `$${pv.toLocaleString()}`,
        p.isBankrupt ? '破產' : `$${total.toLocaleString()}`
      ]

      let rx = startX
      cols.forEach((val, i) => {
        const color = i === 1 ? ci.colorHex : isWinner ? '#90ee90' : p.isBankrupt ? '#666666' : '#dddddd'
        this.add.text(rx + colW[i] / 2, rowY, val, {
          fontSize: '15px', color, fontFamily: FONT
        }).setOrigin(0.5)
        rx += colW[i]
      })
    })

    // 再來一局按鈕
    const btnY = GAME_HEIGHT - 80
    const btnBg = this.add.graphics()
    btnBg.fillStyle(0xe74c3c)
    btnBg.fillRoundedRect(cx - 120, btnY - 25, 240, 50, 10)

    this.add.text(cx, btnY, '再來一局', {
      fontSize: '24px', color: '#ffffff', fontFamily: FONT, fontStyle: 'bold'
    }).setOrigin(0.5)

    const hitArea = this.add.rectangle(cx, btnY, 240, 50, 0x000000, 0).setInteractive({ useHandCursor: true })
    hitArea.on('pointerover', () => { btnBg.clear(); btnBg.fillStyle(0xc0392b); btnBg.fillRoundedRect(cx - 120, btnY - 25, 240, 50, 10) })
    hitArea.on('pointerout',  () => { btnBg.clear(); btnBg.fillStyle(0xe74c3c); btnBg.fillRoundedRect(cx - 120, btnY - 25, 240, 50, 10) })
    hitArea.on('pointerdown', () => this.scene.start('MenuScene'))
  }

  /**
   * 計算每位玩家的房產總價值（地價 + 建築投資）
   */
  private calcPropertyValues(players: Player[], properties: Property[]): Map<number, number> {
    const values = new Map<number, number>()
    for (const p of players) {
      let total = 0
      for (const propId of p.properties) {
        const prop = properties.find(pr => pr.id === propId)
        if (!prop) continue
        // 地價
        total += prop.price
        // 建築投資
        for (let lv = 1; lv <= prop.buildingLevel; lv++) {
          total += lv <= 3
            ? Math.floor(prop.price * BUILDING_COST_RATIO)
            : Math.floor(prop.price * HOTEL_COST_RATIO)
        }
      }
      values.set(p.id, total)
    }
    return values
  }
}
