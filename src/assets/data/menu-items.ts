import { MenuItemType } from '@/types/menu'
import {
  LayoutDashboard,
  Cpu,
  ShoppingBag,
  Package,
  Users,
  Wallet,
  Bell,
  Megaphone,
  Store,
  CreditCard,
  UserPlus,
  ClipboardList,
  Tag,
  Layers,
  UserCheck,
  BarChart2,
  Building2,
  ClipboardCheck,
  CalendarClock,
  Home,
  History,
} from 'lucide-react'

// ─── Admin / Super-admin menu (roles 1, 2) ────────────────────────────────────
export const MENU_ITEMS: MenuItemType[] = [
  {
    key: 'main-nav',
    label: 'Main',
    isTitle: true,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/dashboard',
  },
  {
    key: 'operations-nav',
    label: 'Operations',
    isTitle: true,
  },
  {
    key: 'machines',
    label: 'Machines',
    icon: Cpu,
    url: '/machines',
  },
  {
    key: 'stock',
    label: 'Stock',
    icon: Layers,
    url: '/stock',
  },
  {
    key: 'items',
    label: 'Items',
    icon: Package,
    url: '/items',
  },
  {
    key: 'alerts',
    label: 'Alerts',
    icon: Bell,
    url: '/alerts',
  },
  {
    key: 'promotions',
    label: 'Promotions',
    icon: Megaphone,
    url: '/promotions',
  },
  {
    key: 'users-nav',
    label: 'Users',
    isTitle: true,
  },
  {
    key: 'users',
    label: 'Users',
    icon: Users,
    url: '/users',
  },
  {
    key: 'agents',
    label: 'Agents',
    icon: UserCheck,
    url: '/agents',
  },
  {
    key: 'organizations',
    label: 'Organizations',
    icon: Building2,
    url: '/organizations',
  },
  {
    key: 'finance-nav',
    label: 'Finance',
    isTitle: true,
  },
  {
    key: 'sales',
    label: 'Sales Reports',
    icon: BarChart2,
    url: '/sales',
  },
  {
    key: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    url: '/wallet',
  },
  {
    key: 'memberships',
    label: 'Memberships',
    icon: CreditCard,
    url: '/memberships',
  },
  {
    key: 'more-nav',
    label: 'More',
    isTitle: true,
  },
  {
    key: 'outlets',
    label: 'Outlets',
    icon: Store,
    url: '/outlets',
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: ShoppingBag,
    url: '/orders',
  },
  {
    key: 'reservations',
    label: 'Reservations',
    icon: CalendarClock,
    url: '/reservations',
  },
]

// ─── Agent menu (role 4) ───────────────────────────────────────────────────────
export const AGENT_MENU_ITEMS: MenuItemType[] = [
  {
    key: 'agent-main',
    label: 'Main',
    isTitle: true,
  },
  {
    key: 'agent-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/agent/dashboard',
  },
  {
    key: 'agent-machines',
    label: 'My Machines',
    icon: Cpu,
    url: '/agent/machines',
  },
  {
    key: 'agent-orders',
    label: 'Orders',
    icon: ShoppingBag,
    url: '/agent/orders',
  },
  {
    key: 'agent-customers',
    label: 'Customers',
    isTitle: true,
  },
  {
    key: 'agent-create-customer',
    label: 'Create Customer',
    icon: UserPlus,
    url: '/agent/create-customer',
  },
  {
    key: 'agent-sell-membership',
    label: 'Sell Membership',
    icon: Tag,
    url: '/agent/sell-membership',
  },
  {
    key: 'agent-wallet-topup',
    label: 'Wallet Top-Up',
    icon: Wallet,
    url: '/agent/wallet-topup',
  },
  {
    key: 'agent-inspection',
    label: 'Inspection',
    icon: ClipboardCheck,
    url: '/agent/inspection',
  },
  {
    key: 'agent-activity-log',
    label: 'Activity Log',
    icon: History,
    url: '/agent/activity-log',
  },
]

// ─── Customer menu (role 5) ───────────────────────────────────────────────────
export const CUSTOMER_MENU_ITEMS: MenuItemType[] = [
  {
    key: 'customer-dashboard',
    label: 'Dashboard',
    icon: Home,
    url: '/customer/dashboard',
  },
  {
    key: 'customer-wallet',
    label: 'My Wallet',
    icon: Wallet,
    url: '/customer/wallet',
  },
  {
    key: 'customer-orders',
    label: 'My Orders',
    icon: ClipboardList,
    url: '/customer/orders',
  },
  {
    key: 'customer-membership',
    label: 'Membership',
    icon: CreditCard,
    url: '/customer/membership',
  },
  {
    key: 'customer-reservations',
    label: 'Food Reservations',
    icon: CalendarClock,
    url: '/customer/reservations',
  },
]

// Horizontal layout — same as admin menu (used by HorizontalLayout component)
export const HORIZONTAL_MENU_ITEM: MenuItemType[] = MENU_ITEMS
