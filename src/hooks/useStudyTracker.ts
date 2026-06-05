import { useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../lib/api';
import { supabase } from '../lib/supabase';

// Persistent session seconds inside this tab/session
let sessionTotalSeconds = parseInt(sessionStorage.getItem('giasuao_session_seconds') || '0', 10);
if (isNaN(sessionTotalSeconds)) sessionTotalSeconds = 0;

export function useStudyTracker(user: User | null, subjectName: string = "Chung") {
  useEffect(() => {
    if (!user) return;

    const userId = user.isGuest ? 'guest' : user.id;
    // Use a unique key per user to accumulate seconds within a single minute
    const storageKey = `study_accumulator_${userId}`;
    
    let localSeconds = parseInt(localStorage.getItem(storageKey) || '0', 10);
    if (isNaN(localSeconds)) localSeconds = 0;

    const trackActivity = async (minutes: number) => {
      console.log(`[StudyTracker] Attempting to track ${minutes} minute(s) of study for subject "${subjectName}"...`);
      // 1. Earn XP notification event
      window.dispatchEvent(new CustomEvent('study-xp-earned', {
        detail: {
          xp: minutes * 10,
          minutes: minutes,
          subjectName: subjectName
        }
      }));

      if (user.isGuest) {
        console.log(`[StudyTracker] Guest mode detected. Saving stats to localStorage.`);
        // Track locally for guests (overall stats)
        const statsKey = `gamification_stats_guest`;
        let guestStats = { streak: 1, max_streak: 1, total_study_minutes: 0, total_sp: 0 };
        try {
          const cached = localStorage.getItem(statsKey);
          if (cached) guestStats = JSON.parse(cached);
        } catch (e) {}

        guestStats.total_study_minutes = (guestStats.total_study_minutes || 0) + minutes;
        guestStats.total_sp = (guestStats.total_sp || 0) + (minutes * 10);
        localStorage.setItem(statsKey, JSON.stringify(guestStats));

        // Track local activities list for charts
        const actListKey = 'guest_activities_list';
        let actList = [];
        try {
          const cached = localStorage.getItem(actListKey);
          if (cached) actList = JSON.parse(cached);
        } catch (e) {}

        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const existing = actList.find((a: any) => a.study_date === todayStr && a.subject_name === subjectName);
        if (existing) {
          existing.study_minutes = (existing.study_minutes || 0) + minutes;
        } else {
          actList.push({
            study_date: todayStr,
            subject_name: subjectName,
            study_minutes: minutes
          });
        }
        localStorage.setItem(actListKey, JSON.stringify(actList));

        // Dispatch tracking complete to refresh views
        window.dispatchEvent(new CustomEvent('study-activity-tracked', {
          detail: { subjectName, minutes, isGuest: true }
        }));
        return;
      }

      // Track on database for authenticated users
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.warn(`[StudyTracker] No active Supabase auth session found! Cannot sync stats to database. Please log in again.`);
          return;
        }

        const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/track-activity` : '/api/user/track-activity';
        console.log(`[StudyTracker] Sending activity to API: ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            subject_name: subjectName,
            study_minutes: minutes
          })
        });

        if (response.ok) {
          console.log(`[StudyTracker] Successfully synced study activity to database!`);
          // Clear cached stale stats to force overview / progress reload
          const statsKey = `gamification_stats_${userId}`;
          localStorage.removeItem(statsKey);

          // Dispatch event to trigger state updates in other components
          window.dispatchEvent(new CustomEvent('study-activity-tracked', {
            detail: { subjectName, minutes, isGuest: false }
          }));
        } else {
          const errText = await response.text();
          console.error(`[StudyTracker] API returned error ${response.status}:`, errText);
        }
      } catch (err) {
        console.error("[StudyTracker] Failed to track activity due to network/API error:", err);
      }
    };

    console.log(`[StudyTracker] Initializing tracker for user "${userId}" on subject "${subjectName}"...`);
    const intervalId = setInterval(() => {
      // Only track when tab is active and visible
      if (document.visibilityState === 'visible') {
        localSeconds += 1;
        sessionTotalSeconds += 1;
        sessionStorage.setItem('giasuao_session_seconds', String(sessionTotalSeconds));
        
        // Log every 10 seconds to show it's active without cluttering console
        if (localSeconds % 10 === 0) {
          console.log(`[StudyTracker] Active study time: ${localSeconds}s elapsed for subject "${subjectName}" (cumulative: ${sessionTotalSeconds}s)`);
        }

        // Dispatch live tick event to update active timer UI
        window.dispatchEvent(new CustomEvent('study-tick', {
          detail: {
            sessionSeconds: sessionTotalSeconds,
            minutes: Math.floor(sessionTotalSeconds / 60),
            seconds: sessionTotalSeconds % 60,
            subject: subjectName
          }
        }));

        if (localSeconds >= 60) {
          const minutesToTrack = Math.floor(localSeconds / 60);
          localSeconds = localSeconds % 60;
          trackActivity(minutesToTrack);
        }
        
        localStorage.setItem(storageKey, String(localSeconds));
      }
    }, 1000);

    return () => {
      console.log(`[StudyTracker] Stopping tracker for subject "${subjectName}"...`);
      clearInterval(intervalId);
    };
  }, [user, subjectName]);
}
