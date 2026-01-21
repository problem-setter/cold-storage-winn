// ===============================
// WIB helpers (SINGLE SOURCE — FINAL)
// ===============================

// 🔹 FORMAT WIB (UNTUK TABEL, PDF, EXCEL, UI)
export const formatWIB = (utcTs) =>
  new Date(utcTs).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

// 🔹 DEFAULT DATE PICKER = HARI INI WIB
export const todayWIBISO = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jakarta'
  });

// 🔹 RANGE 1 HARI WIB → UTC (UNTUK QUERY)
// WIB = UTC+7
export const wibDayRangeToUTC = (dateISO) => {
  const startUTC = new Date(`${dateISO}T00:00:00Z`)
  startUTC.setUTCHours(startUTC.getUTCHours() - 7)

  const endUTC = new Date(`${dateISO}T23:59:59.999Z`)
  endUTC.setUTCHours(endUTC.getUTCHours() - 7)

  return {
    startUTC: startUTC.toISOString(),
    endUTC: endUTC.toISOString(),
  }
}


// 🔹 PARSE UTC → DATE OBJECT WIB (UNTUK LOGIC, BUKAN FORMAT)
export const parseUTCToWIBDate = (utcTs) => {
  return new Date(
    new Date(utcTs).toLocaleString('en-US', {
      timeZone: 'Asia/Jakarta'
    })
  )
}
