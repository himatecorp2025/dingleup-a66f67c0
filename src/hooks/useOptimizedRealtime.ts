import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onUpdate: (payload: any) => void;
}

/**
 * Optimized realtime hook with intelligent connection management
 * - Batches multiple table subscriptions into one channel
 * - Automatic reconnection on network failures
 * - Debounced updates to prevent UI thrashing
 * - Memory leak prevention
 */
export const useOptimizedRealtime = (configs: RealtimeConfig[], channelName: string) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const updateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const cleanup = useCallback(() => {
    // Clear all debounce timers
    updateTimersRef.current.forEach(timer => clearTimeout(timer));
    updateTimersRef.current.clear();

    // Remove channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const setupChannel = useCallback(() => {
    cleanup();

    // Create single channel for all subscriptions
    const channel = supabase.channel(`${channelName}-${Date.now()}`);

    // Add all table subscriptions to one channel
    configs.forEach(({ table, event = '*', filter, onUpdate }) => {
      const config: any = {
        event,
        schema: 'public',
        table,
      };

      if (filter) {
        config.filter = filter;
      }

      channel.on('postgres_changes', config, (payload) => {
        // Debounce updates to prevent UI thrashing
        const timerId = `${table}-${event}`;
        const existingTimer = updateTimersRef.current.get(timerId);
        
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const newTimer = setTimeout(() => {
          onUpdate(payload);
          updateTimersRef.current.delete(timerId);
        }, 5); // INSTANT - 5ms micro-debounce (prevents UI thrashing)

        updateTimersRef.current.set(timerId, newTimer);
      });
    });

    // Subscribe with connection handling
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        reconnectAttemptsRef.current = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Auto-reconnect on error
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          setTimeout(setupChannel, 1000 * reconnectAttemptsRef.current); // Exponential backoff
        }
      }
    });

    channelRef.current = channel;
  }, [configs, channelName, cleanup]);

  useEffect(() => {
    setupChannel();
    return cleanup;
  }, [setupChannel, cleanup]);

  return { reconnect: setupChannel };
};

/**
 * Hook for broadcast-based instant updates (admin -> users)
 * Perfect for instant coin/lives updates after purchase
 */
export const useBroadcastChannel = (
  channelName: string,
  eventName: string,
  onReceive: (payload: any) => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: eventName }, (payload) => {
        onReceive(payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, eventName, onReceive]);

  const broadcast = useCallback(async (payload: any) => {
    if (!channelRef.current) return;

    const result = await channelRef.current.send({
      type: 'broadcast',
      event: eventName,
      payload,
    });

    return result;
  }, [eventName]);

  return { broadcast };
};

/**
 * Optimized presence tracking for online users
 * Automatically tracks user online/offline status
 */
export const usePresenceTracking = (userId: string | undefined, enabled = true) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId || !enabled) return;

    const channel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // Update presence every 30 seconds
    const heartbeat = setInterval(() => {
      channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId, enabled]);
};
