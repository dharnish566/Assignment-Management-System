import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MainSidebar from './MainSidebar.jsx';
import MobileNavigation from './MobileNavigation.jsx';
import TopHeader from './TopHeader.jsx';

export default function AppShell({ role }) { const [mobileOpen, setMobileOpen] = useState(false); const location = useLocation(); const title = location.pathname.split('/').at(-1)?.replace('-', ' ') || 'dashboard'; return <div className="flex min-h-screen bg-canvas"><div className="hidden lg:block"><MainSidebar role={role} /></div><MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} role={role} /><div className="flex min-w-0 flex-1 flex-col"><TopHeader title={title[0].toUpperCase() + title.slice(1)} onOpenMenu={() => setMobileOpen(true)} /><main className="w-full flex-1 px-5 py-7 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1280px]"><Outlet /></div></main></div></div>; }
