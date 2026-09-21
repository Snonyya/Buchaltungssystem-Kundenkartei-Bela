import { type FormEvent, useEffect, useState } from "react"

import {
  fetchBusinessProfile,
  saveBusinessProfile,
  type BusinessProfileInput,
  type TaxationMode,
} from "../api/settings"

import {
  fetchAuditLogs,
  type AuditLog,
} from "../api/audit"


const emptyProfile: BusinessProfileInput = {
  legal_name: "",
  owner_name: null,

  street: "",
  postal_code: "",
  city: "",
  country: "Deutschland",

  phone: null,
  email: null,

  tax_number: null,
  vat_id: null,

  taxation_mode: "standard",
  vat_rate_percent: 19,
  small_business_notice: null,
}

export function SettingsPage() {
  const [profile, setProfile] =
    useState<BusinessProfileInput>(emptyProfile)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      setError(null)

      try {
        const loadedProfile = await fetchBusinessProfile()

        if (loadedProfile) {
          setProfile({
            legal_name: loadedProfile.legal_name,
            owner_name: loadedProfile.owner_name,
            street: loadedProfile.street,
            postal_code: loadedProfile.postal_code,
            city: loadedProfile.city,
            country: loadedProfile.country,
            phone: loadedProfile.phone,
            email: loadedProfile.email,
            tax_number: loadedProfile.tax_number,
            vat_id: loadedProfile.vat_id,
            taxation_mode: loadedProfile.taxation_mode,
            vat_rate_percent: loadedProfile.vat_rate_percent,
            small_business_notice: loadedProfile.small_business_notice,
          })
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Die Einstellungen konnten nicht geladen werden.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      await saveBusinessProfile({
        ...profile,
        owner_name: profile.owner_name?.trim() || null,
        phone: profile.phone?.trim() || null,
        email: profile.email?.trim() || null,
        tax_number: profile.tax_number?.trim() || null,
        vat_id: profile.vat_id?.trim() || null,
        vat_rate_percent:
          profile.taxation_mode === "standard"
            ? profile.vat_rate_percent
            : null,
        small_business_notice:
          profile.taxation_mode === "small_business"
            ? profile.small_business_notice?.trim() || null
            : null,
      })

      setSuccess("Betreiberprofil wurde gespeichert.")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Die Einstellungen konnten nicht gespeichert werden.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function loadAuditLogs() {
  setShowAuditLogs(true)
  setIsLoadingAudit(true)
  setAuditError(null)

  try {
    const logs = await fetchAuditLogs(500)
    setAuditLogs(logs)
  } catch (error) {
    setAuditError(
      error instanceof Error
        ? error.message
        : "Das Aktivitätsprotokoll konnte nicht geladen werden.",
    )
  } finally {
    setIsLoadingAudit(false)
  }
}

  if (isLoading) {
    return <p>Einstellungen werden geladen …</p>
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Interne Einstellungen</p>
          <h2>Betreiberprofil</h2>
        </div>
      </header>

      <section className="panel settings-intro">
        <h3>Angaben für spätere Belege</h3>
        <p>
          Diese Daten werden zentral gespeichert und später auf interne
          Buchungsbelege übernommen.
        </p>
      </section>

      <section className="panel settings-intro">
        <h3>Erweiterte Verwaltung</h3>
          <p>
            Das Aktivitätsprotokoll zeigt wichtige Änderungen an Buchungen,
            Kunden, Dienstleistungen und Unternehmenseinstellungen.
            </p>

            <button
              className="secondary-button"
              type="button"
              onClick={() => void loadAuditLogs()}
              disabled={isLoadingAudit}
              >
              {isLoadingAudit
                ? "Protokoll wird geladen …"
                : "Aktivitätsprotokoll anzeigen"}
            </button>
        </section>

      <form className="settings-form panel" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <h3>Unternehmen und Kontakt</h3>
            <p>Der Unternehmensname muss auf späteren Belegen eindeutig sein.</p>
          </div>
        </div>

        <label>
          Unternehmensname / vollständiger Name *
          <input
            required
            value={profile.legal_name}
            onChange={(event) =>
              setProfile({
                ...profile,
                legal_name: event.target.value,
              })
            }
          />
        </label>

        <label>
          Inhaber/in
          <input
            value={profile.owner_name ?? ""}
            onChange={(event) =>
              setProfile({
                ...profile,
                owner_name: event.target.value || null,
              })
            }
          />
        </label>

        <label>
          Straße und Hausnummer *
          <input
            required
            value={profile.street}
            onChange={(event) =>
              setProfile({
                ...profile,
                street: event.target.value,
              })
            }
          />
        </label>

        <label>
          Postleitzahl *
          <input
            required
            value={profile.postal_code}
            onChange={(event) =>
              setProfile({
                ...profile,
                postal_code: event.target.value,
              })
            }
          />
        </label>

        <label>
          Ort *
          <input
            required
            value={profile.city}
            onChange={(event) =>
              setProfile({
                ...profile,
                city: event.target.value,
              })
            }
          />
        </label>

        <label>
          Land
          <input
            value={profile.country}
            onChange={(event) =>
              setProfile({
                ...profile,
                country: event.target.value,
              })
            }
          />
        </label>

        <label>
          Telefonnummer
          <input
            type="tel"
            value={profile.phone ?? ""}
            onChange={(event) =>
              setProfile({
                ...profile,
                phone: event.target.value || null,
              })
            }
          />
        </label>

        <label>
          E-Mail-Adresse
          <input
            type="email"
            value={profile.email ?? ""}
            onChange={(event) =>
              setProfile({
                ...profile,
                email: event.target.value || null,
              })
            }
          />
        </label>

        <div className="settings-section-title">
          <h3>Steuerangaben</h3>
          <p>Diese Angaben sollten vor dem produktiven Einsatz geprüft werden.</p>
        </div>

        <label>
          Steuernummer
          <input
            value={profile.tax_number ?? ""}
            onChange={(event) =>
              setProfile({
                ...profile,
                tax_number: event.target.value || null,
              })
            }
          />
        </label>

        <label>
          Umsatzsteuer-ID
          <input
            value={profile.vat_id ?? ""}
            onChange={(event) =>
              setProfile({
                ...profile,
                vat_id: event.target.value || null,
              })
            }
          />
        </label>

        <label>
          Umsatzsteuer-Modell *
          <select
            value={profile.taxation_mode}
            onChange={(event) =>
              setProfile({
                ...profile,
                taxation_mode: event.target.value as TaxationMode,
              })
            }
          >
            <option value="standard">Reguläre Umsatzsteuer</option>
            <option value="small_business">
              Kleinunternehmerregelung
            </option>
          </select>
        </label>

        {profile.taxation_mode === "standard" && (
          <label>
            Standard-Steuersatz in Prozent *
            <input
              required
              min="0"
              max="100"
              type="number"
              value={profile.vat_rate_percent ?? ""}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  vat_rate_percent:
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                })
              }
            />
          </label>
        )}

        {profile.taxation_mode === "small_business" && (
          <label className="settings-full-width">
            Hinweis auf dem Beleg
            <textarea
              rows={3}
              placeholder="Zum Beispiel: Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
              value={profile.small_business_notice ?? ""}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  small_business_notice: event.target.value || null,
                })
              }
            />
          </label>
        )}

        {error && <p className="error-message">{error}</p>}
        {success && <p className="settings-success">{success}</p>}

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Wird gespeichert …" : "Einstellungen speichern"}
          </button>
        </div>
      </form>
      {showAuditLogs && (
  <section className="panel">
    <div className="panel-heading">
      <div>
        <h3>Aktivitätsprotokoll</h3>
        <p>Die neuesten Änderungen in der Anwendung.</p>
      </div>

      <button
        className="secondary-button"
        type="button"
        onClick={() => void loadAuditLogs()}
        disabled={isLoadingAudit}
      >
        Aktualisieren
      </button>
    </div>

    {auditError && <p className="error-message">{auditError}</p>}

    {!isLoadingAudit && !auditError && auditLogs.length === 0 && (
      <p>Noch keine protokollierten Änderungen vorhanden.</p>
    )}

    {!isLoadingAudit && auditLogs.length > 0 && (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Zeitpunkt</th>
              <th>Aktion</th>
              <th>Beschreibung</th>
            </tr>
          </thead>

          <tbody>
            {auditLogs.map((auditLog) => (
              <tr key={auditLog.id}>
                <td>
                  {new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(auditLog.occurred_at))}
                </td>
                <td>{auditLog.action}</td>
                <td>{auditLog.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}
    </>
  )
}

export default SettingsPage