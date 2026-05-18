import { Character, type CharacterInfo } from '../types'

// 遊戲基本常數
export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720
export const TOTAL_TILES = 32

// 金錢系統
export const STARTING_MONEY = 20000
export const SALARY = 2000               // 經過起點領取
export const CARD_PURCHASE_PRICE = 3000   // 銀行購買卡片
export const MAX_LOAN = 10000             // 最大借款額
export const DEPOSIT_INTEREST = 0.10      // 存款利率 10%
export const LOAN_INTEREST = 0.15         // 借款利率 15%

// 地產系統
export const BUILDING_COST_RATIO = 0.5    // 升級費用 = 空地價格 × 50%
export const HOTEL_COST_RATIO = 1.0       // 旅館升級費用 = 空地價格 × 100%
export const SELL_RATIO = 0.5             // 賣出回收 50%
export const FULL_SET_BONUS = 1.5         // 同色全套加成 +50%

// 過路費倍率
export const RENT_MULTIPLIERS: Record<number, number> = {
  0: 1,    // 空地
  1: 2,    // 一棟房子
  2: 4,    // 兩棟房子
  3: 8,    // 三棟房子
  4: 16    // 旅館
}

// 卡片系統
export const MAX_CARDS = 5               // 手持卡片上限
export const TAX_RATE = 0.10             // 查稅卡稅率 10%

// 骰子系統
export const MAX_CONSECUTIVE_DOUBLES = 3  // 連續雙數上限
export const REST_TILE_ID = 24           // 休息站格子 ID

// 遊戲設定
export const MAX_ROUNDS = 50             // 回合上限
export const PROPERTIES_PER_TIER = 4     // 每個等級的地產數量

// 角色定義
export const CHARACTERS: Record<Character, CharacterInfo> = {
  [Character.BUMBLEBEE]: {
    id: Character.BUMBLEBEE,
    name: '大黃蜂',
    color: 0xFFD700,
    colorHex: '#FFD700',
    imageKey: 'char-bumblebee'
  },
  [Character.MARIO]: {
    id: Character.MARIO,
    name: '馬力歐',
    color: 0xFF4444,
    colorHex: '#FF4444',
    imageKey: 'char-mario'
  },
  [Character.PIKMIN]: {
    id: Character.PIKMIN,
    name: '皮克敏',
    color: 0x44CC44,
    colorHex: '#44CC44',
    imageKey: 'char-pikmin'
  },
  [Character.METAGROSS]: {
    id: Character.METAGROSS,
    name: '巨金怪',
    color: 0x4488CC,
    colorHex: '#4488CC',
    imageKey: 'char-metagross'
  }
}
