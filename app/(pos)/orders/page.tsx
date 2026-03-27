'use client'

import { useRouter } from 'next/navigation'
import { usePOS } from '@/lib/pos-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatTime } from '@/lib/mock-data'
import { Clock, Users, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OrdersPage() {
  const router = useRouter()
  const { state } = usePOS()

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const activeOrders = state.orders.filter((o) => o.status === 'active')
  const occupiedTables = state.tables.filter((t) => t.status !== 'available')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Παραγγελίες</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeOrders.length} ενεργές παραγγελίες
        </p>
      </div>

      {activeOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Δεν υπάρχουν ενεργές παραγγελίες</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/tables')}
            >
              Πήγαινε στα Τραπέζια
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeOrders.map((order) => {
            const table = state.tables.find((t) => t.id === order.tableId)
            const pendingCount = order.items.filter((i) => i.status === 'pending').length
            const preparingCount = order.items.filter((i) => i.status === 'preparing').length
            const readyCount = order.items.filter((i) => i.status === 'ready').length

            return (
              <Card
                key={order.id}
                className="cursor-pointer transition-all hover:border-primary/50"
                onClick={() => router.push(`/orders/${order.tableId}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">Τραπέζι {order.tableNumber}</span>
                      {table && (
                        <Badge
                          variant={
                            table.status === 'bill-requested' ? 'default' : 'secondary'
                          }
                          className={cn(
                            table.status === 'bill-requested' && 'bg-accent text-accent-foreground'
                          )}
                        >
                          {table.status === 'bill-requested' ? 'Λογαριασμός' : 'Κατειλημμένο'}
                        </Badge>
                      )}
                    </CardTitle>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="size-4" />
                      <span>{formatTime(order.createdAt)}</span>
                    </div>
                    {table && (
                      <div className="flex items-center gap-1">
                        <Users className="size-4" />
                        <span>{table.capacity}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pendingCount > 0 && (
                      <Badge variant="outline">{pendingCount} προς αποστολή</Badge>
                    )}
                    {preparingCount > 0 && (
                      <Badge variant="outline" className="border-warning/50 text-warning">
                        {preparingCount} σε προετοιμασία
                      </Badge>
                    )}
                    {readyCount > 0 && (
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        {readyCount} έτοιμα
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {order.items.length} προϊόντα
                    </span>
                    <span className="font-semibold text-lg">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
