// app/components/SmartDashboardView.js
'use client';
import React from 'react';
import DailyTaskDashboard from './DailyTaskDashboard';

export default function SmartDashboardView(props) {
  return <DailyTaskDashboard {...props} />;
}
