import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Calendar, Store, LayoutDashboard, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="header glass-panel" style={{ margin: '1rem', padding: '0 1.5rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
      <div className="flex-center" style={{ gap: '0.75rem' }}>
        <Store className="brand-icon" size={24} color="var(--accent-primary)" />
        <h1 className="brand-title text-gradient" style={{ fontSize: '1.25rem', margin: 0 }}>Seller Analytics</h1>
      </div>

      <nav className="flex-center" style={{ gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
        <Link href="/" className={cn('nav-link flex-center', pathname === '/' && 'active')} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', color: pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </Link>
        <Link href="/manual-tracker" className={cn('nav-link flex-center', pathname === '/manual-tracker' && 'active')} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', color: pathname === '/manual-tracker' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          <Edit3 size={18} />
          <span>Manual Tracker</span>
        </Link>
      </nav>

      <div className="header-actions flex-center" style={{ gap: '1.5rem' }}>
        <div className="user-profile flex-center" style={{ gap: '0.75rem' }}>
          <div className="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>FK</div>
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="user-name" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Demo Seller</span>
          </div>
        </div>
      </div>
    </header>
  );
}
