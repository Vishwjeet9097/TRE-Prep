
import React from 'react';
import { Home, FileUp, Calendar, Hexagon } from 'lucide-react';

interface BottomNavProps {
    currentView: string;
    onChangeView: (view: any) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView }) => {
    const navItems = [
        { id: 'dashboard', icon: <Home />, label: 'Home' },
        { id: 'import', icon: <FileUp />, label: 'Import' },
        { id: 'history', icon: <Calendar />, label: 'History' },
        { id: 'settings', icon: <Hexagon />, label: 'Settings' },
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-6 right-6 h-[4.5rem] bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-between px-2 z-50 ring-1 ring-slate-100/50">
            {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onChangeView(item.id)}
                        className={`flex items-center justify-center gap-2.5 transition-all duration-300 ease-out ${isActive
                                ? 'bg-slate-900 text-white pl-5 pr-6 h-[3.25rem] rounded-[2rem] shadow-xl shadow-slate-900/20 grow-[0.5]'
                                : 'w-14 h-14 text-slate-900 hover:bg-slate-50 rounded-full'
                            }`}
                    >
                        {React.cloneElement(item.icon as React.ReactElement, {
                            size: 22,
                            strokeWidth: 2,
                            className: isActive ? 'text-white' : 'text-slate-900'
                        })}
                        {isActive && (
                            <span className="font-bold text-sm whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                                {item.label}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default BottomNav;
