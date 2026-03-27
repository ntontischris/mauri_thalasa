'use client'

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Table, Category, Product, Order, OrderItem } from './types'
import { initialTables, initialCategories, initialProducts, initialOrders, generateId } from './mock-data'

// State interface
interface POSState {
  tables: Table[]
  categories: Category[]
  products: Product[]
  orders: Order[]
  isLoaded: boolean
}

// Action types
type POSAction =
  | { type: 'LOAD_STATE'; payload: Partial<POSState> }
  | { type: 'SET_LOADED' }
  // Table actions
  | { type: 'UPDATE_TABLE'; payload: Table }
  | { type: 'SET_TABLE_STATUS'; payload: { tableId: string; status: Table['status']; orderId?: string } }
  // Category actions
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  // Product actions
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'TOGGLE_PRODUCT_AVAILABILITY'; payload: string }
  // Order actions
  | { type: 'CREATE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'ADD_ORDER_ITEM'; payload: { orderId: string; item: OrderItem } }
  | { type: 'UPDATE_ORDER_ITEM'; payload: { orderId: string; item: OrderItem } }
  | { type: 'REMOVE_ORDER_ITEM'; payload: { orderId: string; itemId: string } }
  | { type: 'UPDATE_ITEM_STATUS'; payload: { orderId: string; itemId: string; status: OrderItem['status'] } }
  | { type: 'COMPLETE_ORDER'; payload: { orderId: string; paymentMethod: 'cash' | 'card' } }
  | { type: 'CANCEL_ORDER'; payload: string }

// Reducer
function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload }
    
    case 'SET_LOADED':
      return { ...state, isLoaded: true }

    case 'UPDATE_TABLE':
      return {
        ...state,
        tables: state.tables.map(t => t.id === action.payload.id ? action.payload : t)
      }

    case 'SET_TABLE_STATUS':
      return {
        ...state,
        tables: state.tables.map(t => 
          t.id === action.payload.tableId 
            ? { ...t, status: action.payload.status, currentOrderId: action.payload.orderId }
            : t
        )
      }

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] }

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c)
      }

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.payload)
      }

    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] }

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p)
      }

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload)
      }

    case 'TOGGLE_PRODUCT_AVAILABILITY':
      return {
        ...state,
        products: state.products.map(p => 
          p.id === action.payload ? { ...p, available: !p.available } : p
        )
      }

    case 'CREATE_ORDER':
      return { ...state, orders: [...state.orders, action.payload] }

    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o)
      }

    case 'ADD_ORDER_ITEM': {
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            const newItems = [...o.items, action.payload.item]
            return {
              ...o,
              items: newItems,
              total: calculateTotal(newItems, state.products),
              vatAmount: calculateVAT(newItems, state.products)
            }
          }
          return o
        })
      }
    }

    case 'UPDATE_ORDER_ITEM': {
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            const newItems = o.items.map(i => 
              i.id === action.payload.item.id ? action.payload.item : i
            )
            return {
              ...o,
              items: newItems,
              total: calculateTotal(newItems, state.products),
              vatAmount: calculateVAT(newItems, state.products)
            }
          }
          return o
        })
      }
    }

    case 'REMOVE_ORDER_ITEM': {
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            const newItems = o.items.filter(i => i.id !== action.payload.itemId)
            return {
              ...o,
              items: newItems,
              total: calculateTotal(newItems, state.products),
              vatAmount: calculateVAT(newItems, state.products)
            }
          }
          return o
        })
      }
    }

    case 'UPDATE_ITEM_STATUS':
      return {
        ...state,
        orders: state.orders.map(o => {
          if (o.id === action.payload.orderId) {
            return {
              ...o,
              items: o.items.map(i => 
                i.id === action.payload.itemId ? { ...i, status: action.payload.status } : i
              )
            }
          }
          return o
        })
      }

    case 'COMPLETE_ORDER': {
      const order = state.orders.find(o => o.id === action.payload.orderId)
      if (!order) return state
      
      return {
        ...state,
        orders: state.orders.map(o => 
          o.id === action.payload.orderId 
            ? { 
                ...o, 
                status: 'completed', 
                paymentMethod: action.payload.paymentMethod,
                completedAt: new Date().toISOString()
              } 
            : o
        ),
        tables: state.tables.map(t => 
          t.id === order.tableId 
            ? { ...t, status: 'available' as const, currentOrderId: undefined }
            : t
        )
      }
    }

    case 'CANCEL_ORDER': {
      const order = state.orders.find(o => o.id === action.payload)
      if (!order) return state
      
      return {
        ...state,
        orders: state.orders.map(o => 
          o.id === action.payload ? { ...o, status: 'cancelled' } : o
        ),
        tables: state.tables.map(t => 
          t.id === order.tableId 
            ? { ...t, status: 'available' as const, currentOrderId: undefined }
            : t
        )
      }
    }

    default:
      return state
  }
}

// Helper functions
function calculateTotal(items: OrderItem[], products: Product[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity)
  }, 0)
}

function calculateVAT(items: OrderItem[], products: Product[]): number {
  return items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)
    const vatRate = product?.vatRate || 24
    const itemTotal = item.price * item.quantity
    return sum + (itemTotal * vatRate / (100 + vatRate))
  }, 0)
}

// Initial state
const initialState: POSState = {
  tables: initialTables,
  categories: initialCategories,
  products: initialProducts,
  orders: initialOrders,
  isLoaded: false
}

// Context
interface POSContextType {
  state: POSState
  dispatch: React.Dispatch<POSAction>
  // Helper functions
  getTable: (id: string) => Table | undefined
  getCategory: (id: string) => Category | undefined
  getProduct: (id: string) => Product | undefined
  getOrder: (id: string) => Order | undefined
  getActiveOrderForTable: (tableId: string) => Order | undefined
  getProductsByCategory: (categoryId: string) => Product[]
  getKitchenOrders: () => Order[]
  createNewOrder: (tableId: string, tableNumber: number) => string
  addItemToOrder: (orderId: string, product: Product, quantity?: number, notes?: string) => void
}

const POSContext = createContext<POSContextType | undefined>(undefined)

// Storage key
const STORAGE_KEY = 'eatflow-pos-state'

// Provider
export function POSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState)

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        dispatch({ type: 'LOAD_STATE', payload: parsed })
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e)
    }
    dispatch({ type: 'SET_LOADED' })
  }, [])

  // Save state to localStorage on changes
  useEffect(() => {
    if (state.isLoaded) {
      try {
        const toStore = {
          tables: state.tables,
          categories: state.categories,
          products: state.products,
          orders: state.orders
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
      } catch (e) {
        console.error('Failed to save state to localStorage:', e)
      }
    }
  }, [state])

  // Helper functions
  const getTable = (id: string) => state.tables.find(t => t.id === id)
  const getCategory = (id: string) => state.categories.find(c => c.id === id)
  const getProduct = (id: string) => state.products.find(p => p.id === id)
  const getOrder = (id: string) => state.orders.find(o => o.id === id)
  
  const getActiveOrderForTable = (tableId: string) => 
    state.orders.find(o => o.tableId === tableId && o.status === 'active')
  
  const getProductsByCategory = (categoryId: string) =>
    state.products.filter(p => p.categoryId === categoryId)
  
  const getKitchenOrders = () =>
    state.orders.filter(o => 
      o.status === 'active' && 
      o.items.some(i => i.status !== 'served')
    )

  const createNewOrder = (tableId: string, tableNumber: number): string => {
    const orderId = generateId()
    const newOrder: Order = {
      id: orderId,
      tableId,
      tableNumber,
      items: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      total: 0,
      vatAmount: 0
    }
    dispatch({ type: 'CREATE_ORDER', payload: newOrder })
    dispatch({ type: 'SET_TABLE_STATUS', payload: { tableId, status: 'occupied', orderId } })
    return orderId
  }

  const addItemToOrder = (orderId: string, product: Product, quantity = 1, notes?: string) => {
    const order = getOrder(orderId)
    if (!order) return

    // Check if item already exists in order
    const existingItem = order.items.find(
      i => i.productId === product.id && i.status === 'pending' && !i.notes && !notes
    )

    if (existingItem) {
      // Update quantity
      dispatch({
        type: 'UPDATE_ORDER_ITEM',
        payload: {
          orderId,
          item: { ...existingItem, quantity: existingItem.quantity + quantity }
        }
      })
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: generateId(),
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
      dispatch({ type: 'ADD_ORDER_ITEM', payload: { orderId, item: newItem } })
    }
  }

  return (
    <POSContext.Provider value={{
      state,
      dispatch,
      getTable,
      getCategory,
      getProduct,
      getOrder,
      getActiveOrderForTable,
      getProductsByCategory,
      getKitchenOrders,
      createNewOrder,
      addItemToOrder
    }}>
      {children}
    </POSContext.Provider>
  )
}

// Hook
export function usePOS() {
  const context = useContext(POSContext)
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider')
  }
  return context
}
