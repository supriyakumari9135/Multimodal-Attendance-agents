'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Sliders,
  AlertCircle,
  Clock,
  Layers,
  Info,
  ShieldCheck,
  Activity,
  Mic,
  Maximize2,
} from 'lucide-react';
import { SessionEngagementSummary, Session } from '../types';

interface EngagementAnalyticsViewProps {
  session: Session | null;
  summary: SessionEngagementSummary | null;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const EngagementAnalyticsView: React.FC<EngagementAnalyticsViewProps> = ({
  session,
  summary,
  onToast,
}) => {
  const [timeFilter, setTimeFilter] = useState<'15m' | '30m' | 'full'>('full');
  const [weights, setWeights] = useState({
    participation: 35,
    movement: 25,
    head_orientation: 20,
    audio: 20,
  });

  if (!summary || summary.timeline_intervals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-2xl border border-slate-200">
        <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-base font-bold text-slate-800">Insufficient Engagement Data</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          No metrics available for this session yet. Run a simulated session or upload classroom media to view charts.
        </p>
      </div>
    );
  }

  // Filter intervals based on time filter
  const intervals = summary.timeline_intervals;
  let filteredIntervals = intervals;
  if (timeFilter === '15m') {
    filteredIntervals = intervals.slice(-3); // ~last 15 mins (if 5m windows)
  } else if (timeFilter === '30m') {
    filteredIntervals = intervals.slice(-6);
  }

  const hasAudio = summary.available_modalities.includes('audio');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Explainable Engagement Analytics</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              Score: {summary.composite_engagement_score}/100
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multimodal indicator timelines decomposed into participation activity, gentle movement, and voice ratios.
          </p>
        </div>

        {/* Time Window Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setTimeFilter('15m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === '15m'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 15m
          </button>
          <button
            onClick={() => setTimeFilter('30m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === '30m'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 30m
          </button>
          <button
            onClick={() => setTimeFilter('full')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeFilter === 'full'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Full Session
          </button>
        </div>
      </div>

      {/* Limitation Notice Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">Interpretive Guideline & Proxy Boundaries</p>
          <p className="text-slate-600 leading-relaxed">
            Non-invasive indicators reflect physical observable proxies (presence, gentle movement frequency, acoustic activity).
            Low movement frequency often reflects quiet note-taking, focused reading, or deep listening—never equate stillness with disengagement.
          </p>
        </div>
      </div>

      {/* Primary Composite Score Area Chart */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Composite Engagement Trend</h3>
            <p className="text-xs text-slate-500">Normalized weighted fusion across active modalities</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Composite Index</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredIntervals} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time_label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="composite_engagement"
                name="Composite Score"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#engagementGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Multi-Signal Comparison Line Chart */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sub-Indicator Decomposition</h3>
            <p className="text-xs text-slate-500">Independent modality trends across time windows</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              Participation
            </span>
            <span className="flex items-center gap-1 text-sky-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              Movement
            </span>
            <span className="flex items-center gap-1 text-purple-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              Head Orientation
            </span>
            {hasAudio && (
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                Voice Ratio
              </span>
            )}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredIntervals} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time_label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="participation_activity"
                name="Participation Activity"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="movement_frequency"
                name="Movement Frequency"
                stroke="#0284c7"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="head_orientation_indicator"
                name="Head Orientation"
                stroke="#9333ea"
                strokeWidth={2}
                dot={false}
              />
              {hasAudio && (
                <Line
                  type="monotone"
                  dataKey="voice_activity_ratio"
                  name="Voice Activity Ratio"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Configurable Weights Breakdown & Modalities Coverage Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h4 className="text-sm font-bold text-slate-900">Configurable Indicator Weights</h4>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Participation Activity</span>
                <span>{weights.participation}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: `${weights.participation}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Movement / Activity Patterns</span>
                <span>{weights.movement}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-sky-600" style={{ width: `${weights.movement}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Head Orientation Indicator</span>
                <span>{weights.head_orientation}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-purple-600" style={{ width: `${weights.head_orientation}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Audio Activity (VAD)</span>
                <span>{hasAudio ? `${weights.audio}%` : 'Disabled (Renormalized)'}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full ${hasAudio ? 'bg-amber-600' : 'bg-slate-300'}`}
                  style={{ width: `${hasAudio ? weights.audio : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality & Modality Availability */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="text-sm font-bold text-slate-900">Signal Integrity & Coverage</h4>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">Data Quality Status</span>
                <span className="font-bold text-emerald-700">{summary.data_quality_status}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">Active Sensor Modalities</span>
                <span className="font-bold text-slate-800 uppercase">{summary.available_modalities.join(', ')}</span>
              </div>

              {summary.missing_modalities.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  Missing modality: {summary.missing_modalities.join(', ')}. Composite scores were renormalized
                  over active video indicators.
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-100">
            Detector Confidence: {Math.round(summary.confidence_level * 100)}% verified offline
          </div>
        </div>
      </div>
    </div>
  );
};
