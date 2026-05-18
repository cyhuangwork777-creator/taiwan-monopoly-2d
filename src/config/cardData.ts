import { type Card, CardType, SpecialCardId } from '../types'

// 機會卡（12 張）
export const CHANCE_CARDS: Card[] = [
  { id: 'chance-1',  name: '小額獎金',     type: CardType.CHANCE, description: '獲得 $1,000', effect: { action: 'gainMoney', value: 1000 } },
  { id: 'chance-2',  name: '中額獎金',     type: CardType.CHANCE, description: '獲得 $2,000', effect: { action: 'gainMoney', value: 2000 } },
  { id: 'chance-3',  name: '大額獎金',     type: CardType.CHANCE, description: '獲得 $3,000', effect: { action: 'gainMoney', value: 3000 } },
  { id: 'chance-4',  name: '前進到起點',   type: CardType.CHANCE, description: '前進到起點，並領取薪水', effect: { action: 'moveToTile', targetTile: 0 } },
  { id: 'chance-5',  name: '前往台北信義', type: CardType.CHANCE, description: '直接前往台北信義', effect: { action: 'moveToTile', targetTile: 26 } },
  { id: 'chance-6',  name: '前往高雄左營', type: CardType.CHANCE, description: '直接前往高雄左營', effect: { action: 'moveToTile', targetTile: 8 } },
  { id: 'chance-7',  name: '獲得卡片',     type: CardType.CHANCE, description: '隨機獲得一張特殊卡片', effect: { action: 'gainRandomCard' } },
  { id: 'chance-8',  name: '免費升級',     type: CardType.CHANCE, description: '免費升級一處自有地產', effect: { action: 'freeUpgrade' } },
  { id: 'chance-9',  name: '眾人祝福',     type: CardType.CHANCE, description: '每位其他玩家給你 $500', effect: { action: 'collectFromAll', value: 500 } },
  { id: 'chance-10', name: '前往銀行',     type: CardType.CHANCE, description: '前往最近的銀行', effect: { action: 'moveToNearest', value: 0 } },
  { id: 'chance-11', name: '向前三步',     type: CardType.CHANCE, description: '向前走 3 步', effect: { action: 'moveForward', value: 3 } },
  { id: 'chance-12', name: '後退兩步',     type: CardType.CHANCE, description: '後退 2 步', effect: { action: 'moveBackward', value: 2 } }
]

// 命運卡（12 張）
export const FATE_CARDS: Card[] = [
  { id: 'fate-1',  name: '小額罰款',   type: CardType.FATE, description: '損失 $1,000', effect: { action: 'loseMoney', value: 1000 } },
  { id: 'fate-2',  name: '中額罰款',   type: CardType.FATE, description: '損失 $2,000', effect: { action: 'loseMoney', value: 2000 } },
  { id: 'fate-3',  name: '大額罰款',   type: CardType.FATE, description: '損失 $3,000', effect: { action: 'loseMoney', value: 3000 } },
  { id: 'fate-4',  name: '退回起點',   type: CardType.FATE, description: '回到起點（不領薪水）', effect: { action: 'teleportToTile', targetTile: 0 } },
  { id: 'fate-5',  name: '房屋維修',   type: CardType.FATE, description: '每棟房子繳 $200、每座旅館繳 $500', effect: { action: 'repairCost', value: 200 } },
  { id: 'fate-6',  name: '送往休息站', type: CardType.FATE, description: '直接送往休息站，停留一回合', effect: { action: 'sendToRest' } },
  { id: 'fate-7',  name: '金錢洗牌',   type: CardType.FATE, description: '所有玩家的現金重新隨機分配', effect: { action: 'shuffleMoney' } },
  { id: 'fate-8',  name: '意外保險',   type: CardType.FATE, description: '獲得 $1,500 保險金', effect: { action: 'gainMoney', value: 1500 } },
  { id: 'fate-9',  name: '地震災害',   type: CardType.FATE, description: '隨機一處自有地產降級一層', effect: { action: 'downgradeRandom' } },
  { id: 'fate-10', name: '稅務稽查',   type: CardType.FATE, description: '繳交總資產 5% 的稅', effect: { action: 'payTaxPercent', value: 5 } },
  { id: 'fate-11', name: '獲得卡片',   type: CardType.FATE, description: '隨機獲得一張特殊卡片', effect: { action: 'gainRandomCard' } },
  { id: 'fate-12', name: '生日快樂',   type: CardType.FATE, description: '每位其他玩家給你 $300', effect: { action: 'collectFromAll', value: 300 } }
]

// 特殊卡片（8 種）
export const SPECIAL_CARDS: Card[] = [
  {
    id: SpecialCardId.EQUALIZE,
    name: '均貧卡',
    type: CardType.SPECIAL,
    description: '所有玩家金錢重新平均分配',
    effect: { action: 'equalizeMoney' }
  },
  {
    id: SpecialCardId.TAX_AUDIT,
    name: '查稅卡',
    type: CardType.SPECIAL,
    description: '指定一位玩家繳交總資產 10% 稅金',
    effect: { action: 'taxAudit' }
  },
  {
    id: SpecialCardId.TOLL_FREE,
    name: '免罰卡',
    type: CardType.SPECIAL,
    description: '下次被收取過路費時免除',
    effect: { action: 'tollFree' }
  },
  {
    id: SpecialCardId.FORCE_BUY,
    name: '購地卡',
    type: CardType.SPECIAL,
    description: '強制購買當前所在的他人地產（原價）',
    effect: { action: 'forceBuy' }
  },
  {
    id: SpecialCardId.DEMOLISH,
    name: '拆除卡',
    type: CardType.SPECIAL,
    description: '拆除指定地產上的一棟建築',
    effect: { action: 'demolish' }
  },
  {
    id: SpecialCardId.DOUBLE_RENT,
    name: '翻倍卡',
    type: CardType.SPECIAL,
    description: '下次收取過路費時金額翻倍',
    effect: { action: 'doubleRent' }
  },
  {
    id: SpecialCardId.REMOTE_DICE,
    name: '遙控骰子',
    type: CardType.SPECIAL,
    description: '下次擲骰可自選 1-12 的步數',
    effect: { action: 'remoteDice' }
  },
  {
    id: SpecialCardId.ROADBLOCK,
    name: '路障卡',
    type: CardType.SPECIAL,
    description: '在指定格子放置路障，經過的人停留一回合',
    effect: { action: 'placeRoadblock' }
  }
]
