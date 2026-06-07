import {
  Book,
  Bookmark,
  Briefcase,
  Calendar,
  Code,
  Coffee,
  DollarSign,
  Dumbbell,
  Flag,
  Folder,
  Gift,
  Heart,
  Home,
  Lightbulb,
  ListTodo,
  Music,
  Phone,
  Plane,
  ShoppingCart,
  Star,
  Sun,
  Target,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Curated set used by the icon picker. Storing only these names keeps the
// bundle small (vs. importing the whole lucide icon map).
export const TASK_LIST_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'ListTodo', Icon: ListTodo },
  { name: 'Star', Icon: Star },
  { name: 'Sun', Icon: Sun },
  { name: 'Flag', Icon: Flag },
  { name: 'Target', Icon: Target },
  { name: 'Zap', Icon: Zap },
  { name: 'Heart', Icon: Heart },
  { name: 'Bookmark', Icon: Bookmark },
  { name: 'Home', Icon: Home },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'Folder', Icon: Folder },
  { name: 'Calendar', Icon: Calendar },
  { name: 'ShoppingCart', Icon: ShoppingCart },
  { name: 'DollarSign', Icon: DollarSign },
  { name: 'Coffee', Icon: Coffee },
  { name: 'Dumbbell', Icon: Dumbbell },
  { name: 'Book', Icon: Book },
  { name: 'Code', Icon: Code },
  { name: 'Lightbulb', Icon: Lightbulb },
  { name: 'Music', Icon: Music },
  { name: 'Plane', Icon: Plane },
  { name: 'Gift', Icon: Gift },
  { name: 'Phone', Icon: Phone },
  { name: 'Users', Icon: Users },
]

export const DEFAULT_TASK_LIST_ICON = 'ListTodo'

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  TASK_LIST_ICONS.map(({ name, Icon }) => [name, Icon]),
)

export function getListIcon(name?: string | null): LucideIcon {
  return (name ? ICON_MAP[name] : undefined) ?? ICON_MAP[DEFAULT_TASK_LIST_ICON]
}

// Accent palette (shared visual language with the tag picker palette).
export const TASK_LIST_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#64748b', // slate
]
