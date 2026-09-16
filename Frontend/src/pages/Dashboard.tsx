import { useEffect, useMemo, useState } from "react"

import {
  fetchDashboardSummary,
  type DashboardSummary,
} from "../api/dashboard"
import {
  fetchTransactions,
  type Transaction,
} from "../api/transaction"

import {
  fetchBusinessProfile,
  type BusinessProfile,
} from "../api/settings"

type DashboardPageProps = {
  onCreateTransaction: () => void
}

type Period = "day" | "month" | "quarter" | "year"
type ReportMode = "revenue" | "journal"

type PeriodRange = {
  start: string
  end: string
  label: string
}

type PrintableReport = {
  mode: ReportMode
  range: PeriodRange
  transactions: Transaction[]
  createdAt: string
}

function getDateInputValue(): string {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getPeriodRange(period: Period, dateValue: string): PeriodRange {
  const [yearText, monthText, dayText] = dateValue.split("-")
  const year = Number(yearText)
  const month = Number(monthText) - 1
  const day = Number(dayText)

  const selectedDate = new Date(year, month, day)
  let start: Date
  let end: Date
  let label: string

  if (period === "day") {
    start = new Date(year, month, day)
    end = new Date(year, month, day + 1)

    label = new Intl.DateTimeFormat("de-DE", {
      dateStyle: "long",
    }).format(selectedDate)
  } else if (period === "month") {
    start = new Date(year, month, 1)
    end = new Date(year, month + 1, 1)

    label = new Intl.DateTimeFormat("de-DE", {
      month: "long",
      year: "numeric",
    }).format(selectedDate)
  } else if (period === "quarter") {
    const quarter = Math.floor(month / 3) + 1
    const quarterStartMonth = (quarter - 1) * 3

    start = new Date(year, quarterStartMonth, 1)
    end = new Date(year, quarterStartMonth + 3, 1)
    label = `${quarter}. Quartal ${year}`
  } else {
    start = new Date(year, 0, 1)
    end = new Date(year + 1, 0, 1)
    label = String(year)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label,
  }
}

function formatCurrency(amountCents: number | null | undefined): string {
  if (amountCents === null || amountCents === undefined) {
    return "–"
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export function DashboardPage({
  onCreateTransaction,
}: DashboardPageProps) {
  const [period, setPeriod] = useState<Period>("month")
  const [selectedDate, setSelectedDate] = useState(getDateInputValue())
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reportMode, setReportMode] = useState<ReportMode>("revenue")
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [report, setReport] = useState<PrintableReport | null>(null)
  const [businessProfile, setBusinessProfile] =
  useState<BusinessProfile | null>(null)

  const range = useMemo(
    () => getPeriodRange(period, selectedDate),
    [period, selectedDate],
  )

  useEffect(() => {
    async function loadSummary() {
      setIsLoading(true)
      setError(null)

      try {
        const loadedSummary = await fetchDashboardSummary(
          range.start,
          range.end,
        )

        setSummary(loadedSummary)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Die Übersicht konnte nicht geladen werden.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadSummary()
  }, [range.start, range.end])

  useEffect(() => {
  async function loadBusinessProfile() {
    try {
      const loadedBusinessProfile = await fetchBusinessProfile()
      setBusinessProfile(loadedBusinessProfile)
    } catch {
      setBusinessProfile(null)
    }
  }

  void loadBusinessProfile()
}, [])

  async function openPrintableReport() {
    setIsLoadingReport(true)
    setReportError(null)

    try {
      const transactions = await fetchTransactions({
        start: range.start,
        end: range.end,
        status: reportMode === "revenue" ? "booked" : "all",
      })

      setReport({
        mode: reportMode,
        range,
        transactions,
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : "Die Buchungsübersicht konnte nicht erstellt werden.",
      )
    } finally {
      setIsLoadingReport(false)
    }
  }

  function printReport() {
    window.print()
  }

  const bookedReportTotal =
    report?.transactions
      .filter((transaction) => transaction.status === "booked")
      .reduce((total, transaction) => total + transaction.amount_cents, 0) ?? 0

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Bela Buchhaltung</p>
          <h2>Dashboard</h2>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={onCreateTransaction}
        >
          + Einnahme erfassen
        </button>
      </header>

      <section className="panel dashboard-filter-panel">
        <div className="dashboard-filter">
          <div className="view-switcher">
            <button
              className={`view-button ${period === "day" ? "selected" : ""}`}
              type="button"
              onClick={() => setPeriod("day")}
            >
              Tag
            </button>

            <button
              className={`view-button ${period === "month" ? "selected" : ""}`}
              type="button"
              onClick={() => setPeriod("month")}
            >
              Monat
            </button>

            <button
              className={`view-button ${period === "quarter" ? "selected" : ""}`}
              type="button"
              onClick={() => setPeriod("quarter")}
            >
              Quartal
            </button>

            <button
              className={`view-button ${period === "year" ? "selected" : ""}`}
              type="button"
              onClick={() => setPeriod("year")}
            >
              Jahr
            </button>
          </div>

          <label className="dashboard-date-input">
            Datum auswählen
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
        </div>

        <p className="dashboard-period-label">{range.label}</p>
      </section>

      {isLoading && <p>Übersicht wird geladen …</p>}
      {error && <p className="error-message">{error}</p>}

      {!isLoading && !error && summary && (
        <>
          <section className="summary-grid">
            <article className="summary-card summary-card-main">
              <p>Gesamteinnahmen</p>
              <strong>{formatCurrency(summary.total_cents)}</strong>
            </article>

            <article className="summary-card">
              <p>Bar</p>
              <strong>{formatCurrency(summary.cash_total_cents)}</strong>
            </article>

            <article className="summary-card">
              <p>Online</p>
              <strong>{formatCurrency(summary.online_total_cents)}</strong>
            </article>

            <article className="summary-card">
              <p>Buchungen</p>
              <strong>{summary.transaction_count}</strong>
            </article>
          </section>

          <section className="dashboard-details-grid">
            <article className="panel dashboard-detail-card">
              <p>Durchschnitt pro Buchung</p>
              <strong>{formatCurrency(summary.average_cents)}</strong>
            </article>

            <article className="panel dashboard-detail-card">
              <p>Höchste Buchung</p>
              <strong>
                {summary.transaction_count > 0
                  ? formatCurrency(summary.highest_transaction_cents)
                  : "–"}
              </strong>
            </article>

            <article className="panel dashboard-detail-card">
              <p>Niedrigste Buchung</p>
              <strong>
                {summary.transaction_count > 0
                  ? formatCurrency(summary.lowest_transaction_cents)
                  : "–"}
              </strong>
            </article>
          </section>

          <section className="panel report-panel">
            <div>
              <h3>Zeitraum drucken</h3>
              <p>
                Erstelle eine interne Übersicht für: <strong>{range.label}</strong>
              </p>
            </div>

            <div className="report-controls">
              <label>
                Art der Übersicht
                <select
                  value={reportMode}
                  onChange={(event) =>
                    setReportMode(event.target.value as ReportMode)
                  }
                >
                  <option value="revenue">
                    Umsatzübersicht – nur gültige Einnahmen
                  </option>
                  <option value="journal">
                    Buchungsjournal – inklusive Stornierungen
                  </option>
                </select>
              </label>

              <button
                className="primary-button"
                type="button"
                onClick={() => void openPrintableReport()}
                disabled={isLoadingReport}
              >
                {isLoadingReport
                  ? "Wird erstellt …"
                  : "Übersicht erstellen"}
              </button>
            </div>

            {reportError && <p className="error-message">{reportError}</p>}
          </section>

          {summary.transaction_count === 0 && (
            <section className="panel empty-state">
              <h3>Keine Einnahmen in diesem Zeitraum</h3>
              <p>Wähle einen anderen Zeitraum oder erfasse eine neue Einnahme.</p>
            </section>
          )}
        </>
      )}

      {report && (
        <section className="panel printable-report" id="printable-report">
<div className="receipt-header">
  <div className="receipt-company">
    {businessProfile ? (
      <>
        <strong className="receipt-company-name">
          {businessProfile.legal_name}
        </strong>

        {businessProfile.owner_name && (
          <span>{businessProfile.owner_name}</span>
        )}

        <span>{businessProfile.street}</span>
        <span>
          {businessProfile.postal_code} {businessProfile.city}
        </span>
        <span>{businessProfile.country}</span>

        {(businessProfile.phone || businessProfile.email) && (
          <span className="receipt-company-contact">
            {[businessProfile.phone, businessProfile.email]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}

        {(businessProfile.tax_number || businessProfile.vat_id) && (
          <span className="receipt-company-tax">
            {businessProfile.tax_number &&
              `Steuernummer: ${businessProfile.tax_number}`}

            {businessProfile.tax_number && businessProfile.vat_id && " · "}

            {businessProfile.vat_id &&
              `USt-IdNr.: ${businessProfile.vat_id}`}
          </span>
        )}

        {businessProfile.taxation_mode === "small_business" &&
          businessProfile.small_business_notice && (
            <span className="receipt-tax-notice">
              {businessProfile.small_business_notice}
            </span>
          )}
      </>
    ) : (
      <span className="error-message">
        Betreiberprofil ist noch nicht vollständig hinterlegt.
      </span>
    )}
  </div>

  <div className="receipt-document-title">
    <p className="eyebrow">Bela Buchhaltung</p>

    <h2>
      {report.mode === "revenue"
        ? "Interne Umsatzübersicht"
        : "Internes Buchungsjournal"}
    </h2>

    <p className="service-count">Zeitraum: {report.range.label}</p>
  </div>
</div>

<div className="receipt-action-bar">
  <button
    className="secondary-button"
    type="button"
    onClick={() => setReport(null)}
  >
    Schließen
  </button>

  <button
    className="primary-button"
    type="button"
    onClick={printReport}
  >
    Drucken
  </button>
</div>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Belegnummer</th>
                  <th>Kunde</th>
                  <th>Dienstleistung</th>
                  <th>Zahlungsart</th>
                  <th>Status</th>
                  <th>Betrag</th>
                </tr>
              </thead>

              <tbody>
                {report.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.occurred_at)}</td>
                    <td>{transaction.receipt_number}</td>
                    <td>
                      {transaction.customer_name || "Nicht hinterlegt"}
                      {transaction.customer_number &&
                        ` (${transaction.customer_number})`}
                    </td>
                    <td>{transaction.service_name || "Nicht hinterlegt"}</td>
                    <td>
                      {transaction.payment_method === "cash" ? "Bar" : "Online"}
                    </td>
                    <td>
                      {transaction.status === "cancelled"
                        ? "Storniert"
                        : "Gebucht"}
                    </td>
                    <td>{formatCurrency(transaction.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.transactions.length === 0 && (
            <p className="service-count">
              Für diesen Zeitraum wurden keine passenden Buchungen gefunden.
            </p>
          )}

          <div className="report-total">
            <span>Summe gültiger Einnahmen</span>
            <strong>{formatCurrency(bookedReportTotal)}</strong>
          </div>

          <p className="receipt-footer">
            Übersicht erstellt am{" "}
            {new Intl.DateTimeFormat("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(report.createdAt))}
          </p>
        </section>
      )}
    </>
  )
}

export default DashboardPage