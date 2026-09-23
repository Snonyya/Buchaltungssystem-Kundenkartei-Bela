type CsvValue = string | number | null | undefined

function escapeCsvValue(value: CsvValue): string {
    let text = String(value??"")
    .replace(/\r?\n/g, " ")
    .trim()

    if(/^[+\-@]/.test(text)) {
        text = `'${text}`

    }

    return `"${text.replace(/"/g, '""')}"`
}

export function downloadCsv(
    filename: string,
    headers: string[],
    rows: CsvValue[][],
): void {
    const csvContent = [headers, ... rows]
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\r\n")

    // UTF-8-BOM: Excel erkennt Umlaute wie ä, ö und ü korrekt.
    
    const blob = new Blob([`\uFEFF${csvContent}`], {
        type: "text/csv;charset=utf-8"
        })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = filename
    link.click()

    URL.revokeObjectURL(url)
    
}