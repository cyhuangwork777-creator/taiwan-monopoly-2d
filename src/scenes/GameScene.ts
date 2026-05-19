import Phaser from 'phaser'
import {
  type Player,
  type Property,
  type Card,
  Character,
  TileType,
  BuildingLevel
} from '../types'
import {
  CHARACTERS,
  SALARY
} from '../config/gameConfig'
import { BOARD_TILES } from '../config/boardData'
import { GameState } from '../core/GameState'
import { TurnManager } from '../core/TurnManager'
import { PropertySystem } from '../core/PropertySystem'
import { BankSystem } from '../core/BankSystem'
import { CardSystem } from '../core/CardSystem'
import { AIController } from '../core/AIController'
import { BoardRenderer } from '../renderers/BoardRenderer'
import { BuildingRenderer } from '../renderers/BuildingRenderer'
import { PlayerRenderer } from '../renderers/PlayerRenderer'
import { Dice } from '../ui/Dice'
import { PlayerPanel } from '../ui/PlayerPanel'
import { ActionMenu } from '../ui/ActionMenu'
import { CardPopup } from '../ui/CardPopup'
import { BankDialog } from '../ui/BankDialog'
import { soundManager } from '../audio/SoundManager'

/**
 * 主遊戲場景
 * 負責串接所有核心系統、繪製器、UI 模組，實現完整的遊戲迴圈
 */

interface PlayerConfig {
  character: Character
  name: string
  isAI: boolean
}

const DEFAULT_CHARACTER_ORDER: Character[] = [
  Character.BUMBLEBEE,
  Character.MARIO,
  Character.PIKMIN,
  Character.METAGROSS
]

export class GameScene extends Phaser.Scene {
  // 核心系統
  private gameState!: GameState
  private turnManager!: TurnManager
  private propertySystem!: PropertySystem
  private bankSystem!: BankSystem
  private cardSystem!: CardSystem
  private aiController!: AIController

  // 繪製器
  private boardRenderer!: BoardRenderer
  private buildingRenderer!: BuildingRenderer
  private playerRenderer!: PlayerRenderer

  // UI 元件
  private dice!: Dice
  private playerPanel!: PlayerPanel
  private actionMenu!: ActionMenu
  private cardPopup!: CardPopup
  private bankDialog!: BankDialog

  // 遊戲狀態
  private isProcessing: boolean = false
  private playerConfigs: PlayerConfig[] = []
  private fastMode: boolean = false

  // 工具欄橋接狀態
  private rollEnabled: boolean = false
  private cardEnabled: boolean = false
  private gameLog: string[] = []
  private _pendingSaveData: any = null
  // 遙控骰子強制點數（null 表示正常擲骰）
  private forcedDiceValue: number | null = null

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { playerConfigs?: PlayerConfig[], fromSave?: boolean, saveData?: any }): void {
    if (data?.fromSave && data?.saveData) {
      this._pendingSaveData = data.saveData
      this.playerConfigs = data.saveData.playerConfigs || DEFAULT_CHARACTER_ORDER.map((char, i) => ({
        character: char, name: CHARACTERS[char].name, isAI: i > 0
      }))
    } else if (data?.playerConfigs && data.playerConfigs.length > 0) {
      this.playerConfigs = data.playerConfigs
      this._pendingSaveData = null
    } else {
      this.playerConfigs = DEFAULT_CHARACTER_ORDER.map((char, i) => ({
        character: char, name: CHARACTERS[char].name, isAI: i > 0
      }))
      this._pendingSaveData = null
    }
  }

  create(): void {
    // === 1. 初始化核心系統 ===
    this.gameState = new GameState()
    this.gameState.initGame(this.playerConfigs)

    this.turnManager = new TurnManager(this.gameState)
    this.propertySystem = new PropertySystem(this.gameState)
    this.bankSystem = new BankSystem(this.gameState)
    this.cardSystem = new CardSystem(this.gameState, this.propertySystem)
    this.aiController = new AIController(
      this.gameState,
      this.propertySystem,
      this.bankSystem,
      this.cardSystem
    )

    // === 2. 建立繪製器 ===
    this.boardRenderer = new BoardRenderer(this)
    this.buildingRenderer = new BuildingRenderer(this, this.boardRenderer)
    this.playerRenderer = new PlayerRenderer(this, this.boardRenderer)

    // === 3. 繪製棋盤和玩家棋子 ===
    this.boardRenderer.create()
    this.playerRenderer.createPlayerTokens(this.gameState.players)

    // === 4. 建立 UI 元件 ===
    this.dice = new Dice(this)
    this.dice.create(640, 392)

    this.playerPanel = new PlayerPanel(this)
    this.playerPanel.create(this.gameState.players)

    this.actionMenu = new ActionMenu(this)
    this.cardPopup = new CardPopup(this)
    this.bankDialog = new BankDialog(this)

    // === 5. 音效 ===
    soundManager.startBGM()

    // === 6. 還原存檔狀態（如有） ===
    const logEl = document.getElementById('game-log')
    if (this._pendingSaveData) {
      const sd = this._pendingSaveData
      this.gameState.players = sd.players
      this.gameState.properties = sd.properties
      this.gameState.currentRound = sd.round ?? 1
      this.gameState.currentPlayerIndex = sd.currentPlayerIndex ?? 0
      this.gameState.roadblocks = sd.roadblocks ?? []
      this.gameLog = sd.log ?? []

      // 棋子移到儲存位置
      for (const player of this.gameState.players) {
        this.playerRenderer.updatePlayerPosition(player.id, player.position, false)
      }
      this.updateAllVisuals()

      // 把舊記錄發送到工具欄
      if (logEl) logEl.innerHTML = ''
      for (const entry of this.gameLog) {
        document.dispatchEvent(new CustomEvent('game:log', {
          detail: `<div class="log-entry">${entry}</div>`
        }))
      }
      this._pendingSaveData = null
    } else {
      this.gameLog = []
      if (logEl) logEl.innerHTML = ''
    }

    // === 7. 快速模式 F 鍵切換 ===
    this.fastMode = false
    this.input.keyboard!.on('keydown-F', () => {
      this.fastMode = !this.fastMode
      this.dispatchStateChange()
      if (this.fastMode && !this.isProcessing) {
        const cur = this.gameState.getCurrentPlayer()
        if (!cur.isAI) void this.onRollDice()
      }
    })

    // === 8. 掛載 window.gameAPI ===
    ;(window as any).gameAPI = {
      rollDice:       () => { if (!this.isProcessing) void this.onRollDice() },
      useCard:        () => void this.onUseCard(),
      toggleFastMode: () => {
        this.fastMode = !this.fastMode
        this.dispatchStateChange()
        if (this.fastMode && !this.isProcessing) {
          const cur = this.gameState.getCurrentPlayer()
          if (!cur.isAI) void this.onRollDice()
        }
      },
      isFastMode: () => this.fastMode,
      saveGame:   () => this.serializeState(),
      loadGame:   (data: unknown) => this.deserializeState(data),
      getLog:     () => [...this.gameLog],
      gotoMenu:   () => this.scene.start('MenuScene')
    }

    // === 9. 開始第一回合 ===
    this.rollEnabled = false
    this.cardEnabled = false
    this.dispatchStateChange()
    setTimeout(() => this.startPlayerTurn(), 500)
  }

  shutdown(): void {
    ;(window as any).gameAPI = null
    // 通知工具欄重設為非遊戲狀態
    document.dispatchEvent(new CustomEvent('game:state', {
      detail: { canRoll: false, canCard: false, fastMode: false, round: 0 }
    }))
  }

  // ==================== 遊戲迴圈主要方法 ====================

  private async startPlayerTurn(): Promise<void> {
    try {
      if (this.gameState.isGameOver()) {
        this.goToResultScene()
        return
      }

      const player = this.gameState.getCurrentPlayer()

      if (player.isBankrupt) {
        this.turnManager.endTurn()
        this.dispatchStateChange()
        setTimeout(() => this.startPlayerTurn(), 100)
        return
      }

      this.playerPanel.highlightCurrentPlayer(player.id)
      this.playerRenderer.highlightPlayer(player.id)
      this.dispatchStateChange()

      const turnStarted = this.turnManager.startTurn()

      if (!turnStarted || player.skipNextTurn) {
        this.actionMenu.showMessage(`${player.name} 在休息站休息一回合`, 1500)
        await this.delay(1800)
        this.endCurrentTurn()
        return
      }

      if (player.isAI) {
        await this.handleAITurn(player)
      } else if (this.fastMode) {
        await this.handleAITurn({ ...player, isAI: true })
      } else {
        this.enableRollButton()
        this.updateCardButtonState()
      }
    } catch (err) {
      console.error('[startPlayerTurn] ERROR:', err)
    }
  }

  private async onRollDice(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true
    this.disableRollButton()
    this.disableCardButton()

    const player = this.gameState.getCurrentPlayer()

    soundManager.playDice()
    let diceResult = this.turnManager.rollDice()
    // 遙控骰子：用強制點數覆蓋本次擲骰結果
    if (this.forcedDiceValue !== null) {
      const v = this.forcedDiceValue
      this.forcedDiceValue = null
      const die2 = Math.floor(v / 2)
      const die1 = v - die2
      diceResult = { die1, die2, total: v, isDouble: die1 === die2 }
    }
    await this.dice.roll(diceResult)

    if (player.skipNextTurn && player.position === 24) {
      await this.playerRenderer.animateMovement(player.id, player.position, 24, 0)
      this.actionMenu.showMessage('連續三次雙數，送往休息站！', 2000)
      this.playerRenderer.updatePlayerPosition(player.id, 24, false)
      await this.delay(2000)
      this.dice.hide()
      this.endCurrentTurn()
      return
    }

    if (diceResult.isDouble) {
      this.actionMenu.showMessage('雙數！再擲一次！', 1000)
      await this.delay(1000)
    }

    const oldPos = player.position
    const passedStart = this.turnManager.movePlayer(diceResult.total)
    for (let i = 0; i < diceResult.total; i++) {
      setTimeout(() => soundManager.playMove(), i * 250)
    }
    await this.playerRenderer.animateMovement(
      player.id, oldPos, player.position, diceResult.total
    )

    if (passedStart) {
      soundManager.playSalary()
      this.playerPanel.showMoneyChange(player.id, SALARY)
      this.bankSystem.processInterest(player.id)
      this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 經過起點 +$${SALARY}`)
      this.updateAllVisuals()
    }

    this.dice.hide()

    await this.handleLanding(player)

    if (diceResult.isDouble && !this.gameState.isGameOver() && !player.isBankrupt) {
      if (!player.isAI && !this.fastMode) {
        this.enableRollButton()
        this.updateCardButtonState()
        this.isProcessing = false
        return
      } else {
        await this.delay(800)
        this.isProcessing = false
        await this.onRollDice()
        return
      }
    }

    this.endCurrentTurn()
  }

  private async handleLanding(player: Player): Promise<void> {
    const tile = BOARD_TILES[player.position]

    const roadblock = this.gameState.roadblocks.find(r => r.tileId === player.position)
    if (roadblock) {
      player.skipNextTurn = true
      this.gameState.roadblocks = this.gameState.roadblocks.filter(
        r => r.tileId !== player.position
      )
      this.actionMenu.showMessage(`${player.name} 踩到路障！下回合無法行動`, 1500)
      await this.delay(1500)
    }

    switch (tile.type) {
      case TileType.PROPERTY:
        await this.handlePropertyLanding(player, tile.propertyId!)
        break

      case TileType.CHANCE: {
        soundManager.playCard()
        const chanceCard = this.cardSystem.drawChanceCard()
        await this.cardPopup.showCard(chanceCard, (player.isAI || this.fastMode) ? (this.fastMode ? 0 : 2000) : undefined)
        this.cardSystem.executeCardEffect(player.id, chanceCard)
        this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 抽到：${chanceCard.name}`)
        this.updateAllVisuals()
        // 同步所有棋子位置（卡片效果可能移動玩家）
        for (const p of this.gameState.players) {
          this.playerRenderer.updatePlayerPosition(p.id, p.position, false)
        }
        this.checkBankruptcy(player)
        break
      }

      case TileType.FATE: {
        soundManager.playCard()
        const fateCard = this.cardSystem.drawFateCard()
        await this.cardPopup.showCard(fateCard, (player.isAI || this.fastMode) ? (this.fastMode ? 0 : 2000) : undefined)
        this.cardSystem.executeCardEffect(player.id, fateCard)
        this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 抽到：${fateCard.name}`)
        this.updateAllVisuals()
        // 同步所有棋子位置（卡片效果可能移動玩家）
        for (const p of this.gameState.players) {
          this.playerRenderer.updatePlayerPosition(p.id, p.position, false)
        }
        this.checkBankruptcy(player)
        break
      }

      case TileType.BANK:
        if (player.isAI) {
          this.handleAIBankAction(player)
        } else {
          await this.showBankDialog(player)
        }
        this.updateAllVisuals()
        break

      case TileType.START:
        break

      case TileType.REST:
        player.skipNextTurn = true
        this.actionMenu.showMessage('休息站：下回合休息', 1500)
        await this.delay(1500)
        break
    }
  }

  private async handlePropertyLanding(player: Player, propertyId: number): Promise<void> {
    const property = this.gameState.properties.find(p => p.id === propertyId)
    if (!property) return

    if (property.ownerId === null) {
      if (player.isAI) {
        if (this.aiController.decidePurchase(player.id, property.id)) {
          this.propertySystem.buyProperty(player.id, property.id)
          soundManager.playBuy()
          const tilePos = this.boardRenderer.getTilePosition(player.position)
          this.flyCoins(player.id * 320 + 160, 40, tilePos.x, tilePos.y)
          this.actionMenu.showMessage(`${player.name} 購買了 ${property.name}`, 1200)
          this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 購買 ${property.name} $${property.price}`)
          await this.delay(1200)
          this.updatePropertyVisual(property)
        }
      } else {
        if (player.money >= property.price) {
          await this.showBuyPrompt(player, property)
        } else {
          this.actionMenu.showMessage(`資金不足，無法購買 ${property.name}`, 1200)
          await this.delay(1200)
        }
      }
    } else if (property.ownerId === player.id) {
      if (property.buildingLevel < BuildingLevel.HOTEL) {
        const cost = this.propertySystem.getUpgradeCost(property.id)
        if (player.isAI) {
          const upgradeTarget = this.aiController.decideUpgrade(player.id)
          if (upgradeTarget === property.id) {
            this.propertySystem.upgradeProperty(property.id)
            soundManager.playUpgrade()
            const tilePos2 = this.boardRenderer.getTilePosition(player.position)
            this.flyCoins(player.id * 320 + 160, 40, tilePos2.x, tilePos2.y)
            this.actionMenu.showMessage(`${player.name} 升級了 ${property.name}`, 1200)
            await this.delay(1200)
            this.updatePropertyVisual(property)
          }
        } else {
          if (player.money >= cost) {
            await this.showUpgradePrompt(player, property)
          }
        }
      }
    } else {
      let rent = this.propertySystem.calculateRent(property.id)
      const owner = this.gameState.getPlayerById(property.ownerId)
      if (!owner || owner.isBankrupt) return

      if (owner.hasDoubleToll) {
        rent *= 2
        owner.hasDoubleToll = false
      }

      if (player.hasTollFree) {
        rent = 0
        player.hasTollFree = false
        this.actionMenu.showMessage(`${player.name} 使用免罰卡，免除過路費！`, 1500)
        await this.delay(1500)
        return
      }

      if (rent > 0) {
        soundManager.playRent()
        const payerPos = this.playerRenderer.getTokenPosition(player.id)
        const ownerPos = this.playerRenderer.getTokenPosition(owner.id)
        if (payerPos && ownerPos) {
          this.flyCoins(payerPos.x, payerPos.y, ownerPos.x, ownerPos.y)
        }
        if (player.isAI) {
          player.money -= rent
          owner.money += rent
          this.actionMenu.showMessage(
            `${player.name} 支付 $${rent} 過路費給 ${owner.name}`,
            1500
          )
          await this.delay(1500)
        } else {
          await this.showRentPayment(player, owner, property, rent)
        }
        this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 付過路費 $${rent} 給 ${owner.name}`)
        this.playerPanel.showMoneyChange(player.id, -rent)
        this.playerPanel.showMoneyChange(owner.id, rent)
        this.updateAllVisuals()
        this.checkBankruptcy(player)
      }
    }
  }

  private endCurrentTurn(): void {
    this.isProcessing = false
    this.playerRenderer.unhighlightAll()
    this.rollEnabled = false
    this.cardEnabled = false
    this.dice.hide()

    this.turnManager.endTurn()
    this.dispatchStateChange()
    this.updateAllVisuals()

    setTimeout(() => this.startPlayerTurn(), this.fastMode ? 0 : 500)
  }

  private async handleAITurn(player: Player): Promise<void> {
    this.actionMenu.showMessage(`${player.name}（電腦）思考中...`, 1000)
    await this.delay(1000)

    const cardDecision = this.aiController.decideCardUse(player.id)
    if (cardDecision) {
      this.cardSystem.useSpecialCard(
        player.id,
        cardDecision.cardId,
        cardDecision.targetData as { targetPlayerId?: number; targetPropertyId?: number; diceValue?: number; targetTileId?: number } | undefined
      )
      this.actionMenu.showMessage(`${player.name} 使用了卡片`, 1000)
      await this.delay(1000)
      this.updateAllVisuals()
    }

    await this.onRollDice()
  }

  // ==================== UI 互動方法 ====================

  private showBuyPrompt(player: Player, property: Property): Promise<void> {
    const doBuy = () => {
      this.propertySystem.buyProperty(player.id, property.id)
      soundManager.playBuy()
      const buyTilePos = this.boardRenderer.getTilePosition(player.position)
      this.flyCoins(player.id * 320 + 160, 40, buyTilePos.x, buyTilePos.y)
      this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 購買 ${property.name} $${property.price}`)
      this.updatePropertyVisual(property)
      this.playerPanel.showMoneyChange(player.id, -property.price)
      this.updateAllVisuals()
    }
    if (this.fastMode) {
      if (player.money >= property.price) doBuy()
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      this.actionMenu.showBuyPrompt(
        property.name, property.price,
        () => { doBuy(); resolve() },
        () => resolve()
      )
    })
  }

  private showUpgradePrompt(player: Player, property: Property): Promise<void> {
    const cost = this.propertySystem.getUpgradeCost(property.id)
    const doUpgrade = () => {
      this.propertySystem.upgradeProperty(property.id)
      soundManager.playUpgrade()
      const upgTilePos = this.boardRenderer.getTilePosition(player.position)
      this.flyCoins(player.id * 320 + 160, 40, upgTilePos.x, upgTilePos.y)
      this.updatePropertyVisual(property)
      this.playerPanel.showMoneyChange(player.id, -cost)
      this.updateAllVisuals()
    }
    if (this.fastMode) {
      if (player.money >= cost) doUpgrade()
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      this.actionMenu.showUpgradePrompt(
        property.name, cost,
        () => { doUpgrade(); resolve() },
        () => resolve()
      )
    })
  }

  private showRentPayment(
    player: Player,
    owner: Player,
    property: Property,
    rent: number
  ): Promise<void> {
    if (this.fastMode) {
      player.money -= rent
      owner.money += rent
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      this.actionMenu.showRentPayment(
        property.name, owner.name, rent,
        () => { player.money -= rent; owner.money += rent; resolve() }
      )
    })
  }

  private showBankDialog(player: Player): Promise<void> {
    if (this.fastMode) return Promise.resolve()
    const availableCards = this.bankSystem.getRandomCards(5)
    return new Promise<void>(resolve => {
      this.bankDialog.show(
        player,
        availableCards,
        (amount: number) => {
          this.bankSystem.deposit(player.id, amount)
          this.updateAllVisuals()
          resolve()
        },
        (amount: number) => {
          this.bankSystem.withdraw(player.id, amount)
          this.updateAllVisuals()
          resolve()
        },
        (amount: number) => {
          this.bankSystem.takeLoan(player.id, amount)
          this.updateAllVisuals()
          resolve()
        },
        (amount: number) => {
          this.bankSystem.repayLoan(player.id, amount)
          this.updateAllVisuals()
          resolve()
        },
        (card) => {
          this.bankSystem.purchaseCard(player.id, card)
          this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 購買卡片「${card.name}」$${3000}`)
          this.updateAllVisuals()
          resolve()
        },
        (cardId) => {
          const sold = player.cards.find(c => c.id === cardId)
          this.bankSystem.sellCard(player.id, cardId)
          if (sold) this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 賣出卡片「${sold.name}」+$1500`)
          this.updateAllVisuals()
          // 不 resolve，讓玩家留在卡片商店繼續操作
        },
        () => { resolve() }
      )
    })
  }

  private handleAIBankAction(player: Player): void {
    const decision = this.aiController.decideBankAction(player.id)
    if (!decision) return
    switch (decision.action) {
      case 'deposit':
        this.bankSystem.deposit(player.id, (decision.data?.amount as number) ?? 0)
        break
      case 'takeLoan':
        this.bankSystem.takeLoan(player.id, (decision.data?.amount as number) ?? 0)
        break
    }
  }

  private onUseCard(): void {
    const player = this.gameState.getCurrentPlayer()
    if (player.isAI || player.cards.length === 0) return

    this.actionMenu.showCardSelection(
      player.cards,
      (card: Card) => void this.executeCardWithTarget(player, card),
      () => {}
    )
  }

  private async executeCardWithTarget(player: Player, card: Card): Promise<void> {
    type TargetData = { targetPlayerId?: number; targetPropertyId?: number; diceValue?: number; targetTileId?: number }
    let targetData: TargetData | undefined

    const action = card.effect.action

    if (action === 'taxAudit') {
      const others = this.gameState.players.filter(p => p.id !== player.id && !p.isBankrupt)
      if (others.length === 0) {
        this.actionMenu.showMessage('沒有可查稅的目標', 1500)
        return
      }
      const targetPlayerId = await this.actionMenu.showPlayerSelector(
        others.map(p => ({ id: p.id, name: p.name })),
        '查稅卡：選擇目標玩家'
      )
      if (targetPlayerId === null) return
      targetData = { targetPlayerId }

    } else if (action === 'placeRoadblock') {
      const targetTileId = await this.actionMenu.showTileSelector(
        BOARD_TILES.map(t => ({ id: t.id, label: t.label })),
        '路障卡：選擇放置格子'
      )
      if (targetTileId === null) return
      targetData = { targetTileId }

    } else if (action === 'demolish') {
      const targetables = this.gameState.properties.filter(
        p => p.ownerId !== null && p.ownerId !== player.id && p.buildingLevel > 0
      )
      if (targetables.length === 0) {
        this.actionMenu.showMessage('沒有可拆除的對手建築', 1500)
        return
      }
      const targetPropertyId = await this.actionMenu.showPropertySelector(
        targetables.map(p => ({ id: p.id, name: p.name, buildingLevel: p.buildingLevel })),
        '拆除卡：選擇目標地產'
      )
      if (targetPropertyId === null) return
      targetData = { targetPropertyId }

    } else if (action === 'remoteDice') {
      const diceValue = await this.actionMenu.showDiceSelector('遙控骰子：選擇下次擲骰點數')
      if (diceValue === null) return
      this.forcedDiceValue = diceValue
      targetData = { diceValue }
    }

    const success = this.cardSystem.useSpecialCard(player.id, card.id, targetData)
    if (success) {
      this.updateAllVisuals()
      this.updateCardButtonState()
    }
  }

  // ==================== 輔助方法 ====================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.fastMode ? 0 : ms))
  }

  private flyCoins(fromX: number, fromY: number, toX: number, toY: number, count = 4): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const coin = this.add.graphics()
        coin.fillStyle(0xf1c40f, 1)
        coin.fillCircle(0, 0, 5)
        coin.lineStyle(1.5, 0xe67e22, 1)
        coin.strokeCircle(0, 0, 5)
        coin.setPosition(
          fromX + (Math.random() - 0.5) * 10,
          fromY + (Math.random() - 0.5) * 10
        )
        coin.setDepth(500)

        this.tweens.add({
          targets: coin,
          x: toX + (Math.random() - 0.5) * 10,
          y: toY + (Math.random() - 0.5) * 10,
          alpha: { from: 1, to: 0 },
          duration: 550,
          ease: 'Cubic.easeIn'
        })

        setTimeout(() => { if (coin.scene) coin.destroy() }, 650)
      }, i * 75)
    }
  }

  private checkBankruptcy(player: Player): void {
    if (player.money >= 0) return

    const playerProperties = this.gameState.properties
      .filter(p => p.ownerId === player.id)
      .sort((a, b) => a.price - b.price)

    for (const prop of playerProperties) {
      if (player.money >= 0) break
      this.propertySystem.sellProperty(player.id, prop.id)
      this.updatePropertyVisual(prop)
    }

    if (player.money < 0) {
      player.isBankrupt = true
      soundManager.playBankrupt()
      this.playerPanel.markBankrupt(player.id)
      this.playerRenderer.setBankrupt(player.id)
      this.addLog(`第${this.gameState.currentRound}回合 ${player.name} 宣告破產`)
      this.actionMenu.showMessage(`${player.name} 破產了！`, 2000)
    }

    this.updateAllVisuals()
  }

  private updateAllVisuals(): void {
    this.playerPanel.update(this.gameState.players)

    for (const property of this.gameState.properties) {
      const tileId = this.findTileIdForProperty(property.id)
      if (tileId === -1) continue

      if (property.ownerId !== null) {
        const owner = this.gameState.getPlayerById(property.ownerId)
        if (owner) {
          const charInfo = CHARACTERS[owner.character]
          this.boardRenderer.updateTileOwner(tileId, charInfo.color)
        }
      } else {
        this.boardRenderer.updateTileOwner(tileId, null)
      }

      this.buildingRenderer.updateBuilding(tileId, property.buildingLevel)
    }
  }

  private updatePropertyVisual(property: Property): void {
    const tileId = this.findTileIdForProperty(property.id)
    if (tileId === -1) return

    if (property.ownerId !== null) {
      const owner = this.gameState.getPlayerById(property.ownerId)
      if (owner) {
        const charInfo = CHARACTERS[owner.character]
        this.boardRenderer.updateTileOwner(tileId, charInfo.color)
      }
    } else {
      this.boardRenderer.updateTileOwner(tileId, null)
    }

    this.buildingRenderer.updateBuilding(tileId, property.buildingLevel)
  }

  private findTileIdForProperty(propertyId: number): number {
    const tile = BOARD_TILES.find(t => t.propertyId === propertyId)
    return tile ? tile.id : -1
  }

  private goToResultScene(): void {
    const winner = this.gameState.getWinner()
    this.scene.start('ResultScene', {
      players: this.gameState.players,
      properties: this.gameState.properties,
      winner,
      round: this.gameState.currentRound
    })
  }

  // ==================== 工具欄橋接 ====================

  private dispatchStateChange(): void {
    document.dispatchEvent(new CustomEvent('game:state', {
      detail: {
        canRoll: this.rollEnabled,
        canCard: this.cardEnabled,
        fastMode: this.fastMode,
        round: this.gameState.currentRound
      }
    }))
  }

  private addLog(text: string): void {
    this.gameLog.push(text)
    document.dispatchEvent(new CustomEvent('game:log', {
      detail: `<div class="log-entry">${text}</div>`
    }))
  }

  private serializeState(): object {
    return {
      version: 1,
      round: this.gameState.currentRound,
      currentPlayerIndex: this.gameState.currentPlayerIndex,
      players: this.gameState.players,
      properties: this.gameState.properties,
      roadblocks: this.gameState.roadblocks,
      playerConfigs: this.playerConfigs,
      log: this.gameLog
    }
  }

  private deserializeState(data: any): void {
    this.scene.restart({ fromSave: true, saveData: data })
  }

  // ==================== 按鈕狀態 ====================

  private enableRollButton(): void {
    this.rollEnabled = true
    this.dispatchStateChange()
  }

  private disableRollButton(): void {
    this.rollEnabled = false
    this.dispatchStateChange()
  }

  private updateCardButtonState(): void {
    const player = this.gameState.getCurrentPlayer()
    this.cardEnabled = player.cards.length > 0 && !player.isAI
    this.dispatchStateChange()
  }

  private enableCardButton(): void {
    this.cardEnabled = true
    this.dispatchStateChange()
  }

  private disableCardButton(): void {
    this.cardEnabled = false
    this.dispatchStateChange()
  }
}
