'use client'

import { Minus, Plus, X, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import type { OrderItem } from '@/lib/types'

interface OrderItemCardProps {
  item: OrderItem
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
  disabled?: boolean
}

const statusColors = {
  pending: 'bg-muted',
  preparing: 'bg-warning/20 border-warning/50',
  ready: 'bg-primary/20 border-primary/50',
  served: 'bg-muted opacity-50',
}

export function OrderItemCard({
  item,
  onUpdateQuantity,
  onRemove,
  disabled = false,
}: OrderItemCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        statusColors[item.status]
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-foreground truncate">{item.productName}</p>
            <p className="text-sm text-muted-foreground">
              {formatPrice(item.price)} × {item.quantity}
            </p>
          </div>
          <p className="font-semibold text-foreground whitespace-nowrap">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>
        {item.notes && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3" />
            <span className="truncate">{item.notes}</span>
          </div>
        )}
      </div>

      {item.status === 'pending' && !disabled && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => {
              if (item.quantity === 1) {
                onRemove(item.id)
              } else {
                onUpdateQuantity(item.id, item.quantity - 1)
              }
            }}
          >
            {item.quantity === 1 ? <X className="size-4" /> : <Minus className="size-4" />}
          </Button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
