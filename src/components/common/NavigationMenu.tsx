// Navigation menu component that preserves all existing functionality
import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

interface NavigationMenuProps {
  items: NavigationItem[];
  currentView: string;
  onNavigate: (viewId: string) => void;
  className?: string;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  items,
  currentView,
  onNavigate,
  className = '',
}) => {
  const { dispatch } = useAppContext();

  const handleNavigation = (viewId: string) => {
    // Preserve existing navigation functionality
    dispatch({ type: 'SET_CURRENT_VIEW', payload: viewId });
    onNavigate(viewId);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavigation(item.id)}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
            ${currentView === item.id
              ? 'text-brand-700 bg-brand-50 shadow-sm border border-brand-100'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }
          `}
          title={item.description}
        >
          <span className={`
            flex-shrink-0 transition-colors duration-200
            ${currentView === item.id ? 'text-brand-600' : 'text-slate-400'}
          `}>
            {item.icon}
          </span>
          <span className="text-left">{item.label}</span>
          
          {/* Active indicator */}
          {currentView === item.id && (
            <div className="ml-auto w-2 h-2 bg-brand-500 rounded-full"></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default NavigationMenu;