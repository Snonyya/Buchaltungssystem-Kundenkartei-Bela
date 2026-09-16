import { type FormEvent, useEffect, useState } from "react"

import { fetchCustomers, type Customer } from "../api/customer"
import { fetchServices, type Service } from "../api/service"

import {
  cancelTransaction,
  createTransaction,
  fetchTransactions,
  type PaymentMethod,
  type SortDirection,
  type Transaction,
  type TransactionSortField,
  type TransactionStatus,
} from "../api/transaction"

import {
  fetchBusinessProfile,
  type BusinessProfile,
} from "../api/settings"

function getTodayGerman(): string {
  const today = new Date()

  return [
    String(today.getDate()).padStart(2, "0"),
    String(today.getMonth() + 1).padStart(2, "0"),
    today.getFullYear(),
  ].join(".")
}

function parseGermanDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)

  if (!match) {
    return null
  }

  const [, dayText, monthText, yearText] = match
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  const date = new Date(Date.UTC(year, month - 1, day, 12))

  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  if (!isValidDate) {
    return null
  }

  return `${yearText}-${monthText}-${dayText}T12:00:00Z`
}

function parseEuroToCents(value: string): number | null {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  const normalizedValue = trimmedValue.includes(",")
    ? trimmedValue.replace(/\./g, "").replace(",", ".")
    : trimmedValue

  const amountEuro = Number(normalizedValue)

  if (!Number.isFinite(amountEuro) || amountEuro <= 0) {
    return null
  }

  return Math.round(amountEuro * 100)
}

function formatCentsAsInput(amountCents: number): string {
  return (amountCents / 100).toFixed(2).replace(".", ",")
}

export function TransactionPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [amountInput, setAmountInput] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [occurredAt, setOccurredAt] = useState(getTodayGerman())
  const [note, setNote] = useState("")

  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [createdTransaction, setCreatedTransaction] = useState<Transaction | null>(null,)
  const [receiptToPrint, setReceiptToPrint] = useState<Transaction | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [reloadTransactions, setReloadTransactions] = useState(0) 

  const [listSearch, setListSearch] = useState("")
  const [listStatus, setListStatus] =
  useState<TransactionStatus>("all")

  const [listPaymentMethod, setListPaymentMethod] =
  useState<PaymentMethod | "all">("all")

  const [listStartDate, setListStartDate] = useState("")
  const [listEndDate, setListEndDate] = useState("")

  const [listSortBy, setListSortBy] =
  useState<TransactionSortField>("occurred_at")

  const [listSortDirection, setListSortDirection] =
  useState<SortDirection>("desc")

  const [businessProfile, setBusinessProfile] =
  useState<BusinessProfile | null>(null)

  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true)
      setLoadingError(null)

      try {
      const [loadedCustomers, loadedServices, loadedBusinessProfile] =
        await Promise.all([
          fetchCustomers(),
          fetchServices(),
          fetchBusinessProfile(),
        ])

        setBusinessProfile(loadedBusinessProfile)

        setCustomers(loadedCustomers)
        setServices(loadedServices)
      } catch (error) {
        setLoadingError(
          error instanceof Error
            ? error.message
            : "Kunden und Dienstleistungen konnten nicht geladen werden.",
        )
      } finally {
        setIsLoadingOptions(false)
      }
    }
    void loadOptions()
  }, [])

  useEffect(() => {
  async function loadTransactions() {
    setIsLoadingTransactions(true)
    setTransactionError(null)

    try {
    const loadedTransactions = await fetchTransactions({
    status: listStatus,
    search: listSearch.trim() || undefined,
    payment_method:
    listPaymentMethod === "all"
      ? undefined
      : listPaymentMethod,
      start: getStartOfDay(listStartDate),
     end: getEndOfDay(listEndDate),
      sort_by: listSortBy,
     sort_direction: listSortDirection,
    })
      setTransactions(loadedTransactions)
    } catch (error) {
      setTransactionError(
        error instanceof Error
          ? error.message
          : "Die Buchungen konnten nicht geladen werden.",
      )
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  void loadTransactions()
}, [
  reloadTransactions,
  listSearch,
  listStatus,
  listPaymentMethod,
  listStartDate,
  listEndDate,
  listSortBy,
  listSortDirection,
])

  function handleServiceChange(nextServiceId: string) {
    setServiceId(nextServiceId)

    const selectedService = services.find(
      (service) => service.id === nextServiceId,
    )

    if (selectedService?.default_price_cents !== null && selectedService) {
      setAmountInput(formatCentsAsInput(selectedService.default_price_cents))
    }
  }
  function getStartOfDay(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined
  }

  return `${dateValue}T00:00:00Z`
}

function getEndOfDay(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined
  }

  const [yearText, monthText, dayText] = dateValue.split("-")

  const nextDay = new Date(
    Date.UTC(
      Number(yearText),
      Number(monthText) - 1,
      Number(dayText) + 1,
    ),
  )

  return nextDay.toISOString()
}

  function resetForm() {
    setCustomerId("")
    setServiceId("")
    setAmountInput("")
    setPaymentMethod("cash")
    setOccurredAt(getTodayGerman())
    setNote("")
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setCreatedTransaction(null)

    const amountCents = parseEuroToCents(amountInput)

    if (!amountCents) {
      setFormError("Bitte gib einen gültigen Betrag größer als 0 ein.")
      return
    }

    const occurredAtIso = parseGermanDate(occurredAt)

    if (!occurredAtIso) {
      setFormError("Bitte gib das Datum im Format TT.MM.JJJJ ein.")
      return
    }

    setIsSaving(true)

    try {
      const transaction = await createTransaction({
        customer_id: customerId,
        service_id: serviceId,
        amount_cents: amountCents,
        payment_method: paymentMethod,
        occurred_at: occurredAtIso,
        note: note.trim() || null,
      })

      setCreatedTransaction(transaction)
      setReloadTransactions((currentValue) => currentValue + 1)
      resetForm()
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Die Einnahme konnte nicht gespeichert werden.",
      )
    } finally {
      setIsSaving(false)
    }
  }



async function handleCancel(transaction: Transaction) {
  const reason = window.prompt(
    `Warum soll die Buchung ${transaction.receipt_number} storniert werden?`,
  )

  if (!reason?.trim()) {
    return
  }

  setTransactionError(null)

  try {
    await cancelTransaction(transaction.id, {
      reason: reason.trim(),
    })

    setReloadTransactions((currentValue) => currentValue + 1)
  } catch (error) {
    setTransactionError(
      error instanceof Error
        ? error.message
        : "Die Buchung konnte nicht storniert werden.",
    )
  }
}

function handlePrintReceipt() {
  window.print()
}

function resetTransactionFilters() {
  setListSearch("")
  setListStatus("all")
  setListPaymentMethod("all")
  setListStartDate("")
  setListEndDate("")
  setListSortBy("occurred_at")
  setListSortDirection("desc")
}

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Einnahmen</p>
          <h2>Einnahme erfassen</h2>
        </div>
      </header>

      {createdTransaction && (
        <section className="success-message">
          <div>
            <strong>Einnahme wurde gespeichert.</strong>
            <p>
              Belegnummer: <strong>{createdTransaction.receipt_number}</strong>
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={() => setCreatedTransaction(null)}
          >
            Schließen
          </button>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Neue Einnahme</h3>
            <p>Alle mit Stern markierten Angaben sind erforderlich.</p>
          </div>
        </div>
        <div className="transaction-filter-bar">
  <input
    className="transaction-search"
    type="search"
    placeholder="Kunde, Kundennummer, Dienstleistung oder Belegnummer suchen …"
    value={listSearch}
    onChange={(event) => setListSearch(event.target.value)}
  />

  <select
    value={listStatus}
    onChange={(event) =>
      setListStatus(event.target.value as TransactionStatus)
    }
  >
    <option value="all">Alle Status</option>
    <option value="booked">Nur gebucht</option>
    <option value="cancelled">Nur storniert</option>
  </select>

  <select
    value={listPaymentMethod}
    onChange={(event) =>
      setListPaymentMethod(
        event.target.value as PaymentMethod | "all",
      )
    }
  >
    <option value="all">Bar und Online</option>
    <option value="cash">Nur Bar</option>
    <option value="online">Nur Online</option>
  </select>

  <label>
    Von
    <input
      type="date"
      value={listStartDate}
      onChange={(event) => setListStartDate(event.target.value)}
    />
  </label>

  <label>
    Bis
    <input
      type="date"
      value={listEndDate}
      onChange={(event) => setListEndDate(event.target.value)}
    />
  </label>

  <select
    value={listSortBy}
    onChange={(event) =>
      setListSortBy(event.target.value as TransactionSortField)
    }
  >
    <option value="occurred_at">Nach Datum</option>
    <option value="amount_cents">Nach Betrag</option>
    <option value="receipt_number">Nach Belegnummer</option>
    <option value="customer_name">Nach Kunde</option>
    <option value="service_name">Nach Dienstleistung</option>
  </select>

  <select
    value={listSortDirection}
    onChange={(event) =>
      setListSortDirection(event.target.value as SortDirection)
    }
  >
    <option value="desc">Absteigend</option>
    <option value="asc">Aufsteigend</option>
  </select>

  <button
    className="secondary-button"
    type="button"
    onClick={resetTransactionFilters}
  >
    Filter zurücksetzen
  </button>
</div>

        {isLoadingOptions && <p>Kunden und Dienstleistungen werden geladen …</p>}

        {loadingError && <p className="error-message">{loadingError}</p>}

        {!isLoadingOptions && !loadingError && (
          <form className="transaction-form" onSubmit={handleSubmit}>
            <label>
              Kunde *
              <select
                required
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Kunden auswählen …</option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_number} · {customer.first_name}{" "}
                    {customer.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Dienstleistung *
              <select
                required
                value={serviceId}
                onChange={(event) => handleServiceChange(event.target.value)}
              >
                <option value="">Dienstleistung auswählen …</option>

                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.service_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Betrag in Euro *
              <input
                required
                inputMode="decimal"
                placeholder="z. B. 25,00"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
              />
            </label>

            <label>
              Zahlungsart *
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as PaymentMethod)
                }
              >
                <option value="cash">Bar</option>
                <option value="online">Online</option>
              </select>
            </label>

            <label>
              Buchungsdatum *
              <input
                required
                placeholder="TT.MM.JJJJ"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </label>

            <label className="transaction-note-field">
              Notiz
              <textarea
                rows={3}
                placeholder="Optionale Notiz zur Buchung …"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            {formError && <p className="error-message">{formError}</p>}

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={resetForm}
                disabled={isSaving}
              >
                Leeren
              </button>

              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Wird gespeichert …" : "Einnahme speichern"}
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="panel transaction-list-panel">
  <div className="panel-heading">
    <div>
      <h3>Letzte Einnahmen</h3>
      <p>Alle gespeicherten Buchungen inklusive Stornierungen.</p>
    </div>
  </div>

  {isLoadingTransactions && <p>Buchungen werden geladen …</p>}

  {transactionError && (
    <p className="error-message">{transactionError}</p>
  )}

  {!isLoadingTransactions &&
    !transactionError &&
    transactions.length === 0 && (
      <div className="empty-state">
        <h3>Noch keine Einnahmen</h3>
        <p>Erfasse oben die erste Einnahme.</p>
      </div>
    )}

  {!isLoadingTransactions &&
    !transactionError &&
    transactions.length > 0 && (
      <div className="transaction-list">
        {transactions.map((transaction) => (
          <article className="transaction-item" key={transaction.id}>
            <div className="transaction-main-info">
              <div className="transaction-icon">
                {transaction.payment_method === "cash" ? "€" : "↗"}
              </div>

              <div>
                <h3>{transaction.service_name || "Dienstleistung"}</h3>
                {transaction.customer_name && (
  <p className="transaction-customer-name">
    {transaction.customer_name}
    {transaction.customer_number &&
      ` · ${transaction.customer_number}`}
  </p>
)}

                <p>
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "medium",
                  }).format(new Date(transaction.occurred_at))}
                  {" · "}
                  {transaction.payment_method === "cash" ? "Bar" : "Online"}
                  {" · "}
                  {transaction.receipt_number}
                </p>

                {transaction.note && (
                  <p className="transaction-note">
                    Notiz: {transaction.note}
                  </p>
                )}
                {transaction.status === "cancelled" && (
                <div className="cancelled-transaction-info">
                <strong>Storniert</strong>

               {transaction.cancellation_reason && (
                  <p>Grund: {transaction.cancellation_reason}</p>
                )}
             </div>
            )}
              </div>
            </div>

            <div className="transaction-actions">
              <strong>
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(transaction.amount_cents / 100)}
              </strong>

                <button
                  className="action-button"
                  type="button"
                  onClick={() => setReceiptToPrint(transaction)}
                >
                  Beleg drucken
                </button>

            {transaction.status === "booked" ? (
            <button
              className="action-button danger"
               type="button"
               onClick={() => void handleCancel(transaction)}
               >
                Stornieren
              </button>
              ) : (
             <span className="cancelled-status">Storniert</span>
            )}
            </div>
          </article>
        ))}
      </div>
    )}
</section>
{receiptToPrint && (
  <section className="panel receipt-preview" id="printable-receipt">
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
    <h2>Interner Buchungsbeleg</h2>
    <p className="service-count">
      Belegnummer: {receiptToPrint.receipt_number}
    </p>

    {receiptToPrint.status === "cancelled" && (
      <p className="receipt-cancelled">
        STORNIERT
        {receiptToPrint.cancellation_reason &&
          ` – Grund: ${receiptToPrint.cancellation_reason}`}
      </p>
    )}
  </div>
</div>

<div className="receipt-action-bar">
  <button
    className="secondary-button"
    type="button"
    onClick={() => setReceiptToPrint(null)}
  >
    Schließen
  </button>

  <button
    className="primary-button"
    type="button"
    onClick={handlePrintReceipt}
  >
    Drucken
  </button>
</div>
    <div className="receipt-grid">
      <div>
        <span>Kunde</span>
        <strong>
          {receiptToPrint.customer_name || "Kunde nicht hinterlegt"}
        </strong>
        {receiptToPrint.customer_number && (
          <p>{receiptToPrint.customer_number}</p>
        )}
      </div>

      <div>
        <span>Dienstleistung</span>
        <strong>{receiptToPrint.service_name || "Nicht hinterlegt"}</strong>
      </div>

      <div>
        <span>Buchungsdatum</span>
        <strong>
          {new Intl.DateTimeFormat("de-DE", {
            dateStyle: "short",
          }).format(new Date(receiptToPrint.occurred_at))}
        </strong>
      </div>

      <div>
        <span>Zahlungsart</span>
        <strong>
          {receiptToPrint.payment_method === "cash" ? "Barzahlung" : "Online"}
        </strong>
      </div>
    </div>

    {receiptToPrint.note && (
      <div className="receipt-note">
        <span>Notiz zur Buchung</span>
        <p>{receiptToPrint.note}</p>
      </div>
    )}

    <div className="receipt-total">
      <span>Gesamtbetrag</span>
      <strong>
        {new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(receiptToPrint.amount_cents / 100)}
      </strong>
    </div>

    <p className="receipt-footer">
      Erstellt am{" "}
      {new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(receiptToPrint.created_at))}
    </p>
  </section>
)}
    </>
  )
}

export default TransactionPage