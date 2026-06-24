'use client';

import { Header } from '../components/Layout/Header';
import { Overview } from '../components/Overview';

export default function Home() {
  return (
    <div className="app-container">
      <div className="main-content">
        <Header />
        <main className="page-container">
          <Overview />
        </main>
      </div>
    </div>
  );
}
