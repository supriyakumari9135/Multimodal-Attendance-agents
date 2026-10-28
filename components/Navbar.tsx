'use client';

import React from 'react';
import { ShieldCheck, HardDrive, Bell, ChevronDown, User, Activity, Sparkles } from 'lucide-react';
import { Course, Session } from '../types';

interface NavbarProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  activeSession: Session | null;
  onNewSession: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  courses,
  selectedCourseId,
  onSelectCourse,
  activeSession,
  onNewSession,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight text-base">Multimodal Attendance</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Agent v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500">Privacy-Preserving Classroom Intelligence</p>
        </div>
      </div>

      {/* Middle: Course Selector & Session Status */}
      <div className="hidden md:flex items-center gap-4">
        {/* Course Dropdown */}
        <div className="relative">
          <select
            value={selectedCourseId}
            onChange={(e) => onSelectCourse(e.target.value)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-sm font-medium rounded-lg pl-3 pr-8 py-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Courses & Sessions</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} - {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Live Active Session Indicator */}
        {activeSession && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[200px]">{activeSession.title}</span>
            <span className="uppercase text-[10px] tracking-wider font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              {activeSession.status}
            </span>
          </div>
        )}
      </div>

      {/* Right: Offline / Local Processing Badge, Notifications, User Profile */}
      <div className="flex items-center gap-3">
        {/* Local Processing Badge */}
        <div
          title="All visual & audio inference executes strictly on this local device. Zero cloud biometric transmission."
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local Processing</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>

        {/* Start Session Button */}
        <button
          onClick={onNewSession}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Session</span>
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
            EV
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-900 leading-none">Dr. Eleanor Vance</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Faculty Instructor</p>
          </div>
        </div>
      </div>
    </header>
  );
};
