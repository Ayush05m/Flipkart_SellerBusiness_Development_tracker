import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Receipt, Package, Settings, Store, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/' },
  { icon: Edit3, label: 'Manual Tracker', href: '/manual-tracker' },
  { icon: TrendingUp, label: 'Profit & Loss', href: '#' },
  { icon: Receipt, label: 'Fees & Charges', href: '#' },
  { icon: Package, label: 'Products', href: '#' },
  { icon: Settings, label: 'Settings', href: '#' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header flex-center">
        <Store className="brand-icon" size={32} />
        <h1 className="brand-title text-gradient">Seller<br />Analytics</h1>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={index}>
                <Link href={item.href} className={cn('nav-link flex-center', isActive && 'active')}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile flex-center">
          <div className="avatar">FK</div>
          <div className="user-info">
            <span className="user-name">Demo Seller</span>
            <span className="user-role">Pro Account</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
