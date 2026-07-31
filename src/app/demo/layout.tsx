import { DemoProvider } from '@/contexts/DemoContext'

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DemoProvider>
      {/* Demo banner */}
      <div className="bg-warning text-warning-ink text-sm font-medium px-4 py-2 flex items-center gap-2">
        <span className="text-base">🧪</span>
        <span>
          <strong>Demo Mode</strong> — This is a live preview. No data is saved
          and no account is required.
        </span>
      </div>
      {children}
    </DemoProvider>
  )
}
