'use client'

import { useRouter } from 'next/navigation'
import { usePOS } from '@/lib/pos-context'
import { TableCard } from '@/components/pos/table-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function TablesPage() {
  const router = useRouter()
  const { state, getActiveOrderForTable, createNewOrder } = usePOS()

  const handleTableClick = (tableId: string, tableNumber: number) => {
    const table = state.tables.find(t => t.id === tableId)
    if (!table) return

    if (table.status === 'available') {
      // Create new order and navigate to order page
      const orderId = createNewOrder(tableId, tableNumber)
      router.push(`/orders/${tableId}`)
    } else if (table.status === 'occupied') {
      // Navigate to existing order
      router.push(`/orders/${tableId}`)
    } else if (table.status === 'bill-requested') {
      // Navigate to checkout
      router.push(`/checkout/${tableId}`)
    }
  }

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const availableCount = state.tables.filter(t => t.status === 'available').length
  const occupiedCount = state.tables.filter(t => t.status === 'occupied').length
  const billRequestedCount = state.tables.filter(t => t.status === 'bill-requested').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Τραπέζια</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {availableCount} διαθέσιμα • {occupiedCount} κατειλημμένα • {billRequestedCount} λογαριασμός
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {state.tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onClick={() => handleTableClick(table.id, table.number)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 pt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border-2 border-border bg-secondary" />
          <span className="text-muted-foreground">Διαθέσιμο</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border-2 border-primary/50 bg-primary/10" />
          <span className="text-muted-foreground">Κατειλημμένο</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border-2 border-accent/50 bg-accent/10" />
          <span className="text-muted-foreground">Λογαριασμός</span>
        </div>
      </div>
    </div>
  )
}
