'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Shield, Video, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { Course, Session } from '../types';
import { createSession } from '../lib/api';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  defaultCourseId?: string;
  onSessionCreated: (session: Session) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  courses,
  defaultCourseId,
  onSessionCreated,
  onToast,
}) => {
  const [courseId, setCourseId] = useState(defaultCourseId || (courses[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [teacherName, setTeacherName] = useState('Dr. Eleanor Vance');
  const [subject, setSubject] = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [inputMode, setInputMode] = useState<'live_camera' | 'uploaded_video' | 'simulated'>('simulated');
  const [enableVideo, setEnableVideo] = useState(true);
  const [enableAudio, setEnableAudio] = useState(true);
  const [consentConfirmed, setConsentConfirmed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!courseId) {
      setValidationError('Please select a course.');
      return;
    }
    if (!title.trim()) {
      setValidationError('Please enter a session title.');
      return;
    }
    if (!consentConfirmed) {
      setValidationError('Please acknowledge the privacy and consent checklist.');
      return;
    }

    try {
      setSubmitting(true);
      const newSession = await createSession({
        course_id: courseId,
        title: title.trim(),
        teacher_name: teacherName.trim(),
        subject: subject.trim() || undefined,
        input_mode: inputMode,
        configuration_json: {
          sample_interval: 1.0,
          min_duration_seconds: 15.0,
          planned_duration_minutes: durationMins,
          weights: {
            participation: 0.35,
            movement: 0.25,
            head_orientation: 0.20,
            audio: enableAudio ? 0.20 : 0.0,
          },
          modalities_enabled: [
            ...(enableVideo ? ['video'] : []),
            ...(enableAudio ? ['audio'] : []),
          ],
        },
      });

      onToast('success', 'Session Initialized', `Created "${newSession.title}" in ${inputMode} mode.`);
      onSessionCreated(newSession);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create session');
      onToast('error', 'Session Creation Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create New Classroom Session</h3>
            <p className="text-xs text-slate-500">Configure privacy boundaries, input modality, and session details</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Step 1: Course Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Step 1: Course *</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            >
              <option value="" disabled>Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code}: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Session Metadata */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Step 2: Session Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lecture 4: Real-time Multimodal Interaction"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Instructor</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Duration (mins)</label>
              <input
                type="number"
                min="10"
                max="180"
                value={durationMins}
                onChange={(e) => setDurationMins(parseInt(e.target.value) || 45)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Step 3: Input Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Step 3: Input Source</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInputMode('simulated')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  inputMode === 'simulated'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Simulated</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Deterministic offline demo session</p>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('live_camera')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  inputMode === 'live_camera'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Video className="w-3.5 h-3.5 text-sky-600" />
                  <span>Live Camera</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Browser webcam with local tracking</p>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('uploaded_video')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  inputMode === 'uploaded_video'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Video File</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Upload MP4/MOV for offline processing</p>
              </button>
            </div>
          </div>

          {/* Step 4: Enabled Capabilities */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Step 4: Active Modalities</label>
            <div className="flex items-center gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableVideo}
                  onChange={(e) => setEnableVideo(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Visual Motion & Presence</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAudio}
                  onChange={(e) => setEnableAudio(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Acoustic Activity Ratio (Audio)</span>
              </label>
            </div>
          </div>

          {/* Step 5: Privacy Checklist */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">Step 5: Privacy & Consent Checklist</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 mb-2.5 list-disc pl-4">
              <li>All frame decoding and signal inference execute exclusively on this local computer.</li>
              <li>No raw facial biometric templates or unconsented video streams are permanently stored.</li>
              <li>Metrics are proxy indicators for instructional pacing and will never grade students.</li>
            </ul>
            <label className="flex items-start gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>I acknowledge that this session follows ethical boundaries and local privacy policies.</span>
            </label>
          </div>

          {/* Step 6: Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 flex items-center gap-1.5"
            >
              {submitting ? 'Creating...' : 'Initialize Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
