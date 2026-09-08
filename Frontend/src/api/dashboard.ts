import {apiRequest} from "./client"


export type DashboardSummary = {
    start: string
    end: string
    transaction_count: number
    total_cents: number
    cash_total_cents: number
    online_total_cents: number
    average_cents: number
    lowest_transaction_cents?: number | null
    highest_transaction_cents?: number | null
}

export function fetchDashboardSummary(start: string, end: string): Promise<DashboardSummary>{

    const query = new URLSearchParams
    
    query.set("start", start)
    query.set("end", end)

    const queryString = query.toString()
    

    return apiRequest<DashboardSummary>(`/dashboard?${queryString}`)
}