import './HistoryPage.css';

const historyRows = [
  { time: '15/07/25 13:45', description: 'Suhu berada pada nilai tertinggi yaitu -82\u00b0C.' },
  { time: '15/07/25 13:44', description: 'Suhu berada pada nilai tertinggi yaitu -81\u00b0C.' },
  { time: '15/07/25 13:42', description: 'Suhu berada pada nilai tertinggi yaitu -80\u00b0C.' },
  { time: '15/07/25 13:40', description: 'Suhu berada pada nilai tertinggi yaitu -79\u00b0C.' },
];

const HistoryPage = () => {
  return (
    <main className="page history-page">
      <div className="history-title">
        <h1>Analisis Grafik</h1>
        <span>Pilih rentang waktu dan jenis sensor untuk melihat data historis secara mendetail.</span>
      </div>

      <div className="history-menu">
        <div className="sensor-menu">
          <label htmlFor="sensor">Pilih sensor:</label>
          <select name="sensor" id="sensor">
            <option value="sensor-suhu">Suhu</option>
            <option value="sensor-compressor">Compressor</option>
            <option value="sensor-evaporator">Evaporator</option>
            <option value="sensor-blower">Blower</option>
          </select>
        </div>
        <div className="filter-menu">
          <div className="filter-pill">Hari</div>
          <div className="filter-pill">Minggu</div>
          <div className="filter-pill">Bulan</div>
          <div className="filter-pill">Tahun</div>
        </div>
      </div>

      <div className="history-display">
        <table>
          <thead>
            <tr>
              <td>Waktu</td>
              <td>Kejadian</td>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((row) => (
              <tr key={row.time}>
                <td>{row.time}</td>
                <td>{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="history-export">
        <div className="export-btn">Ekspor PDF</div>
        <div className="export-btn">Ekspor Excel</div>
      </div>
    </main>
  );
};

export default HistoryPage;
