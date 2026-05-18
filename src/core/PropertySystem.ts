import {
  type Property,
  type Player,
  PropertyTier,
  BuildingLevel
} from '../types'
import {
  BUILDING_COST_RATIO,
  HOTEL_COST_RATIO,
  SELL_RATIO,
  FULL_SET_BONUS,
  RENT_MULTIPLIERS,
  PROPERTIES_PER_TIER
} from '../config/gameConfig'
import { GameState } from './GameState'

/**
 * 地產系統類別
 * 負責購買、升級、計算租金、出售等地產操作
 */
export class PropertySystem {
  private gameState: GameState

  constructor(gameState: GameState) {
    this.gameState = gameState
  }

  /**
   * 購買地產
   * @param playerId - 購買者 ID
   * @param propertyId - 地產 ID
   * @returns 是否購買成功
   */
  buyProperty(playerId: number, propertyId: number): boolean {
    const player = this.gameState.getPlayerById(playerId)
    const property = this.gameState.properties.find(p => p.id === propertyId)

    if (!player || !property) return false
    if (property.ownerId !== null) return false
    if (player.money < property.price) return false

    // 扣款並設定擁有者
    player.money -= property.price
    property.ownerId = playerId
    player.properties.push(propertyId)

    this.gameState.addEvent({
      type: 'buyProperty',
      playerId,
      message: `${player.name} 購買了 ${property.name}，花費 $${property.price}`,
      data: { propertyId, price: property.price }
    })

    return true
  }

  /**
   * 升級地產（蓋房子 / 旅館）
   * @param propertyId - 地產 ID
   * @returns 是否升級成功
   */
  upgradeProperty(propertyId: number): boolean {
    const property = this.gameState.properties.find(p => p.id === propertyId)
    if (!property || property.ownerId === null) return false
    if (property.buildingLevel >= BuildingLevel.HOTEL) return false

    const player = this.gameState.getPlayerById(property.ownerId)
    if (!player) return false

    const cost = this.getUpgradeCost(propertyId)
    if (player.money < cost) return false

    // 扣款並升級
    player.money -= cost
    property.buildingLevel++

    const levelName = property.buildingLevel === BuildingLevel.HOTEL ? '旅館' : `${property.buildingLevel} 棟房子`
    this.gameState.addEvent({
      type: 'upgradeProperty',
      playerId: property.ownerId,
      message: `${player.name} 在 ${property.name} 升級至 ${levelName}，花費 $${cost}`,
      data: { propertyId, level: property.buildingLevel, cost }
    })

    return true
  }

  /**
   * 計算租金（過路費）
   * @param propertyId - 地產 ID
   * @returns 租金金額
   */
  calculateRent(propertyId: number): number {
    const property = this.gameState.properties.find(p => p.id === propertyId)
    if (!property || property.ownerId === null) return 0

    // 基礎租金 × 建築等級倍率
    const multiplier = RENT_MULTIPLIERS[property.buildingLevel] ?? 1
    let rent = property.baseRent * multiplier

    // 同等級全套加成
    if (this.hasFullSet(property.ownerId, property.tier)) {
      rent = Math.floor(rent * FULL_SET_BONUS)
    }

    return rent
  }

  /**
   * 出售地產
   * @param playerId - 出售者 ID
   * @param propertyId - 地產 ID
   * @returns 是否出售成功
   */
  sellProperty(playerId: number, propertyId: number): boolean {
    const player = this.gameState.getPlayerById(playerId)
    const property = this.gameState.properties.find(p => p.id === propertyId)

    if (!player || !property) return false
    if (property.ownerId !== playerId) return false

    // 計算回收金額：(地價 + 建築投資) × 50%
    const buildingInvestment = this.getBuildingInvestment(property)
    const sellPrice = Math.floor((property.price + buildingInvestment) * SELL_RATIO)

    // 歸還金錢並重設地產
    player.money += sellPrice
    property.ownerId = null
    property.buildingLevel = BuildingLevel.EMPTY
    player.properties = player.properties.filter(id => id !== propertyId)

    this.gameState.addEvent({
      type: 'sellProperty',
      playerId,
      message: `${player.name} 出售了 ${property.name}，獲得 $${sellPrice}`,
      data: { propertyId, sellPrice }
    })

    return true
  }

  /**
   * 取得玩家擁有的所有地產
   * @param playerId - 玩家 ID
   */
  getPlayerProperties(playerId: number): Property[] {
    return this.gameState.properties.filter(p => p.ownerId === playerId)
  }

  /**
   * 檢查玩家是否擁有某等級的全部地產
   * @param playerId - 玩家 ID
   * @param tier - 地產等級
   */
  hasFullSet(playerId: number, tier: PropertyTier): boolean {
    const tierProperties = this.gameState.properties.filter(p => p.tier === tier)
    const ownedCount = tierProperties.filter(p => p.ownerId === playerId).length
    return ownedCount === PROPERTIES_PER_TIER
  }

  /**
   * 計算升級費用
   * @param propertyId - 地產 ID
   * @returns 升級費用（無法升級時返回 0）
   */
  getUpgradeCost(propertyId: number): number {
    const property = this.gameState.properties.find(p => p.id === propertyId)
    if (!property) return 0
    if (property.buildingLevel >= BuildingLevel.HOTEL) return 0

    // 升到旅館的費用 = 地價 × 100%；其餘 = 地價 × 50%
    if (property.buildingLevel === BuildingLevel.HOUSE_3) {
      return Math.floor(property.price * HOTEL_COST_RATIO)
    }
    return Math.floor(property.price * BUILDING_COST_RATIO)
  }

  /**
   * 計算地產的建築投資總額（內部輔助）
   */
  private getBuildingInvestment(property: Property): number {
    let investment = 0
    for (let level = 1; level <= property.buildingLevel; level++) {
      if (level <= 3) {
        investment += property.price * BUILDING_COST_RATIO
      } else {
        investment += property.price * HOTEL_COST_RATIO
      }
    }
    return investment
  }
}
