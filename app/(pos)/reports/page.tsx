'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePOS } from '@/lib/pos-context'
import { formatPrice } from '@/lib/mock-data'
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  ShoppingBag,
  Users,
} from 'lucide-react'

export default function ReportsPage() {
  const { state } = usePOS()

  // Calculate stats from completed orders
  const stats = useMemo(() => {
    const completedOrders = state.orders.filter((o) => o.status === 'completed')
    const today = new Date().toDateString()
    const todayOrders = completedOrders.filter(
      (o) => new Date(o.completedAt || o.createdAt).toDateString() === today
    )

    const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
    const orderCount = todayOrders.length
    const averageCheck = orderCount > 0 ? totalRevenue / orderCount : 0
    
    const cashTotal = todayOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + o.total, 0)
    const cardTotal = todayOrders
      .filter((o) => o.paymentMethod === 'card')
      .reduce((sum, o) => sum + o.total, 0)

    // Products sold today
    const productsSold: Record<string, { name: string; quantity: number; revenue: number }> = {}
    todayOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productsSold[item.productId]) {
          productsSold[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          }
        }
        productsSold[item.productId].quantity += item.quantity
        productsSold[item.productId].revenue += item.price * item.quantity
      })
    })

    const topProducts = Object.values(productsSold)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Hourly revenue (simulate for demo)
    const hourlyData = Array.from({ length: 12 }, (_, i) => ({
      hour: `${12 + i}:00`,
      revenue: Math.random() * 200 + 50,
    }))

    // If we have actual data, use it
    if (todayOrders.length > 0) {
      const hourlyMap: Record<number, number> = {}
      todayOrders.forEach((order) => {
        const hour = new Date(order.completedAt || order.createdAt).getHours()
        hourlyMap[hour] = (hourlyMap[hour] || 0) + order.total
      })
      
      // Recreate hourly data with actual values
      for (let i = 0; i < 12; i++) {
        const hour = 12 + i
        hourlyData[i].revenue = hourlyMap[hour] || 0
      }
    }

    return {
      totalRevenue,
      orderCount,
      averageCheck,
      cashTotal,
      cardTotal,
      topProducts,
      hourlyData,
    }
  }, [state.orders])

  // Payment method pie chart data
  const paymentData = [
    { name: 'Μετρητά', value: stats.cashTotal, color: 'hsl(var(--chart-1))' },
    { name: 'Κάρτα', value: stats.cardTotal, color: 'hsl(var(--chart-2))' },
  ]

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  const occupiedTables = state.tables.filter((t) => t.status !== 'available').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Αναφορές</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Στατιστικά πωλήσεων - Σήμερα
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Σημερινός Τζίρος
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ΦΠΑ: {formatPrice(stats.totalRevenue * 0.18)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Παραγγελίες
            </CardTitle>
            <Receipt className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orderCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Μ.Ο. {formatPrice(stats.averageCheck)} / παραγγελία
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Τραπέζια
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupiedTables} / {state.tables.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Κατειλημμένα τώρα
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Προϊόντα
            </CardTitle>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.products.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {state.products.filter((p) => !p.available).length} εξαντλημένα
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Τζίρος ανά Ώρα</CardTitle>
            <CardDescription>Πωλήσεις σήμερα ανά ώρα</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `€${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatPrice(value), 'Τζίρος']}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Τρόποι Πληρωμής</CardTitle>
            <CardDescription>Κατανομή σημερινών πωλήσεων</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {stats.cashTotal + stats.cardTotal > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatPrice(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Δεν υπάρχουν δεδομένα
                </div>
              )}
            </div>
            {/* Payment breakdown */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 flex-1">
                <Banknote className="size-5 text-chart-1" />
                <div>
                  <p className="text-sm font-medium">Μετρητά</p>
                  <p className="text-lg font-bold">{formatPrice(stats.cashTotal)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <CreditCard className="size-5 text-chart-2" />
                <div>
                  <p className="text-sm font-medium">Κάρτα</p>
                  <p className="text-lg font-bold">{formatPrice(stats.cardTotal)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Δημοφιλή Προϊόντα</CardTitle>
          <CardDescription>Τα πιο πουλημένα προϊόντα σήμερα</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topProducts.length > 0 ? (
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} πωλήσεις
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold">{formatPrice(product.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Δεν υπάρχουν δεδομένα πωλήσεων για σήμερα
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
