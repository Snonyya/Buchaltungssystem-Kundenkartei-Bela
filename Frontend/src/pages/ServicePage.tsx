import { type FormEvent, useEffect, useState } from "react"

import {
  archiveService,
  createService,
  fetchArchivedServices,
  fetchServices,
  restoreService,
  updateService,
  type Service,
} from "../api/service"

type ServiceView = "active" | "archived"

function formatCents(amountCents: number | null): string {
  if (amountCents === null) {
    return "Kein Preis"
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100)
}

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [view, setView] = useState<ServiceView>("active")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const [serviceName, setServiceName] = useState("")
  const [serviceDescription, setServiceDescription] = useState("")
  const [priceInput, setPriceInput] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function loadServices() {
      setIsLoading(true)
      setError(null)

      try {
        const loadedServices =
          view === "active"
            ? await fetchServices()
            : await fetchArchivedServices()

        setServices(loadedServices)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Dienstleistungen konnten nicht geladen werden.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadServices()
  }, [view])

  function closeForm() {
    setIsFormOpen(false)
    setEditingService(null)
    setServiceName("")
    setServiceDescription("")
    setPriceInput("")
    setFormError(null)
  }

  function openCreateForm() {
    closeForm()
    setIsFormOpen(true)
  }

  function openEditForm(service: Service) {
    setEditingService(service)
    setServiceName(service.service_name)
    setServiceDescription(service.service_description)
    setPriceInput(
      service.default_price_cents === null
        ? ""
        : (service.default_price_cents / 100)
            .toFixed(2)
            .replace(".", ","),
    )
    setFormError(null)
    setIsFormOpen(true)
  }

  async function handleSubmitService(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const normalizedPrice = priceInput.replace(",", ".")
    const priceInEuros = normalizedPrice
      ? Number(normalizedPrice)
      : null

    if (
      priceInEuros !== null &&
      (!Number.isFinite(priceInEuros) || priceInEuros < 0)
    ) {
      setFormError("Bitte gib einen gültigen Preis ein.")
      return
    }

    const serviceData = {
      service_name: serviceName.trim(),
      service_description: serviceDescription.trim(),
      default_price_cents:
        priceInEuros === null ? null : Math.round(priceInEuros * 100),
    }

    setIsSaving(true)
    setFormError(null)

    try {
      if (editingService) {
        const updatedService = await updateService(
          serviceData,
          editingService.id,
        )

        setServices((currentServices) =>
          currentServices.map((service) =>
            service.id === updatedService.id ? updatedService : service,
          ),
        )
      } else {
        const createdService = await createService(serviceData)

        setServices((currentServices) =>
          [...currentServices, createdService].sort((first, second) =>
            first.service_name.localeCompare(second.service_name, "de"),
          ),
        )
      }

      closeForm()
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Die Dienstleistung konnte nicht gespeichert werden.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleArchiveService(service: Service) {
    if (
      !window.confirm(
        `Möchtest du „${service.service_name}“ wirklich archivieren?`,
      )
    ) {
      return
    }

    setActionError(null)

    try {
      const archivedService = await archiveService(service.id)

      setServices((currentServices) =>
        currentServices.filter(
          (currentService) => currentService.id !== archivedService.id,
        ),
      )

      if (editingService?.id === archivedService.id) {
        closeForm()
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Die Dienstleistung konnte nicht archiviert werden.",
      )
    }
  }

  async function handleRestoreService(service: Service) {
    setActionError(null)

    try {
      const restoredService = await restoreService(service.id)

      setServices((currentServices) =>
        currentServices.filter(
          (currentService) => currentService.id !== restoredService.id,
        ),
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Die Dienstleistung konnte nicht wiederhergestellt werden.",
      )
    }
  }

  function switchView(nextView: ServiceView) {
    closeForm()
    setActionError(null)
    setView(nextView)
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h2>Dienstleistungen</h2>
        </div>

        {view === "active" && (
          <button className="primary-button" onClick={openCreateForm}>
            + Dienstleistung anlegen
          </button>
        )}
      </header>

      <div className="service-toolbar">
        <div className="view-switcher">
          <button
            className={`view-button ${view === "active" ? "selected" : ""}`}
            onClick={() => switchView("active")}
          >
            Aktiv
          </button>

          <button
            className={`view-button ${view === "archived" ? "selected" : ""}`}
            onClick={() => switchView("archived")}
          >
            Archiv
          </button>
        </div>

        <span className="service-count">
          {services.length} {services.length === 1 ? "Eintrag" : "Einträge"}
        </span>
      </div>

      {isFormOpen && (
        <section className="panel service-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Dienstleistung</p>
              <h3>
                {editingService
                  ? "Dienstleistung bearbeiten"
                  : "Neue Dienstleistung"}
              </h3>
            </div>
          </div>

          <form className="service-form" onSubmit={handleSubmitService}>
            <label>
              Name
              <input
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
                placeholder="z. B. Haarschnitt"
                required
              />
            </label>

            <label>
              Beschreibung
              <input
                value={serviceDescription}
                onChange={(event) =>
                  setServiceDescription(event.target.value)
                }
                placeholder="Kurze Beschreibung"
                required
              />
            </label>

            <label>
              Standardpreis in €
              <input
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value)}
                placeholder="z. B. 25,00"
                inputMode="decimal"
              />
            </label>

            {formError && <p className="error-message">{formError}</p>}

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeForm}
              >
                Abbrechen
              </button>

              <button className="primary-button" disabled={isSaving}>
                {isSaving
                  ? "Wird gespeichert …"
                  : editingService
                    ? "Änderungen speichern"
                    : "Dienstleistung speichern"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        {isLoading && <p>Dienstleistungen werden geladen …</p>}

        {error && <p className="error-message">{error}</p>}

        {actionError && <p className="error-message">{actionError}</p>}

        {!isLoading && !error && services.length === 0 && (
          <div className="empty-state">
            <h3>
              {view === "active"
                ? "Noch keine Dienstleistungen"
                : "Das Archiv ist leer"}
            </h3>
            <p>
              {view === "active"
                ? "Lege deine erste Dienstleistung über den Button oben an."
                : "Archivierte Dienstleistungen erscheinen hier."}
            </p>
          </div>
        )}

        {!isLoading && !error && services.length > 0 && (
          <div className="service-list">
            {services.map((service) => (
              <article className="service-item" key={service.id}>
                <div className="service-details">
                  <div className="service-icon">
                    {service.service_name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3>{service.service_name}</h3>
                    <p>{service.service_description}</p>
                  </div>
                </div>

                <div className="service-actions">
                  <strong className="service-price">
                    {formatCents(service.default_price_cents)}
                  </strong>

                  {view === "active" ? (
                    <>
                      <button
                        className="action-button"
                        onClick={() => openEditForm(service)}
                      >
                        Bearbeiten
                      </button>

                      <button
                        className="action-button danger"
                        onClick={() => void handleArchiveService(service)}
                      >
                        Archivieren
                      </button>
                    </>
                  ) : (
                    <button
                      className="action-button restore"
                      onClick={() => void handleRestoreService(service)}
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
    </>
  )
}

export default ServicesPage