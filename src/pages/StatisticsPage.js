import './StatisticsPage.css';

const StatisticsPage = () => {
  return (
    <main className="page statistics-page">
      <div className="statistics-title">
        <h1>Analisis Grafik</h1>
        <span>Pilih rentang waktu dan jenis sensor untuk melihat data historis secara mendetail.</span>
      </div>

      <div className="statistics-menu">
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

      <div className="statistics-display card">
        Grafik tahunan dari suhu.
      </div>
    </main>
  );
};

export default StatisticsPage;
