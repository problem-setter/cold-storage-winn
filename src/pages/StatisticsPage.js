import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './StatisticsPage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function StatisticsPage() {
  const [sensor, setSensor] = useState('temperature');
  const [period, setPeriod] = useState('hour');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  const sensors = {
    temperature: {
      label: 'Suhu Rata-rata (°C)',
      type: 'line',
      get: r => Number(r.suhu)
    },
    compressor: {
      label: 'Kompresor Aktif (%)',
      type: 'bar',
      get: r => r.comp_on ? 1 : 0
    },
    evaporator: {
      label: 'Evaporator Aktif (%)',
      type: 'bar',
      get: r => r.evap_on ? 1 : 0
    },
    condenser: {
      label: 'Kondensor Aktif (%)',
      type: 'bar',
      get: r => r.cond_on ? 1 : 0
    },
    system: {
      label: 'Sistem Menyala (%)',
      type: 'bar',
      get: r => r.power_on ? 1 : 0
    }
  };

  useEffect(() => {
    loadData();
  }, [sensor, period, date]);

  async function loadData() {
    setLoading(true);

    let start, end;
    const now = new Date();

    if (period === 'hour') {
      start = new Date(date); start.setHours(0,0,0,0);
      end = new Date(date); end.setHours(23,59,59,999);
    } else {
      end = now;
      start = new Date(now);
      if (period === 'day') start.setDate(now.getDate() - 6);
      if (period === 'week') start.setMonth(now.getMonth() - 1);
      if (period === 'month') start.setFullYear(now.getFullYear() - 1);
    }

    const { data } = await supabase
      .from('cold_storage')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at');

    setChartData(buildChart(data || []));
    setLoading(false);
  }

  function buildChart(rows) {
    let labels = [];
    let buckets = [];

    if (period === 'hour') {
      labels = [...Array(24)].map((_,i)=>`${i.toString().padStart(2,'0')}:00`);
      buckets = Array.from({length:24},()=>[]);
    }
    if (period === 'day') {
      labels = DAYS;
      buckets = Array.from({length:7},()=>[]);
    }
    if (period === 'week') {
      labels = ['Minggu 1','Minggu 2','Minggu 3','Minggu 4','Minggu 5'];
      buckets = Array.from({length:5},()=>[]);
    }
    if (period === 'month') {
      labels = MONTHS;
      buckets = Array.from({length:12},()=>[]);
    }

    rows.forEach(r => {
      const d = new Date(r.created_at);
      let i = 0;
      if (period === 'hour') i = d.getHours();
      if (period === 'day') i = d.getDay();
      if (period === 'week') i = Math.min(4, Math.floor((d.getDate()-1)/7));
      if (period === 'month') i = d.getMonth();
      buckets[i].push(sensors[sensor].get(r));
    });

    const values = buckets.map(b => {
      if (!b.length) return null;
      if (sensor === 'temperature') {
        return +(b.reduce((a,c)=>a+c,0)/b.length).toFixed(2);
      }
      return Math.round((b.filter(v=>v===1).length / b.length) * 100);
    });

    return {
      labels,
      datasets: [{
        label: sensors[sensor].label,
        data: values,
        backgroundColor: sensor === 'temperature'
          ? 'rgba(37,99,235,0.25)'
          : 'rgba(16,185,129,0.85)',
        borderColor: '#2563eb',
        fill: sensor === 'temperature',
        tension: 0.35
      }]
    };
  }

  return (
    <main className="page statistics-page">
      <div className="statistics-title">
        <h1>Analisis Grafik</h1>
        <span>Pilih rentang waktu dan jenis sensor untuk melihat grafik data secara mendetail.</span>
      </div>

      <div className="statistics-menu">
        <select value={sensor} onChange={e=>setSensor(e.target.value)}>
          {Object.entries(sensors).map(([k,v])=>(
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {period === 'hour' && (
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        )}

        <div className="filter-menu">
          {['hour','day','week','month'].map(p=>(
            <div
              key={p}
              className={`filter-pill ${period===p?'active':''}`}
              onClick={()=>setPeriod(p)}
            >
              {p.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="statistics-display">
        {loading && <p>Memuat data…</p>}
        {!loading && chartData && (
          <div className="chart-container">
            {sensors[sensor].type === 'line'
              ? <Line data={chartData} />
              : <Bar data={chartData} />}
          </div>
        )}
      </div>
    </main>
  );
}
