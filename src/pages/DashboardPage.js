import { useEffect, useState } from 'react';
import './DashboardPage.css';

const machineStatuses = [
  { label: 'Compressor', status: 'ON' },
  { label: 'Evaporator', status: 'OFF' },
  { label: 'Condenser', status: 'ON' },
  { label: 'System', status: 'ON' },
];

const getJakartaGreeting = () => {
  const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const hour = new Date(jakartaTime).getHours();

  if (hour >= 5 && hour < 11) {
    return 'pagi'; // Morning: 5am - 10:59am
  } else if (hour >= 11 && hour < 15) {
    return 'siang'; // Afternoon: 11am - 2:59pm
  } else if (hour >= 15 && hour < 18) {
    return 'sore'; // Evening: 3pm - 5:59pm
  } else {
    return 'malam'; // Night: 6pm - 4:59am
  }
};

const DashboardPage = () => {
  const [greeting, setGreeting] = useState(getJakartaGreeting());

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getJakartaGreeting());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="page dashboard-page">
      <div className="dashboard-title">
        <h1>Dashboard</h1>
        <span>Selamat {greeting}!</span>
      </div>

      <div className="dashboard-main">
        <div className="temperature card">
          <div className="temperature-title">
            <span>Suhu ruangan saat ini</span>
            <span className="temperature-value">-82°C</span>
          </div>
        </div>

        <div className="machine card">
          {machineStatuses.map((machine) => (
            <div key={machine.label} className="machine-row">
              <div className="machine-label">{machine.label}</div>
              <div className="machine-status" data-state={machine.status.toLowerCase()}>
                {machine.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
