'use client';

import { Header } from '../../components/Layout/Header';
import { TrackerOverview } from '../../components/ManualTracker/TrackerOverview';

export default function ManualTrackerPage() {
  return (
    <div className="app-container">
      <div className="main-content">
        <Header />
        <main className="page-container">
          <TrackerOverview />
        </main>
      </div>
    </div>
  );
}
