import { apiRequest } from "./client"


export type TaxationMode = "standard" | "small_business"

export type BusinessProfileInput = {
  legal_name: string
  owner_name: string | null

  street: string
  postal_code: string
  city: string
  country: string

  phone: string | null
  email: string | null

  tax_number: string | null
  vat_id: string | null

  taxation_mode: TaxationMode
  vat_rate_percent: number | null
  small_business_notice: string | null
}

export type BusinessProfile = BusinessProfileInput & {
  created_at: string
  updated_at: string
}

export function fetchBusinessProfile(): Promise<BusinessProfile | null> {
  return apiRequest<BusinessProfile | null>("/settings/business_profile")
}

export function saveBusinessProfile(
  profile: BusinessProfileInput,
): Promise<BusinessProfile> {
  return apiRequest<BusinessProfile>("/settings/business_profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  })
}