'use client'

import { useState } from 'react'
import { Banknote, CreditCard, Printer, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/mock-data'
import type { Order } from '@/lib/types'
import { ReceiptPreview } from './receipt-preview'

interface PaymentDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (paymentMethod: 'cash' | 'card') => void
}

export function PaymentDialog({
  order,
  open,
  onOpenChange,
  onComplete,
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null)
  const [cashReceived, setCashReceived] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const cashAmount = parseFloat(cashReceived) || 0
  const change = cashAmount - order.total

  const handlePayment = async () => {
    if (!paymentMethod) return
    if (paymentMethod === 'cash' && cashAmount < order.total) return

    setIsProcessing(true)
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsProcessing(false)
    setShowReceipt(true)
  }

  const handleComplete = () => {
    if (!paymentMethod) return
    onComplete(paymentMethod)
    // Reset state
    setPaymentMethod(null)
    setCashReceived('')
    setShowReceipt(false)
  }

  const quickCashAmounts = [20, 50, 100].filter((amount) => amount >= order.total)

  if (showReceipt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="size-5 text-primary" />
              Πληρωμή Ολοκληρώθηκε
            </DialogTitle>
            <DialogDescription>
              Η απόδειξη εκδόθηκε επιτυχώς
            </DialogDescription>
          </DialogHeader>

          <ReceiptPreview order={order} paymentMethod={paymentMethod!} />

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1">
              <Printer className="size-4 mr-2" />
              Εκτύπωση
            </Button>
            <Button className="flex-1" onClick={handleComplete}>
              Κλείσιμο Τραπεζιού
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Πληρωμή</DialogTitle>
          <DialogDescription>
            Τραπέζι {order.tableNumber} • {formatPrice(order.total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Method Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all',
                paymentMethod === 'cash'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Banknote className="size-10 text-primary" />
              <span className="font-medium">Μετρητά</span>
            </button>
            <button
              onClick={() => {
                setPaymentMethod('card')
                setCashReceived('')
              }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all',
                paymentMethod === 'card'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <CreditCard className="size-10 text-primary" />
              <span className="font-medium">Κάρτα</span>
            </button>
          </div>

          {/* Cash Payment Details */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cash">Ποσό που δόθηκε</Label>
                <Input
                  id="cash"
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl h-14 text-center font-mono"
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCashReceived(order.total.toFixed(2))}
                >
                  Ακριβές
                </Button>
                {quickCashAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCashReceived(amount.toString())}
                  >
                    {amount}
                  </Button>
                ))}
              </div>

              {/* Change calculation */}
              {cashAmount > 0 && (
                <div
                  className={cn(
                    'rounded-lg p-4 text-center',
                    change >= 0 ? 'bg-primary/10' : 'bg-destructive/10'
                  )}
                >
                  <p className="text-sm text-muted-foreground">Ρέστα</p>
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      change >= 0 ? 'text-primary' : 'text-destructive'
                    )}
                  >
                    {change >= 0 ? formatPrice(change) : 'Ανεπαρκές ποσό'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Card Payment Info */}
          {paymentMethod === 'card' && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <CreditCard className="size-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Χρησιμοποιήστε το τερματικό POS για την πληρωμή
              </p>
              <p className="mt-1 text-2xl font-bold">{formatPrice(order.total)}</p>
            </div>
          )}

          {/* Complete Button */}
          <Button
            className="w-full h-14 text-lg"
            disabled={
              !paymentMethod ||
              (paymentMethod === 'cash' && cashAmount < order.total) ||
              isProcessing
            }
            onClick={handlePayment}
          >
            {isProcessing ? (
              'Επεξεργασία...'
            ) : (
              <>
                <Check className="size-5 mr-2" />
                Ολοκλήρωση Πληρωμής
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
