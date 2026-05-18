import {
  type DiceResult,
  type Player,
  type BoardTile,
  GamePhase,
  TileType
} from '../types'
import {
  TOTAL_TILES,
  SALARY,
  MAX_CONSECUTIVE_DOUBLES,
  REST_TILE_ID
} from '../config/gameConfig'
import { BOARD_TILES } from '../config/boardData'
import { GameState } from './GameState'

/**
 * 回合管理類別
 * 負責擲骰、移動、著陸判定、回合流轉
 */
export class TurnManager {
  private gameState: GameState

  constructor(gameState: GameState) {
    this.gameState = gameState
  }

  /**
   * 開始回合
   * 檢查是否需要跳過，設定遊戲階段為擲骰
   * @returns true 表示回合正常開始，false 表示被跳過
   */
  startTurn(): boolean {
    const player = this.gameState.getCurrentPlayer()

    // 檢查是否跳過本回合
    if (player.skipNextTurn) {
      player.skipNextTurn = false
      this.gameState.addEvent({
        type: 'skipTurn',
        playerId: player.id,
        message: `${player.name} 因休息而跳過本回合`
      })
      this.endTurn()
      return false
    }

    // 重置遊戲階段
    this.gameState.gamePhase = GamePhase.ROLL_DICE
    return true
  }

  /**
   * 擲骰子
   * @returns 骰子結果（兩顆骰子各 1-6）
   */
  rollDice(): DiceResult {
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    const total = die1 + die2
    const isDouble = die1 === die2

    const player = this.gameState.getCurrentPlayer()

    // 追蹤連續雙數
    if (isDouble) {
      player.consecutiveDoubles++
    } else {
      player.consecutiveDoubles = 0
    }

    // 連續三次雙數 → 送往休息站
    if (player.consecutiveDoubles >= MAX_CONSECUTIVE_DOUBLES) {
      player.consecutiveDoubles = 0
      player.position = REST_TILE_ID
      player.skipNextTurn = true
      this.gameState.addEvent({
        type: 'tripleDoubles',
        playerId: player.id,
        message: `${player.name} 連續三次雙數，被送往休息站！`
      })
    }

    this.gameState.gamePhase = GamePhase.MOVING

    return { die1, die2, total, isDouble }
  }

  /**
   * 移動玩家
   * @param steps - 移動步數
   * @returns 是否經過起點
   */
  movePlayer(steps: number): boolean {
    const player = this.gameState.getCurrentPlayer()
    const oldPosition = player.position
    const newPosition = (oldPosition + steps) % TOTAL_TILES

    // 判斷是否經過或抵達起點（繞了一圈）
    const passedStart = newPosition < oldPosition && steps > 0

    // 經過起點領取薪水
    if (passedStart) {
      player.money += SALARY
      this.gameState.addEvent({
        type: 'salary',
        playerId: player.id,
        message: `${player.name} 經過起點，領取薪水 $${SALARY}`,
        data: { amount: SALARY }
      })
    }

    player.position = newPosition
    this.gameState.gamePhase = GamePhase.LANDED

    return passedStart
  }

  /**
   * 處理著陸事件
   * 根據著陸的格子類型決定後續行動
   * @returns 著陸格子的資訊
   */
  handleLanding(): BoardTile {
    const player = this.gameState.getCurrentPlayer()
    const tile = BOARD_TILES[player.position]

    // 檢查是否有路障
    const roadblock = this.gameState.roadblocks.find(r => r.tileId === player.position)
    if (roadblock) {
      player.skipNextTurn = true
      // 移除已觸發的路障
      this.gameState.roadblocks = this.gameState.roadblocks.filter(
        r => r.tileId !== player.position
      )
      this.gameState.addEvent({
        type: 'roadblock',
        playerId: player.id,
        message: `${player.name} 踩到路障，下回合無法行動！`
      })
    }

    this.gameState.gamePhase = GamePhase.ACTION

    return tile
  }

  /**
   * 結束回合
   * 切換到下一位未破產的玩家，必要時增加回合數
   */
  endTurn(): void {
    const totalPlayers = this.gameState.players.length
    const currentIndex = this.gameState.currentPlayerIndex
    let nextIndex = (currentIndex + 1) % totalPlayers

    // 尋找下一位未破產玩家
    while (nextIndex !== currentIndex) {
      if (!this.gameState.players[nextIndex].isBankrupt) {
        break
      }
      nextIndex = (nextIndex + 1) % totalPlayers
    }

    // 如果繞回第一位玩家（或更前面），回合數 +1
    if (nextIndex <= currentIndex) {
      this.gameState.currentRound++
    }

    this.gameState.currentPlayerIndex = nextIndex
    this.gameState.gamePhase = GamePhase.END_TURN
  }
}
