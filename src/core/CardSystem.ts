import {
  type Card,
  type Player,
  type Property,
  CardType,
  BuildingLevel
} from '../types'
import {
  MAX_CARDS,
  TOTAL_TILES,
  SALARY,
  REST_TILE_ID,
  TAX_RATE
} from '../config/gameConfig'
import { CHANCE_CARDS, FATE_CARDS, SPECIAL_CARDS } from '../config/cardData'
import { BOARD_TILES } from '../config/boardData'
import { GameState } from './GameState'
import { PropertySystem } from './PropertySystem'

/**
 * 卡片系統類別
 * 負責抽卡、執行卡片效果、使用特殊卡片
 */
export class CardSystem {
  private gameState: GameState
  private propertySystem: PropertySystem

  constructor(gameState: GameState, propertySystem: PropertySystem) {
    this.gameState = gameState
    this.propertySystem = propertySystem
  }

  /**
   * 抽機會卡
   * @returns 隨機一張機會卡
   */
  drawChanceCard(): Card {
    const index = Math.floor(Math.random() * CHANCE_CARDS.length)
    return { ...CHANCE_CARDS[index] }
  }

  /**
   * 抽命運卡
   * @returns 隨機一張命運卡
   */
  drawFateCard(): Card {
    const index = Math.floor(Math.random() * FATE_CARDS.length)
    return { ...FATE_CARDS[index] }
  }

  /**
   * 執行卡片效果
   * @param playerId - 受影響的玩家 ID
   * @param card - 要執行的卡片
   */
  executeCardEffect(playerId: number, card: Card): void {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return

    const { action, value, targetTile } = card.effect

    switch (action) {
      case 'gainMoney':
        this.effectGainMoney(player, value ?? 0)
        break
      case 'loseMoney':
        this.effectLoseMoney(player, value ?? 0)
        break
      case 'moveToTile':
        this.effectMoveToTile(player, targetTile ?? 0)
        break
      case 'teleportToTile':
        this.effectTeleportToTile(player, targetTile ?? 0)
        break
      case 'moveForward':
        this.effectMoveForward(player, value ?? 0)
        break
      case 'moveBackward':
        this.effectMoveBackward(player, value ?? 0)
        break
      case 'collectFromAll':
        this.effectCollectFromAll(player, value ?? 0)
        break
      case 'gainRandomCard':
        this.effectGainRandomCard(player)
        break
      case 'freeUpgrade':
        this.effectFreeUpgrade(player)
        break
      case 'shuffleMoney':
        this.effectShuffleMoney()
        break
      case 'repairCost':
        this.effectRepairCost(player)
        break
      case 'sendToRest':
        this.effectSendToRest(player)
        break
      case 'downgradeRandom':
        this.effectDowngradeRandom(player)
        break
      case 'payTaxPercent':
        this.effectPayTaxPercent(player, value ?? 0)
        break
      case 'moveToNearest':
        this.effectMoveToNearest(player)
        break
    }
  }

  /**
   * 使用特殊卡片
   * @param playerId - 使用者 ID
   * @param cardId - 卡片 ID
   * @param targetData - 目標資料（對象玩家 ID、目標地產 ID、骰子值等）
   * @returns 是否成功使用
   */
  useSpecialCard(
    playerId: number,
    cardId: string,
    targetData?: { targetPlayerId?: number; targetPropertyId?: number; diceValue?: number; targetTileId?: number }
  ): boolean {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return false

    const cardIndex = player.cards.findIndex(c => c.id === cardId)
    if (cardIndex === -1) return false

    const card = player.cards[cardIndex]
    const action = card.effect.action

    let success = false

    switch (action) {
      case 'equalizeMoney':
        success = this.specialEqualizeMoney()
        break
      case 'taxAudit':
        success = this.specialTaxAudit(targetData?.targetPlayerId)
        break
      case 'tollFree':
        player.hasTollFree = true
        success = true
        this.gameState.addEvent({
          type: 'useCard',
          playerId,
          message: `${player.name} 啟用了「免罰卡」`
        })
        break
      case 'forceBuy':
        success = this.specialForceBuy(player)
        break
      case 'demolish':
        success = this.specialDemolish(targetData?.targetPropertyId)
        break
      case 'doubleRent':
        player.hasDoubleToll = true
        success = true
        this.gameState.addEvent({
          type: 'useCard',
          playerId,
          message: `${player.name} 啟用了「翻倍卡」`
        })
        break
      case 'remoteDice':
        // 遙控骰子由 UI 層處理，這裡只標記為已使用
        success = true
        this.gameState.addEvent({
          type: 'useCard',
          playerId,
          message: `${player.name} 使用了「遙控骰子」`,
          data: { diceValue: targetData?.diceValue }
        })
        break
      case 'placeRoadblock':
        success = this.specialPlaceRoadblock(playerId, targetData?.targetTileId)
        break
    }

    // 移除已使用的卡片
    if (success) {
      player.cards.splice(cardIndex, 1)
    }

    return success
  }

  /**
   * 新增卡片到玩家手中
   * @param playerId - 玩家 ID
   * @param card - 卡片
   * @returns 是否成功加入（未超過上限）
   */
  addCardToPlayer(playerId: number, card: Card): boolean {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return false
    if (player.cards.length >= MAX_CARDS) return false

    // 給予唯一 ID
    const uniqueCard: Card = {
      ...card,
      id: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    }
    player.cards.push(uniqueCard)
    return true
  }

  /**
   * 從玩家手中移除卡片
   * @param playerId - 玩家 ID
   * @param cardId - 卡片 ID
   * @returns 是否成功移除
   */
  removeCardFromPlayer(playerId: number, cardId: string): boolean {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return false

    const index = player.cards.findIndex(c => c.id === cardId)
    if (index === -1) return false

    player.cards.splice(index, 1)
    return true
  }

  // ==================== 卡片效果實作 ====================

  /** 獲得金錢 */
  private effectGainMoney(player: Player, amount: number): void {
    player.money += amount
    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 獲得 $${amount}`,
      data: { action: 'gainMoney', amount }
    })
  }

  /** 損失金錢 */
  private effectLoseMoney(player: Player, amount: number): void {
    player.money = Math.max(0, player.money - amount)
    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 損失 $${amount}`,
      data: { action: 'loseMoney', amount }
    })
  }

  /** 移動到指定格子（經過起點領薪水） */
  private effectMoveToTile(player: Player, targetTile: number): void {
    const oldPosition = player.position
    player.position = targetTile

    // 如果目標位置在前方（數值上比目前小，代表繞過起點）
    if (targetTile <= oldPosition && targetTile !== oldPosition) {
      player.money += SALARY
      this.gameState.addEvent({
        type: 'salary',
        playerId: player.id,
        message: `${player.name} 經過起點，領取薪水 $${SALARY}`
      })
    }

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 移動到第 ${targetTile} 格`,
      data: { action: 'moveToTile', targetTile }
    })
  }

  /** 傳送到指定格子（不領薪水） */
  private effectTeleportToTile(player: Player, targetTile: number): void {
    player.position = targetTile
    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 被傳送到第 ${targetTile} 格`,
      data: { action: 'teleportToTile', targetTile }
    })
  }

  /** 向前移動 */
  private effectMoveForward(player: Player, steps: number): void {
    const oldPosition = player.position
    const newPosition = (oldPosition + steps) % TOTAL_TILES

    // 判斷是否經過起點
    if (newPosition < oldPosition) {
      player.money += SALARY
      this.gameState.addEvent({
        type: 'salary',
        playerId: player.id,
        message: `${player.name} 經過起點，領取薪水 $${SALARY}`
      })
    }

    player.position = newPosition
    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 向前移動 ${steps} 步`,
      data: { action: 'moveForward', steps }
    })
  }

  /** 向後移動 */
  private effectMoveBackward(player: Player, steps: number): void {
    const newPosition = (player.position - steps + TOTAL_TILES) % TOTAL_TILES
    player.position = newPosition
    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 後退 ${steps} 步`,
      data: { action: 'moveBackward', steps }
    })
  }

  /** 向所有其他玩家收錢 */
  private effectCollectFromAll(player: Player, amount: number): void {
    const otherPlayers = this.gameState.players.filter(
      p => p.id !== player.id && !p.isBankrupt
    )

    let totalCollected = 0
    for (const other of otherPlayers) {
      const paid = Math.min(amount, other.money)
      other.money -= paid
      totalCollected += paid
    }

    player.money += totalCollected
    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 從每位玩家收取 $${amount}，共得 $${totalCollected}`,
      data: { action: 'collectFromAll', totalCollected }
    })
  }

  /** 隨機獲得特殊卡片 */
  private effectGainRandomCard(player: Player): void {
    if (player.cards.length >= MAX_CARDS) {
      this.gameState.addEvent({
        type: 'cardEffect',
        playerId: player.id,
        message: `${player.name} 手牌已滿，無法獲得新卡片`
      })
      return
    }

    const randomIndex = Math.floor(Math.random() * SPECIAL_CARDS.length)
    const card: Card = {
      ...SPECIAL_CARDS[randomIndex],
      id: `${SPECIAL_CARDS[randomIndex].id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    }
    player.cards.push(card)

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 獲得了「${card.name}」`,
      data: { action: 'gainRandomCard', cardName: card.name }
    })
  }

  /** 免費升級第一處可升級的地產 */
  private effectFreeUpgrade(player: Player): void {
    const ownedProperties = this.gameState.properties.filter(
      p => p.ownerId === player.id && p.buildingLevel < BuildingLevel.HOTEL
    )

    if (ownedProperties.length === 0) {
      this.gameState.addEvent({
        type: 'cardEffect',
        playerId: player.id,
        message: `${player.name} 沒有可升級的地產`
      })
      return
    }

    // 選擇第一處可升級的地產
    const target = ownedProperties[0]
    target.buildingLevel++

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 免費升級了 ${target.name}`,
      data: { action: 'freeUpgrade', propertyId: target.id }
    })
  }

  /** 金錢洗牌：所有玩家現金隨機重新分配 */
  private effectShuffleMoney(): void {
    const activePlayers = this.gameState.players.filter(p => !p.isBankrupt)
    const totalMoney = activePlayers.reduce((sum, p) => sum + p.money, 0)

    // 隨機分配（使用隨機切割法）
    const portions: number[] = []
    let remaining = totalMoney

    for (let i = 0; i < activePlayers.length - 1; i++) {
      const portion = Math.floor(Math.random() * remaining)
      portions.push(portion)
      remaining -= portion
    }
    portions.push(remaining)

    // 打亂分配順序
    for (let i = portions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [portions[i], portions[j]] = [portions[j], portions[i]]
    }

    activePlayers.forEach((player, index) => {
      player.money = portions[index]
    })

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: activePlayers[0]?.id ?? 0,
      message: `所有玩家的現金已重新隨機分配！`,
      data: { action: 'shuffleMoney' }
    })
  }

  /** 房屋維修費：每棟房子 $200、每座旅館 $500 */
  private effectRepairCost(player: Player): void {
    const ownedProperties = this.gameState.properties.filter(p => p.ownerId === player.id)

    let totalCost = 0
    for (const prop of ownedProperties) {
      if (prop.buildingLevel === BuildingLevel.HOTEL) {
        totalCost += 500
      } else if (prop.buildingLevel > BuildingLevel.EMPTY) {
        totalCost += 200 * prop.buildingLevel
      }
    }

    player.money = Math.max(0, player.money - totalCost)

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 支付維修費 $${totalCost}`,
      data: { action: 'repairCost', totalCost }
    })
  }

  /** 送往休息站並跳過下回合 */
  private effectSendToRest(player: Player): void {
    player.position = REST_TILE_ID
    player.skipNextTurn = true

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 被送往休息站，須休息一回合`,
      data: { action: 'sendToRest' }
    })
  }

  /** 隨機自有地產降級一層 */
  private effectDowngradeRandom(player: Player): void {
    const upgradedProperties = this.gameState.properties.filter(
      p => p.ownerId === player.id && p.buildingLevel > BuildingLevel.EMPTY
    )

    if (upgradedProperties.length === 0) {
      this.gameState.addEvent({
        type: 'cardEffect',
        playerId: player.id,
        message: `${player.name} 沒有可降級的地產`
      })
      return
    }

    const randomIndex = Math.floor(Math.random() * upgradedProperties.length)
    const target = upgradedProperties[randomIndex]
    target.buildingLevel--

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 的 ${target.name} 被降級一層`,
      data: { action: 'downgradeRandom', propertyId: target.id }
    })
  }

  /** 繳交總資產百分比的稅 */
  private effectPayTaxPercent(player: Player, percent: number): void {
    const totalAssets = this.calculatePlayerTotalAssets(player)
    const tax = Math.floor(totalAssets * (percent / 100))
    player.money = Math.max(0, player.money - tax)

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 繳交 ${percent}% 資產稅 $${tax}`,
      data: { action: 'payTaxPercent', tax, percent }
    })
  }

  /** 移動到最近的銀行格子（id 6 或 18） */
  private effectMoveToNearest(player: Player): void {
    const bankTiles = [6, 18]
    const currentPos = player.position

    // 找到向前走最近的銀行格子
    let nearestBank = bankTiles[0]
    let minDistance = TOTAL_TILES

    for (const bankTile of bankTiles) {
      const distance = (bankTile - currentPos + TOTAL_TILES) % TOTAL_TILES
      if (distance > 0 && distance < minDistance) {
        minDistance = distance
        nearestBank = bankTile
      }
    }

    // 判斷是否經過起點
    const oldPosition = player.position
    if (nearestBank < oldPosition) {
      player.money += SALARY
      this.gameState.addEvent({
        type: 'salary',
        playerId: player.id,
        message: `${player.name} 經過起點，領取薪水 $${SALARY}`
      })
    }

    player.position = nearestBank

    this.gameState.addEvent({
      type: 'cardEffect',
      playerId: player.id,
      message: `${player.name} 前往最近的銀行（第 ${nearestBank} 格）`,
      data: { action: 'moveToNearest', targetTile: nearestBank }
    })
  }

  // ==================== 特殊卡片效果 ====================

  /** 均貧卡：所有玩家現金平均分配 */
  private specialEqualizeMoney(): boolean {
    const activePlayers = this.gameState.players.filter(p => !p.isBankrupt)
    const totalMoney = activePlayers.reduce((sum, p) => sum + p.money, 0)
    const equalShare = Math.floor(totalMoney / activePlayers.length)

    // 整除後的餘數分配給第一位玩家
    const remainder = totalMoney - equalShare * activePlayers.length

    activePlayers.forEach((player, index) => {
      player.money = equalShare + (index === 0 ? remainder : 0)
    })

    this.gameState.addEvent({
      type: 'useCard',
      playerId: activePlayers[0]?.id ?? 0,
      message: `均貧卡生效！所有玩家現金重新平均分配（每人 $${equalShare}）`,
      data: { equalShare }
    })

    return true
  }

  /** 查稅卡：指定玩家繳交總資產 10% */
  private specialTaxAudit(targetPlayerId?: number): boolean {
    if (targetPlayerId === undefined) return false

    const target = this.gameState.getPlayerById(targetPlayerId)
    if (!target || target.isBankrupt) return false

    const totalAssets = this.calculatePlayerTotalAssets(target)
    const tax = Math.floor(totalAssets * TAX_RATE)
    target.money = Math.max(0, target.money - tax)

    this.gameState.addEvent({
      type: 'useCard',
      playerId: targetPlayerId,
      message: `${target.name} 被查稅，繳交 $${tax}（總資產 10%）`,
      data: { tax, targetPlayerId }
    })

    return true
  }

  /** 購地卡：強制購買當前所在的他人地產 */
  private specialForceBuy(player: Player): boolean {
    const tile = BOARD_TILES[player.position]

    if (!tile || tile.propertyId === undefined) return false

    const property = this.gameState.properties.find(p => p.id === tile.propertyId)
    if (!property || property.ownerId === null || property.ownerId === player.id) return false

    const previousOwner = this.gameState.getPlayerById(property.ownerId)
    if (!previousOwner) return false

    // 以原價購買
    if (player.money < property.price) return false

    player.money -= property.price
    previousOwner.money += property.price

    // 移轉所有權
    previousOwner.properties = previousOwner.properties.filter(id => id !== property.id)
    property.ownerId = player.id
    player.properties.push(property.id)

    this.gameState.addEvent({
      type: 'useCard',
      playerId: player.id,
      message: `${player.name} 使用購地卡強制購買了 ${property.name}！`,
      data: { propertyId: property.id, price: property.price }
    })

    return true
  }

  /** 拆除卡：目標地產降級一層 */
  private specialDemolish(targetPropertyId?: number): boolean {
    if (targetPropertyId === undefined) return false

    const property = this.gameState.properties.find(p => p.id === targetPropertyId)
    if (!property || property.buildingLevel <= BuildingLevel.EMPTY) return false

    property.buildingLevel--

    this.gameState.addEvent({
      type: 'useCard',
      playerId: property.ownerId ?? 0,
      message: `${property.name} 被拆除一層建築！`,
      data: { propertyId: targetPropertyId, newLevel: property.buildingLevel }
    })

    return true
  }

  /** 路障卡：在指定格子放置路障 */
  private specialPlaceRoadblock(playerId: number, targetTileId?: number): boolean {
    if (targetTileId === undefined) return false
    if (targetTileId < 0 || targetTileId >= TOTAL_TILES) return false

    this.gameState.roadblocks.push({
      tileId: targetTileId,
      placedBy: playerId
    })

    const player = this.gameState.getPlayerById(playerId)
    this.gameState.addEvent({
      type: 'useCard',
      playerId,
      message: `${player?.name} 在第 ${targetTileId} 格放置了路障`,
      data: { targetTileId }
    })

    return true
  }

  // ==================== 輔助方法 ====================

  /** 計算玩家總資產（現金 + 存款 + 地產價值） */
  private calculatePlayerTotalAssets(player: Player): number {
    const propertyValue = this.gameState.properties
      .filter(p => p.ownerId === player.id)
      .reduce((sum, prop) => sum + prop.price, 0)

    return player.money + player.bankDeposit + propertyValue
  }
}
