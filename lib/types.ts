// EatFlow POS - Type Definitions

export interface Table {
  id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'bill-requested'
  currentOrderId?: string
}

export interface Category {
  id: string
  name: string
  order: number
}

export interface Product {
  id: string
  name: string
  price: number
  categoryId: string
  description?: string
  vatRate: 24 | 13 // Greek VAT rates
  available: boolean
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  price: number
  quantity: number
  notes?: string
  status: 'pending' | 'preparing' | 'ready' | 'served'
  createdAt: string
}

export interface Order {
  id: string
  tableId: string
  tableNumber: number
  items: OrderItem[]
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
  completedAt?: string
  paymentMethod?: 'cash' | 'card'
  total: number
  vatAmount: number
}

export interface DailySummary {
  date: string
  totalRevenue: number
  orderCount: number
  averageCheck: number
  cashPayments: number
  cardPayments: number
  topProducts: { productId: string; productName: string; quantity: number; revenue: number }[]
  hourlyRevenue: { hour: number; revenue: number }[]
}

// Helper type for status badges
export type TableStatus = Table['status']
export type OrderStatus = Order['status']
export type OrderItemStatus = OrderItem['status']
