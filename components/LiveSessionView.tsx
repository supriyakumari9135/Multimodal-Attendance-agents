'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Play,
  Pause,
  Square,
  Upload,
  RefreshCw,
  Users,
  Eye,
  EyeOff,
  Video,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Session, AttendanceRecord } from '../types';
import {
  startSession,
  pauseSession,
  resumeSession,
  stopSession,
  finalizeSession,
  uploadSessionVideo,
  getSessionProcessingStatus,
  getSessionAttendance,
} from '../lib/api';

interface LiveSessionViewProps {
  session: Session | null;
  onSessionUpdated: (session: Session) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const LiveSessionView: React.FC<LiveSessionViewProps> = ({
  session,
  onSessionUpdated,
  onToast,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  
  // Video upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  // Attendance events
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceRecord[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer ticker for running session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (session && session.status === 'running') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session?.status]);

  // Load attendance events when session changes
  useEffect(() => {
    if (session) {
      loadAttendance();
      // calculate initial elapsed if start_time exists
      if (session.start_time) {
        const startMs = new Date(session.start_time).getTime();
        const endMs = session.end_time ? new Date(session.end_time).getTime() : Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((endMs - startMs) / 1000)));
      }
    }
  }, [session?.id, session?.status]);

  const loadAttendance = async () => {
    if (!session) return;
    try {
      const records = await getSessionAttendance(session.id);
      setAttendanceEvents(records);
    } catch {
      // ignore
    }
  };

  // Enumerate video devices
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setCameraDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Browser Camera Stream Management
  const toggleCamera = async () => {
    if (cameraActive) {
      stopCameraStream();
    } else {
      await startCameraStream();
    }
  };

  const startCameraStream = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Webcam media access is not supported by your browser environment.');
      }
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      onToast('success', 'Camera Preview Active', 'Local camera feed streaming successfully.');
    } catch (err: any) {
      setCameraError(err.message || 'Unable to access camera.');
      setCameraActive(false);
      onToast('error', 'Camera Access Failed', err.message);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Animation frame loop to render detection overlay boxes on canvas
  useEffect(() => {
    let animId: number;
    const renderOverlay = () => {
      if (canvasRef.current && videoRef.current && showOverlay) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (cameraActive) {
            // Draw simulated anonymous bounding boxes for detected participants
            const t = Date.now() / 1000;
            const boxes = [
              { x: 120 + Math.sin(t) * 10, y: 80, w: 90, h: 120, id: 'track_01' },
              { x: 280 + Math.cos(t * 0.8) * 8, y: 70, w: 95, h: 125, id: 'track_02' },
              { x: 440 + Math.sin(t * 1.2) * 6, y: 85, w: 85, h: 115, id: 'track_03' },
            ];

            boxes.forEach((b) => {
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 2;
              ctx.strokeRect(b.x, b.y, b.w, b.h);

              ctx.fillStyle = '#059669';
              ctx.fillRect(b.x, b.y - 20, 68, 20);
              ctx.fillStyle = '#ffffff';
              ctx.font = '10px sans-serif';
              ctx.fillText(b.id, b.x + 6, b.y - 6);
            });
          }
        }
      }
      animId = requestAnimationFrame(renderOverlay);
    };

    if (cameraActive && showOverlay) {
      animId = requestAnimationFrame(renderOverlay);
    }
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, showOverlay]);

  // Session Control Actions
  const handleStart = async () => {
    if (!session) return;
    try {
      const updated = await startSession(session.id);
      onSessionUpdated(updated);
      onToast('success', 'Session Started', `Now running in ${updated.input_mode} mode.`);
    } catch (err: any) {
      onToast('error', 'Start Failed', err.message);
    }
  };

  const handlePause = async () => {
    if (!session) return;
    try {
      const updated = await pauseSession(session.id);
      onSessionUpdated(updated);
      onToast('info', 'Session Paused', 'Elapsed metrics halted.');
    } catch (err: any) {
      onToast('error', 'Pause Failed', err.message);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      const updated = await resumeSession(session.id);
      onSessionUpdated(updated);
      onToast('success', 'Session Resumed', 'Now recording presence metrics.');
    } catch (err: any) {
      onToast('error', 'Resume Failed', err.message);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    try {
      const updated = await stopSession(session.id);
      onSessionUpdated(updated);
      stopCameraStream();
      onToast('success', 'Session Completed', 'Finalized attendance records and metrics.');
    } catch (err: any) {
      onToast('error', 'Stop Failed', err.message);
    }
  };

  // Video File Upload Workflow
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadFile(file);
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusMsg('Uploading video to local processor...');

    try {
      await uploadSessionVideo(session.id, file);
      setUploadProgress(40);
      setUploadStatusMsg('Decoding frames with OpenCV...');

      // Poll processing status
      const pollInterval = setInterval(async () => {
        try {
          const status = await getSessionProcessingStatus(session.id);
          setUploadProgress(status.progress);
          setUploadStatusMsg(status.message);

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setIsUploading(false);
            loadAttendance();
            onToast('success', 'Video Processing Complete', 'Attendance and metrics derived successfully.');
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setIsUploading(false);
            onToast('error', 'Processing Failed', status.message);
          }
        } catch {
          clearInterval(pollInterval);
          setIsUploading(false);
        }
      }, 1500);
    } catch (err: any) {
      setIsUploading(false);
      onToast('error', 'Upload Failed', err.message);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-2xl border border-slate-200">
        <Video className="w-12 h-12 text-slate-400 mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Active Session Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Select an existing session from the header or initialize a new session to begin live monitoring.
        </p>
      </div>
    );
  }

  const presentCount = attendanceEvents.filter((r) => r.status === 'present' || r.status === 'manually_confirmed').length;

  return (
    <div className="space-y-6">
      {/* Session Header Card with State Machine Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{session.title}</h2>
            <span
              className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                session.status === 'running'
                  ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                  : session.status === 'paused'
                  ? 'bg-amber-100 text-amber-800'
                  : session.status === 'completed'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-sky-100 text-sky-800'
              }`}
            >
              {session.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Course: {session.course_name || 'General'} • Instructor: {session.teacher_name} • Mode: {session.input_mode}
          </p>
        </div>

        {/* State Machine Action Controls */}
        <div className="flex items-center gap-2.5">
          {session.status === 'ready' && (
            <button
              onClick={handleStart}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Session</span>
            </button>
          )}

          {session.status === 'running' && (
            <>
              <button
                onClick={handlePause}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
              <button
                onClick={handleStop}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop Session</span>
              </button>
            </>
          )}

          {session.status === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
              <button
                onClick={handleStop}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </>
          )}

          {session.status === 'completed' && (
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
              Session Finalized
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Live Video / Upload Area + Real-Time Attendance Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Feed & Detection Interface */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl bg-slate-900 overflow-hidden aspect-video border border-slate-800 shadow-md flex items-center justify-center">
            {/* Real HTML5 Video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Bounding box overlay canvas */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${
                cameraActive && showOverlay ? 'block' : 'hidden'
              }`}
            />

            {/* Offline / Placeholder Screen when camera not active */}
            {!cameraActive && (
              <div className="p-8 text-center text-slate-300">
                {session.input_mode === 'uploaded_video' ? (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold">Offline Video Processing Mode</p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Upload a recorded lecture file below to execute frame sampling and presence tracking.
                    </p>
                  </div>
                ) : session.input_mode === 'simulated' ? (
                  <div className="flex flex-col items-center">
                    <Sparkles className="w-12 h-12 text-emerald-400 mb-2" />
                    <p className="text-sm font-semibold">Deterministic Simulated Stream</p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Simulated presence tracks, movement frequency, and audio ratios are accumulating deterministically.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold">Live Camera Stream Inactive</p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Click "Start Camera Preview" below to activate your local webcam securely.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Video HUD: Timer & Attendees count */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-xs font-semibold">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>{presentCount} Active</span>
              </div>
            </div>

            {/* Overlay toggle button */}
            {cameraActive && (
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-xs font-medium hover:bg-black/80 transition-colors flex items-center gap-1.5"
                >
                  {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showOverlay ? 'Hide Tracks' : 'Show Tracks'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCamera}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  cameraActive
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraActive ? 'Stop Camera Preview' : 'Start Camera Preview'}</span>
              </button>

              {cameraDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-2 font-medium"
                >
                  {cameraDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Camera permission/error alert */}
            {cameraError && (
              <div className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Offline Frame Processing Active</span>
            </div>
          </div>

          {/* Video Upload Dropzone (for Uploaded Video Mode) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Upload Classroom Recording</span>
              <span className="text-[11px] text-slate-500">Supported: MP4, AVI, MOV, WEBM</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-3 text-center cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                <span className="text-xs font-medium text-slate-600">
                  {uploadFile ? uploadFile.name : 'Select or drop video file to process offline'}
                </span>
              </label>
            </div>

            {isUploading && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{uploadStatusMsg}</span>
                  <span className="font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Attendance Register & Presence Stream */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Attendance Stream</h3>
                <p className="text-xs text-slate-500">{presentCount} students verified</p>
              </div>
              <button
                onClick={loadAttendance}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                title="Refresh attendance"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {attendanceEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No attendance detections recorded yet. Start camera or run simulated session.
                </div>
              ) : (
                attendanceEvents.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span>{rec.student_name}</span>
                        {rec.manually_corrected && (
                          <span className="text-[9px] bg-sky-100 text-sky-800 px-1 rounded">
                            manual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Duration: {Math.round(rec.observed_duration)}s • Conf: {Math.round(rec.confidence * 100)}%
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        rec.status === 'present' || rec.status === 'manually_confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'absent'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Minimum observation: 15s</span>
            <span className="text-emerald-700 font-semibold">Verified Presence</span>
          </div>
        </div>
      </div>
    </div>
  );
};
