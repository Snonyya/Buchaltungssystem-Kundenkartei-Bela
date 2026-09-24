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

import {
  fetchExpenses,
  type Expense,
} from "../api/expense"

type DashboardPageProps = {
  onCreateTransaction: () => void
}

type Period = "day" | "month" | "quarter" | "year" | "custom"
type ReportMode = "revenue" | "journal" | "profit_loss"

type PeriodRange = {
  start: string
  end: string
  label: string
}

type PrintableReport = {
  mode: ReportMode
  range: PeriodRange
  transactions: Transaction[]
  expenses: Expense[]
  summary: DashboardSummary
  createdAt: string
}

function getDateInputValue(): string {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}
function getMonthInputValue(): string {
  return getDateInputValue().slice(0, 7)
}

function getCurrentQuarter(): string {
  const currentMonth = new Date().getMonth()
  return String(Math.floor(currentMonth / 3) + 1)
}

function getCurrentYear(): string {
  return String(new Date().getFullYear())
}

function dateFromInput(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-")

  return new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
  )
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
  }).format(date)
}

function getPeriodRange(
  period: Period,
  selectedDay: string,
  selectedMonth: string,
  selectedQuarter: string,
  selectedYear: string,
  customStart: string,
  customEnd: string,
): PeriodRange {
  let start: Date
  let end: Date
  let label: string

  if (period === "day") {
    start = dateFromInput(selectedDay)
    end = new Date(start)
    end.setDate(end.getDate() + 1)

    label = formatLongDate(start)
  } else if (period === "month") {
    const [yearText, monthText] = selectedMonth.split("-")
    const year = Number(yearText)
    const month = Number(monthText) - 1

    start = new Date(year, month, 1)
    end = new Date(year, month + 1, 1)

    label = new Intl.DateTimeFormat("de-DE", {
      month: "long",
      year: "numeric",
    }).format(start)
  } else if (period === "quarter") {
    const year = Number(selectedYear)
    const quarter = Number(selectedQuarter)
    const quarterStartMonth = (quarter - 1) * 3

    start = new Date(year, quarterStartMonth, 1)
    end = new Date(year, quarterStartMonth + 3, 1)

    label = `${quarter}. Quartal ${year}`
  } else if (period === "year") {
    const year = Number(selectedYear)

    start = new Date(year, 0, 1)
    end = new Date(year + 1, 0, 1)

    label = String(year)
  } else {
    start = dateFromInput(customStart)

    const selectedEnd = dateFromInput(customEnd)
    end = new Date(selectedEnd)
    end.setDate(end.getDate() + 1)

    label = `${formatLongDate(start)} bis ${formatLongDate(selectedEnd)}`
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

  const [selectedDay, setSelectedDay] = useState(getDateInputValue())
  const [selectedMonth, setSelectedMonth] = useState(getMonthInputValue())

  const [selectedQuarter, setSelectedQuarter] =
  useState(getCurrentQuarter())

  const [selectedYear, setSelectedYear] =
  useState(getCurrentYear())

  const [customStart, setCustomStart] = useState(getDateInputValue())
  const [customEnd, setCustomEnd] = useState(getDateInputValue())
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
  () =>
    getPeriodRange(
      period,
      selectedDay,
      selectedMonth,
      selectedQuarter,
      selectedYear,
      customStart,
      customEnd,
    ),
  [
    period,
    selectedDay,
    selectedMonth,
    selectedQuarter,
    selectedYear,
    customStart,
    customEnd,
  ],
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

  const reportStatus =
    reportMode === "journal" ? "all" : "booked"

  try {
    const [transactions, expenses, reportSummary] = await Promise.all([
      fetchTransactions({
        start: range.start,
        end: range.end,
        status: reportStatus,
      }),
      fetchExpenses({
        start: range.start,
        end: range.end,
        status: reportStatus,
      }),
      fetchDashboardSummary(range.start, range.end),
    ])

    setReport({
      mode: reportMode,
      range,
      transactions,
      expenses,
      summary: reportSummary,
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
      const bookedExpenseReportTotal =
    report?.expenses
    .filter((expense) => expense.status === "booked")
    .reduce((total, expense) => total + expense.amount_cents, 0) ?? 0

  const reportProfitLoss =
    bookedReportTotal - bookedExpenseReportTotal

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

    <button
      className={`view-button ${period === "custom" ? "selected" : ""}`}
      type="button"
      onClick={() => setPeriod("custom")}
    >
      Freier Zeitraum
    </button>
  </div>

  <div className="dashboard-period-inputs">
    {period === "day" && (
      <label>
        Tag auswählen
        <input
          type="date"
          value={selectedDay}
          onChange={(event) => setSelectedDay(event.target.value)}
        />
      </label>
    )}

    {period === "month" && (
      <label>
        Monat auswählen
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        />
      </label>
    )}

    {period === "quarter" && (
      <div className="dashboard-quarter-inputs">
        <label>
          Quartal
          <select
            value={selectedQuarter}
            onChange={(event) => setSelectedQuarter(event.target.value)}
          >
            <option value="1">1. Quartal</option>
            <option value="2">2. Quartal</option>
            <option value="3">3. Quartal</option>
            <option value="4">4. Quartal</option>
          </select>
        </label>

        <label>
          Jahr
          <input
            min="2000"
            max="2100"
            type="number"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
          />
        </label>
      </div>
    )}

    {period === "year" && (
      <label>
        Jahr auswählen
        <input
          min="2000"
          max="2100"
          type="number"
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
        />
      </label>
    )}

    {period === "custom" && (
      <div className="dashboard-quarter-inputs">
        <label>
          Von
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(event) => setCustomStart(event.target.value)}
          />
        </label>

        <label>
          Bis
          <input
            type="date"
            value={customEnd}
            min={customStart}
            onChange={(event) => setCustomEnd(event.target.value)}
          />
        </label>
      </div>
    )}
  </div>
</div>

        <p className="dashboard-period-label">{range.label}</p>
      </section>

      {isLoading && <p>Übersicht wird geladen …</p>}
      {error && <p className="error-message">{error}</p>}

      {!isLoading && !error && summary && (
        <>
<section className="summary-grid">
  <article className="summary-card summary-card-income">
  <p>Umsatz</p>
  <strong>{formatCurrency(summary.total_cents)}</strong>
</article>


<article className="summary-card summary-card-expense">
  <p>Ausgaben</p>
  <strong>{formatCurrency(summary.expense_total_cents)}</strong>
</article>

<article
  className={`summary-card summary-card-result ${
    summary.profit_loss_cents >= 0
      ? "is-positive"
      : "is-negative"
  }`}
>
  <p>
    {summary.profit_loss_cents >= 0
      ? "Überschuss"
      : "Verlust"}
  </p>
  <strong>{formatCurrency(summary.profit_loss_cents)}</strong>
</article>

  <article className="summary-card">
    <p>Gebuchte Einnahmen</p>
    <strong>{summary.transaction_count}</strong>
  </article>
</section>

<section className="dashboard-details-grid">
  <article className="panel dashboard-detail-card">
    <p>Einnahmen Bar</p>
    <strong>{formatCurrency(summary.cash_total_cents)}</strong>
  </article>

  <article className="panel dashboard-detail-card">
    <p>Einnahmen Online</p>
    <strong>{formatCurrency(summary.online_total_cents)}</strong>
  </article>

  <article className="panel dashboard-detail-card">
    <p>Ausgaben Bar</p>
    <strong>
      {formatCurrency(summary.expense_cash_total_cents)}
    </strong>
  </article>

  <article className="panel dashboard-detail-card">
    <p>Ausgaben Online</p>
    <strong>
      {formatCurrency(summary.expense_online_total_cents)}
    </strong>
  </article>

  <article className="panel dashboard-detail-card">
    <p>Gebuchte Ausgaben</p>
    <strong>{summary.expense_count}</strong>
  </article>

  <article className="panel dashboard-detail-card">
    <p>Durchschnitt pro Einnahme</p>
    <strong>{formatCurrency(summary.average_cents)}</strong>
  </article>

  <article className="panel dashboard-detail-card">
    <p>Höchste Einnahme</p>
    <strong>
      {summary.transaction_count > 0
        ? formatCurrency(summary.highest_transaction_cents)
        : "–"}
    </strong>
  </article>

  <article className="panel dashboard-detail-card">
    <p>Niedrigste Einnahme</p>
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
                  <option value="profit_loss">
                    Einnahmen und Ausgaben – Überschuss / Verlust
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
    : report.mode === "journal"
      ? "Internes Buchungsjournal"
      : "Interne Einnahmen- und Ausgabenübersicht"}
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

{report.mode === "profit_loss" ? (
  <>
    <section className="dashboard-details-grid">
      <article className="panel dashboard-detail-card">
        <p>Umsatz</p>
        <strong>{formatCurrency(report.summary.total_cents)}</strong>
      </article>

      <article className="panel dashboard-detail-card">
        <p>Ausgaben</p>
        <strong>
          {formatCurrency(report.summary.expense_total_cents)}
        </strong>
      </article>

      <article className="panel dashboard-detail-card">
        <p>
          {report.summary.profit_loss_cents >= 0
            ? "Überschuss"
            : "Verlust"}
        </p>
        <strong>
          {formatCurrency(report.summary.profit_loss_cents)}
        </strong>
      </article>
    </section>

    <div className="report-table-wrapper">
      <table className="report-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Art</th>
            <th>Beschreibung</th>
            <th>Empfänger / Kunde</th>
            <th>Zahlungsart</th>
            <th>Betrag</th>
          </tr>
        </thead>

        <tbody>
          {report.transactions
            .filter((transaction) => transaction.status === "booked")
            .map((transaction) => (
              <tr key={`income-${transaction.id}`}>
                <td>{formatDate(transaction.occurred_at)}</td>
                <td>Einnahme</td>
                <td>
                  {transaction.service_name || "Dienstleistung"}
                  {` (${transaction.receipt_number})`}
                </td>
                <td>
                  {transaction.customer_name || "Nicht hinterlegt"}
                </td>
                <td>
                  {transaction.payment_method === "cash"
                    ? "Bar"
                    : "Online"}
                </td>
                <td>{formatCurrency(transaction.amount_cents)}</td>
              </tr>
            ))}

          {report.expenses
            .filter((expense) => expense.status === "booked")
            .map((expense) => (
              <tr key={`expense-${expense.id}`}>
                <td>{formatDate(expense.occurred_at)}</td>
                <td>Ausgabe</td>
                <td>{expense.category}</td>
                <td>{expense.vendor || "Nicht hinterlegt"}</td>
                <td>
                  {expense.payment_method === "cash"
                    ? "Bar"
                    : "Online"}
                </td>
                <td>-{formatCurrency(expense.amount_cents)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>

    <div className="report-total">
      <span>
        {reportProfitLoss >= 0
          ? "Überschuss im Zeitraum"
          : "Verlust im Zeitraum"}
      </span>
      <strong>{formatCurrency(reportProfitLoss)}</strong>
    </div>
  </>
) : (
  <>
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
              <td>
                {transaction.service_name || "Nicht hinterlegt"}
              </td>
              <td>
                {transaction.payment_method === "cash"
                  ? "Bar"
                  : "Online"}
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
  </>
)}

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