import { type Card, CardType } from '../types'
import {
  MAX_LOAN,
  DEPOSIT_INTEREST,
  LOAN_INTEREST,
  CARD_PURCHASE_PRICE,
  MAX_CARDS
} from '../config/gameConfig'
import { SPECIAL_CARDS } from '../config/cardData'
import { GameState } from './GameState'

/**
 * 銀行系統類別
 * 負責存款、提款、貸款、利息計算、購買卡片
 */
export class BankSystem {
  private gameState: GameState

  constructor(gameState: GameState) {
    this.gameState = gameState
  }

  /**
   * 存款
   * @param playerId - 玩家 ID
   * @param amount - 存入金額
   * @returns 是否成功
   */
  deposit(playerId: number, amount: number): boolean {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return false
    if (amount <= 0 || player.money < amount) return false

    player.money -= amount
    player.bankDeposit += amount

    this.gameState.addEvent({
      type: 'deposit',
      playerId,
      message: `${player.name} 存入 $${amount}（存款餘額 $${player.bankDeposit}）`,
      data: { amount, totalDeposit: player.bankDeposit }
    })

    return true
  }

  /**
   * 提款
   * @param playerId - 玩家 ID
   * @param amount - 提領金額
   * @returns 是否成功
   */
  withdraw(playerId: number, amount: number): boolean {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return false
    if (amount <= 0 || player.bankDeposit < amount) return false

    player.bankDeposit -= amount
    player.money += amount

    this.gameState.addEvent({
      type: 'withdraw',
      playerId,
      message: `${player.name} 提領 $${amount}（存款餘額 $${player.bankDeposit}）`,
      data: { amount, totalDeposit: player.bankDeposit }
    })

    return true
  }

  /**
   * 借款
   * @param playerId - 玩家 ID
   * @param amount - 借款金額
   * @returns 是否成功（不能超過最大貸款額）
   */
  takeLoan(playerId: number, amount: number): boolean {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return false
    if (amount <= 0) return false
    if (player.bankLoan + amount > MAX_LOAN) return false

    player.bankLoan += amount
    player.money += amount

    this.gameState.addEvent({
      type: 'takeLoan',
      playerId,
      message: `${player.name} 借款 $${amount}（貸款總額 $${player.bankLoan}）`,
      data: { amount, totalLoan: player.bankLoan }
    })

    return true
  }

  /**
   * 還款
   * @param playerId - 玩家 ID
   * @param amount - 還款金額
   * @returns 是否成功
   */
  repayLoan(playerId: number, amount: number): boolean {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return false
    if (amount <= 0 || player.money < amount) return false

    // 不能還超過貸款總額
    const actualRepay = Math.min(amount, player.bankLoan)
    player.money -= actualRepay
    player.bankLoan -= actualRepay

    this.gameState.addEvent({
      type: 'repayLoan',
      playerId,
      message: `${player.name} 還款 $${actualRepay}（貸款餘額 $${player.bankLoan}）`,
      data: { amount: actualRepay, totalLoan: player.bankLoan }
    })

    return true
  }

  /**
   * 處理利息（經過起點時觸發）
   * 存款利率 10%、貸款利率 15%
   * @param playerId - 玩家 ID
   */
  processInterest(playerId: number): void {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return

    // 存款利息（增加存款）
    if (player.bankDeposit > 0) {
      const depositInterest = Math.floor(player.bankDeposit * DEPOSIT_INTEREST)
      player.bankDeposit += depositInterest
      this.gameState.addEvent({
        type: 'depositInterest',
        playerId,
        message: `${player.name} 獲得存款利息 $${depositInterest}`,
        data: { interest: depositInterest, totalDeposit: player.bankDeposit }
      })
    }

    // 貸款利息（增加貸款）
    if (player.bankLoan > 0) {
      const loanInterest = Math.floor(player.bankLoan * LOAN_INTEREST)
      player.bankLoan += loanInterest
      this.gameState.addEvent({
        type: 'loanInterest',
        playerId,
        message: `${player.name} 被追加貸款利息 $${loanInterest}`,
        data: { interest: loanInterest, totalLoan: player.bankLoan }
      })
    }
  }

  /**
   * 購買隨機特殊卡片
   * @param playerId - 玩家 ID
   * @returns 購得的卡片（失敗返回 null）
   */
  purchaseRandomCard(playerId: number): Card | null {
    const player = this.gameState.getPlayerById(playerId)
    if (!player) return null
    if (player.money < CARD_PURCHASE_PRICE) return null
    if (player.cards.length >= MAX_CARDS) return null

    // 扣款
    player.money -= CARD_PURCHASE_PRICE

    // 隨機選一張特殊卡片（深拷貝）
    const randomIndex = Math.floor(Math.random() * SPECIAL_CARDS.length)
    const card: Card = JSON.parse(JSON.stringify(SPECIAL_CARDS[randomIndex]))

    // 給卡片一個唯一 ID（加上時間戳避免重複）
    card.id = `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    player.cards.push(card)

    this.gameState.addEvent({
      type: 'purchaseCard',
      playerId,
      message: `${player.name} 花費 $${CARD_PURCHASE_PRICE} 購買了「${card.name}」`,
      data: { cardId: card.id, cardName: card.name }
    })

    return card
  }
}
