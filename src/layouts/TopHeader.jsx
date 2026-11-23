import { Menu } from 'lucide-react';
import UserMenu from './UserMenu.jsx';

export default function TopHeader({ onOpenMenu, title }) { return <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-5 sm:px-8"><button className="icon-button static h-10 w-10 rounded-lg lg:hidden" aria-label="Open navigation" onClick={onOpenMenu}><Menu size={20} /></button><p className="hidden text-sm font-medium text-muted sm:block">{title}</p><UserMenu /></header>; }
