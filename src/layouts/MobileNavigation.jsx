import { X } from 'lucide-react';
import MainSidebar from './MainSidebar.jsx';

export default function MobileNavigation({ open, onClose, role }) { if (!open) return null; return <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-hidden="true" /><div className="relative h-full w-[280px]"><button className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:text-white" aria-label="Close navigation" onClick={onClose}><X size={19} /></button><MainSidebar role={role} onNavigate={onClose} /></div></div>; }
