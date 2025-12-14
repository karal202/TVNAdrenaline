// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

export function useWebSocket(onMessage) {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('🔌 WebSocket connected');
        
        // Gửi token để xác thực
        const token = localStorage.getItem('token');
        if (token) {
          ws.current.send(JSON.stringify({ type: 'auth', token }));
        }

        // Ping mỗi 30s để giữ connection
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);
          
          if (data.type === 'auth_success') {
            console.log('✅ WebSocket authenticated');
          } else if (onMessage) {
            onMessage(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.current.onclose = () => {
        console.log('🔴 WebSocket disconnected');
        clearInterval(pingInterval.current);
        
        // Auto reconnect sau 3s
        reconnectTimeout.current = setTimeout(() => {
          console.log('🔄 Reconnecting WebSocket...');
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
  }, [onMessage]);

  useEffect(() => {
    connect();

    return () => {
      clearInterval(pingInterval.current);
      clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return ws.current;
}

export default useWebSocket;