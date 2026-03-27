'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { POSSidebar } from '@/components/pos/sidebar'
import { POSProvider } from '@/lib/pos-context'
import { Separator } from '@/components/ui/separator'
import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

function CurrentTime() {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('el-GR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      )
      setDate(
        now.toLocaleDateString('el-GR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      )
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="size-4" />
      <span className="font-medium text-foreground">{time}</span>
      <span className="hidden sm:inline">•</span>
      <span className="hidden sm:inline">{date}</span>
    </div>
  )
}

export default function POSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <POSProvider>
      <SidebarProvider defaultOpen={true}>
        <POSSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-6" />
            </div>
            <CurrentTime />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </POSProvider>
  )
}
