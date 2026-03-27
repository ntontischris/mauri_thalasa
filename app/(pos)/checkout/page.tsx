'use client'

import { useRouter } from 'next/navigation'
import { usePOS } from '@/lib/pos-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatTime } from '@/lib/mock-data'
import { Receipt, Clock, ChevronRight, CreditCard } from 'lucide-react'

export default function CheckoutListPage() {
  const router = useRouter()
  const { state } = usePOS()

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Tables with bill requested
  const billRequestedTables = state.tables.filter((t) => t.status === 'bill-requested')
  const ordersForCheckout = billRequestedTables
    .map((t) => ({
      table: t,
      order: state.orders.find((o) => o.id === t.currentOrderId),
    }))
    .filter((item) => item.order)

  // Recently completed orders (last 10)
  const completedOrders = state.orders
    .filter((o) => o.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-8">
      {/* Pending Checkouts */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ταμείο</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ordersForCheckout.length} λογαριασμοί προς εξόφληση
          </p>
        </div>

        {ordersForCheckout.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="size-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                Δεν υπάρχουν λογαριασμοί προς εξόφληση
              </p>
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
            {ordersForCheckout.map(({ table, order }) => (
              <Card
                key={table.id}
                className="cursor-pointer transition-all hover:border-accent/50 border-accent/20 bg-accent/5"
                onClick={() => router.push(`/checkout/${table.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">Τραπέζι {table.number}</span>
                      <Badge className="bg-accent text-accent-foreground">
                        Λογαριασμός
                      </Badge>
                    </CardTitle>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>{formatTime(order!.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {order!.items.length} προϊόντα
                    </span>
                    <span className="font-bold text-xl text-accent">
                      {formatPrice(order!.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Πρόσφατες Πληρωμές
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {completedOrders.map((order) => (
              <Card key={order.id} className="bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Τραπέζι {order.tableNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(order.completedAt || order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(order.total)}</p>
                      <Badge variant="outline" className="text-xs">
                        {order.paymentMethod === 'card' ? (
                          <><CreditCard className="size-3 mr-1" /> Κάρτα</>
                        ) : (
                          'Μετρητά'
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
