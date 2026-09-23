import { apiRequest } from "./client"
import type { PaymentMethod } from "./transaction"



export type ExpenseStatus = "booked" | "cancelled"


export type ExpenseListStatus = ExpenseStatus | "all"


export type ExpenseCreate = {
    amount_cents: number 
    payment_method: PaymentMethod
    category: string
    vendor?: string | null
    note?: string | null
    receipt_reference?: string | null
    occurred_at?: string
}

export type ExpenseCancel = {
    reason: string
}

export type ExpenseSortField =
  | "occurred_at"
  | "created_at"
  | "amount_cents"
  | "category"
  | "vendor"


export type SortDirection = "asc" | "desc"



export type ExpenseFilters = {
  start?: string
  end?: string
  payment_method?: PaymentMethod
  category?: string
  vendor?: string
  search?: string
  status?: ExpenseListStatus
  sort_by?: ExpenseSortField
  sort_direction?: SortDirection
}


export type Expense = {
    id: string
    amount_cents: number
    payment_method: PaymentMethod
    category: string
    vendor: string | null
    note: string | null
    receipt_reference: string | null
    occurred_at: string
    created_at: string
    status: ExpenseStatus
    cancelled_at: string | null
    cancellation_reason: string | null
}


export function fetchExpenses(filters: ExpenseFilters = {},): Promise <Expense[]> {
    const query = new URLSearchParams()

    if (filters.start) {
    query.set("start", filters.start)
  }

  if (filters.end) {
    query.set("end", filters.end)
  }

  if (filters.payment_method) {
    query.set("payment_method", filters.payment_method)
  }

  if (filters.category) {
    query.set("category", filters.category)
  }

  if (filters.vendor) {
    query.set("vendor", filters.vendor)
  }

  if (filters.search) {
    query.set("search", filters.search)
  }

  if (filters.status) {
    query.set("status", filters.status)
  }

  if (filters.sort_by) {
    query.set("sort_by", filters.sort_by)
  }

  if (filters.sort_direction) {
    query.set("sort_direction", filters.sort_direction)
}

const queryString = query.toString()
const path = queryString
    ? `/expense?${queryString}`
    : "/expense"

return apiRequest<Expense[]>(path)
}

export function createExpense(expenseData: ExpenseCreate): Promise<Expense> {
    return apiRequest<Expense>("/expense", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(expenseData)
    })
}

export function fetchExpense(expenseId: string): Promise<Expense>{
    return apiRequest(`/expense${expenseId}`)
}

export function cancelExpense(expenseId: string, cancellation: ExpenseCancel): Promise<Expense>{
    return apiRequest<Expense>(`/expense${expenseId}/cancel`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(cancellation),
    })
}