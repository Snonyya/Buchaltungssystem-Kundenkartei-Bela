export type Page =
  | "dashboard"
  | "customers"
  | "transaction"
  | "services"

type SidebarProps = {
  activePage: Page
  onNavigate: (page: Page) => void
}

const navigationItems: { page: Page; label: string }[] = [
  { page: "dashboard", label: "Dashboard" },
  { page: "customers", label: "Kunden" },
  { page: "transaction", label: "Einnahme erfassen" },
  { page: "services", label: "Dienstleistungen" },
]

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h1>Bela</h1>
      <p className="subtitle">Buchhaltung & Kunden</p>

      <nav className="navigation">
        {navigationItems.map((item) => (
          <button
            key={item.page}
            className={`nav-item ${activePage === item.page ? "active" : ""}`}
            onClick={() => onNavigate(item.page)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar