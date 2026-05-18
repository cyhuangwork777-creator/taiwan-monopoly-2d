import {
  type Player,
  type Property,
  type Card,
  BuildingLevel,
  PropertyTier,
  SpecialCardId
} from '../types'
import { GameState } from './GameState'
import { PropertySystem } from './PropertySystem'
import { BankSystem } from './BankSystem'
import { CardSystem } from './CardSystem'

// AI 決策結果類型
export interface AIDecision {
  action: string
  data?: Record<string, unknown>
}

/**
 * AI 控制器類別
 * 負責 AI 玩家的所有決策邏輯
 */
export class AIController {
  private gameState: GameState
  private propertySystem: PropertySystem
  private bankSystem: BankSystem
  private cardSystem: CardSystem

  constructor(
    gameState: GameState,
    propertySystem: PropertySystem,
    bankSystem: BankSystem,
    cardSystem: CardSystem
  ) {
    this.gameState = gameState
    this.propertySystem = propertySystem
    this.bankSystem = bankSystem
    this.cardSystem = cardSystem
  }

  /**
   * 決定是否購買地產
   * 策略：
   *   - 金錢 > 地價 × 2 時購買
   *   - 金錢 > 地價 × 1.2 且能湊齊全套時購買
   * @param playerId - AI 玩家 ID
   * @param propertyId - 地產 ID
   * @returns 是否購買
   */
  decidePurchase(playerId: number, propertyId: number): boolean {
    const player = this.gameState.getPlayerById(playerId)
    const property = this.gameState.properties.find(p => p.id === propertyId)

    if (!player || !property) return false
    if (property.ownerId !== null) return false

    // 計算購買後是否能湊齊全套
    const wouldCompleteSet = this.wouldCompleteFullSet(playerId, property)

    // 策略判斷
    if (player.money > property.price * 2) {
      return true
    }

    if (wouldCompleteSet && player.money > property.price * 1.2) {
      return true
    }

    return false
  }

  /**
   * 決定升級地產
   * 策略：金錢 > $8000 時升級，優先升級全套地產，從最高等級開始
   * @param playerId - AI 玩家 ID
   * @returns 要升級的地產 ID（null 表示不升級）
   */
  decideUpgrade(playerId: number): number | null {
    const player = this.gameState.getPlayerById(playerId)
    if (!player || player.money <= 8000) return null

    const ownedProperties = this.propertySystem.getPlayerProperties(playerId)
      .filter(p => p.buildingLevel < BuildingLevel.HOTEL)

    if (ownedProperties.length === 0) return null

    // 排序優先順序：全套 > 高等級
    const tierPriority: Record<PropertyTier, number> = {
      [PropertyTier.S]: 5,
      [PropertyTier.A]: 4,
      [PropertyTier.B]: 3,
      [PropertyTier.C]: 2,
      [PropertyTier.D]: 1
    }

    const sorted = [...ownedProperties].sort((a, b) => {
      const aFullSet = this.propertySystem.hasFullSet(playerId, a.tier) ? 10 : 0
      const bFullSet = this.propertySystem.hasFullSet(playerId, b.tier) ? 10 : 0
      const aTierScore = tierPriority[a.tier] + aFullSet
      const bTierScore = tierPriority[b.tier] + bFullSet
      return bTierScore - aTierScore
    })

    // 選擇第一個可升級且買得起的
    for (const prop of sorted) {
      const cost = this.propertySystem.getUpgradeCost(prop.id)
      if (cost > 0 && player.money - cost > 3000) {
        return prop.id
      }
    }

    return null
  }

  /**
   * 決定使用哪張特殊卡片
   * @param playerId - AI 玩家 ID
   * @returns 要使用的卡片及目標資料（null 表示不使用）
   */
  decideCardUse(playerId: number): { cardId: string; targetData?: Record<string, unknown> } | null {
    const player = this.gameState.getPlayerById(playerId)
    if (!player || player.cards.length === 0) return null

    const activePlayers = this.gameState.players.filter(p => !p.isBankrupt && p.id !== playerId)

    for (const card of player.cards) {
      const action = card.effect.action

      switch (action) {
        case 'equalizeMoney': {
          // 自己現金低於平均值時使用
          const averageMoney = this.getAveragePlayerMoney()
          if (player.money < averageMoney * 0.8) {
            return { cardId: card.id }
          }
          break
        }

        case 'taxAudit': {
          // 對最富有的玩家使用
          const richestPlayer = this.getRichestPlayer(activePlayers)
          if (richestPlayer) {
            return { cardId: card.id, targetData: { targetPlayerId: richestPlayer.id } }
          }
          break
        }

        case 'demolish': {
          // 拆除租金最高的對手地產
          const targetProp = this.getHighestRentOpponentProperty(playerId)
          if (targetProp) {
            return { cardId: card.id, targetData: { targetPropertyId: targetProp.id } }
          }
          break
        }

        case 'doubleRent': {
          // 當擁有高租金地產時啟用
          const highRentProps = this.propertySystem.getPlayerProperties(playerId)
            .filter(p => p.buildingLevel >= BuildingLevel.HOUSE_2)
          if (highRentProps.length > 0) {
            return { cardId: card.id }
          }
          break
        }

        case 'tollFree': {
          // 即將進入高風險區域或現金不足時使用
          if (player.money < 5000) {
            return { cardId: card.id }
          }
          break
        }

        case 'placeRoadblock': {
          // 放在對手前方高機率經過的位置
          const targetTile = this.findBestRoadblockTile(playerId)
          if (targetTile !== null) {
            return { cardId: card.id, targetData: { targetTileId: targetTile } }
          }
          break
        }

        case 'forceBuy': {
          // 當所在地產為對手的高價地產時使用（由 landing 時機判斷）
          break
        }

        case 'remoteDice': {
          // 保留到需要精確移動時使用
          break
        }
      }
    }

    return null
  }

  /**
   * 決定銀行操作
   * 策略：
   *   - 金錢 > $10000 時存款
   *   - 金錢 < $3000 且有投資機會時借款
   * @param playerId - AI 玩家 ID
   * @returns 銀行操作決策
   */
  decideBankAction(playerId: number): AIDecision | null {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return null

    // 多餘資金存入銀行
    if (player.money > 10000) {
      const depositAmount = Math.floor((player.money - 8000) / 1000) * 1000
      return { action: 'deposit', data: { amount: depositAmount } }
    }

    // 現金不足且有投資機會時借款
    if (player.money < 3000 && this.hasInvestmentOpportunity(playerId)) {
      const loanAmount = Math.min(5000, 10000 - player.bankLoan)
      if (loanAmount > 0) {
        return { action: 'takeLoan', data: { amount: loanAmount } }
      }
    }

    return null
  }

  /**
   * 主要決策入口
   * 根據當前情境返回 AI 的決策
   * @param playerId - AI 玩家 ID
   * @param context - 決策情境
   */
  makeDecision(
    playerId: number,
    context: { type: string; propertyId?: number; [key: string]: unknown }
  ): AIDecision {
    switch (context.type) {
      case 'purchase': {
        const shouldBuy = this.decidePurchase(playerId, context.propertyId ?? 0)
        return { action: shouldBuy ? 'buy' : 'pass', data: { propertyId: context.propertyId } }
      }

      case 'upgrade': {
        const upgradeTarget = this.decideUpgrade(playerId)
        if (upgradeTarget !== null) {
          return { action: 'upgrade', data: { propertyId: upgradeTarget } }
        }
        return { action: 'pass' }
      }

      case 'useCard': {
        const cardDecision = this.decideCardUse(playerId)
        if (cardDecision) {
          return { action: 'useCard', data: cardDecision }
        }
        return { action: 'pass' }
      }

      case 'bankAction': {
        const bankDecision = this.decideBankAction(playerId)
        if (bankDecision) {
          return bankDecision
        }
        return { action: 'pass' }
      }

      case 'payRent': {
        // 如果有免罰卡且租金高，使用免罰卡
        const player = this.gameState.getPlayerById(playerId)
        if (player && !player.hasTollFree) {
          const tollFreeCard = player.cards.find(c => c.effect.action === 'tollFree')
          if (tollFreeCard && (context.rentAmount as number) > 2000) {
            return { action: 'useTollFree', data: { cardId: tollFreeCard.id } }
          }
        }
        return { action: 'pay' }
      }

      default:
        return { action: 'pass' }
    }
  }

  // ==================== 輔助方法 ====================

  /** 判斷購買後是否能湊齊全套 */
  private wouldCompleteFullSet(playerId: number, property: Property): boolean {
    const sameTierProps = this.gameState.properties.filter(p => p.tier === property.tier)
    const ownedCount = sameTierProps.filter(p => p.ownerId === playerId).length
    // 加上即將購買的這塊，是否等於 4
    return ownedCount + 1 === 4
  }

  /** 取得所有玩家平均現金 */
  private getAveragePlayerMoney(): number {
    const activePlayers = this.gameState.players.filter(p => !p.isBankrupt)
    if (activePlayers.length === 0) return 0
    const total = activePlayers.reduce((sum, p) => sum + p.money, 0)
    return total / activePlayers.length
  }

  /** 取得最富有的玩家 */
  private getRichestPlayer(players: Player[]): Player | null {
    if (players.length === 0) return null
    return players.reduce((richest, player) => {
      return player.money > richest.money ? player : richest
    })
  }

  /** 取得對手租金最高的地產 */
  private getHighestRentOpponentProperty(playerId: number): Property | null {
    const opponentProperties = this.gameState.properties.filter(
      p => p.ownerId !== null && p.ownerId !== playerId && p.buildingLevel > BuildingLevel.EMPTY
    )

    if (opponentProperties.length === 0) return null

    return opponentProperties.reduce((highest, prop) => {
      const propRent = this.propertySystem.calculateRent(prop.id)
      const highestRent = this.propertySystem.calculateRent(highest.id)
      return propRent > highestRent ? prop : highest
    })
  }

  /** 尋找最佳路障放置位置（對手前方 4-8 格） */
  private findBestRoadblockTile(playerId: number): number | null {
    const opponents = this.gameState.players.filter(
      p => !p.isBankrupt && p.id !== playerId
    )

    if (opponents.length === 0) return null

    // 找對手前方 7 格的位置（平均骰子結果）
    const targetPositions = opponents.map(p => (p.position + 7) % 32)

    // 選擇第一個有效的目標位置
    for (const pos of targetPositions) {
      // 避免在起點或銀行格放路障
      if (pos !== 0 && pos !== 6 && pos !== 18 && pos !== 24) {
        return pos
      }
    }

    return null
  }

  /** 判斷是否有投資機會（附近有可購買或可升級的地產） */
  private hasInvestmentOpportunity(playerId: number): boolean {
    // 檢查是否有可升級的地產
    const ownedUpgradeable = this.gameState.properties.filter(
      p => p.ownerId === playerId && p.buildingLevel < BuildingLevel.HOTEL
    )

    if (ownedUpgradeable.length > 0) return true

    // 檢查是否有可購買的空地
    const availableProperties = this.gameState.properties.filter(p => p.ownerId === null)
    return availableProperties.length > 0
  }
}
