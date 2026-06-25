import type { ElementType } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  icon: ElementType;
  isCurrency?: boolean;
  trendLabel?: string;
  colorClass?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  isCurrency = true,
  trendLabel = 'vs last month',
  colorClass = 'text-accent',
  onClick,
}: MetricCardProps) {
  const isPositive = trend >= 0;

  return (
    <div 
      className={`metric-card glass-panel animate-fade-in ${onClick ? 'cursor-pointer hover-scale' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="metric-header flex-between">
        <h3 className="metric-title">{title}</h3>
        <div className={`metric-icon-wrapper ${colorClass}`}>
          <Icon size={20} />
        </div>
      </div>

      <div className="metric-content">
        <div className="metric-value">
          {isCurrency && <span className="currency-symbol">₹</span>}
          {value}
        </div>

        <div className="metric-trend flex-center">
          <div className={`trend-badge flex-center ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
          <span className="trend-label">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}
