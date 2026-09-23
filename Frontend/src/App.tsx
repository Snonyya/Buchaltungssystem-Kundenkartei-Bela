import { useState } from "react"

import "./App.css"
import { Sidebar, type Page } from "./components/Sidebar"
import { CustomersPage } from "./pages/CustomerPage"
import Dashboard from "./pages/Dashboard"
import { ServicesPage } from "./pages/ServicePage"
import { TransactionPage } from "./pages/TransactionPage"
import { SettingsPage } from "./pages/SettingsPage"
import { ExpensePage } from "./pages/ExpensePage"

function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard")

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <main className="content">
        {activePage === "dashboard" && (
          <Dashboard
            onCreateTransaction={() => setActivePage("transaction")}
          />
        )}

        {activePage === "customers" && <CustomersPage />}
        {activePage === "transaction" && <TransactionPage />}
        {activePage === "services" && <ServicesPage />}
        {activePage === "settings" && <SettingsPage />}
        {activePage === "expenses" && <ExpensePage />}
      </main>
    </div>
  )
}

export default App