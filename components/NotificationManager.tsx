
import React, { useEffect, useRef } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { GoogleGenAI } from '@google/genai';
import { AppNotification } from '../types';
import { toast } from 'sonner';

const TARGET_TIMES = [
  { hour: 7, minute: 0, label: 'Mañana' },
  { hour: 12, minute: 0, label: 'Mediodía' },
  { hour: 15, minute: 0, label: 'Tarde' },
  { hour: 17, minute: 50, label: 'Salir' },
  { hour: 20, minute: 30, label: 'Noche' },
  { hour: 23, minute: 30, label: 'Dormir' }
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
        const ai = new GoogleGenAI({ 
            apiKey: googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || '',
            baseUrl: `${window.location.origin}/api/proxy/google`
        });
        const model = "gemini-3.1-flash-preview";
        
        let context = "";
        if (slotLabel === 'Mañana') {
            const today = new Date().toISOString().split('T')[0];
            const todayEvents = (config.calendarEvents || [])
                .filter(e => e.date === today)
                .map(e => `- ${e.title}${e.time ? ' a las ' + e.time : ''}`)
                .join('\n');
            context = todayEvents 
                ? `Hoy tienes los siguientes pendientes:\n${todayEvents}\nComenta sobre ellos de forma motivadora.`
                : "No hay eventos programados para hoy. Da un consejo para empezar el día con fuerza.";
        } else if (slotLabel === 'Salir') {
            context = "Ya son las 5:50 PM. Es casi hora de salir y cerrar el día laboral. Aconséjame desconectar y descansar.";
        } else if (slotLabel === 'Dormir') {
            context = "Son las 11:30 PM. Es hora de dormir para recuperar energías. Dame un consejo de descanso profundo.";
        }

        const prompt = `Eres el Estratega Rembrandt (Chief of Staff). Es el momento de: ${slotLabel}. 
        ${context}
        Genera un consejo corto, motivador y estratégico para Rembrandt. 
        Sé directo, elegante y usa un tono de mentor. Máximo 25 palabras.
        Responde SOLO con el texto del consejo, sin comillas.`;

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        const content = response.text || "Es momento de un respiro estratégico. Mantén el enfoque.";
        
        const newNotification: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          title: slotLabel === 'Mañana' ? 'Estrategia del Día' : `Mensaje del Estratega`,
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

    const interval = setInterval(checkTime, 30000); 
    checkTime(); 

    return () => clearInterval(interval);
  }, [config.notifications, config.lastNotificationCheck, config.calendarEvents, updateNotifications, updateConfig, googleApiConfig]);

  return null;
};

export default NotificationManager;
