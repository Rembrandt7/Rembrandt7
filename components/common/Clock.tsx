import React, { useState, useEffect, useMemo } from 'react';
import { useLinks } from '../../contexts/LinkContext';

const Clock: React.FC = () => {
  const { config } = useLinks();
  const [time, setTime] = useState({
    hoursMinutes: '',
    seconds: '',
    ampm: '',
    date: '',
    fullDate: new Date()
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime({
        hoursMinutes: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s[ap]\.?m\.?/i, ''),
        seconds: now.toLocaleTimeString('es-MX', { second: '2-digit' }),
        ampm: now.toLocaleTimeString('es-MX', { hour12: true }).split(' ').pop() || '',
        date: now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        fullDate: now
      });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isWorkTime = useMemo(() => {
    const now = time.fullDate;
    const dateStr = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTimeVal = hour + minute / 60;

    // 1. Check for custom off days (vacation/holiday)
    const events = config.calendarEvents || [];
    const customOff = events.find(e => e.date === dateStr && (e.type === 'holiday' || e.type === 'vacation' || e.type === 'off'));
    if (customOff) return false;

    // 2. Check Day Type
    const day = now.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    if (day === 0) return false; // Sunday is always OFF

    let isWorkDay = false;
    if (day >= 1 && day <= 5) {
      isWorkDay = true;
    } else if (day === 6) {
      // Alternating Saturday
      const REFERENCE_OFF_SATURDAY = new Date('2026-03-07T00:00:00');
      const diffTime = now.getTime() - REFERENCE_OFF_SATURDAY.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.round(diffDays / 7);
      isWorkDay = diffWeeks % 2 !== 0; // If it's not an off Saturday, it's a work Saturday
    }

    if (!isWorkDay) return false;

    // 3. Check Hours
    let startWork = 8;
    let endWork = 18;
    let startLunch = 13;
    let endLunch = 14;

    if (day === 6) {
      // Saturday: 9 AM to 1 PM
      startWork = 9;
      endWork = 13;
      startLunch = 0; // No lunch on Saturday
      endLunch = 0;
    }

    const isDuringWorkHours = currentTimeVal >= startWork && currentTimeVal < endWork;
    const isDuringLunch = currentTimeVal >= startLunch && currentTimeVal < endLunch;

    return isDuringWorkHours && !isDuringLunch;
  }, [time.fullDate, config.calendarEvents]);

  const nextEvent = useMemo(() => {
    const events = config.calendarEvents || [];
    if (events.length === 0) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const futureEvents = events
      .map(e => ({ ...e, eventDate: new Date(e.date + 'T00:00:00') }))
      .filter(e => e.eventDate >= now)
      .sort((a, b) => {
        const dateDiff = a.eventDate.getTime() - b.eventDate.getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.time || '').localeCompare(b.time || '');
      });

    if (futureEvents.length === 0) return null;

    const next = futureEvents[0];
    const diffTime = next.eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      title: next.title,
      days: diffDays,
      date: next.date
    };
  }, [config.calendarEvents]);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className={`flex items-baseline gap-1 font-mono transition-colors duration-500 ${isWorkTime ? 'text-orange-500' : 'text-green-500'}`}>
        <span className="text-4xl md:text-5xl font-bold tracking-wider">{time.hoursMinutes}</span>
        <span className="text-2xl md:text-3xl font-bold opacity-50">:</span>
        <span className="text-xl md:text-2xl font-medium">{time.seconds}</span>
        <span className="text-lg md:text-xl font-medium">{time.ampm}</span>
      </div>
      <div className="text-xs md:text-sm text-gray-400 capitalize tracking-wide">
        {time.date}
      </div>
      {nextEvent && (
        <div className="text-[10px] md:text-xs font-bold text-purple-400/80 mt-0.5 flex items-center gap-1 animate-pulse">
          <span>Faltan {nextEvent.days} {nextEvent.days === 1 ? 'día' : 'días'} para:</span>
          <span className="text-white truncate max-w-[150px]">{nextEvent.title}</span>
        </div>
      )}
    </div>
  );
};

export default Clock;
