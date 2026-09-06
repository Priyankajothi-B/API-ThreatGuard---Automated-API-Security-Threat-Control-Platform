import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import OverviewDashboard from './pages/OverviewDashboard';
import AttackSimulator from './pages/AttackSimulator';
import LiveEvents from './pages/LiveEvents';
import BehaviorAnalytics from './pages/BehaviorAnalytics';
import AttackCampaigns from './pages/AttackCampaigns';
import IncidentsManager from './pages/IncidentsManager';
import EndpointsInventory from './pages/EndpointsInventory';
import PolicyManager from './pages/PolicyManager';
import AuditLogs from './pages/AuditLogs';
import socket from './services/socket';
import { getSecurityPosture } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [posture, setPosture] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);

  const fetchPosture = async () => {
    try {
      const res = await getSecurityPosture();
      if (res.data.success) setPosture(res.data.data);
    } catch (err) {
      console.error('Failed to fetch security posture:', err);
    }
  };

  useEffect(() => {
    fetchPosture();

    socket.on('connect', () => setIsSocketConnected(true));
    socket.on('disconnect', () => setIsSocketConnected(false));
    socket.on('security-event', () => {
      fetchPosture();
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('security-event');
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans">
      <Navbar posture={posture} isSocketConnected={isSocketConnected} />

      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 max-w-7xl mx-auto overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewDashboard onNavigateToSimulator={() => setActiveTab('simulator')} />
          )}
          {activeTab === 'simulator' && (
            <AttackSimulator onRefreshDashboard={fetchPosture} />
          )}
          {activeTab === 'events' && <LiveEvents />}
          {activeTab === 'behavior' && <BehaviorAnalytics />}
          {activeTab === 'campaigns' && <AttackCampaigns />}
          {activeTab === 'incidents' && <IncidentsManager />}
          {activeTab === 'endpoints' && <EndpointsInventory />}
          {activeTab === 'policies' && <PolicyManager />}
          {activeTab === 'audit' && <AuditLogs />}
        </main>
      </div>
    </div>
  );
}
