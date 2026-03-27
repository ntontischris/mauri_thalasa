'use client'

import { useEffect, useState } from 'react'
import { usePOS } from '@/lib/pos-context'
import { KitchenOrderCard } from '@/components/pos/kitchen-order'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChefHat, Bell, Clock } from 'lucide-react'
import type { OrderItem } from '@/lib/types'

export default function KitchenPage() {
  const { state, dispatch, getKitchenOrders } = usePOS()
  const [, setTick] = useState(0)

  // Force re-render every 30 seconds to update time displays
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const kitchenOrders = getKitchenOrders()

  const handleItemStatusChange = (
    orderId: string,
    itemId: string,
    status: OrderItem['status']
  ) => {
    dispatch({
      type: 'UPDATE_ITEM_STATUS',
      payload: { orderId, itemId, status },
    })
  }

  const handleMarkAllReady = (orderId: string) => {
    const order = state.orders.find((o) => o.id === orderId)
    if (!order) return

    order.items.forEach((item) => {
      if (item.status === 'preparing') {
        dispatch({
          type: 'UPDATE_ITEM_STATUS',
          payload: { orderId, itemId: item.id, status: 'ready' },
        })
      }
    })
  }

  // Calculate stats
  const allKitchenItems = kitchenOrders.flatMap((o) =>
    o.items.filter((i) => i.status === 'preparing' || i.status === 'ready')
  )
  const preparingCount = allKitchenItems.filter((i) => i.status === 'preparing').length
  const readyCount = allKitchenItems.filter((i) => i.status === 'ready').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Κουζίνα</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Οθόνη Προετοιμασίας Παραγγελιών
          </p>
        </div>

        <div className="flex gap-3">
          <Badge
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 text-base"
          >
            <ChefHat className="size-5 text-warning" />
            <span>{preparingCount} σε προετοιμασία</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 text-base border-primary/50"
          >
            <Bell className="size-5 text-primary" />
            <span>{readyCount} έτοιμα</span>
          </Badge>
        </div>
      </div>

      {kitchenOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChefHat className="size-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              Δεν υπάρχουν παραγγελίες
            </p>
            <p className="text-sm text-muted-foreground">
              Οι νέες παραγγελίες θα εμφανιστούν εδώ
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kitchenOrders
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onItemStatusChange={handleItemStatusChange}
                onMarkAllReady={handleMarkAllReady}
              />
            ))}
        </div>
      )}

      {/* Kitchen workflow legend */}
      <div className="flex flex-wrap gap-6 pt-4 text-sm border-t border-border">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-warning/20" />
          <span className="text-muted-foreground">Σε Προετοιμασία</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-primary/20" />
          <span className="text-muted-foreground">Έτοιμο για Σερβίρισμα</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-destructive" />
          <span className="text-muted-foreground">15+ λεπτά αναμονή</span>
        </div>
      </div>
    </div>
  )
}
