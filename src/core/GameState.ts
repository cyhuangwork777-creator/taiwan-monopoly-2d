import {
  type Player,
  type Property,
  type GameEvent,
  type Roadblock,
  type Card,
  Character,
  GamePhase,
  BuildingLevel
} from '../types'
import { STARTING_MONEY, TOTAL_TILES } from '../config/gameConfig'
import { PROPERTIES } from '../config/boardData'

// 玩家建立設定
interface PlayerConfig {
  character: Character
  name: string
  isAI: boolean
}

/**
 * 遊戲狀態管理類別
 * 負責管理所有遊戲核心狀態：玩家、回合、地產、事件紀錄等
 */
export class GameState {
  /** 所有玩家陣列 */
  players: Player[] = []
  /** 當前行動玩家索引 */
  currentPlayerIndex: number = 0
  /** 當前回合數 */
  currentRound: number = 1
  /** 當前遊戲階段 */
  gamePhase: GamePhase = GamePhase.ROLL_DICE
  /** 路障陣列 */
  roadblocks: Roadblock[] = []
  /** 地產陣列（從設定深拷貝） */
  properties: Property[] = []
  /** 遊戲事件紀錄 */
  private eventLog: GameEvent[] = []

  constructor() {
    // 深拷貝地產資料，避免修改原始設定
    this.properties = JSON.parse(JSON.stringify(PROPERTIES))
  }

  /**
   * 初始化遊戲
   * @param playerConfigs - 玩家設定陣列（最多 4 位）
   */
  initGame(playerConfigs: PlayerConfig[]): void {
    this.players = playerConfigs.map((config, index) => ({
      id: index,
      name: config.name,
      character: config.character,
      money: STARTING_MONEY,
      position: 0,
      properties: [],
      cards: [] as Card[],
      isBankrupt: false,
      isAI: config.isAI,
      bankDeposit: 0,
      bankLoan: 0,
      skipNextTurn: false,
      hasDoubleToll: false,
      hasTollFree: false,
      consecutiveDoubles: 0
    }))

    this.currentPlayerIndex = 0
    this.currentRound = 1
    this.gamePhase = GamePhase.ROLL_DICE
    this.roadblocks = []
    this.eventLog = []
    this.properties = JSON.parse(JSON.stringify(PROPERTIES))
  }

  /**
   * 取得當前行動玩家
   */
  getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex]
  }

  /**
   * 取得下一位未破產的玩家
   */
  getNextActivePlayer(): Player {
    const totalPlayers = this.players.length
    let nextIndex = (this.currentPlayerIndex + 1) % totalPlayers

    // 循環尋找下一個未破產的玩家
    while (nextIndex !== this.currentPlayerIndex) {
      if (!this.players[nextIndex].isBankrupt) {
        return this.players[nextIndex]
      }
      nextIndex = (nextIndex + 1) % totalPlayers
    }

    // 如果繞了一圈回到自己，返回自己
    return this.players[this.currentPlayerIndex]
  }

  /**
   * 依 ID 取得玩家
   * @param id - 玩家 ID
   */
  getPlayerById(id: number): Player | undefined {
    return this.players.find(p => p.id === id)
  }

  /**
   * 判斷遊戲是否結束
   * 條件：僅剩 1 位未破產玩家 或 回合數達到上限
   */
  isGameOver(): boolean {
    const MAX_ROUNDS = 50
    const activePlayers = this.players.filter(p => !p.isBankrupt)
    return activePlayers.length <= 1 || this.currentRound >= MAX_ROUNDS
  }

  /**
   * 取得勝利者
   * 規則：最後存活者 或 總資產最高者
   */
  getWinner(): Player | null {
    const activePlayers = this.players.filter(p => !p.isBankrupt)

    if (activePlayers.length === 0) return null
    if (activePlayers.length === 1) return activePlayers[0]

    // 回合上限結束時，比較總資產
    return activePlayers.reduce((richest, player) => {
      const playerAssets = this.calculateTotalAssets(player)
      const richestAssets = this.calculateTotalAssets(richest)
      return playerAssets > richestAssets ? player : richest
    })
  }

  /**
   * 計算玩家總資產
   * 包含：現金 + 存款 - 貸款 + 地產價值
   */
  private calculateTotalAssets(player: Player): number {
    const propertyValue = this.properties
      .filter(p => p.ownerId === player.id)
      .reduce((sum, prop) => {
        // 地產本身價值 + 建築投資
        const buildingInvestment = this.getBuildingInvestment(prop)
        return sum + prop.price + buildingInvestment
      }, 0)

    return player.money + player.bankDeposit - player.bankLoan + propertyValue
  }

  /**
   * 計算地產的建築投資總額
   */
  private getBuildingInvestment(property: Property): number {
    let investment = 0
    for (let level = 1; level <= property.buildingLevel; level++) {
      if (level <= 3) {
        investment += property.price * 0.5
      } else {
        investment += property.price * 1.0
      }
    }
    return investment
  }

  /**
   * 新增遊戲事件
   */
  addEvent(event: GameEvent): void {
    this.eventLog.push(event)
  }

  /**
   * 取得所有遊戲事件
   */
  getEvents(): GameEvent[] {
    return [...this.eventLog]
  }
}
