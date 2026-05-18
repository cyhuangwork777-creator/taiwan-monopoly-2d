import { type BoardTile, type Property, TileType, PropertyTier, BuildingLevel } from '../types'

// 地產等級對應顏色
export const TIER_COLORS: Record<PropertyTier, number> = {
  [PropertyTier.D]: 0x27ae60,  // 綠色
  [PropertyTier.C]: 0xe67e22,  // 橙色
  [PropertyTier.B]: 0x8e44ad,  // 紫色
  [PropertyTier.A]: 0x2980b9,  // 藍色
  [PropertyTier.S]: 0xe74c3c   // 紅色
}

// 20 個台灣地產定義
export const PROPERTIES: Property[] = [
  // D 級（綠色）— 宜蘭、花蓮、台東、南投
  { id: 0,  name: '宜蘭市',   tier: PropertyTier.D, color: TIER_COLORS[PropertyTier.D], price: 1000, baseRent: 100, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 1,  name: '花蓮市',   tier: PropertyTier.D, color: TIER_COLORS[PropertyTier.D], price: 1000, baseRent: 100, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 2,  name: '台東市',   tier: PropertyTier.D, color: TIER_COLORS[PropertyTier.D], price: 1000, baseRent: 100, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 3,  name: '南投埔里', tier: PropertyTier.D, color: TIER_COLORS[PropertyTier.D], price: 1000, baseRent: 100, ownerId: null, buildingLevel: BuildingLevel.EMPTY },

  // C 級（橙色）— 台南、高雄、嘉義、屏東
  { id: 4,  name: '台南安平', tier: PropertyTier.C, color: TIER_COLORS[PropertyTier.C], price: 2000, baseRent: 200, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 5,  name: '高雄左營', tier: PropertyTier.C, color: TIER_COLORS[PropertyTier.C], price: 2000, baseRent: 200, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 6,  name: '嘉義市',   tier: PropertyTier.C, color: TIER_COLORS[PropertyTier.C], price: 2000, baseRent: 200, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 7,  name: '屏東市',   tier: PropertyTier.C, color: TIER_COLORS[PropertyTier.C], price: 2000, baseRent: 200, ownerId: null, buildingLevel: BuildingLevel.EMPTY },

  // B 級（紫色）— 台中×2、彰化、苗栗
  { id: 8,  name: '台中西屯', tier: PropertyTier.B, color: TIER_COLORS[PropertyTier.B], price: 3500, baseRent: 350, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 9,  name: '台中北屯', tier: PropertyTier.B, color: TIER_COLORS[PropertyTier.B], price: 3500, baseRent: 350, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 10, name: '彰化市',   tier: PropertyTier.B, color: TIER_COLORS[PropertyTier.B], price: 3500, baseRent: 350, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 11, name: '苗栗頭份', tier: PropertyTier.B, color: TIER_COLORS[PropertyTier.B], price: 3500, baseRent: 350, ownerId: null, buildingLevel: BuildingLevel.EMPTY },

  // A 級（藍色）— 新北、桃園、新竹、基隆
  { id: 12, name: '新北板橋', tier: PropertyTier.A, color: TIER_COLORS[PropertyTier.A], price: 5500, baseRent: 550, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 13, name: '桃園中壢', tier: PropertyTier.A, color: TIER_COLORS[PropertyTier.A], price: 5500, baseRent: 550, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 14, name: '新竹竹北', tier: PropertyTier.A, color: TIER_COLORS[PropertyTier.A], price: 5500, baseRent: 550, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 15, name: '基隆市',   tier: PropertyTier.A, color: TIER_COLORS[PropertyTier.A], price: 5500, baseRent: 550, ownerId: null, buildingLevel: BuildingLevel.EMPTY },

  // S 級（紅色）— 台北×3、澎湖
  { id: 16, name: '台北信義', tier: PropertyTier.S, color: TIER_COLORS[PropertyTier.S], price: 8000, baseRent: 800, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 17, name: '台北大安', tier: PropertyTier.S, color: TIER_COLORS[PropertyTier.S], price: 8000, baseRent: 800, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 18, name: '台北中山', tier: PropertyTier.S, color: TIER_COLORS[PropertyTier.S], price: 8000, baseRent: 800, ownerId: null, buildingLevel: BuildingLevel.EMPTY },
  { id: 19, name: '澎湖馬公', tier: PropertyTier.S, color: TIER_COLORS[PropertyTier.S], price: 8000, baseRent: 800, ownerId: null, buildingLevel: BuildingLevel.EMPTY }
]

// 32 格棋盤定義（從起點順時針）
export const BOARD_TILES: BoardTile[] = [
  { id: 0,  type: TileType.START,    label: '起點' },
  { id: 1,  type: TileType.PROPERTY, label: '宜蘭市',   propertyId: 0 },
  { id: 2,  type: TileType.PROPERTY, label: '花蓮市',   propertyId: 1 },
  { id: 3,  type: TileType.CHANCE,   label: '機會' },
  { id: 4,  type: TileType.PROPERTY, label: '台東市',   propertyId: 2 },
  { id: 5,  type: TileType.PROPERTY, label: '南投埔里', propertyId: 3 },
  { id: 6,  type: TileType.BANK,     label: '銀行' },
  { id: 7,  type: TileType.PROPERTY, label: '台南安平', propertyId: 4 },

  { id: 8,  type: TileType.PROPERTY, label: '高雄左營', propertyId: 5 },
  { id: 9,  type: TileType.FATE,     label: '命運' },
  { id: 10, type: TileType.PROPERTY, label: '嘉義市',   propertyId: 6 },
  { id: 11, type: TileType.PROPERTY, label: '屏東市',   propertyId: 7 },
  { id: 12, type: TileType.CHANCE,   label: '機會' },
  { id: 13, type: TileType.PROPERTY, label: '台中西屯', propertyId: 8 },
  { id: 14, type: TileType.PROPERTY, label: '台中北屯', propertyId: 9 },
  { id: 15, type: TileType.FATE,     label: '命運' },

  { id: 16, type: TileType.PROPERTY, label: '彰化市',   propertyId: 10 },
  { id: 17, type: TileType.PROPERTY, label: '苗栗頭份', propertyId: 11 },
  { id: 18, type: TileType.BANK,     label: '銀行' },
  { id: 19, type: TileType.PROPERTY, label: '新北板橋', propertyId: 12 },
  { id: 20, type: TileType.PROPERTY, label: '桃園中壢', propertyId: 13 },
  { id: 21, type: TileType.CHANCE,   label: '機會' },
  { id: 22, type: TileType.PROPERTY, label: '新竹竹北', propertyId: 14 },
  { id: 23, type: TileType.PROPERTY, label: '基隆市',   propertyId: 15 },

  { id: 24, type: TileType.REST,     label: '休息站' },
  { id: 25, type: TileType.FATE,     label: '命運' },
  { id: 26, type: TileType.PROPERTY, label: '台北信義', propertyId: 16 },
  { id: 27, type: TileType.PROPERTY, label: '台北大安', propertyId: 17 },
  { id: 28, type: TileType.CHANCE,   label: '機會' },
  { id: 29, type: TileType.PROPERTY, label: '台北中山', propertyId: 18 },
  { id: 30, type: TileType.PROPERTY, label: '澎湖馬公', propertyId: 19 },
  { id: 31, type: TileType.FATE,     label: '命運' }
]
