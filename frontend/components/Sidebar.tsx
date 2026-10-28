'use client';

import React from 'react';
import {
  LayoutDashboard,
  Video,
  UserCheck,
  TrendingUp,
  History,
  Bot,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'live'
  | 'attendance'
  | 'analytics'
  | 'history'
  | 'assistant'
  | 'students'
  | 'reports'
  | 'privacy';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadRecommendationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  unreadRecommendationsCount = 0,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'live' as NavTab, label: 'Live Session', icon: Video },
    { id: 'attendance' as NavTab, label: 'Attendance', icon: UserCheck },
    { id: 'analytics' as NavTab, label: 'Engagement Analytics', icon: TrendingUp },
    { id: 'history' as NavTab, label: 'Session History', icon: History },
    {
      id: 'assistant' as NavTab,
      label: 'AI Teaching Assistant',
      icon: Bot,
      badge: unreadRecommendationsCount > 0 ? unreadRecommendationsCount : undefined,
    },
    { id: 'students' as NavTab, label: 'Students', icon: Users },
    { id: 'reports' as NavTab, label: 'Reports', icon: FileSpreadsheet },
    { id: 'privacy' as NavTab, label: 'Privacy & Settings', icon: ShieldCheck },
  ];

  return (
    <aside
      className={`relative flex flex-col justify-between bg-white border-r border-slate-200 transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Navigation Links */}
      <div className="py-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: Privacy Tagline & Collapse Toggle */}
      <div className="p-3 border-t border-slate-200">
        {!collapsed && (
          <div className="p-3 mb-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700 block mb-0.5">Ethical Boundary</span>
            Activity metrics are non-invasive proxies. Never used for grading or punitive profiling.
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
