import {apiRequest} from "./client";

import type { BusinessProfileInput } from "./settings"

export type TransactionStatus = "booked" | "cancelled" | "all"


export type TransactionCreate = {
    customer_id: string
    amount_cents: number
    payment_method: PaymentMethod
    service_id: string
    note?: string | null
    occurred_at?: string | null
}


export type TransactionCancel = {
    reason: string
}


export type PaymentMethod = "cash" | "online"


export type TransactionSortField =
  | "occurred_at"
  | "amount_cents"
  | "receipt_number"
  | "customer_name"
  | "service_name"
  | "created_at"

export type SortDirection = "asc" | "desc"


export type TransactionFilters = {
  customer_id?: string
  start?: string
  end?: string
  payment_method?: PaymentMethod
  service_id?: string
  status?: TransactionStatus
  search?: string
  sort_by?: TransactionSortField
  sort_direction?: SortDirection
}

export type Transaction = {
    id: string
    customer_id: string
    customer_name: string | null
    customer_number: string | null
    business_profile_snapshot: BusinessProfileInput | null
    net_amount_cents: number | null
    tax_amount_cents: number | null
    amount_cents: number
    payment_method: PaymentMethod
    service_id: string
    service_name:string | null
    note: string | null
    occurred_at: string
    created_at: string
    status: "booked" | "cancelled"
    receipt_number: string
    cancelled_at: string | null
    cancellation_reason: string | null
}


export function fetchTransactions(
  filters: TransactionFilters = {},
): Promise<Transaction[]> {
  const query = new URLSearchParams()

  if (filters.customer_id) {
    query.set("customer_id", filters.customer_id)
  }

  if (filters.start) {
    query.set("start", filters.start)
  }

  if (filters.end) {
    query.set("end", filters.end)
  }

  if (filters.payment_method) {
    query.set("payment_method", filters.payment_method)
  }

  if (filters.service_id) {
    query.set("service_id", filters.service_id)
  }

    if (filters.status){
    query.set("status", filters.status)
  }

  if (filters.search){
    query.set("search", filters.search)
  }

  if (filters.sort_by){
    query.set("sort_by", filters.sort_by)
  }

  if (filters.sort_direction){
    query.set("sort_direction", filters.sort_direction)
  }

  const queryString = query.toString()
  const path = queryString
    ? `/transaction?${queryString}`
    : "/transaction"

  return apiRequest<Transaction[]>(path)
}

export function createTransaction(transactionCreate: TransactionCreate): Promise<Transaction> {
    return apiRequest<Transaction>("/transaction", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(transactionCreate)
    })
}

export function cancelTransaction(transactionId: string, transactionCancel: TransactionCancel): Promise<Transaction> {
    return apiRequest<Transaction>(`/transaction/${transactionId}/cancel`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(transactionCancel)
    })
}


export function fetchTransaction(transactionId: string): Promise<Transaction> {
    return apiRequest<Transaction>(`/transaction/${transactionId}`)
}

