import { apiRequest } from "./client";

export type AuditLog = {
    id: string
    action: string
    entity_type: string
    entity_id: string
    summary: string
    actor: string
    details: Record<string, unknown>
    occurred_at: string
}

export function fetchAuditLogs(limit = 500): Promise<AuditLog[]>{
    const query = new URLSearchParams({
        limit: String(limit),
    })
    return apiRequest<AuditLog[]>(`/audit?${query.toString()}`)
}