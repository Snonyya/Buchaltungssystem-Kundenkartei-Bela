import { type FormEvent, useEffect, useState } from "react"
import { downloadCsv } from "../utils/csv"

import {
  fetchTransactions,
  type Transaction,
} from "../api/transaction"

import {
  activateCustomer,
  addCustomerNote,
  archiveCustomer,
  createCustomer,
  fetchCustomers,
  getArchivedCustomers,
  updateCustomer,
  type Customer,
  type CustomerCreate,
  type CustomerUpdate,
} from "../api/customer"

type CustomerView = "active" | "archived"

function formatAddress(customer: Customer): string {
  return `${customer.street}, ${customer.postal_code} ${customer.city}`
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [view, setView] = useState<CustomerView>("active")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [street, setStreet] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [noteText, setNoteText] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true)
      setError(null)

      try {
        const loadedCustomers =
          view === "active"
            ? await fetchCustomers({ search })
            : await getArchivedCustomers()

        setCustomers(loadedCustomers)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Kunden konnten nicht geladen werden.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadCustomers()
  }, [view, search, reloadKey])

  function resetFormFields() {
    setFirstName("")
    setLastName("")
    setStreet("")
    setPostalCode("")
    setCity("")
    setPhone("")
    setEmail("")
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingCustomer(null)
    setFormError(null)
    resetFormFields()
  }

  function openCreateForm() {
    closeForm()
    setIsFormOpen(true)
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer)
    setFirstName(customer.first_name)
    setLastName(customer.last_name)
    setStreet(customer.street)
    setPostalCode(customer.postal_code)
    setCity(customer.city)
    setPhone(customer.phone ?? "")
    setEmail(customer.email ?? "")
    setFormError(null)
    setIsFormOpen(true)
  }

  function switchView(nextView: CustomerView) {
    closeForm()
    setSearch("")
    setActionError(null)
    setView(nextView)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setIsSaving(true)

    try {
      if (editingCustomer) {
        const customerUpdate: CustomerUpdate = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          street: street.trim(),
          postal_code: postalCode.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim(),
        }

        await updateCustomer(customerUpdate, editingCustomer.id)
      } else {
        const customerCreate: CustomerCreate = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          street: street.trim(),
          postal_code: postalCode.trim(),
          city: city.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
        }

        await createCustomer(customerCreate)
      }

      closeForm()
      setSearch("")
      setReloadKey((currentKey) => currentKey + 1)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Der Kunde konnte nicht gespeichert werden.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleArchive(customer: Customer) {
    const shouldArchive = window.confirm(
      `Möchtest du „${customer.first_name} ${customer.last_name}“ wirklich archivieren?`,
    )

    if (!shouldArchive) {
      return
    }

    setActionError(null)

    try {
      const archivedCustomer = await archiveCustomer(customer.id)

      setCustomers((currentCustomers) =>
        currentCustomers.filter(
          (currentCustomer) => currentCustomer.id !== archivedCustomer.id,
        ),
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Der Kunde konnte nicht archiviert werden.",
      )
    }
  }

  async function handleRestore(customer: Customer) {
    setActionError(null)

    try {
      const restoredCustomer = await activateCustomer(customer.id)

      setCustomers((currentCustomers) =>
        currentCustomers.filter(
          (currentCustomer) => currentCustomer.id !== restoredCustomer.id,
        ),
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Der Kunde konnte nicht wiederhergestellt werden.",
      )
    }
  }



  function openDetails(customer: Customer) {
  setSelectedCustomer(customer)
  setNoteText("")
  setNoteError(null)
}

function closeDetails() {
  setSelectedCustomer(null)
  setNoteText("")
  setNoteError(null)
}

async function handleAddNote(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()

  if (!selectedCustomer || !noteText.trim()) {
    return
  }

  setIsAddingNote(true)
  setNoteError(null)

  try {
    const updatedCustomer = await addCustomerNote(selectedCustomer.id, {
      text: noteText.trim(),
    })

    setSelectedCustomer(updatedCustomer)

    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === updatedCustomer.id ? updatedCustomer : customer,
      ),
    )

    setNoteText("")
  } catch (error) {
    setNoteError(
      error instanceof Error
        ? error.message
        : "Die Notiz konnte nicht gespeichert werden.",
    )
  } finally {
    setIsAddingNote(false)
  }
}


useEffect(() => {
  async function loadCustomerTransactions() {
    if (!selectedCustomer) {
      setCustomerTransactions([])
      return
    }

    setIsLoadingTransactions(true)
    setTransactionError(null)

    try {
      const loadedTransactions = await fetchTransactions({
        customer_id: selectedCustomer.id,
      })

      setCustomerTransactions(loadedTransactions)
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



  void loadCustomerTransactions()
}, [selectedCustomer?.id])

async function handleExportCustomers() {
  setIsExporting(true)
  setActionError(null)

  try {
    const [activeCustomers, archivedCustomers] = await Promise.all([
      fetchCustomers(),
      getArchivedCustomers(),
    ])

    const allCustomers = [...activeCustomers, ...archivedCustomers]

    const rows = allCustomers.map((customer) => [
      customer.customer_number,
      customer.first_name,
      customer.last_name,
      customer.street,
      customer.postal_code,
      customer.city,
      customer.phone ?? "",
      customer.email ?? "",
      customer.is_active ? "Aktiv" : "Archiviert",
      new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(customer.created_at)),
      new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(customer.updated_at)),
      customer.notes
        .map(
          (note) =>
            `${new Intl.DateTimeFormat("de-DE", {
              dateStyle: "short",
            }).format(new Date(note.created_at))}: ${note.text}`,
        )
        .join(" | "),
    ])

    const datePart = new Date().toISOString().slice(0, 10)

    downloadCsv(
      `bela-kunden-${datePart}.csv`,
      [
        "Kundennummer",
        "Vorname",
        "Nachname",
        "Straße und Hausnummer",
        "PLZ",
        "Ort",
        "Telefon",
        "E-Mail",
        "Status",
        "Angelegt am",
        "Zuletzt geändert",
        "Notizen",
      ],
      rows,
    )
  } catch (error) {
    setActionError(
      error instanceof Error
        ? error.message
        : "Der Kundenexport konnte nicht erstellt werden.",
    )
  } finally {
    setIsExporting(false)
  }
}
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Kundenkartei</p>
          <h2>Kunden</h2>
        </div>

        {view === "active" && (
          <button className="primary-button" type="button" onClick={openCreateForm}>
            + Kunde anlegen
          </button>
        )}
        <button
          className="secondary-button"
            type="button"
              onClick={() => void handleExportCustomers()}
              disabled={isExporting}
          >
            {isExporting ? "Export wird erstellt …" : "Kunden als CSV exportieren"}
          </button>
      </header>

      <div className="customer-toolbar">
        <div className="view-switcher">
          <button
            className={`view-button ${view === "active" ? "selected" : ""}`}
            type="button"
            onClick={() => switchView("active")}
          >
            Aktive Kunden
          </button>

          <button
            className={`view-button ${view === "archived" ? "selected" : ""}`}
            type="button"
            onClick={() => switchView("archived")}
          >
            Archiv
          </button>
        </div>

        <span className="service-count">
          {customers.length} {view === "active" ? "aktive" : "archivierte"} Kunden
        </span>
      </div>

      {isFormOpen && (
        <section className="panel customer-form-panel">
          <div className="panel-heading">
            <div>
              <h3>
                {editingCustomer ? "Kundendaten bearbeiten" : "Neuen Kunden anlegen"}
              </h3>
              <p>
                {editingCustomer
                  ? "Die Änderungen werden direkt beim Kunden gespeichert."
                  : "Stammdaten für die Kundenkartei eintragen."}
              </p>
            </div>
          </div>

          <form className="customer-form" onSubmit={handleSubmit}>
            <label>
              Vorname
              <input
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>

            <label>
              Nachname
              <input
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>

            <label>
              Straße und Hausnummer
              <input
                required
                value={street}
                onChange={(event) => setStreet(event.target.value)}
              />
            </label>

            <label>
              Postleitzahl
              <input
                required
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
              />
            </label>

            <label>
              Ort
              <input
                required
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </label>

            <label>
              Telefonnummer
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>

            <label>
              E-Mail-Adresse
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            {formError && <p className="error-message">{formError}</p>}

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeForm}
                disabled={isSaving}
              >
                Abbrechen
              </button>

              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Wird gespeichert …" : "Speichern"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="customer-list-heading">
          <div>
            <h3>
              {view === "active" ? "Kundenübersicht" : "Archivierte Kunden"}
            </h3>
            <p className="service-count">
              {view === "active"
                ? "Diese Kunden können für Buchungen ausgewählt werden."
                : "Archivierte Kunden erscheinen nicht mehr in der normalen Auswahl."}
            </p>
          </div>

          {view === "active" && (
            <input
              className="customer-search"
              type="search"
              placeholder="Nach Vor- oder Nachname suchen …"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          )}
        </div>

        {isLoading && <p>Kunden werden geladen …</p>}
        {error && <p className="error-message">{error}</p>}
        {actionError && <p className="error-message">{actionError}</p>}

        {!isLoading && !error && customers.length === 0 && (
          <div className="empty-state">
            <h3>Keine Kunden gefunden</h3>
            <p>
              {view === "active"
                ? "Lege einen neuen Kunden an oder passe die Suche an."
                : "Zurzeit befinden sich keine Kunden im Archiv."}
            </p>
          </div>
        )}

        {!isLoading && !error && customers.length > 0 && (
          <div className="customer-list">
            {customers.map((customer) => (
              <article className="customer-item" key={customer.id}>
                <div className="customer-avatar">
                  {customer.first_name.charAt(0)}
                  {customer.last_name.charAt(0)}
                </div>

                <div className="customer-details">
                  <div>
                    <h3>
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <p>{customer.customer_number}</p>
                  </div>

                  <p>{formatAddress(customer)}</p>

                  {(customer.phone || customer.email) && (
                    <p>
                      {[customer.phone, customer.email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <div className="customer-actions">
                  <button 
                  className="action-button" 
                  type="button" 
                  onClick={() => openDetails(customer)}>
                  Details
                  </button>
                  {view === "active" ? (
                    <>
                      <button
                        className="action-button"
                        type="button"
                        onClick={() => openEditForm(customer)}
                      >
                        Bearbeiten
                      </button>

                      <button
                        className="action-button danger"
                        type="button"
                        onClick={() => void handleArchive(customer)}
                      >
                        Archivieren
                      </button>
                    </>
                  ) : (
                    <button
                      className="action-button restore"
                      type="button"
                      onClick={() => void handleRestore(customer)}
                    >
                      Wiederherstellen
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {selectedCustomer && (
  <section className="panel customer-detail-panel">
    <div className="customer-detail-header">
      <div>
        <p className="eyebrow">Kundendetails</p>
        <h3>
          {selectedCustomer.first_name} {selectedCustomer.last_name}
        </h3>
        <p className="service-count">{selectedCustomer.customer_number}</p>
      </div>

      <button
        className="secondary-button"
        type="button"
        onClick={closeDetails}
      >
        Schließen
      </button>
    </div>

    <div className="customer-detail-grid">
      <div>
        <span>Adresse</span>
        <p>{formatAddress(selectedCustomer)}</p>
      </div>

      <div>
        <span>Telefon</span>
        <p>{selectedCustomer.phone || "Nicht hinterlegt"}</p>
      </div>

      <div>
        <span>E-Mail</span>
        <p>{selectedCustomer.email || "Nicht hinterlegt"}</p>
      </div>
    </div>
        <div className="customer-transactions">
  <h4>Buchungen</h4>

  {isLoadingTransactions && <p className="service-count">Buchungen werden geladen …</p>}

  {transactionError && (
    <p className="error-message">{transactionError}</p>
  )}

  {!isLoadingTransactions &&
    !transactionError &&
    customerTransactions.length === 0 && (
      <p className="service-count">
        Für diesen Kunden gibt es bisher keine Buchungen.
      </p>
    )}

  {!isLoadingTransactions &&
    !transactionError &&
    customerTransactions.length > 0 && (
      <div className="customer-transaction-list">
        {customerTransactions.map((transaction) => (
          <article className="customer-transaction-item" key={transaction.id}>
            <div>
              <strong>{transaction.service_name || "Dienstleistung"}</strong>
              <p>
                {transaction.note && (
                  <p className="transaction-note">Notiz: {transaction.note}</p>
                )}
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "medium",
                }).format(new Date(transaction.occurred_at))}
                {" · "}
                {transaction.payment_method === "cash" ? "Bar" : "Online"}
                {"."}
                {transaction.receipt_number}
              </p>
            </div>

            <div className="transaction-amount">
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
              }).format(transaction.amount_cents / 100)}
            </div>
          </article>
        ))}
      </div>
    )}
</div>
    <div className="notes-section">
      <h4>Notizen</h4>

      {selectedCustomer.notes.length === 0 && (
        <p className="service-count">Bisher gibt es keine Notizen.</p>
      )}

      {selectedCustomer.notes.length > 0 && (
        <div className="notes-list">
          {[...selectedCustomer.notes]
            .reverse()
            .map((note, index) => (
              <article className="note-item" key={`${note.created_at}-${index}`}>
                <p>{note.text}</p>
                <span>
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(note.created_at))}
                </span>
              </article>
            ))}
        </div>
      )}

      {selectedCustomer.is_active && (
        <form className="note-form" onSubmit={handleAddNote}>
          <label>
            Neue Notiz
            <textarea
              required
              rows={3}
              placeholder="Zum Beispiel: Wunsch, Besonderheit oder Gesprächsnotiz …"
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
            />
          </label>

          {noteError && <p className="error-message">{noteError}</p>}

          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isAddingNote || !noteText.trim()}
            >
              {isAddingNote ? "Wird gespeichert …" : "Notiz hinzufügen"}
            </button>
          </div>
        </form>
      )}
    </div>
  </section>
)}
    </>
  )
}

export default CustomersPage