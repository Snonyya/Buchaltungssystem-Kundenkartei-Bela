const Backend_URL = import.meta.env.VITE_BACKEND_URL


export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${Backend_URL}${path}`, options)

  if (!response.ok) {
    throw new Error("Die Anfrage an das Backend ist fehlgeschlagen.")
  }

  return response.json() as Promise<T>
}