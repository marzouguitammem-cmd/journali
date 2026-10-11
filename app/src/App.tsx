import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StoreProvider } from './lib/store';
import { ToastProvider } from './ui';
import Home from './screens/Home';
import JournalEditor from './screens/JournalEditor';
import Plans from './screens/Plans';
import Progress from './screens/Progress';
import Settings from './screens/Settings';

type Tab = 'journal' | 'plans' | 'progress' | 'settings';
const TABS: [Tab, string, string][] = [
  ['journal', '📝', 'الجورنال'],
  ['plans', '📚', 'المخططات'],
  ['progress', '📈', 'وين وصلت'],
  ['settings', '⚙️', 'الإعدادات'],
];

function Shell() {
  const [tab, setTab] = useState<Tab>('journal');
  const [journal, setJournal] = useState<string | null>(null);
  const state = useRef({ tab, journal });
  useEffect(() => { state.current = { tab, journal }; }, [tab, journal]);

  // زرّ الرجوع في الأندرويد
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const h = CapApp.addListener('backButton', () => {
      const sheet = document.querySelector('.sheet-bg') as HTMLElement | null;
      if (sheet) { sheet.click(); return; }
      if (state.current.journal) { setJournal(null); return; }
      if (state.current.tab !== 'journal') { setTab('journal'); return; }
      CapApp.exitApp();
    });
    return () => { h.then((x) => x.remove()); };
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [tab, journal]);

  if (journal) return <JournalEditor id={journal} onClose={() => setJournal(null)} />;
  return (
    <>
      <main>
        {tab === 'journal' && <Home openJournal={setJournal} goPlans={() => setTab('plans')} />}
        {tab === 'plans' && <Plans />}
        {tab === 'progress' && <Progress />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="tabs">
        {TABS.map(([t, icon, label]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            <span className="ti">{icon}</span>{label}
          </button>
        ))}
      </nav>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
