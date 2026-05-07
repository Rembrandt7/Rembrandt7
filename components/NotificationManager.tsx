
import React, { useEffect, useRef } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { GoogleGenAI } from '@google/genai';
import { AppNotification } from '../types';
import { toast } from 'sonner';

const TARGET_TIMES = [
  { hour: 8, minute: 30, label: 'Mañana' },
  { hour: 12, minute: 0, label: 'Mediodía' },
  { hour: 15, minute: 0, label: 'Tarde' },
  { hour: 17, minute: 50, label: 'Tarde-Noche' },
  { hour: 20, minute: 30, label: 'Noche' },
  { hour: 23, minute: 20, label: 'Descanso' }
];

const NotificationManager: React.FC = () => {
  const { config, updateNotifications, updateConfig, googleApiConfig } = useLinks();
  const lastCheckRef = useRef<string | null>(null);

  useEffect(() => {
    const checkTime = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // 1. Clear notifications from previous days
      if (config.lastNotificationCheck !== todayStr) {
        updateConfig(prev => ({
          ...prev,
          notifications: [],
          lastNotificationCheck: todayStr
        }));
        return;
      }

      // 2. Check if we are at a target time
      const target = TARGET_TIMES.find(t => 
        t.hour === now.getHours() && t.minute === now.getMinutes()
      );

      if (target) {
        const slotKey = `${todayStr}-${target.hour}:${target.minute}`;
        
        // Prevent multiple triggers in the same minute
        if (lastCheckRef.current === slotKey) return;
        lastCheckRef.current = slotKey;

        // Check if already generated for this slot
        const alreadyGenerated = config.notifications?.some(n => {
          const nDate = new Date(n.timestamp);
          return nDate.getHours() === target.hour && nDate.getMinutes() === target.minute;
        });

        if (!alreadyGenerated) {
          await generateNotification(target.label);
        }
      }
    };

    const generateNotification = async (slotLabel: string) => {
      try {
        const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '';
        const ai = new GoogleGenAI({ 
            apiKey: googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || '',
            baseUrl: `${window.location.origin}/api/proxy/google`
        });
        const model = "gemini-2.5-flash";
        
        const prompt = `Eres el Estratega Rembrandt (Chief of Staff). Es el momento de la ${slotLabel}. 
        Genera un consejo corto, motivador y estratégico para Rembrandt. 
        Puede ser sobre salud (tomar agua, comer algo, estirarse), productividad o mentalidad.
        Sé directo, elegante y usa un tono de mentor. Máximo 20 palabras.
        Responde SOLO con el texto del consejo, sin comillas.`;

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        const content = response.text || "Es momento de un respiro estratégico. Mantén el enfoque.";
        
        const newNotification: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          title: `Mensaje de la ${slotLabel}`,
          content: content,
          timestamp: Date.now(),
          isRead: false,
          type: 'ai_advice'
        };

        updateNotifications([...(config.notifications || []), newNotification]);
        toast.info("Nuevo mensaje del Estratega Rembrandt");
      } catch (error) {
        console.error('Error generating notification:', error);
      }
    };

    const interval = setInterval(checkTime, 30000); // Check every 30 seconds
    checkTime(); // Initial check

    return () => clearInterval(interval);
  }, [config.notifications, config.lastNotificationCheck, updateNotifications, updateConfig]);

  return null;
};

export default NotificationManager;
