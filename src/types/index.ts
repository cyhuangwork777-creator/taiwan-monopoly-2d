// 角色列舉
export enum Character {
  BUMBLEBEE = 'bumblebee',
  MARIO = 'mario',
  PIKMIN = 'pikmin',
  METAGROSS = 'metagross'
}

// 角色資訊
export interface CharacterInfo {
  id: Character
  name: string
  color: number     // 十六進位顏色
  colorHex: string  // CSS 顏色字串
  imageKey: string  // Phaser 圖片 key
}

// 地產等級
export enum PropertyTier {
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S'
}

// 格子類型
export enum TileType {
  START = 'start',
  PROPERTY = 'property',
  CHANCE = 'chance',
  FATE = 'fate',
  BANK = 'bank',
  REST = 'rest'
}

// 建築等級
export enum BuildingLevel {
  EMPTY = 0,
  HOUSE_1 = 1,
  HOUSE_2 = 2,
  HOUSE_3 = 3,
  HOTEL = 4
}

// 卡片類型
export enum CardType {
  CHANCE = 'chance',
  FATE = 'fate',
  SPECIAL = 'special'
}

// 特殊卡片 ID
export enum SpecialCardId {
  EQUALIZE = 'equalize',       // 均貧卡
  TAX_AUDIT = 'taxAudit',      // 查稅卡
  TOLL_FREE = 'tollFree',      // 免罰卡
  FORCE_BUY = 'forceBuy',      // 購地卡
  DEMOLISH = 'demolish',       // 拆除卡
  DOUBLE_RENT = 'doubleRent',  // 翻倍卡
  REMOTE_DICE = 'remoteDice',  // 遙控骰子
  ROADBLOCK = 'roadblock'      // 路障卡
}

// 遊戲階段
export enum GamePhase {
  ROLL_DICE = 'rollDice',
  MOVING = 'moving',
  LANDED = 'landed',
  ACTION = 'action',
  END_TURN = 'endTurn'
}

// 玩家資料
export interface Player {
  id: number
  name: string
  character: Character
  money: number
  position: number          // 棋盤格子索引 (0-31)
  properties: number[]      // 擁有的地產 ID 陣列
  cards: Card[]             // 手持特殊卡片
  isBankrupt: boolean
  isAI: boolean
  bankDeposit: number       // 銀行存款
  bankLoan: number          // 銀行借款
  skipNextTurn: boolean     // 是否跳過下一回合
  hasDoubleToll: boolean    // 翻倍卡效果
  hasTollFree: boolean      // 免罰卡效果
  consecutiveDoubles: number // 連續雙數次數
}

// 地產資料
export interface Property {
  id: number
  name: string
  tier: PropertyTier
  color: number             // 十六進位顏色
  price: number             // 空地價格
  baseRent: number          // 基礎過路費
  ownerId: number | null    // 擁有者玩家 ID
  buildingLevel: BuildingLevel
}

// 棋盤格子
export interface BoardTile {
  id: number                // 格子索引 (0-31)
  type: TileType
  propertyId?: number       // 如果是地產格，對應的地產 ID
  label: string             // 顯示名稱
}

// 卡片
export interface Card {
  id: string
  name: string
  type: CardType
  description: string
  effect: CardEffect
}

// 卡片效果
export interface CardEffect {
  action: string            // 效果動作識別碼
  value?: number            // 數值參數
  targetTile?: number       // 目標格子
}

// 骰子結果
export interface DiceResult {
  die1: number              // 第一顆骰子 (1-6)
  die2: number              // 第二顆骰子 (1-6)
  total: number             // 合計
  isDouble: boolean         // 是否為雙數
}

// 遊戲事件（用於 UI 顯示）
export interface GameEvent {
  type: string
  playerId: number
  message: string
  data?: Record<string, unknown>
}

// 路障資料
export interface Roadblock {
  tileId: number
  placedBy: number          // 放置者玩家 ID
}
