import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { WorkoutInstance, WorkoutTemplate, PreviousWorkoutData } from '../../../shared/models';

interface WorkoutContextType {
  // Active workout state
  activeWorkout: WorkoutInstance | null;
  activeTemplate: WorkoutTemplate | null;
  previousData: Map<string, PreviousWorkoutData>;

  // Timer state
  elapsedSeconds: number;
  isTimerPaused: boolean;

  // Actions
  setActiveWorkout: (workout: WorkoutInstance | null) => void;
  setActiveTemplate: (template: WorkoutTemplate | null) => void;
  setPreviousData: (data: Map<string, PreviousWorkoutData>) => void;
  updateWorkout: (updater: (prev: WorkoutInstance | null) => WorkoutInstance | null) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  clearWorkout: () => void;

  // Check if workout is running
  isWorkoutRunning: boolean;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function useWorkoutContext() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkoutContext must be used within WorkoutProvider');
  return ctx;
}

interface WorkoutProviderProps {
  children: React.ReactNode;
}

export function WorkoutProvider({ children }: WorkoutProviderProps) {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutInstance | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(null);
  const [previousData, setPreviousData] = useState<Map<string, PreviousWorkoutData>>(new Map());

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // Track paused time
  const startTimeRef = useRef<Date | null>(null);
  const totalPausedTimeRef = useRef<number>(0); // Total milliseconds spent paused
  const pauseStartRef = useRef<number | null>(null); // When current pause started

  // Timer effect
  useEffect(() => {
    if (!activeWorkout || isTimerPaused) return;

    startTimeRef.current = activeWorkout.startTime;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const totalElapsedMs = Date.now() - startTimeRef.current.getTime();
        const activeTimeMs = totalElapsedMs - totalPausedTimeRef.current;
        setElapsedSeconds(Math.floor(activeTimeMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout, isTimerPaused]);

  const pauseTimer = useCallback(() => {
    if (!isTimerPaused) {
      // Record when we started pausing
      pauseStartRef.current = Date.now();
      setIsTimerPaused(true);
    }
  }, [isTimerPaused]);

  const resumeTimer = useCallback(() => {
    if (isTimerPaused && pauseStartRef.current !== null) {
      // Add the paused duration to total paused time
      const pausedDuration = Date.now() - pauseStartRef.current;
      totalPausedTimeRef.current += pausedDuration;
      pauseStartRef.current = null;
      setIsTimerPaused(false);
    }
  }, [isTimerPaused]);

  const updateWorkout = useCallback((updater: (prev: WorkoutInstance | null) => WorkoutInstance | null) => {
    setActiveWorkout(updater);
  }, []);

  const clearWorkout = useCallback(() => {
    setActiveWorkout(null);
    setActiveTemplate(null);
    setPreviousData(new Map());
    setElapsedSeconds(0);
    setIsTimerPaused(false);
    startTimeRef.current = null;
    totalPausedTimeRef.current = 0;
    pauseStartRef.current = null;
  }, []);

  const value: WorkoutContextType = {
    activeWorkout,
    activeTemplate,
    previousData,
    elapsedSeconds,
    isTimerPaused,
    setActiveWorkout,
    setActiveTemplate,
    setPreviousData,
    updateWorkout,
    pauseTimer,
    resumeTimer,
    clearWorkout,
    isWorkoutRunning: activeWorkout !== null,
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
}
