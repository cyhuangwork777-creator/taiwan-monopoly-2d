import Phaser from 'phaser'
import { type Player } from '../types'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'

/**
 * 銀行互動對話框
 * 提供存款、借款/還款、購買卡片等功能頁籤
 */

// UI 常數
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'
const DIALOG_W = 480           // 對話框寬度
const DIALOG_H = 420           // 對話框高度
const TAB_HEIGHT = 36          // 頁籤高度
const BUTTON_HEIGHT = 36       // 按鈕高度
const BUTTON_RADIUS = 6        // 按鈕圓角
const AMOUNT_BUTTON_W = 90     // 金額按鈕寬度
const AMOUNT_BUTTON_H = 34     // 金額按鈕高度

// 頁籤定義
type TabId = 'deposit' | 'loan' | 'card'
interface TabDef {
  id: TabId
  label: string
  color: number
}

const TABS: TabDef[] = [
  { id: 'deposit', label: '存款/提款', color: 0x27ae60 },
  { id: 'loan', label: '借款/還款', color: 0xe67e22 },
  { id: 'card', label: '購買卡片', color: 0x8e44ad }
]

// 預設金額選項
const PRESET_AMOUNTS = [1000, 3000, 5000]

export class BankDialog {
  private scene: Phaser.Scene
  /** 整體容器 */
  private container: Phaser.GameObjects.Container | null = null
  /** 目前選中的頁籤 */
  private activeTab: TabId = 'deposit'
  /** 頁籤內容容器（切換時銷毀重建） */
  private tabContent: Phaser.GameObjects.Container | null = null
  /** 回呼函式暫存 */
  private callbacks: {
    onDeposit: (amount: number) => void
    onWithdraw: (amount: number) => void
    onLoan: (amount: number) => void
    onRepay: (amount: number) => void
    onBuyCard: () => void
    onClose: () => void
  } | null = null
  /** 目前顯示的玩家資料 */
  private currentPlayer: Player | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * 顯示銀行對話框
   */
  show(
    player: Player,
    onDeposit: (amount: number) => void,
    onWithdraw: (amount: number) => void,
    onLoan: (amount: number) => void,
    onRepay: (amount: number) => void,
    onBuyCard: () => void,
    onClose: () => void
  ): void {
    this.hide()

    this.currentPlayer = player
    this.callbacks = { onDeposit, onWithdraw, onLoan, onRepay, onBuyCard, onClose }
    this.activeTab = 'deposit'

    const container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    container.setDepth(600)
    this.container = container

    // 全螢幕遮罩
    const overlay = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
    overlay.setInteractive()
    container.add(overlay)

    // 對話框背景
    const dialogBg = this.scene.add.graphics()
    dialogBg.fillStyle(0x1a2332, 0.97)
    dialogBg.fillRoundedRect(-DIALOG_W / 2, -DIALOG_H / 2, DIALOG_W, DIALOG_H, 14)
    dialogBg.lineStyle(2, 0x27ae60, 0.8)
    dialogBg.strokeRoundedRect(-DIALOG_W / 2, -DIALOG_H / 2, DIALOG_W, DIALOG_H, 14)
    container.add(dialogBg)

    // 標題
    const titleText = this.scene.add.text(0, -DIALOG_H / 2 + 24, '銀 行', {
      fontSize: '24px',
      color: '#27ae60',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(titleText)

    // 玩家資產摘要
    this.drawBalanceInfo(container, player)

    // 頁籤按鈕
    this.drawTabs(container)

    // 關閉按鈕
    const closeBtn = this.scene.add.text(
      DIALOG_W / 2 - 20, -DIALOG_H / 2 + 12, 'X',
      {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true })

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'))
    closeBtn.on('pointerout', () => closeBtn.setColor('#aaaaaa'))
    closeBtn.on('pointerdown', () => {
      this.hide()
      this.callbacks?.onClose()
    })
    container.add(closeBtn)

    // 顯示預設頁籤內容
    this.showTabContent()
  }

  /**
   * 隱藏對話框
   */
  hide(): void {
    if (this.tabContent) {
      this.tabContent.destroy()
      this.tabContent = null
    }
    if (this.container) {
      this.container.destroy()
      this.container = null
    }
  }

  // ====== 私有方法 ======

  /**
   * 繪製玩家資產摘要資訊
   */
  private drawBalanceInfo(container: Phaser.GameObjects.Container, player: Player): void {
    const infoY = -DIALOG_H / 2 + 60
    const items = [
      { label: '現金', value: `$${player.money.toLocaleString()}`, color: '#f1c40f' },
      { label: '存款', value: `$${player.bankDeposit.toLocaleString()}`, color: '#2ecc71' },
      { label: '借款', value: `$${player.bankLoan.toLocaleString()}`, color: '#e74c3c' }
    ]

    const spacing = 150
    const startX = -(items.length - 1) * spacing / 2

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const x = startX + i * spacing

      const label = this.scene.add.text(x, infoY, item.label, {
        fontSize: '12px',
        color: '#888888',
        fontFamily: FONT_FAMILY
      }).setOrigin(0.5)
      container.add(label)

      const value = this.scene.add.text(x, infoY + 18, item.value, {
        fontSize: '16px',
        color: item.color,
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      container.add(value)
    }
  }

  /**
   * 繪製頁籤按鈕列
   */
  private drawTabs(container: Phaser.GameObjects.Container): void {
    const tabY = -DIALOG_H / 2 + 105
    const tabW = DIALOG_W / TABS.length - 8
    const startX = -DIALOG_W / 2 + tabW / 2 + 8

    for (let i = 0; i < TABS.length; i++) {
      const tab = TABS[i]
      const x = startX + i * (tabW + 4)

      // 頁籤背景
      const tabBg = this.scene.add.graphics()
      const isActive = tab.id === this.activeTab
      tabBg.fillStyle(isActive ? tab.color : 0x2c3e50, 1)
      tabBg.fillRoundedRect(
        x - tabW / 2, tabY - TAB_HEIGHT / 2,
        tabW, TAB_HEIGHT,
        { tl: 6, tr: 6, bl: 0, br: 0 }
      )
      container.add(tabBg)

      // 頁籤文字
      const tabText = this.scene.add.text(x, tabY, tab.label, {
        fontSize: '13px',
        color: isActive ? '#ffffff' : '#aaaaaa',
        fontFamily: FONT_FAMILY,
        fontStyle: isActive ? 'bold' : 'normal'
      }).setOrigin(0.5)
      container.add(tabText)

      // 互動
      const hitArea = this.scene.add.rectangle(x, tabY, tabW, TAB_HEIGHT, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      hitArea.on('pointerdown', () => {
        if (this.activeTab !== tab.id) {
          this.activeTab = tab.id
          // 需要重繪整個對話框來更新頁籤狀態
          if (this.currentPlayer && this.callbacks) {
            const p = this.currentPlayer
            const cb = this.callbacks
            this.show(p, cb.onDeposit, cb.onWithdraw, cb.onLoan, cb.onRepay, cb.onBuyCard, cb.onClose)
          }
        }
      })
      container.add(hitArea)
    }
  }

  /**
   * 顯示當前頁籤的內容
   */
  private showTabContent(): void {
    if (this.tabContent) {
      this.tabContent.destroy()
      this.tabContent = null
    }

    if (!this.container || !this.currentPlayer || !this.callbacks) return

    const contentContainer = this.scene.add.container(0, 0)
    this.container.add(contentContainer)
    this.tabContent = contentContainer

    const contentY = -DIALOG_H / 2 + 150

    switch (this.activeTab) {
      case 'deposit':
        this.drawDepositTab(contentContainer, contentY)
        break
      case 'loan':
        this.drawLoanTab(contentContainer, contentY)
        break
      case 'card':
        this.drawCardTab(contentContainer, contentY)
        break
    }
  }

  /**
   * 存款/提款頁籤
   */
  private drawDepositTab(container: Phaser.GameObjects.Container, startY: number): void {
    if (!this.callbacks) return

    // 存款區塊
    const depositLabel = this.scene.add.text(0, startY, '存入銀行', {
      fontSize: '16px',
      color: '#2ecc71',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(depositLabel)

    this.drawAmountButtons(container, startY + 35, 0x27ae60, 0x2ecc71, (amount) => {
      this.callbacks?.onDeposit(amount)
    }, this.currentPlayer?.money ?? 0)

    // 分隔線
    const divider = this.scene.add.graphics()
    divider.lineStyle(1, 0x3a3a5e, 0.6)
    divider.lineBetween(-DIALOG_W / 2 + 30, startY + 80, DIALOG_W / 2 - 30, startY + 80)
    container.add(divider)

    // 提款區塊
    const withdrawLabel = this.scene.add.text(0, startY + 100, '從銀行提款', {
      fontSize: '16px',
      color: '#e67e22',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(withdrawLabel)

    this.drawAmountButtons(container, startY + 135, 0xe67e22, 0xf39c12, (amount) => {
      this.callbacks?.onWithdraw(amount)
    }, this.currentPlayer?.bankDeposit ?? 0)
  }

  /**
   * 借款/還款頁籤
   */
  private drawLoanTab(container: Phaser.GameObjects.Container, startY: number): void {
    if (!this.callbacks) return

    // 借款區塊
    const loanLabel = this.scene.add.text(0, startY, '向銀行借款', {
      fontSize: '16px',
      color: '#e74c3c',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(loanLabel)

    const loanNote = this.scene.add.text(0, startY + 20, '(利率 15%，每過起點結算)', {
      fontSize: '11px',
      color: '#999999',
      fontFamily: FONT_FAMILY
    }).setOrigin(0.5)
    container.add(loanNote)

    this.drawAmountButtons(container, startY + 50, 0xc0392b, 0xe74c3c, (amount) => {
      this.callbacks?.onLoan(amount)
    })

    // 分隔線
    const divider = this.scene.add.graphics()
    divider.lineStyle(1, 0x3a3a5e, 0.6)
    divider.lineBetween(-DIALOG_W / 2 + 30, startY + 95, DIALOG_W / 2 - 30, startY + 95)
    container.add(divider)

    // 還款區塊
    const repayLabel = this.scene.add.text(0, startY + 115, '償還借款', {
      fontSize: '16px',
      color: '#2ecc71',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(repayLabel)

    this.drawAmountButtons(container, startY + 150, 0x27ae60, 0x2ecc71, (amount) => {
      this.callbacks?.onRepay(amount)
    }, this.currentPlayer?.bankLoan ?? 0)
  }

  /**
   * 購買卡片頁籤
   */
  private drawCardTab(container: Phaser.GameObjects.Container, startY: number): void {
    if (!this.callbacks) return

    // 說明
    const desc = this.scene.add.text(0, startY + 20, '花費 $3,000 隨機購買一張特殊卡片', {
      fontSize: '15px',
      color: '#cccccc',
      fontFamily: FONT_FAMILY,
      align: 'center',
      wordWrap: { width: 360 }
    }).setOrigin(0.5)
    container.add(desc)

    const cardCountText = this.scene.add.text(
      0, startY + 50,
      `目前手持卡片：${this.currentPlayer?.cards.length ?? 0} / 5`,
      {
        fontSize: '13px',
        color: '#aaaaaa',
        fontFamily: FONT_FAMILY
      }
    ).setOrigin(0.5)
    container.add(cardCountText)

    // 購買按鈕
    const btnW = 160
    const btnY = startY + 100
    const btnBg = this.scene.add.graphics()
    btnBg.fillStyle(0x8e44ad, 1)
    btnBg.fillRoundedRect(-btnW / 2, btnY - BUTTON_HEIGHT / 2, btnW, BUTTON_HEIGHT, BUTTON_RADIUS)
    container.add(btnBg)

    const btnText = this.scene.add.text(0, btnY, '購買卡片 $3,000', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    container.add(btnText)

    const btnHit = this.scene.add.rectangle(0, btnY, btnW, BUTTON_HEIGHT, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
    btnHit.on('pointerover', () => {
      btnBg.clear()
      btnBg.fillStyle(0x9b59b6, 1)
      btnBg.fillRoundedRect(-btnW / 2, btnY - BUTTON_HEIGHT / 2, btnW, BUTTON_HEIGHT, BUTTON_RADIUS)
    })
    btnHit.on('pointerout', () => {
      btnBg.clear()
      btnBg.fillStyle(0x8e44ad, 1)
      btnBg.fillRoundedRect(-btnW / 2, btnY - BUTTON_HEIGHT / 2, btnW, BUTTON_HEIGHT, BUTTON_RADIUS)
    })
    btnHit.on('pointerdown', () => {
      this.hide()
      this.callbacks?.onBuyCard()
    })
    container.add(btnHit)
  }

  /**
   * 繪製預設金額按鈕列（$1000 / $3000 / $5000 / 全部）
   * @param maxAmount - 可選：「全部」按鈕的金額上限
   */
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

      // 按鈕背景
      const btnBg = this.scene.add.graphics()
      btnBg.fillStyle(bgColor, 1)
      btnBg.fillRoundedRect(
        x - AMOUNT_BUTTON_W / 2, y - AMOUNT_BUTTON_H / 2,
        AMOUNT_BUTTON_W, AMOUNT_BUTTON_H,
        BUTTON_RADIUS
      )
      container.add(btnBg)

      // 按鈕文字
      const btnText = this.scene.add.text(x, y, labels[i], {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      container.add(btnText)

      // 互動
      const hitArea = this.scene.add.rectangle(
        x, y, AMOUNT_BUTTON_W, AMOUNT_BUTTON_H, 0x000000, 0
      ).setInteractive({ useHandCursor: true })

      hitArea.on('pointerover', () => {
        btnBg.clear()
        btnBg.fillStyle(hoverColor, 1)
        btnBg.fillRoundedRect(
          x - AMOUNT_BUTTON_W / 2, y - AMOUNT_BUTTON_H / 2,
          AMOUNT_BUTTON_W, AMOUNT_BUTTON_H,
          BUTTON_RADIUS
        )
      })
      hitArea.on('pointerout', () => {
        btnBg.clear()
        btnBg.fillStyle(bgColor, 1)
        btnBg.fillRoundedRect(
          x - AMOUNT_BUTTON_W / 2, y - AMOUNT_BUTTON_H / 2,
          AMOUNT_BUTTON_W, AMOUNT_BUTTON_H,
          BUTTON_RADIUS
        )
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
