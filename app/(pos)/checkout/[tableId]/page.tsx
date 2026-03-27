'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, use } from 'react'
import { ArrowLeft, Receipt, Banknote, CreditCard, Users, Split } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { usePOS } from '@/lib/pos-context'
import { formatPrice, formatTime } from '@/lib/mock-data'
import { PaymentDialog } from '@/components/pos/payment-dialog'
import { cn } from '@/lib/utils'

export default function CheckoutPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params)
  const router = useRouter()
  const { state, getTable, getActiveOrderForTable, dispatch } = usePOS()
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [splitMode, setSplitMode] = useState<'none' | 'equal' | 'items'>('none')
  const [splitCount, setSplitCount] = useState(2)

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const table = getTable(tableId)
  const order = getActiveOrderForTable(tableId)

  if (!table || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Δεν βρέθηκε παραγγελία</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/tables')}>
          Επιστροφή στα τραπέζια
        </Button>
      </div>
    )
  }

  const handlePaymentComplete = (paymentMethod: 'cash' | 'card') => {
    dispatch({
      type: 'COMPLETE_ORDER',
      payload: { orderId: order.id, paymentMethod },
    })
    setPaymentDialogOpen(false)
    router.push('/tables')
  }

  const splitAmount = splitMode === 'equal' ? order.total / splitCount : order.total

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/orders/${tableId}`)}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Λογαριασμός - Τραπέζι {table.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            Ώρα παραγγελίας: {formatTime(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Παραγγελία</span>
              <Badge variant="outline">
                {order.items.length} προϊόντα
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items List */}
            <div className="space-y-2 max-h-64 overflow-auto">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {item.quantity}
                    </span>
                    <span>{item.productName}</span>
                  </div>
                  <span className="font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Υποσύνολο</span>
                <span>{formatPrice(order.total - order.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ΦΠΑ</span>
                <span>{formatPrice(order.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-border">
                <span>Σύνολο</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Options */}
        <div className="space-y-4">
          {/* Split Bill Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Split className="size-5" />
                Διαχωρισμός Λογαριασμού
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={splitMode === 'none' ? 'default' : 'outline'}
                  onClick={() => setSplitMode('none')}
                >
                  Ενιαίος
                </Button>
                <Button
                  variant={splitMode === 'equal' ? 'default' : 'outline'}
                  onClick={() => setSplitMode('equal')}
                >
                  Ίσα Μέρη
                </Button>
                <Button
                  variant={splitMode === 'items' ? 'default' : 'outline'}
                  onClick={() => setSplitMode('items')}
                  disabled
                >
                  Ανά Είδος
                </Button>
              </div>

              {splitMode === 'equal' && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Αριθμός ατόμων:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-bold">{splitCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSplitCount(splitCount + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <span className="text-lg font-semibold ml-auto">
                    {formatPrice(splitAmount)} / άτομο
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Amount */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Προς Πληρωμή</p>
                <p className="text-4xl font-bold text-primary mt-2">
                  {formatPrice(splitMode === 'equal' ? splitAmount : order.total)}
                </p>
                {splitMode === 'equal' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ({splitCount} x {formatPrice(splitAmount)} = {formatPrice(order.total)})
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <Banknote className="size-8" />
              <span>Μετρητά</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <CreditCard className="size-8" />
              <span>Κάρτα</span>
            </Button>
          </div>

          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={() => setPaymentDialogOpen(true)}
          >
            <Receipt className="size-5 mr-2" />
            Έκδοση Απόδειξης
          </Button>
        </div>
      </div>

      <PaymentDialog
        order={order}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onComplete={handlePaymentComplete}
      />
    </div>
  )
}
