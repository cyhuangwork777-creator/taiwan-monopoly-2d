import Phaser from 'phaser'
import { type Player, type Card } from '../types'
import {
  GAME_WIDTH, GAME_HEIGHT,
  CARD_PURCHASE_PRICE, CARD_SELL_PRICE, MAX_CARDS
} from '../config/gameConfig'

/**
 * 銀行互動對話框
 * 提供存款、借款/還款、卡片商店（購買＋賣出）功能頁籤
 */

const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'
const DIALOG_W = 480
const DIALOG_H = 420          // 存款/借款頁籤高度
const CARD_DIALOG_H = 600     // 卡片商店頁籤高度
const TAB_HEIGHT = 36
const BUTTON_HEIGHT = 36
const BUTTON_RADIUS = 6
const AMOUNT_BUTTON_W = 90
const AMOUNT_BUTTON_H = 34
const CARD_ROW_H = 34         // 卡片列高度
const CARD_BTN_W = 86         // 卡片操作按鈕寬度
const CARD_BTN_H = 26         // 卡片操作按鈕高度

type TabId = 'deposit' | 'loan' | 'card'
interface TabDef { id: TabId; label: string; color: number }
const TABS: TabDef[] = [
  { id: 'deposit', label: '存款/提款', color: 0x27ae60 },
  { id: 'loan',    label: '借款/還款', color: 0xe67e22 },
  { id: 'card',    label: '卡片商店',  color: 0x8e44ad }
]
const PRESET_AMOUNTS = [1000, 3000, 5000]

export class BankDialog {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container | null = null
  private activeTab: TabId = 'deposit'
  private tabContent: Phaser.GameObjects.Container | null = null
  private currentPlayer: Player | null = null
  private availableCards: Card[] = []
  private dialogH = DIALOG_H
  private callbacks: {
    onDeposit: (amount: number) => void
    onWithdraw: (amount: number) => void
    onLoan: (amount: number) => void
    onRepay: (amount: number) => void
    onBuyCard: (card: Card) => void
    onSellCard: (cardId: string) => void
    onClose: () => void
  } | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  show(
    player: Player,
    availableCards: Card[],
    onDeposit: (amount: number) => void,
    onWithdraw: (amount: number) => void,
    onLoan: (amount: number) => void,
    onRepay: (amount: number) => void,
    onBuyCard: (card: Card) => void,
    onSellCard: (cardId: string) => void,
    onClose: () => void
  ): void {
    this.hide()

    this.currentPlayer = player
    this.availableCards = availableCards
    this.callbacks = { onDeposit, onWithdraw, onLoan, onRepay, onBuyCard, onSellCard, onClose }
    if (this.activeTab !== 'deposit' && this.activeTab !== 'loan' && this.activeTab !== 'card') {
      this.activeTab = 'deposit'
    }

    this.dialogH = this.activeTab === 'card' ? CARD_DIALOG_H : DIALOG_H

    const container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    container.setDepth(600)
    this.container = container

    const overlay = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
    overlay.setInteractive()
    container.add(overlay)

    const dialogBg = this.scene.add.graphics()
    dialogBg.fillStyle(0x1a2332, 0.97)
    dialogBg.fillRoundedRect(-DIALOG_W / 2, -this.dialogH / 2, DIALOG_W, this.dialogH, 14)
    dialogBg.lineStyle(2, 0x27ae60, 0.8)
    dialogBg.strokeRoundedRect(-DIALOG_W / 2, -this.dialogH / 2, DIALOG_W, this.dialogH, 14)
    container.add(dialogBg)

    container.add(
      this.scene.add.text(0, -this.dialogH / 2 + 24, '銀 行', {
        fontSize: '24px', color: '#27ae60', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0.5)
    )

    this.drawBalanceInfo(container, player)
    this.drawTabs(container)

    const closeBtn = this.scene.add.text(
      DIALOG_W / 2 - 20, -this.dialogH / 2 + 12, 'X',
      { fontSize: '20px', color: '#aaaaaa', fontFamily: FONT_FAMILY, fontStyle: 'bold' }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true })
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'))
    closeBtn.on('pointerout',  () => closeBtn.setColor('#aaaaaa'))
    closeBtn.on('pointerdown', () => { this.hide(); this.callbacks?.onClose() })
    container.add(closeBtn)

    this.showTabContent()
  }

  hide(): void {
    if (this.tabContent) { this.tabContent.destroy(); this.tabContent = null }
    if (this.container)  { this.container.destroy();  this.container  = null }
  }

  // ── Private ──────────────────────────────────────────────

  private drawBalanceInfo(container: Phaser.GameObjects.Container, player: Player): void {
    const infoY = -this.dialogH / 2 + 60
    const items = [
      { label: '現金', value: `$${player.money.toLocaleString()}`,       color: '#f1c40f' },
      { label: '存款', value: `$${player.bankDeposit.toLocaleString()}`, color: '#2ecc71' },
      { label: '借款', value: `$${player.bankLoan.toLocaleString()}`,    color: '#e74c3c' }
    ]
    const spacing = 150
    const startX = -(items.length - 1) * spacing / 2
    for (let i = 0; i < items.length; i++) {
      const { label, value, color } = items[i]
      const x = startX + i * spacing
      container.add(
        this.scene.add.text(x, infoY,      label, { fontSize: '12px', color: '#888888',  fontFamily: FONT_FAMILY }).setOrigin(0.5)
      )
      container.add(
        this.scene.add.text(x, infoY + 18, value, { fontSize: '16px', color, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5)
      )
    }
  }

  private drawTabs(container: Phaser.GameObjects.Container): void {
    const tabY = -this.dialogH / 2 + 105
    const tabW = DIALOG_W / TABS.length - 8
    const startX = -DIALOG_W / 2 + tabW / 2 + 8

    for (let i = 0; i < TABS.length; i++) {
      const tab = TABS[i]
      const x = startX + i * (tabW + 4)
      const isActive = tab.id === this.activeTab

      const tabBg = this.scene.add.graphics()
      tabBg.fillStyle(isActive ? tab.color : 0x2c3e50, 1)
      tabBg.fillRoundedRect(x - tabW / 2, tabY - TAB_HEIGHT / 2, tabW, TAB_HEIGHT, { tl: 6, tr: 6, bl: 0, br: 0 })
      container.add(tabBg)

      container.add(
        this.scene.add.text(x, tabY, tab.label, {
          fontSize: '13px', color: isActive ? '#ffffff' : '#aaaaaa',
          fontFamily: FONT_FAMILY, fontStyle: isActive ? 'bold' : 'normal'
        }).setOrigin(0.5)
      )

      const hitArea = this.scene.add.rectangle(x, tabY, tabW, TAB_HEIGHT, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      hitArea.on('pointerdown', () => {
        if (this.activeTab !== tab.id) {
          this.activeTab = tab.id
          const p = this.currentPlayer
          const cb = this.callbacks
          if (p && cb) {
            this.show(p, this.availableCards,
              cb.onDeposit, cb.onWithdraw, cb.onLoan, cb.onRepay,
              cb.onBuyCard, cb.onSellCard, cb.onClose)
          }
        }
      })
      container.add(hitArea)
    }
  }

  private showTabContent(): void {
    if (this.tabContent) { this.tabContent.destroy(); this.tabContent = null }
    if (!this.container || !this.currentPlayer || !this.callbacks) return

    const contentContainer = this.scene.add.container(0, 0)
    this.container.add(contentContainer)
    this.tabContent = contentContainer

    const contentY = -this.dialogH / 2 + 150

    switch (this.activeTab) {
      case 'deposit': this.drawDepositTab(contentContainer, contentY); break
      case 'loan':    this.drawLoanTab(contentContainer, contentY);    break
      case 'card':    this.drawCardTab(contentContainer, contentY);    break
    }
  }

  private drawDepositTab(container: Phaser.GameObjects.Container, startY: number): void {
    container.add(
      this.scene.add.text(0, startY, '存入銀行', {
        fontSize: '16px', color: '#2ecc71', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0.5)
    )
    this.drawAmountButtons(container, startY + 35, 0x27ae60, 0x2ecc71,
      (amount) => this.callbacks?.onDeposit(amount), this.currentPlayer?.money ?? 0)

    const divider = this.scene.add.graphics()
    divider.lineStyle(1, 0x3a3a5e, 0.6)
    divider.lineBetween(-DIALOG_W / 2 + 30, startY + 80, DIALOG_W / 2 - 30, startY + 80)
    container.add(divider)

    container.add(
      this.scene.add.text(0, startY + 100, '從銀行提款', {
        fontSize: '16px', color: '#e67e22', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0.5)
    )
    this.drawAmountButtons(container, startY + 135, 0xe67e22, 0xf39c12,
      (amount) => this.callbacks?.onWithdraw(amount), this.currentPlayer?.bankDeposit ?? 0)
  }

  private drawLoanTab(container: Phaser.GameObjects.Container, startY: number): void {
    container.add(
      this.scene.add.text(0, startY, '向銀行借款', {
        fontSize: '16px', color: '#e74c3c', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0.5)
    )
    container.add(
      this.scene.add.text(0, startY + 20, '(利率 15%，每過起點結算)', {
        fontSize: '11px', color: '#999999', fontFamily: FONT_FAMILY
      }).setOrigin(0.5)
    )
    this.drawAmountButtons(container, startY + 50, 0xc0392b, 0xe74c3c,
      (amount) => this.callbacks?.onLoan(amount))

    const divider = this.scene.add.graphics()
    divider.lineStyle(1, 0x3a3a5e, 0.6)
    divider.lineBetween(-DIALOG_W / 2 + 30, startY + 95, DIALOG_W / 2 - 30, startY + 95)
    container.add(divider)

    container.add(
      this.scene.add.text(0, startY + 115, '償還借款', {
        fontSize: '16px', color: '#2ecc71', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0.5)
    )
    this.drawAmountButtons(container, startY + 150, 0x27ae60, 0x2ecc71,
      (amount) => this.callbacks?.onRepay(amount), this.currentPlayer?.bankLoan ?? 0)
  }

  /**
   * 卡片商店頁籤（重寫）
   * 上半：5 張可購買卡片；下半：玩家手牌（可賣出）
   */
  private drawCardTab(container: Phaser.GameObjects.Container, startY: number): void {
    const player = this.currentPlayer!
    const callbacks = this.callbacks!
    const TEXT_X  = -DIALOG_W / 2 + 22
    const BTN_CX  = DIALOG_W / 2 - 22 - CARD_BTN_W / 2
    const canBuy  = player.money >= CARD_PURCHASE_PRICE && player.cards.length < MAX_CARDS

    let y = startY + 8

    // ── 可購買的卡片 ───────────────────────────────────
    container.add(
      this.scene.add.text(TEXT_X, y, `可購買的卡片（$${CARD_PURCHASE_PRICE.toLocaleString()} / 張）`, {
        fontSize: '13px', color: '#f39c12', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0, 0.5)
    )
    y += 20

    for (const card of this.availableCards) {
      this.drawCardRow(container, y, card.name, card.description, '購買', 0x8e44ad, 0x9b59b6, canBuy, () => {
        this.hide()
        callbacks.onBuyCard(card)
      })
      y += CARD_ROW_H
    }

    // ── 分隔線 ─────────────────────────────────────────
    y += 4
    const sep = this.scene.add.graphics()
    sep.lineStyle(1, 0x3a3a5e, 0.6)
    sep.lineBetween(-DIALOG_W / 2 + 20, y, DIALOG_W / 2 - 20, y)
    container.add(sep)
    y += 10

    // ── 我的卡片（手牌） ───────────────────────────────
    container.add(
      this.scene.add.text(TEXT_X, y, `我的卡片（${player.cards.length} / ${MAX_CARDS}）`, {
        fontSize: '13px', color: '#2ecc71', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0, 0.5)
    )
    y += 20

    if (player.cards.length === 0) {
      container.add(
        this.scene.add.text(0, y + 10, '尚無卡片', {
          fontSize: '13px', color: '#666666', fontFamily: FONT_FAMILY
        }).setOrigin(0.5)
      )
    } else {
      for (const card of player.cards) {
        const cardId = card.id
        this.drawCardRow(container, y, card.name, card.description,
          `賣 $${CARD_SELL_PRICE / 1000}K`, 0x1a6e35, 0x27ae60, true, () => {
            callbacks.onSellCard(cardId)
            // 賣出後留在對話框，重建以更新手牌顯示
            if (this.currentPlayer && this.callbacks) {
              const cb = this.callbacks
              this.show(this.currentPlayer, this.availableCards,
                cb.onDeposit, cb.onWithdraw, cb.onLoan, cb.onRepay,
                cb.onBuyCard, cb.onSellCard, cb.onClose)
            }
          })
        y += CARD_ROW_H
      }
    }
  }

  /**
   * 通用卡片列（名稱 + 描述 + 操作按鈕）
   */
  private drawCardRow(
    container: Phaser.GameObjects.Container,
    y: number,
    name: string,
    desc: string,
    btnLabel: string,
    btnColor: number,
    btnHoverColor: number,
    enabled: boolean,
    onPress: () => void
  ): void {
    const TEXT_X = -DIALOG_W / 2 + 26
    const BTN_CX = DIALOG_W / 2 - 22 - CARD_BTN_W / 2

    // 行背景
    const rowBg = this.scene.add.graphics()
    rowBg.fillStyle(0x1e2d3d, 0.5)
    rowBg.fillRoundedRect(-DIALOG_W / 2 + 12, y - CARD_ROW_H / 2 + 1, DIALOG_W - 24, CARD_ROW_H - 2, 4)
    container.add(rowBg)

    // 名稱
    container.add(
      this.scene.add.text(TEXT_X, y - 6, name, {
        fontSize: '13px', color: '#ffffff', fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0, 0.5)
    )

    // 描述（截斷）
    const shortDesc = desc.length > 15 ? desc.slice(0, 15) + '…' : desc
    container.add(
      this.scene.add.text(TEXT_X, y + 7, shortDesc, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: FONT_FAMILY
      }).setOrigin(0, 0.5)
    )

    // 按鈕背景
    const btnBg = this.scene.add.graphics()
    btnBg.fillStyle(enabled ? btnColor : 0x444444, 1)
    btnBg.fillRoundedRect(BTN_CX - CARD_BTN_W / 2, y - CARD_BTN_H / 2, CARD_BTN_W, CARD_BTN_H, 4)
    container.add(btnBg)

    // 按鈕文字
    container.add(
      this.scene.add.text(BTN_CX, y, btnLabel, {
        fontSize: '11px', color: enabled ? '#ffffff' : '#888888',
        fontFamily: FONT_FAMILY, fontStyle: 'bold'
      }).setOrigin(0.5)
    )

    if (!enabled) return

    // 點擊互動
    const hit = this.scene.add.rectangle(BTN_CX, y, CARD_BTN_W, CARD_BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
    hit.on('pointerover', () => {
      btnBg.clear()
      btnBg.fillStyle(btnHoverColor, 1)
      btnBg.fillRoundedRect(BTN_CX - CARD_BTN_W / 2, y - CARD_BTN_H / 2, CARD_BTN_W, CARD_BTN_H, 4)
    })
    hit.on('pointerout', () => {
      btnBg.clear()
      btnBg.fillStyle(btnColor, 1)
      btnBg.fillRoundedRect(BTN_CX - CARD_BTN_W / 2, y - CARD_BTN_H / 2, CARD_BTN_W, CARD_BTN_H, 4)
    })
    hit.on('pointerdown', onPress)
    container.add(hit)
  }

  private drawAmountButtons(
    container: Phaser.GameObjects.Container,
    y: number,
    bgColor: number,
    hoverColor: number,
    onSelect: (amount: number) => void,
    maxAmount?: number
  ): void {
    const allAmounts = [...PRESET_AMOUNTS]
    const labels = ['$1,000', '$3,000', '$5,000', '全部']
    const totalBtns = 4
    const gap = 10
    const totalW = totalBtns * AMOUNT_BUTTON_W + (totalBtns - 1) * gap
    const startX = -totalW / 2 + AMOUNT_BUTTON_W / 2

    for (let i = 0; i < totalBtns; i++) {
      const x = startX + i * (AMOUNT_BUTTON_W + gap)
      const isAll = i === 3

      const btnBg = this.scene.add.graphics()
      btnBg.fillStyle(bgColor, 1)
      btnBg.fillRoundedRect(x - AMOUNT_BUTTON_W / 2, y - AMOUNT_BUTTON_H / 2, AMOUNT_BUTTON_W, AMOUNT_BUTTON_H, BUTTON_RADIUS)
      container.add(btnBg)

      container.add(
        this.scene.add.text(x, y, labels[i], {
          fontSize: '12px', color: '#ffffff', fontFamily: FONT_FAMILY, fontStyle: 'bold'
        }).setOrigin(0.5)
      )

      const hitArea = this.scene.add.rectangle(x, y, AMOUNT_BUTTON_W, AMOUNT_BUTTON_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      hitArea.on('pointerover', () => {
        btnBg.clear(); btnBg.fillStyle(hoverColor, 1)
        btnBg.fillRoundedRect(x - AMOUNT_BUTTON_W / 2, y - AMOUNT_BUTTON_H / 2, AMOUNT_BUTTON_W, AMOUNT_BUTTON_H, BUTTON_RADIUS)
      })
      hitArea.on('pointerout', () => {
        btnBg.clear(); btnBg.fillStyle(bgColor, 1)
        btnBg.fillRoundedRect(x - AMOUNT_BUTTON_W / 2, y - AMOUNT_BUTTON_H / 2, AMOUNT_BUTTON_W, AMOUNT_BUTTON_H, BUTTON_RADIUS)
      })
      hitArea.on('pointerdown', () => {
        const amount = isAll ? (maxAmount ?? 0) : allAmounts[i]
        this.hide()
        onSelect(amount)
      })
      container.add(hitArea)
    }
  }
}
