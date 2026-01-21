import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import './HistoryPage.css';
import { formatWIB, todayWIBISO, wibDayRangeToUTC } from '../utils/time';

/* 🔽 LIBRARY EXPORT */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const PAGE_SIZE = 20;
const AUTO_REFRESH_INTERVAL = 10000; // 10 detik
const EXPORT_TITLE = 'Riwayat Data Sistem';

/* ✅ FORMAT TANGGAL dd-mm-yyyy */
const formatDateDMY = (isoDate) => {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

/* ✅ TANGGAL LOKAL (yyyy-mm-dd untuk input date) */
const todayLocalISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const HistoryPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(todayLocalISO());
  const [showFaultOnly, setShowFaultOnly] = useState(false);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const autoReloadRef = useRef(null);

  /* ==========================
     📌 FETCH DATA (TABLE)
  ========================== */
  const fetchHistory = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
     const { startUTC, endUTC } = wibDayRangeToUTC(selectedDate)
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('cold_storage')
        .select('*', { count: 'exact' })
        .gte('created_at', startUTC)
        .lte('created_at', endUTC);

      if (showFaultOnly) {
        query = query.or(
          'comp_fault.eq.1,evap_fault.eq.1,cond_fault.eq.1,temp_fault.eq.1'
        );
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setRows(data || []);
      setTotalPages(Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)));
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data histori');
      setRows([]);
      setTotalPages(1);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /* ==========================
     🔁 AUTO RELOAD
  ========================== */
  useEffect(() => {
    fetchHistory();

    if (autoReloadRef.current) {
      clearInterval(autoReloadRef.current);
    }

    autoReloadRef.current = setInterval(() => {
      fetchHistory(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(autoReloadRef.current);
    // eslint-disable-next-line
  }, [selectedDate, showFaultOnly, page]);

  /* ==========================
     📌 FETCH SEMUA DATA (EXPORT)
  ========================== */
  const fetchAllForExport = async () => {
    const startUTC = new Date(`${selectedDate}T00:00:00+07:00`).toISOString();
    const endUTC   = new Date(`${selectedDate}T23:59:59+07:00`).toISOString();

    const PAGE_LIMIT = 1000;
    let allData = [];
    let from = 0;
    let done = false;

    while (!done) {
      let query = supabase
        .from('cold_storage')
        .select('*')
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_LIMIT - 1);

      if (showFaultOnly) {
        query = query.or(
          'comp_fault.eq.1,evap_fault.eq.1,cond_fault.eq.1,temp_fault.eq.1'
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      allData.push(...data);

      if (data.length < PAGE_LIMIT) done = true;
      else from += PAGE_LIMIT;
    }

    return allData;
  };

  /* ==========================
     🧱 RENDER HELPER
  ========================== */
  const renderStatus = (value) => (
    <span className={`badge ${value ? 'on' : 'off'}`}>
      {value ? 'ON' : 'OFF'}
    </span>
  );

  const faultText = (row) => {
    const f = [];
    if (row.comp_fault) f.push('Kompresor');
    if (row.evap_fault) f.push('Evaporator');
    if (row.cond_fault) f.push('Kondensor');
    if (row.temp_fault) f.push('Suhu');
    return f.length ? f.join(', ') : 'Normal';
  };

  const renderFault = (row) =>
    faultText(row) === 'Normal'
      ? <span className="fault-ok">✔ Normal</span>
      : <span className="fault-bad">⚠ {faultText(row)}</span>;

  /* ==========================
     📄 EXPORT PDF
  ========================== */
  const exportPDF = async () => {
    const data = await fetchAllForExport();
    if (!data.length) return alert('Tidak ada data untuk diexport');

    const dateLabel = formatDateDMY(selectedDate);

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text(EXPORT_TITLE, 14, 15);
    doc.text(`Tanggal: ${dateLabel}`, 14, 23);

    autoTable(doc, {
      startY: 30,
      head: [['Waktu', 'Suhu', 'Sistem', 'Kompresor', 'Evaporator', 'Kondensor', 'Fault']],
      body: data.map(row => [
        formatWIB(row.created_at),
        row.suhu?.toFixed(1),
        row.power_on ? 'ON' : 'OFF',
        row.comp_on ? 'ON' : 'OFF',
        row.evap_on ? 'ON' : 'OFF',
        row.cond_on ? 'ON' : 'OFF',
        faultText(row),
      ]),
      styles: { fontSize: 9 },
    });

    doc.save(`Riwayat_Data_${dateLabel}.pdf`);
  };

  /* ==========================
     📊 EXPORT EXCEL
  ========================== */
  const exportExcel = async () => {
    const data = await fetchAllForExport();
    if (!data.length) return alert('Tidak ada data untuk diexport');

    const dateLabel = formatDateDMY(selectedDate);

    const sheet = XLSX.utils.json_to_sheet(
      data.map(row => ({
        Waktu: formatWIB(row.created_at),
        Suhu: row.suhu,
        Sistem: row.power_on ? 'ON' : 'OFF',
        Kompresor: row.comp_on ? 'ON' : 'OFF',
        Evaporator: row.evap_on ? 'ON' : 'OFF',
        Kondensor: row.cond_on ? 'ON' : 'OFF',
        Fault: faultText(row),
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'History');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    saveAs(new Blob([buffer]), `Riwayat_Data_${dateLabel}.xlsx`);
  };

  return (
    <main className="page history-page">
      <div className="history-title">
        <h1>Riwayat Data Sistem</h1>
        <span>Pilih tanggal dan filter untuk melihat data histori.</span>
      </div>

      <div className="history-filter card">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setPage(0);
          }}
        />

        <label>
          <input
            type="checkbox"
            checked={showFaultOnly}
            onChange={(e) => {
              setShowFaultOnly(e.target.checked);
              setPage(0);
            }}
          />
          Fault saja
        </label>

        <button onClick={exportPDF}>📄 Export PDF</button>
        <button onClick={exportExcel}>📊 Export Excel</button>
      </div>

      <div className="history-display card">
        {loading && <p>Memuat…</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && rows.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Suhu</th>
                    <th>Sistem</th>
                    <th>Kompresor</th>
                    <th>Evaporator</th>
                    <th>Kondensor</th>
                    <th>Fault</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatWIB(row.created_at)}</td>
                      <td>{row.suhu?.toFixed(1)}</td>
                      <td>{renderStatus(row.power_on)}</td>
                      <td>{renderStatus(row.comp_on)}</td>
                      <td>{renderStatus(row.evap_on)}</td>
                      <td>{renderStatus(row.cond_on)}</td>
                      <td>{renderFault(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button disabled={page === 0} onClick={() => setPage(0)}>⏮ First</button>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>◀ Prev</button>
              <span className="page-info">
                Halaman <strong>{page + 1}</strong> dari <strong>{totalPages}</strong>
              </span>
              <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next ▶</button>
              <button disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>Last ⏭</button>
            </div>
          </>
        )}

        {!loading && rows.length === 0 && !error && (
          <p>Tidak ada data sesuai filter</p>
        )}
      </div>
    </main>
  );
};

export default HistoryPage;
