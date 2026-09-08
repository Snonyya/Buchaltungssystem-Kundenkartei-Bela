import { apiRequest } from "./client";



export type CustomerNoteCreate = {
    text: string
}

export type NoteUpdate = {
    note: string
    updated_at: string
}

export type CustomerNote = {
    text: string
    created_at: string
}



export type CustomerCreate = {
    first_name: string
    last_name: string
    street: string
    city: string
    postal_code: string
    notes?: string | null
    phone?: string | null
    email?: string | null
}


export type CustomerUpdate = {
    first_name?: string
    last_name?: string
    street?: string
    city?: string
    postal_code?: string
    note?: string
    phone?: string
    email?: string
}



export type Customer = {
        id: string
        customer_number: string
        first_name: string
        last_name: string
        street: string
        postal_code: string
        city: string
        email: string | null
        phone: string | null
        notes: CustomerNote []
        created_at: string
        updated_at: string
        is_active: boolean 
}

export type CustomerFilter = {
    search?: string
}

export function fetchCustomers(filters: CustomerFilter = {}): Promise<Customer[]>{
    const query = new URLSearchParams

    if (filters.search){
    query.set("search", filters.search)
    }


    const queryString = query.toString()
    const path = queryString
    ? `/customer?${queryString}`
    : `/customer`


    return apiRequest <Customer[]>(path)
}

export function createCustomer(customerCreate: CustomerCreate): Promise<Customer>{
    return apiRequest <Customer>("/customer", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(customerCreate)
    })
}

export function getArchivedCustomers(): Promise<Customer[]>{
    return apiRequest<Customer[]>("/customer/archived")
}

export function fetchCustomer(customerId: string): Promise<Customer>{
    return apiRequest<Customer>(`/customer/${customerId}`)
}

export function updateCustomer(customerUpdate: CustomerUpdate, customerId: string): Promise<Customer>{
    return apiRequest<Customer>(`/customer/${customerId}`, {
        method:"PATCH",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify(customerUpdate)
    })
}

export function archiveCustomer(customerId: string): Promise<Customer>{
    return apiRequest<Customer>(`/customer/${customerId}`, {
        method:"DELETE"
    })
}

export function activateCustomer(customerId: string): Promise<Customer>{
    return apiRequest<Customer>(`/customer/${customerId}/restore`, {
        method: "PATCH"
    })
}

export function addCustomerNote(customerId: string, customerNote: CustomerNoteCreate): Promise<Customer>{
    return apiRequest<Customer>(`/customer/${customerId}/notes`, {
        method:"POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify(customerNote)
    })
}


