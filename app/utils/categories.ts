import type { Category } from './geo'

export const CATEGORIES: Category[] = ['convenience', 'supermarket', 'hypermarket', 'grocery', 'vending']

export const CATEGORY_LABELS: Record<Category, string> = {
  convenience: '便利商店',
  supermarket: '超市',
  hypermarket: '量販店',
  grocery: '雜貨店',
  vending: '自動販賣機',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  convenience: '#d9480f',
  supermarket: '#2b8a3e',
  hypermarket: '#1864ab',
  grocery: '#862e9c',
  vending: '#0c8599',
}

export const RADIUS_OPTIONS = [300, 500, 1000] as const
export const DEFAULT_RADIUS = 500
