// app/components/SmartRightPanel.js
'use client';
import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, ChevronDown, Wifi, Refrigerator, Disc, Lamp, 
  Tv, Volume2, ShieldCheck, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

export default function SmartRightPanel({ user, transactions = [], products = [] }) {
  // Toggle states for devices
  const [devices, setDevices] = useState({
    fridge: true,
    router: true,
    music: true,
    lamps: true
  });

  const toggleDevice = (key) => {
    setDevices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Monthly consumption / turnover data
  const chartData = [
    { month: 'Jan', value: 28 },
    { month: 'Feb', value: 24 },
    { month: 'Mar', value: 50 },
    { month: 'Apr', value: 42 },
    { month: 'May', value: 54 },
    { month: 'June', value: 65 },
    { month: 'July', value: 73 },
    { month: 'Aug', value: 48 },
  ];

  // Team members list
  const teamMembers = [
    { 
      name: user?.name || 'Scarlett', 
      role: 'Admin', 
      bg: 'bg-purple-100 text-purple-700 border-purple-200',
      avatar: user?.photoURL || null,
      color: '#6355d8'
    },
    { 
      name: 'Nariya', 
      role: 'Full Access', 
      bg: 'bg-orange-100 text-orange-700 border-orange-200',
      avatar: null,
      color: '#f97316'
    },
    { 
      name: 'Riya', 
      role: 'Full Access', 
      bg: 'bg-pink-100 text-pink-700 border-pink-200',
      avatar: null,
      color: '#ec4899'
    },
    { 
      name: 'Dad', 
      role: 'Full Access', 
      bg: 'bg-blue-100 text-blue-700 border-blue-200',
      avatar: null,
      color: '#3b82f6'
    },
    { 
      name: 'Mom', 
      role: 'Full Access', 
      bg: 'bg-amber-100 text-amber-700 border-amber-200',
      avatar: null,
      color: '#eab308'
    },
  ];

  return (
    <aside className="smart-right-panel">
      {/* 1. My Devices Section */}
      <section className="smart-panel-section">
        <div className="smart-panel-header">
          <h3 className="smart-panel-title">My Devices</h3>
          <div className="flex items-center gap-1.5">
            <div className="smart-badge-select">
              <span>ON</span>
              <ChevronDown size={14} />
            </div>
            <button className="smart-arrow-btn" title="ดูอุปกรณ์ทั้งหมด">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* 2x2 Colorful Grid */}
        <div className="grid grid-cols-2 gap-3.5 mt-3">
          {/* Card 1: Refridgerator (Purple) */}
          <div className={`smart-device-card bg-[#6355d8] ${!devices.fridge ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <Refrigerator size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white/90">
                  {devices.fridge ? 'ON' : 'OFF'}
                </span>
                <button 
                  onClick={() => toggleDevice('fridge')}
                  className={`smart-toggle-switch ${devices.fridge ? 'on' : ''}`}
                >
                  <span className="smart-toggle-thumb" />
                </button>
              </div>
            </div>
            <p className="smart-device-label mt-4">Refridgerator</p>
          </div>

          {/* Card 2: Router (Golden Yellow) */}
          <div className={`smart-device-card bg-[#ebb129] ${!devices.router ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <Wifi size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white/90">
                  {devices.router ? 'ON' : 'OFF'}
                </span>
                <button 
                  onClick={() => toggleDevice('router')}
                  className={`smart-toggle-switch ${devices.router ? 'on' : ''}`}
                >
                  <span className="smart-toggle-thumb" />
                </button>
              </div>
            </div>
            <p className="smart-device-label mt-4">Router</p>
          </div>

          {/* Card 3: Music System (Coral Orange) */}
          <div className={`smart-device-card bg-[#ff7a59] ${!devices.music ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <Disc size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white/90">
                  {devices.music ? 'ON' : 'OFF'}
                </span>
                <button 
                  onClick={() => toggleDevice('music')}
                  className={`smart-toggle-switch ${devices.music ? 'on' : ''}`}
                >
                  <span className="smart-toggle-thumb" />
                </button>
              </div>
            </div>
            <p className="smart-device-label mt-4">Music System</p>
          </div>

          {/* Card 4: Lamps (Teal Cyan) */}
          <div className={`smart-device-card bg-[#2cccd3] ${!devices.lamps ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <Lamp size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white/90">
                  {devices.lamps ? 'ON' : 'OFF'}
                </span>
                <button 
                  onClick={() => toggleDevice('lamps')}
                  className={`smart-toggle-switch ${devices.lamps ? 'on' : ''}`}
                >
                  <span className="smart-toggle-thumb" />
                </button>
              </div>
            </div>
            <p className="smart-device-label mt-4">Lamps</p>
          </div>
        </div>
      </section>

      {/* 2. Members Section */}
      <section className="smart-panel-section">
        <div className="smart-panel-header">
          <h3 className="smart-panel-title">Members</h3>
          <button className="smart-arrow-btn" title="ดูสมาชิกทั้งหมด">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-1 mt-3 px-1">
          {teamMembers.map((m, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 group cursor-pointer">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105 border-2 border-white"
                style={{ backgroundColor: `${m.color}20`, color: m.color }}
              >
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{m.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[11px] font-bold text-gray-800 truncate max-w-[50px]">
                {m.name}
              </span>
              <span className="text-[9px] text-gray-400 -mt-0.5">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Power Consumed Section */}
      <section className="smart-panel-section flex-1 flex flex-col justify-between">
        <div>
          <div className="smart-panel-header">
            <h3 className="smart-panel-title">Power Consumed</h3>
            <div className="flex items-center gap-1.5">
              <div className="smart-badge-select">
                <span>Month</span>
                <ChevronDown size={14} />
              </div>
              <button className="smart-arrow-btn" title="ดูรายละเอียดกราฟ">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff7a59] inline-block shadow-sm" />
              <span className="font-semibold text-gray-700">Electricity Consumed</span>
            </div>
            <span className="font-extrabold text-gray-800">73% Spending</span>
          </div>
        </div>

        {/* Spline Area Chart */}
        <div className="w-full h-36 mt-4 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff7a59" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#ff7a59" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 9, fill: '#94a3b8' }} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                ticks={[0, 25, 50, 75]}
                domain={[0, 85]}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white px-2.5 py-1 rounded-lg shadow-md border border-gray-100 text-xs font-bold text-gray-800">
                        {payload[0].payload.month}: <span className="text-[#ff7a59]">{payload[0].value}%</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#ff7a59" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#powerGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Peak dot indicator */}
          <div 
            className="absolute top-[28px] right-[62px] w-3 h-3 rounded-full bg-white border-2 border-[#ff7a59] shadow-sm pointer-events-none"
            title="73% peak"
          />
        </div>
      </section>
    </aside>
  );
}
