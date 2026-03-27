'use client'

import { Clock, Check, ChefHat, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/mock-data'
import type { Order, OrderItem } from '@/lib/types'

interface KitchenOrderCardProps {
  order: Order
  onItemStatusChange: (orderId: string, itemId: string, status: OrderItem['status']) => void
  onMarkAllReady: (orderId: string) => void
}

function getTimeSince(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Τώρα'
  if (minutes < 60) return `${minutes} λεπτά`
  const hours = Math.floor(minutes / 60)
  return `${hours} ώρ${hours === 1 ? 'α' : 'ες'}`
}

function getUrgencyLevel(dateString: string): 'normal' | 'warning' | 'urgent' {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes >= 15) return 'urgent'
  if (minutes >= 10) return 'warning'
  return 'normal'
}

const urgencyStyles = {
  normal: 'border-border',
  warning: 'border-warning/50 bg-warning/5',
  urgent: 'border-destructive/50 bg-destructive/5 animate-pulse',
}

export function KitchenOrderCard({
  order,
  onItemStatusChange,
  onMarkAllReady,
}: KitchenOrderCardProps) {
  const kitchenItems = order.items.filter(
    (item) => item.status === 'preparing' || item.status === 'ready'
  )
  
  const preparingItems = kitchenItems.filter((item) => item.status === 'preparing')
  const readyItems = kitchenItems.filter((item) => item.status === 'ready')
  
  const oldestItem = kitchenItems.reduce((oldest, item) => {
    return new Date(item.createdAt) < new Date(oldest.createdAt) ? item : oldest
  }, kitchenItems[0])
  
  const urgency = oldestItem ? getUrgencyLevel(oldestItem.createdAt) : 'normal'

  if (kitchenItems.length === 0) return null

  return (
    <Card className={cn('transition-all duration-300', urgencyStyles[urgency])}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl font-bold">Τραπέζι {order.tableNumber}</span>
            <Badge
              variant="outline"
              className={cn(
                urgency === 'urgent' && 'border-destructive text-destructive',
                urgency === 'warning' && 'border-warning text-warning'
              )}
            >
              <Clock className="size-3 mr-1" />
              {getTimeSince(oldestItem?.createdAt || order.createdAt)}
            </Badge>
          </CardTitle>
          {preparingItems.length > 0 && (
            <Button
              size="sm"
              onClick={() => onMarkAllReady(order.id)}
              className="bg-primary hover:bg-primary/90"
            >
              <Check className="size-4 mr-1" />
              Όλα Έτοιμα
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Ώρα: {formatTime(order.createdAt)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Preparing Items */}
        {preparingItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <ChefHat className="size-3" />
              Σε Προετοιμασία ({preparingItems.length})
            </p>
            {preparingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-warning/20 text-warning font-bold">
                    {item.quantity}
                  </span>
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onItemStatusChange(order.id, item.id, 'ready')}
                >
                  <Check className="size-4 mr-1" />
                  Έτοιμο
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Ready Items */}
        {readyItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-primary uppercase flex items-center gap-1">
              <Bell className="size-3" />
              Έτοιμα για Σερβίρισμα ({readyItems.length})
            </p>
            {readyItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                    {item.quantity}
                  </span>
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onItemStatusChange(order.id, item.id, 'served')}
                >
                  Σερβιρίστηκε
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
