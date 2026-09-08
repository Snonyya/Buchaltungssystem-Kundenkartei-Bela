type DashboardPageProps = {
  onCreateTransaction: () => void
}

export function DashboardPage({
  onCreateTransaction,
}: DashboardPageProps) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Bela Buchhaltung</p>
          <h2>Dashboard</h2>
        </div>

        <button className="primary-button" onClick={onCreateTransaction}>
          + Einnahme erfassen
        </button>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <p>Gesamteinnahmen</p>
          <strong>0,00 €</strong>
        </article>

        <article className="summary-card">
          <p>Bar</p>
          <strong>0,00 €</strong>
        </article>

        <article className="summary-card">
          <p>Online</p>
          <strong>0,00 €</strong>
        </article>

        <article className="summary-card">
          <p>Buchungen</p>
          <strong>0</strong>
        </article>
      </section>

      <section className="panel">
        <h3>Willkommen bei Bela</h3>
        <p>Hier erscheinen später deine Einnahmen und Auswertungen.</p>
      </section>
    </>
  )
}

export default DashboardPage