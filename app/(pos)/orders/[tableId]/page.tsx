'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, use } from 'react'
import { ArrowLeft, Send, Receipt, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { usePOS } from '@/lib/pos-context'
import { formatPrice } from '@/lib/mock-data'
import { MenuItemCard } from '@/components/pos/menu-item'
import { OrderItemCard } from '@/components/pos/order-item'
import type { Product, OrderItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function OrderPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params)
  const router = useRouter()
  const {
    state,
    getTable,
    getActiveOrderForTable,
    getProductsByCategory,
    addItemToOrder,
    dispatch,
  } = usePOS()
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  const table = getTable(tableId)
  const order = getActiveOrderForTable(tableId)

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Το τραπέζι δεν βρέθηκε</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/tables')}>
          Επιστροφή στα τραπέζια
        </Button>
      </div>
    )
  }

  const categories = state.categories
  const activeCategory = selectedCategory || categories[0]?.id
  const products = activeCategory ? getProductsByCategory(activeCategory) : []

  const handleAddItem = (product: Product) => {
    if (!order) return
    addItemToOrder(order.id, product)
  }

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (!order) return
    const item = order.items.find((i) => i.id === itemId)
    if (!item) return
    dispatch({
      type: 'UPDATE_ORDER_ITEM',
      payload: { orderId: order.id, item: { ...item, quantity } },
    })
  }

  const handleRemoveItem = (itemId: string) => {
    if (!order) return
    dispatch({
      type: 'REMOVE_ORDER_ITEM',
      payload: { orderId: order.id, itemId },
    })
  }

  const handleSendToKitchen = () => {
    if (!order) return
    // Mark all pending items as preparing
    order.items.forEach((item) => {
      if (item.status === 'pending') {
        dispatch({
          type: 'UPDATE_ITEM_STATUS',
          payload: { orderId: order.id, itemId: item.id, status: 'preparing' },
        })
      }
    })
  }

  const handleRequestBill = () => {
    dispatch({
      type: 'SET_TABLE_STATUS',
      payload: { tableId, status: 'bill-requested', orderId: order?.id },
    })
    router.push(`/checkout/${tableId}`)
  }

  const handleCancelOrder = () => {
    if (!order) return
    dispatch({ type: 'CANCEL_ORDER', payload: order.id })
    router.push('/tables')
  }

  const pendingItems = order?.items.filter((i) => i.status === 'pending') || []
  const sentItems = order?.items.filter((i) => i.status !== 'pending') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/tables')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Τραπέζι {table.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {order?.items.length || 0} προϊόντα • {formatPrice(order?.total || 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category Tabs */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="shrink-0"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <MenuItemCard
                key={product.id}
                product={product}
                onAdd={handleAddItem}
              />
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Παραγγελία</span>
              {order && order.items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleCancelOrder}
                >
                  <Trash2 className="size-4 mr-1" />
                  Ακύρωση
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!order || order.items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Δεν υπάρχουν προϊόντα
              </p>
            ) : (
              <>
                {/* Pending Items */}
                {pendingItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Προς αποστολή ({pendingItems.length})
                    </p>
                    {pendingItems.map((item) => (
                      <OrderItemCard
                        key={item.id}
                        item={item}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemove={handleRemoveItem}
                      />
                    ))}
                  </div>
                )}

                {/* Sent Items */}
                {sentItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Στην κουζίνα ({sentItems.length})
                    </p>
                    {sentItems.map((item) => (
                      <OrderItemCard
                        key={item.id}
                        item={item}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemove={handleRemoveItem}
                        disabled
                      />
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Υποσύνολο</span>
                    <span>{formatPrice(order.total - order.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ΦΠΑ</span>
                    <span>{formatPrice(order.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Σύνολο</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {pendingItems.length > 0 && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleSendToKitchen}
                    >
                      <Send className="size-4 mr-2" />
                      Αποστολή στην Κουζίνα
                    </Button>
                  )}
                  {order.items.length > 0 && pendingItems.length === 0 && (
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={handleRequestBill}
                    >
                      <Receipt className="size-4 mr-2" />
                      Λογαριασμός
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
