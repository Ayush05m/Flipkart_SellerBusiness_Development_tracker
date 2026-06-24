'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FeesBreakdownChartProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#ef4444'];

export function FeesBreakdownChart({ data }: FeesBreakdownChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="chart-card glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="chart-header">
        <h3 className="chart-title">Fees & Deduction Breakdown</h3>
        <p className="chart-subtitle">Where is your money going?</p>
      </div>

      <div className="chart-wrapper flex-center">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" stroke="none">
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `Rs ${value}`}
                contentStyle={{
                  backgroundColor: 'rgba(19, 26, 42, 0.9)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
