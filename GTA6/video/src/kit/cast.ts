// Единый каст: внешность постоянных персонажей. Использовать так: <Character {...CAST.pm} eyes=… mouth=… position=… />
import type { CharacterProps } from "./Character";

type Look = Partial<CharacterProps>;
export const CAST: Record<string, Look> = {
  // Премьер-министр: лысеющий начальник с зачёсом, серый костюм, красный галстук
  pm: { outfit: "suit", color: "#4a5363", color2: "#30363f", tie: "#c62828", hat: "combover", hairColor: "#7d7466", skin: "#f3cfa6", stubble: false },
  // Министр обороны: генеральский мундир, фуражка, усы, медали
  defense: { outfit: "uniform", color: "#56633b", color2: "#3d4729", hat: "militaryCap", hatColor: "#4a5631", medals: true, mustache: true, hairColor: "#3b2a1a", skin: "#e9bd92" },
  // Министр сельского хозяйства: клетчатая рубашка, соломенная шляпа
  agri: { outfit: "flannel", color: "#2f7d4a", color2: "#5b4636", hat: "strawHat", skin: "#f1c9a0", beard: false, stubble: true },
  // Инженер электросети: каска, очки, комбинезон
  engineer: { outfit: "overalls", color: "#1f5fa8", color2: "#1f5fa8", hat: "hardHat", glasses: "round", skin: "#f5d3ae" },
  // Командир на стене: камуфляж, каска, тёмные очки
  commander: { outfit: "camo", color: "#5f6b3a", color2: "#4a5230", hat: "helmet", hatColor: "#4b5320", glasses: "shades", stubble: true, skin: "#e2b48a" },
  // Спецназовец (×3): чёрная тактика, балаклава
  swat: { outfit: "tactical", hat: "balaclava", hatColor: "#141414", skin: "#e9bf96", eyes: "angry" },
  // Солдат на стене
  soldier: { outfit: "camo", hat: "helmet", hatColor: "#55613a", skin: "#efc79e" },
  // Главный геймер-прорывальщик: серое худи, взъерошенные волосы, уши (одно откушено), кровь
  gamer: { outfit: "hoodie", color: "#5b6270", color2: "#283a5e", hat: "messyHair", hairColor: "#3a2414", ears: true, missingEar: true, blood: 0.8, stubble: true, skin: "#f0caa3" },
  // Диктор новостей: гладкая укладка, синий костюм
  anchor: { outfit: "suit", color: "#1d3d7a", color2: "#14284f", tie: "#e6b422", hat: "slickHair", hairColor: "#20160f", skin: "#f2cda5" },
  // Семья в квартире
  dad: { outfit: "tshirt", color: "#2e86c1", color2: "#3c3c3c", hat: "slickHair", hairColor: "#6b4226", mustache: true, skin: "#f3cba1" },
  mom: { outfit: "dress", color: "#c0392b", hat: "bun", hairColor: "#a0522d", skin: "#f6d3b0" },
  kid: { outfit: "tshirt", color: "#f1c40f", color2: "#2c3e50", hat: "beanie", hatColor: "#16a085", skin: "#f6d3b0", scale: 0.78 },
  grandpa: { outfit: "cardigan", color: "#8b7765", color2: "#555", hat: "baldGray", hairColor: "#e6e6e6", glasses: "round", skin: "#efc9a3", stubble: false },
  // Геймер с HDMI (часть 2): кепка козырьком, футболка, гарнитура не нужна
  gamer2: { outfit: "tshirt", color: "#7d3c98", color2: "#2c3e50", hat: "cap", hatColor: "#222", stubble: true, sweat: 1, skin: "#e8bb90" },
};
