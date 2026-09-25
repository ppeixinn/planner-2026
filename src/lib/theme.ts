// Morandi palettes. `head` is the planner's header bar colour; `deep` is used
// for text/controls on white and must stay ≥4.5:1 contrast.
export interface Palette {
  id: string;
  zh: string;
  en: string;
  head: string;
  deep: string;
  tint: string;
  paper: string;
  grid: string;
}

export const PALETTES: Palette[] = [
  { id: 'sage', zh: '鼠尾草', en: 'Sage', head: '#A3B39A', deep: '#4F6647', tint: '#EAF0E5', paper: '#F6F6F2', grid: '#EAEAE5' },
  { id: 'rose', zh: '豆沙', en: 'Rose', head: '#D2B4AE', deep: '#85524C', tint: '#F5E9E6', paper: '#F9F5F3', grid: '#EFE6E3' },
  { id: 'haze', zh: '雾霾蓝', en: 'Haze blue', head: '#A7B6C4', deep: '#4A5F73', tint: '#E7EDF2', paper: '#F4F6F8', grid: '#E4E9EE' },
  { id: 'oat', zh: '燕麦', en: 'Oat', head: '#CFC1A9', deep: '#6B5C44', tint: '#F3EDE3', paper: '#F8F6F1', grid: '#ECE7DD' },
  { id: 'lilac', zh: '灰紫', en: 'Lilac grey', head: '#B9B0C6', deep: '#5C5470', tint: '#EFECF3', paper: '#F7F5F8', grid: '#E9E6EE' },
  { id: 'clay', zh: '陶土', en: 'Clay', head: '#C8A393', deep: '#7A4F40', tint: '#F4E9E3', paper: '#F9F5F2', grid: '#EEE4DE' }
];

export function palette(id: string | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export interface HandFont {
  id: string;
  label: string;
  family: string;
}

export const HAND_FONTS: HandFont[] = [
  { id: 'casual', label: '随性 Casual · Caveat + 龙藏体', family: "'Caveat', 'Long Cang', cursive" },
  { id: 'round', label: '圆润 Rounded · Patrick Hand + 快乐体', family: "'Patrick Hand', 'ZCOOL KuaiLe', cursive" },
  { id: 'brush', label: '书法 Brush · Caveat Brush + 马善政', family: "'Caveat Brush', 'Ma Shan Zheng', cursive" }
];

export interface PenSet {
  personal: string;
  personalBg: string;
  important: string;
  importantBg: string;
  birthday: string;
  birthdayBg: string;
}

const PENS_BRIGHT: PenSet = {
  personal: '#9A4D00', personalBg: '#FCEBD9',
  important: '#A51F26', importantBg: '#FBDDE0',
  birthday: '#962459', birthdayBg: '#FBE3EE'
};

const PENS_SOFT: PenSet = {
  personal: '#8A5A3C', personalBg: '#F1E4DA',
  important: '#8E4449', importantBg: '#F0DEDC',
  birthday: '#8A4A66', birthdayBg: '#F1E1E8'
};

export function applyTheme(p: Palette, fontId: string, soft: boolean): void {
  const r = document.documentElement.style;
  r.setProperty('--head', p.head);
  r.setProperty('--deep', p.deep);
  r.setProperty('--tint', p.tint);
  r.setProperty('--paper', p.paper);
  r.setProperty('--grid', p.grid);
  const font = HAND_FONTS.find((f) => f.id === fontId) ?? HAND_FONTS[0];
  r.setProperty('--hand', font.family);
  const pens = soft ? PENS_SOFT : PENS_BRIGHT;
  r.setProperty('--pen-personal', pens.personal);
  r.setProperty('--pen-personal-bg', pens.personalBg);
  r.setProperty('--pen-important', pens.important);
  r.setProperty('--pen-important-bg', pens.importantBg);
  r.setProperty('--pen-birthday', pens.birthday);
  r.setProperty('--pen-birthday-bg', pens.birthdayBg);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.head);
}
