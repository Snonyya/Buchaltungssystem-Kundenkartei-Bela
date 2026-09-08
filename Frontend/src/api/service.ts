import { apiRequest } from "./client"


export type ServiceCreate = {
    service_name: string
    service_description?: string
    default_price_cents?: number | null
}


export type ServiceUpdate = {
    service_name?: string
    service_description?:string
    default_price_cents?: number | null
}


export type Service = {
  id: string
  service_name: string
  service_description: string
  default_price_cents: number | null
  is_active: boolean
}

export function fetchServices(): Promise<Service[]> {
  return apiRequest<Service[]>("/service")
}

export function updateService(serviceUpdate: ServiceUpdate, serviceId: string): Promise<Service> {
     return apiRequest<Service>(`/service/${serviceId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceUpdate),
        }
     )
}

export function createService(serviceCreate: ServiceCreate): Promise<Service> {
    return apiRequest<Service>(`/service`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceCreate)
    })
}

export function archiveService(serviceId: string): Promise<Service> {
    return apiRequest<Service>(`/service/${serviceId}`, {
        method: "DELETE"
    })
}

export function fetchService(serviceId: string): Promise<Service> {
  return apiRequest<Service>(`/service/${serviceId}`)
}

export function fetchArchivedServices(): Promise<Service[]> {
  return apiRequest<Service[]>("/service/archived")
}

export function restoreService(serviceId: string): Promise<Service>{
    return apiRequest<Service>(`/service/${serviceId}/restore`, {
        method: "PATCH"
    })
}