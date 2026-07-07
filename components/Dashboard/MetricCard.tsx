import type { ElementType } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  icon: ElementType;
  isCurrency?: boolean;
  trendLabel?: string;
  colorClass?: string;
  onClick?: () => void;
  tooltip?: string;
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
  tooltip,
}: MetricCardProps) {
  const isPositive = trend >= 0;

  return (
    <div
      className={`metric-card glass-panel animate-fade-in ${onClick ? 'cursor-pointer hover-scale' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="metric-header flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          <h3 className="metric-title" style={{ margin: 0 }}>{title}</h3>
          {tooltip && (
            <div className="metric-tooltip-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
              <Info
                size={13}
                style={{ color: 'var(--text-tertiary)', cursor: 'help', display: 'block' }}
              />
              <div className="metric-tooltip-bubble">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <div className={`metric-icon-wrapper ${colorClass}`} style={{ flexShrink: 0 }}>
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
