import { useEffect, useRef } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../lib/api';
import { supabase } from '../lib/supabase';

export function useStudyTracker(user: User | null, subjectName: string = "Chung") {
  const isTracking = useRef(false);

  useEffect(() => {
    if (!user || user.isGuest) return;

    const trackActivity = async () => {
      if (isTracking.current) return;
      isTracking.current = true;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          isTracking.current = false;
          return;
        }

        const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/track-activity` : '/api/user/track-activity';
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            subject_name: subjectName,
            study_minutes: 1
          })
        });
      } catch (err) {
        console.error("Failed to track activity:", err);
      } finally {
        isTracking.current = false;
      }
    };

    // Ping every 60 seconds
    const intervalId = setInterval(trackActivity, 60000);
    
    // Cleanup
    return () => clearInterval(intervalId);
  }, [user, subjectName]);
}
