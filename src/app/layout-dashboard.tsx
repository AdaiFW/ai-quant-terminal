export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <nav className="flex h-14 items-center gap-4 px-6">
          <span className="font-semibold tracking-tight">AI Stock Platform</span>
          {/* Navigation will go here */}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
