// app/components/SmartDashboardView.js
'use client';
import React, { useState, useMemo } from 'react';
import { 
  CloudSun, Thermometer, Droplets, ChevronDown, Zap, Refrigerator, 
  Wind, Lightbulb, Minus, Plus, Flame, Sliders, TrendingUp,
  Package, ArrowRightLeft, Clock, ShieldCheck
} from 'lucide-react';
import HeroIllustration from './HeroIllustration';

export default function SmartDashboardView({ 
  user, 
  products = [], 
  transactions = [], 
  categories = [],
  setActiveTab = () => {}
}) {
  // Room / Space selector
  const [selectedRoom, setSelectedRoom] = useState('Living Room');
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);

  // Quick 4 cards state
  const [quickCards, setQuickCards] = useState({
    fridge: true,
    temperature: true,
    ac: false,
    lights: false
  });

  const toggleCard = (key) => {
    setQuickCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Living Room Temperature state & controls
  const [temp, setTemp] = useState(25);
  const [isTempActive, setIsTempActive] = useState(true);

  const handleDecreaseTemp = () => {
    if (temp > 5) setTemp(prev => prev - 1);
  };

  const handleIncreaseTemp = () => {
    if (temp < 35) setTemp(prev => prev + 1);
  };

  // Calculate arc rotation based on temp (range 5°C - 35°C => 0% - 100%)
  const percentage = Math.min(Math.max((temp - 5) / (35 - 5), 0), 1);
  // Stroke dasharray for 240 degree arc
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage * 0.75 * circumference);

  const rooms = ['Living Room', 'คลังสินค้าหลัก (Main Warehouse)', 'ห้องจัดเก็บเย็น (Cold Room)', 'พื้นที่จัดส่งสินค้า (Packing)'];

  const userName = user?.name || 'Scarlett';

  return (
    <div className="smart-dashboard-container space-y-6 animate-fade-in">
      {/* 1. Welcome Hero Banner */}
      <div className="smart-hero-banner flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <div className="smart-hero-content w-full sm:w-auto">
          <h1 className="smart-hero-title">
            Hello, {userName}!
          </h1>
          <p className="smart-hero-subtitle">
            Welcome Home! The air quality is good & fresh you can go out today.
          </p>

          <div className="smart-hero-stats">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8b4513]">
              <Thermometer size={16} className="text-[#b45309]" />
              <span><strong>+25°C</strong> Outdoor temperature</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8b4513]">
              <CloudSun size={16} className="text-[#b45309]" />
              <span>Fuzzy cloudy weather</span>
            </div>
          </div>
        </div>

        {/* Hero Vector Illustration */}
        <div className="smart-hero-art shrink-0">
          <HeroIllustration className="w-40 h-30 sm:w-48 sm:h-36 md:w-64 md:h-44" />
        </div>
      </div>

      {/* 2. Room / Space Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
          {userName}&apos;s Home
        </h2>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-xs border border-gray-100 text-xs font-bold text-gray-700">
            <Droplets size={14} className="text-sky-500" />
            <span>35%</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-xs border border-gray-100 text-xs font-bold text-gray-700">
            <Thermometer size={14} className="text-amber-500" />
            <span>15°C</span>
          </div>

          {/* Room Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-full shadow-xs border border-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>{selectedRoom}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isRoomDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRoomDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 animate-fade-in">
                {rooms.map((room, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedRoom(room);
                      setIsRoomDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${selectedRoom === room ? 'text-[#6355d8] bg-purple-50 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {room}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 4 Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Refridgerator */}
        <div className={`smart-quick-card bg-white border border-gray-100 ${!quickCards.fridge ? 'opacity-70' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500">
              {quickCards.fridge ? 'ON' : 'OFF'}
            </span>
            <button 
              onClick={() => toggleCard('fridge')}
              className={`smart-toggle-switch ${quickCards.fridge ? 'on' : ''}`}
            >
              <span className="smart-toggle-thumb" />
            </button>
          </div>
          <div className="mt-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6355d8] flex items-center justify-center">
              <Refrigerator size={20} />
            </div>
            <p className="font-bold text-sm text-[#6355d8] mt-2.5">Refridgerator</p>
          </div>
        </div>

        {/* Card 2: Temperature (Solid Purple Card) */}
        <div 
          className={`smart-quick-card bg-[#6355d8] text-white shadow-lg shadow-purple-500/20 ${!quickCards.temperature ? 'opacity-70' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/90">
              {quickCards.temperature ? 'ON' : 'OFF'}
            </span>
            <button 
              onClick={() => toggleCard('temperature')}
              className={`smart-toggle-switch on`}
              style={{ background: 'rgba(255,255,255,0.3)' }}
            >
              <span className="smart-toggle-thumb" style={{ background: '#ffffff' }} />
            </button>
          </div>
          <div className="mt-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <Zap size={20} />
            </div>
            <p className="font-bold text-sm text-white mt-2.5">Temperature</p>
          </div>
        </div>

        {/* Card 3: Air Conditioner */}
        <div className={`smart-quick-card bg-white border border-gray-100 ${!quickCards.ac ? 'opacity-70' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400">
              {quickCards.ac ? 'ON' : 'OFF'}
            </span>
            <button 
              onClick={() => toggleCard('ac')}
              className={`smart-toggle-switch ${quickCards.ac ? 'on' : ''}`}
            >
              <span className="smart-toggle-thumb" />
            </button>
          </div>
          <div className="mt-4">
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <Wind size={20} />
            </div>
            <p className="font-bold text-sm text-gray-500 mt-2.5">Air Conditioner</p>
          </div>
        </div>

        {/* Card 4: Lights */}
        <div className={`smart-quick-card bg-white border border-gray-100 ${!quickCards.lights ? 'opacity-70' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400">
              {quickCards.lights ? 'ON' : 'OFF'}
            </span>
            <button 
              onClick={() => toggleCard('lights')}
              className={`smart-toggle-switch ${quickCards.lights ? 'on' : ''}`}
            >
              <span className="smart-toggle-thumb" />
            </button>
          </div>
          <div className="mt-4">
            <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <Lightbulb size={20} />
            </div>
            <p className="font-bold text-sm text-gray-500 mt-2.5">Lights</p>
          </div>
        </div>
      </div>

      {/* 4. Living Room Temperature Controller Card */}
      <div className="smart-controller-card">
        {/* Controller Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-[#6355d8] flex items-center justify-center">
              <Zap size={18} />
            </div>
            <h3 className="font-bold text-base text-[#6355d8]">
              Living Room Temperature
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">
              {isTempActive ? 'ON' : 'OFF'}
            </span>
            <button 
              onClick={() => setIsTempActive(!isTempActive)}
              className={`smart-toggle-switch ${isTempActive ? 'on' : ''}`}
            >
              <span className="smart-toggle-thumb" />
            </button>
          </div>
        </div>

        {/* Circular Dial Area */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-14 py-6 relative">
          {/* Minus Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={handleDecreaseTemp}
              className="smart-dial-btn bg-gray-100 hover:bg-gray-200 text-gray-600"
              title="ลดอุณหภูมิ"
            >
              <Minus size={18} strokeWidth={2.5} />
            </button>
            <span className="text-xs font-extrabold text-gray-700 hidden sm:inline">
              05°C
            </span>
          </div>

          {/* Central Radial Dial */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center shrink-0">
            {/* Top Indicator Label */}
            <span className="absolute -top-1 font-bold text-[11px] text-[#6355d8]">
              15°C
            </span>

            {/* SVG Circular Arc */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6355d8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#ff7a59" />
                </linearGradient>
                <filter id="dialShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#6355d8" floodOpacity="0.15" />
                </filter>
              </defs>

              {/* Dial Track */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="#eef2f6"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                strokeLinecap="round"
              />

              {/* Dial Active Arc */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="url(#dialGrad)"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
            </svg>

            {/* Inner Dial Circle */}
            <div className="absolute inset-7 rounded-full bg-white shadow-xl flex flex-col items-center justify-center border-4 border-[#f8fafc]">
              <span className="text-3xl font-black text-gray-800 tracking-tight">
                {temp}°C
              </span>
              <span className="text-[11px] font-semibold text-gray-400 -mt-0.5">
                Celcious
              </span>
            </div>

            {/* Right Max Label */}
            <span className="absolute -right-3 top-1/2 transform -translate-y-1/2 font-bold text-[11px] text-[#ff7a59] hidden sm:inline">
              25°C
            </span>
          </div>

          {/* Plus Button */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-[#ff7a59] sm:hidden">
              25°C
            </span>
            <button 
              onClick={handleIncreaseTemp}
              className="smart-dial-btn bg-[#6355d8] hover:bg-[#5244c9] text-white shadow-lg shadow-purple-500/25"
              title="เพิ่มอุณหภูมิ"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
