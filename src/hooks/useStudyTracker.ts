import { useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../lib/api';
import { supabase } from '../lib/supabase';

export function useStudyTracker(user: User | null, subjectName: string = "Chung") {
  useEffect(() => {
    if (!user || user.isGuest) return;

    // Use a unique key per user to accumulate seconds
    const storageKey = `study_accumulator_${user.id}`;
    
    let localSeconds = parseInt(localStorage.getItem(storageKey) || '0', 10);
    if (isNaN(localSeconds)) localSeconds = 0;

    const trackActivity = async (minutes: number) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/track-activity` : '/api/user/track-activity';
        await fetch(url, {
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
      } catch (err) {
        console.error("Failed to track activity:", err);
      }
    };

    const intervalId = setInterval(() => {
      // Only track when tab is active and visible
      if (document.visibilityState === 'visible') {
        localSeconds += 1;
        
        if (localSeconds >= 60) {
          const minutesToTrack = Math.floor(localSeconds / 60);
          localSeconds = localSeconds % 60;
          trackActivity(minutesToTrack);
        }
        
        localStorage.setItem(storageKey, String(localSeconds));
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, subjectName]);
}
