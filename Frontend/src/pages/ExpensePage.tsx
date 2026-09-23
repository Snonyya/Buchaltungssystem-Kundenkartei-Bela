import { type FormEvent, useEffect, useState } from "react"

import {
  cancelExpense,
  createExpense,
  fetchExpenses,
  type Expense,
} from "../api/expense"
import type { PaymentMethod } from "../api/transaction"


function getTodayGerman(): string {
  const now = new Date()

  return [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    now.getFullYear(),
  ].join(".")
}

function getCurrentTime(): string {
  const now = new Date()

  return [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join(":")
}

function parseGermanDateTime(
  dateValue: string,
  timeValue: string,
): string | null {
  const dateMatch = dateValue.trim().match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/,
  )

  const timeMatch = timeValue.trim().match(
    /^(\d{2}):(\d{2}):(\d{2})$/,
  )

  if (!dateMatch || !timeMatch) {
    return null
  }

  const [, dayText, monthText, yearText] = dateMatch
  const [, hourText, minuteText, secondText] = timeMatch

  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hours = Number(hourText)
  const minutes = Number(minuteText)
  const seconds = Number(secondText)

  const localDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
  )

  const isValid =
    localDate.getFullYear() === year &&
    localDate.getMonth() === month - 1 &&
    localDate.getDate() === day &&
    localDate.getHours() === hours &&
    localDate.getMinutes() === minutes &&
    localDate.getSeconds() === seconds

  if (!isValid) {
    return null
  }

  return localDate.toISOString()
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

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100)
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}


export function ExpensePage() {
  const [amountInput, setAmountInput] = useState("")
  const [category, setCategory] = useState("")
  const [vendor, setVendor] = useState("")
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash")
  const [occurredAt, setOccurredAt] = useState(getTodayGerman())
  const [occurredAtTime, setOccurredAtTime] = useState(getCurrentTime())
  const [receiptReference, setReceiptReference] = useState("")
  const [note, setNote] = useState("")

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    async function loadExpenses() {
      setIsLoading(true)
      setListError(null)

      try {
        const loadedExpenses = await fetchExpenses({
          status: "all",
          sort_by: "occurred_at",
          sort_direction: "desc",
        })

        setExpenses(loadedExpenses)
      } catch (error) {
        setListError(
          error instanceof Error
            ? error.message
            : "Die Ausgaben konnten nicht geladen werden.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadExpenses()
  }, [reloadKey])

  function resetForm() {
    setAmountInput("")
    setCategory("")
    setVendor("")
    setPaymentMethod("cash")
    setOccurredAt(getTodayGerman())
    setOccurredAtTime(getCurrentTime())
    setReceiptReference("")
    setNote("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const amountCents = parseEuroToCents(amountInput)

    if (!amountCents) {
      setFormError("Bitte gib einen gültigen Betrag größer als 0 ein.")
      return
    }

    if (!category.trim()) {
      setFormError("Bitte gib eine Kategorie an.")
      return
    }

    const occurredAtIso = parseGermanDateTime(
      occurredAt,
      occurredAtTime,
    )

    if (!occurredAtIso) {
      setFormError(
        "Bitte gib Datum und Uhrzeit im angegebenen Format ein.",
      )
      return
    }

    setIsSaving(true)

    try {
      await createExpense({
        amount_cents: amountCents,
        payment_method: paymentMethod,
        category: category.trim(),
        vendor: vendor.trim() || null,
        receipt_reference: receiptReference.trim() || null,
        note: note.trim() || null,
        occurred_at: occurredAtIso,
      })

      resetForm()
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Die Ausgabe konnte nicht gespeichert werden.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCancel(expense: Expense) {
    const reason = window.prompt(
      `Warum soll die Ausgabe „${expense.category}“ storniert werden?`,
    )

    if (!reason?.trim()) {
      return
    }

    setListError(null)

    try {
      await cancelExpense(expense.id, {
        reason: reason.trim(),
      })

      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : "Die Ausgabe konnte nicht storniert werden.",
      )
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Buchhaltung</p>
          <h2>Ausgaben</h2>
        </div>
      </header>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Ausgabe erfassen</h3>
            <p>Erfasste Ausgaben können später storniert, aber nicht gelöscht werden.</p>
          </div>
        </div>

        <form className="transaction-form" onSubmit={handleSubmit}>
          <label>
            Betrag in Euro *
            <input
              required
              inputMode="decimal"
              placeholder="z. B. 24,99"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
          </label>

          <label>
            Kategorie *
            <input
              required
              list="expense-category-options"
              placeholder="z. B. Material oder Software"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />

            <datalist id="expense-category-options">
              <option value="Material" />
              <option value="Software" />
              <option value="Miete" />
              <option value="Telefon & Internet" />
              <option value="Fahrtkosten" />
              <option value="Versicherung" />
              <option value="Marketing" />
              <option value="Sonstiges" />
            </datalist>
          </label>

          <label>
            Empfänger / Händler
            <input
              placeholder="z. B. Adobe"
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
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
            Datum *
            <input
              required
              placeholder="TT.MM.JJJJ"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>

          <label>
            Uhrzeit *
            <input
              required
              step="1"
              type="time"
              value={occurredAtTime}
              onChange={(event) => setOccurredAtTime(event.target.value)}
            />
          </label>

          <label>
            Rechnungs- oder Belegnummer
            <input
              value={receiptReference}
              onChange={(event) =>
                setReceiptReference(event.target.value)
              }
            />
          </label>

          <label className="transaction-form-full-width">
            Notiz
            <textarea
              rows={3}
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

            <button
              className="primary-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Wird gespeichert …" : "Ausgabe speichern"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel transaction-list-panel">
        <div className="panel-heading">
          <div>
            <h3>Erfasste Ausgaben</h3>
            <p>Stornierte Ausgaben bleiben zur Nachvollziehbarkeit sichtbar.</p>
          </div>
        </div>

        {isLoading && <p>Ausgaben werden geladen …</p>}
        {listError && <p className="error-message">{listError}</p>}

        {!isLoading && !listError && expenses.length === 0 && (
          <div className="empty-state">
            <h3>Noch keine Ausgaben</h3>
            <p>Erfasse oben die erste Ausgabe.</p>
          </div>
        )}

        {!isLoading && !listError && expenses.length > 0 && (
          <div className="transaction-list">
            {expenses.map((expense) => (
              <article className="transaction-item" key={expense.id}>
                <div className="transaction-main-info">
                  <div className="transaction-icon">−</div>

                  <div>
                    <h3>{expense.category}</h3>

                    {expense.vendor && (
                      <p className="transaction-customer-name">
                        {expense.vendor}
                      </p>
                    )}

                    <p>
                      {formatDateTime(expense.occurred_at)}
                      {" · "}
                      {expense.payment_method === "cash" ? "Bar" : "Online"}

                      {expense.receipt_reference &&
                        ` · ${expense.receipt_reference}`}
                    </p>

                    {expense.note && (
                      <p className="transaction-note">
                        Notiz: {expense.note}
                      </p>
                    )}

                    {expense.status === "cancelled" && (
                      <div className="cancelled-transaction-info">
                        <strong>Storniert</strong>

                        {expense.cancellation_reason && (
                          <p>Grund: {expense.cancellation_reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="transaction-actions">
                  <strong>{formatCurrency(expense.amount_cents)}</strong>

                  {expense.status === "booked" ? (
                    <button
                      className="action-button danger"
                      type="button"
                      onClick={() => void handleCancel(expense)}
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
    </>
  )
}

export default ExpensePage