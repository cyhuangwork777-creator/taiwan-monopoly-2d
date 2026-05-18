import Phaser from 'phaser'
import { Character } from '../types'
import { CHARACTERS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'
import { soundManager } from '../audio/SoundManager'

/**
 * 主選單場景
 * 提供遊戲標題、玩家人數選擇、角色選擇、音量控制，以及開始遊戲按鈕
 */

// UI 常數
const FONT_FAMILY = 'Arial, "Microsoft JhengHei"'

// 所有可選角色（固定順序，用於循環切換）
const ALL_CHARACTERS: Character[] = [
  Character.BUMBLEBEE,
  Character.MARIO,
  Character.PIKMIN,
  Character.METAGROSS
]

// 玩家設定介面
interface PlayerConfig {
  character: Character
  name: string
  isAI: boolean
}

export class MenuScene extends Phaser.Scene {
  /** 當前選擇的人類玩家人數 */
  private humanCount: number = 1
  /** 每位玩家目前選中的角色索引 */
  private playerCharIndex: number[] = [0, 1, 2, 3]
  /** 玩家人數按鈕陣列 */
  private countButtons: Phaser.GameObjects.Container[] = []
  /** 角色分配顯示列（每次 update 完整重建） */
  private assignmentRows: Phaser.GameObjects.Container[] = []
  /** 角色區域位置（供 update 使用） */
  private assignmentCenterX: number = 0
  private assignmentStartY: number = 0

  constructor() {
    super({ key: 'MenuScene' })
  }

  create(): void {
    const centerX = GAME_WIDTH / 2
    this.humanCount = 1
    this.playerCharIndex = [0, 1, 2, 3]
    this.countButtons = []
    this.assignmentRows = []

    // 背景漸層效果
    const bgGradient = this.add.graphics()
    bgGradient.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1)
    bgGradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // === 標題區 ===
    this.add.text(centerX, 100, '台灣大富翁', {
      fontSize: '64px',
      color: '#FFD700',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      stroke: '#8B6914',
      strokeThickness: 5
    }).setOrigin(0.5)

    this.add.text(centerX, 160, 'Taiwan Monopoly', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'italic'
    }).setOrigin(0.5).setAlpha(0.7)

    // === 玩家人數選擇區 ===
    this.add.text(centerX, 230, '玩家人數', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.createPlayerCountSelector(centerX, 275)

    // === 角色選擇區 ===
    this.add.text(centerX, 330, '角色選擇（點擊 ◀ ▶ 切換）', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: FONT_FAMILY
    }).setOrigin(0.5)

    this.assignmentCenterX = centerX
    this.assignmentStartY = 370
    this.createAssignmentDisplay(centerX, 370)

    // === 音量控制區 ===
    this.createVolumeControls(centerX, 565)

    // === 開始遊戲按鈕 ===
    this.createStartButton(centerX, 650)

    // === 版本資訊 ===
    this.add.text(centerX, GAME_HEIGHT - 25, 'v1.0.0 — Phaser + TypeScript', {
      fontSize: '12px',
      color: '#555555',
      fontFamily: 'Arial'
    }).setOrigin(0.5)

    // 啟動主選單背景音樂
    soundManager.startBGM()
  }

  /**
   * 建立玩家人數選擇器（4 個按鈕）
   */
  private createPlayerCountSelector(centerX: number, y: number): void {
    const buttonSize = 50
    const gap = 16
    const totalWidth = 4 * buttonSize + 3 * gap
    const startX = centerX - totalWidth / 2 + buttonSize / 2

    for (let i = 1; i <= 4; i++) {
      const x = startX + (i - 1) * (buttonSize + gap)
      const container = this.add.container(x, y)

      // 按鈕背景
      const bg = this.add.graphics()
      container.add(bg)

      // 按鈕文字
      const text = this.add.text(0, 0, `${i}`, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      container.add(text)

      // 互動區
      const hitArea = this.add.rectangle(0, 0, buttonSize, buttonSize, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      hitArea.on('pointerdown', () => {
        this.humanCount = i
        this.updateCountButtons()
        this.updateAssignmentDisplay()
      })
      container.add(hitArea)

      this.countButtons.push(container)
    }

    this.updateCountButtons()
  }

  /**
   * 更新人數按鈕的選中狀態
   */
  private updateCountButtons(): void {
    const buttonSize = 50
    for (let i = 0; i < this.countButtons.length; i++) {
      const container = this.countButtons[i]
      const bg = container.getAt(0) as Phaser.GameObjects.Graphics
      bg.clear()

      const isSelected = (i + 1) === this.humanCount
      if (isSelected) {
        bg.fillStyle(0xe74c3c, 1)
        bg.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8)
        bg.lineStyle(2, 0xf1c40f, 1)
        bg.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8)
      } else {
        bg.fillStyle(0x2c3e50, 1)
        bg.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8)
        bg.lineStyle(1, 0x5a5a7e, 0.6)
        bg.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8)
      }
    }
  }

  /**
   * 建立角色分配顯示區域（首次呼叫，內部直接觸發 update）
   */
  private createAssignmentDisplay(_centerX: number, _startY: number): void {
    this.updateAssignmentDisplay()
  }

  /**
   * 更新角色分配顯示
   * 每次完整銷毀舊 containers 再重建，確保 Phaser input 正確追蹤 hit area
   */
  private updateAssignmentDisplay(): void {
    // 銷毀舊的 containers
    for (const c of this.assignmentRows) {
      c.destroy()
    }
    this.assignmentRows = []

    const centerX = this.assignmentCenterX
    const startY = this.assignmentStartY
    const rowWidth = 420
    const rowHeight = 44
    const rowSpacing = 50

    for (let i = 0; i < 4; i++) {
      const y = startY + i * rowSpacing
      // 每次重建一個全新 container，確保 input hit area 能正確作用
      const container = this.add.container(centerX, y)
      this.assignmentRows.push(container)

      const charIdx = this.playerCharIndex[i]
      const character = ALL_CHARACTERS[charIdx]
      const charInfo = CHARACTERS[character]
      const isHuman = i < this.humanCount

      // 行背景
      const rowBg = this.add.graphics()
      rowBg.fillStyle(isHuman ? 0x1e3a5f : 0x1a1a2e, 0.8)
      rowBg.fillRoundedRect(-rowWidth / 2, -rowHeight / 2, rowWidth, rowHeight, 6)
      rowBg.lineStyle(1, isHuman ? 0x3498db : 0x3a3a5e, 0.6)
      rowBg.strokeRoundedRect(-rowWidth / 2, -rowHeight / 2, rowWidth, rowHeight, 6)
      container.add(rowBg)

      // 玩家編號
      const indexText = this.add.text(-rowWidth / 2 + 20, 0, `P${i + 1}`, {
        fontSize: '14px',
        color: '#888888',
        fontFamily: FONT_FAMILY
      }).setOrigin(0, 0.5)
      container.add(indexText)

      // ◀ 左箭頭
      const leftText = this.add.text(-rowWidth / 2 + 55, 0, '◀', {
        fontSize: '18px',
        color: '#cccccc',
        fontFamily: FONT_FAMILY
      }).setOrigin(0.5)
      container.add(leftText)
      const leftHit = this.add.rectangle(-rowWidth / 2 + 55, 0, 32, 32, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      leftHit.on('pointerdown', () => this.cycleCharacter(i, -1))
      leftHit.on('pointerover', () => leftText.setColor('#ffffff'))
      leftHit.on('pointerout', () => leftText.setColor('#cccccc'))
      container.add(leftHit)

      // 角色彩色圓點
      const colorDot = this.add.graphics()
      colorDot.fillStyle(charInfo.color, 1)
      colorDot.fillCircle(-rowWidth / 2 + 90, 0, 10)
      colorDot.lineStyle(1, 0xffffff, 0.5)
      colorDot.strokeCircle(-rowWidth / 2 + 90, 0, 10)
      container.add(colorDot)

      // 角色名稱
      const nameText = this.add.text(-rowWidth / 2 + 110, 0, charInfo.name, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5)
      container.add(nameText)

      // ▶ 右箭頭
      const rightText = this.add.text(-rowWidth / 2 + 195, 0, '▶', {
        fontSize: '18px',
        color: '#cccccc',
        fontFamily: FONT_FAMILY
      }).setOrigin(0.5)
      container.add(rightText)
      const rightHit = this.add.rectangle(-rowWidth / 2 + 195, 0, 32, 32, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
      rightHit.on('pointerdown', () => this.cycleCharacter(i, 1))
      rightHit.on('pointerover', () => rightText.setColor('#ffffff'))
      rightHit.on('pointerout', () => rightText.setColor('#cccccc'))
      container.add(rightHit)

      // 玩家 / 電腦 標籤
      const labelText = isHuman ? '玩家' : '電腦'
      const labelColor = isHuman ? '#3498db' : '#e67e22'
      const labelBg = isHuman ? 0x2980b9 : 0xe67e22

      const badge = this.add.graphics()
      badge.fillStyle(labelBg, 0.2)
      badge.fillRoundedRect(rowWidth / 2 - 80, -12, 60, 24, 4)
      badge.lineStyle(1, labelBg, 0.6)
      badge.strokeRoundedRect(rowWidth / 2 - 80, -12, 60, 24, 4)
      container.add(badge)

      const badgeText = this.add.text(rowWidth / 2 - 50, 0, labelText, {
        fontSize: '13px',
        color: labelColor,
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold'
      }).setOrigin(0.5)
      container.add(badgeText)
    }
  }

  /**
   * 切換玩家的角色（左/右循環）
   * 若目標角色已被其他玩家佔用，則與該玩家交換
   */
  private cycleCharacter(playerIdx: number, direction: number): void {
    const current = this.playerCharIndex[playerIdx]
    const next = (current + direction + ALL_CHARACTERS.length) % ALL_CHARACTERS.length

    // 若其他玩家已選此角色，則互換
    const swapIdx = this.playerCharIndex.findIndex((c, i) => i !== playerIdx && c === next)
    if (swapIdx !== -1) {
      this.playerCharIndex[swapIdx] = current
    }
    this.playerCharIndex[playerIdx] = next
    this.updateAssignmentDisplay()
  }

  /**
   * 建立開始遊戲按鈕
   */
  private createStartButton(centerX: number, y: number): void {
    const btnW = 220
    const btnH = 56

    const btnBg = this.add.graphics()
    btnBg.fillStyle(0xe74c3c, 1)
    btnBg.fillRoundedRect(centerX - btnW / 2, y - btnH / 2, btnW, btnH, 12)

    const btnText = this.add.text(centerX, y, '開始遊戲', {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold'
    }).setOrigin(0.5)

    const hitArea = this.add.rectangle(centerX, y, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true })

    hitArea.on('pointerover', () => {
      btnBg.clear()
      btnBg.fillStyle(0xc0392b, 1)
      btnBg.fillRoundedRect(centerX - btnW / 2, y - btnH / 2, btnW, btnH, 12)
      btnText.setScale(1.05)
    })
    hitArea.on('pointerout', () => {
      btnBg.clear()
      btnBg.fillStyle(0xe74c3c, 1)
      btnBg.fillRoundedRect(centerX - btnW / 2, y - btnH / 2, btnW, btnH, 12)
      btnText.setScale(1)
    })
    hitArea.on('pointerdown', () => {
      soundManager.stopBGM()
      const playerConfigs = this.buildPlayerConfigs()
      this.scene.start('GameScene', { playerConfigs })
    })
  }

  /**
   * 建立音量控制區塊（BGM + 音效兩條滑桿）
   */
  private createVolumeControls(centerX: number, y: number): void {
    this.add.text(centerX, y, '音量設定', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: FONT_FAMILY
    }).setOrigin(0.5)

    this.createVolumeSlider(
      'BGM', centerX, y + 28,
      () => soundManager.bgmVolume,
      v => soundManager.setBGMVolume(v)
    )
    this.createVolumeSlider(
      '音效', centerX, y + 58,
      () => soundManager.sfxVolume,
      v => soundManager.setSFXVolume(v)
    )
  }

  /**
   * 建立單條音量滑桿
   */
  private createVolumeSlider(
    label: string,
    x: number,
    y: number,
    getValue: () => number,
    setValue: (v: number) => void
  ): void {
    const trackW = 220
    const trackH = 6
    const thumbR = 8
    const labelOffsetX = 55

    this.add.text(x - trackW / 2 - labelOffsetX, y, label, {
      fontSize: '14px',
      color: '#cccccc',
      fontFamily: FONT_FAMILY
    }).setOrigin(0, 0.5)

    const pctText = this.add.text(x + trackW / 2 + 14, y, '', {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: FONT_FAMILY
    }).setOrigin(0, 0.5)

    const trackG = this.add.graphics()

    const redraw = () => {
      trackG.clear()
      const v = getValue()
      // 軌道底色
      trackG.fillStyle(0x2c3e50, 1)
      trackG.fillRoundedRect(x - trackW / 2, y - trackH / 2, trackW, trackH, trackH / 2)
      // 填充色
      trackG.fillStyle(0x3498db, 1)
      const fillW = Math.max(trackH, trackW * v)
      trackG.fillRoundedRect(x - trackW / 2, y - trackH / 2, fillW, trackH, trackH / 2)
      // 拖曳圓鈕
      trackG.fillStyle(0xffffff, 1)
      trackG.fillCircle(x - trackW / 2 + trackW * v, y, thumbR)
      // 百分比文字
      pctText.setText(`${Math.round(v * 100)}%`)
    }

    redraw()

    const hitArea = this.add.rectangle(x, y, trackW + thumbR * 2, thumbR * 2 + 8, 0x000000, 0)
      .setInteractive({ useHandCursor: true })

    const applyPointer = (ptr: Phaser.Input.Pointer) => {
      const localX = ptr.x - (x - trackW / 2)
      const v = Math.max(0, Math.min(1, localX / trackW))
      setValue(v)
      redraw()
    }

    hitArea.on('pointerdown', applyPointer)
    hitArea.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) applyPointer(ptr)
    })
  }

  /**
   * 根據目前選擇建立玩家設定陣列
   */
  private buildPlayerConfigs(): PlayerConfig[] {
    const configs: PlayerConfig[] = []
    for (let i = 0; i < 4; i++) {
      const character = ALL_CHARACTERS[this.playerCharIndex[i]]
      const charInfo = CHARACTERS[character]
      configs.push({
        character,
        name: charInfo.name,
        isAI: i >= this.humanCount
      })
    }
    return configs
  }
}
