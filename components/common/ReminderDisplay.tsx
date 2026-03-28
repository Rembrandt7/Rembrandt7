import React, { useState, useMemo } from 'react';
import { Plus, X, AlertTriangle, DollarSign, Brain, Zap } from 'lucide-react';
import { useLinks } from '../../contexts/LinkContext';

const ReminderDisplay: React.FC = () => {
  const { config, updateConfig } = useLinks();
  const [newReminder, setNewReminder] = useState<string>('');

  const dynamicReminders = useMemo(() => {
    const events = config.calendarEvents || [];
    const tokens = config.calendarTokens || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const reminders: { text: string; type: 'payment' | 'trabajo' | 'manual' | 'token'; isUrgent: boolean; color?: string; id?: string }[] = [];

    // Add manual reminders
    if (config.reminders) {
      config.reminders.forEach((r, i) => {
        reminders.push({ text: r, type: 'manual', isUrgent: false });
      });
    }

    // Add dynamic reminders from events
    events.forEach(event => {
      const eventDate = new Date(event.date + 'T00:00:00');
      
      // Payments: Only show if today or past due
      if (event.type === 'payment' && !event.isPaid) {
        if (eventDate <= today) {
          reminders.push({ 
            text: `PAGO: ${event.title}${event.amount ? ` ($${event.amount})` : ''}`, 
            type: 'payment', 
            isUrgent: true,
            id: event.id
          });
        }
      }

      // Jobs: Always show if not finished
      if (event.type === 'trabajo' && !event.isFinished) {
        let isUrgent = false;
        let color = '#22c55e'; // Default green
        let text = event.title;

        if (event.isIndefinite) {
          text += ` (Indefinido)`;
          color = '#22c55e';
        } else if (event.deliveryDate) {
          const deliveryDate = new Date(event.deliveryDate + 'T00:00:00');
          const diffTime = deliveryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          text += ` (${event.deliveryDate})`;

          if (diffDays <= 0) {
            color = '#ef4444'; // Red
            isUrgent = true;
          } else if (diffDays <= 3) {
            color = '#eab308'; // Yellow
            isUrgent = true;
          } else {
            color = '#22c55e'; // Green
          }
        }

        reminders.push({ 
          text, 
          type: 'trabajo', 
          isUrgent,
          color,
          id: event.id
        });
      }
    });

    // Add tokens
    tokens.forEach(token => {
      const activeDate = new Date(token.currentActiveDate + 'T00:00:00');
      if (activeDate <= today) {
        const isExpired = activeDate < today;
        reminders.push({
          text: `TOKEN: ${token.name}`,
          type: 'token',
          isUrgent: true,
          color: isExpired ? '#ef4444' : '#eab308', // Red if expired, Yellow if active today
          id: token.id
        });
      }
    });

    return reminders;
  }, [config.calendarEvents, config.reminders, config.calendarTokens]);

  const addReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReminder.trim()) {
      updateConfig(prev => ({
        ...prev,
        reminders: [...(prev.reminders || []), newReminder.trim()]
      }));
      setNewReminder('');
    }
  };

  const removeReminder = (index: number) => {
    updateConfig(prev => ({
      ...prev,
      reminders: (prev.reminders || []).filter((_, idx) => idx !== index)
    }));
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg">
      <div className="flex items-center gap-4">
        <div className="flex-grow overflow-hidden bg-gray-800 rounded-lg p-2 h-10 flex items-center border border-gray-700 relative">
          <div 
            className="flex gap-4 items-center animate-marquee whitespace-nowrap"
            style={{ animationDuration: '60s' }} // Constant slow speed
          >
            {dynamicReminders.length === 0 && <span className="text-sm text-gray-500">No hay recordatorios pendientes.</span>}
            {dynamicReminders.map((r, i) => (
              <div 
                key={i} 
                className={`text-xs flex items-center gap-2 px-2 py-1 rounded font-bold whitespace-nowrap transition-all ${
                  r.isUrgent && !r.color
                    ? 'bg-yellow-500 text-gray-900 animate-pulse border border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                    : 'bg-gray-700 text-white border border-gray-600'
                }`}
                style={r.color ? { 
                  backgroundColor: r.color, 
                  color: r.color === '#eab308' ? '#000' : '#fff',
                  borderColor: `${r.color}40`,
                  boxShadow: r.isUrgent ? `0 0 10px ${r.color}40` : 'none'
                } : {}}
              >
                {r.type === 'payment' && <DollarSign size={12} />}
                {r.type === 'trabajo' && <Brain size={12} />}
                {r.type === 'token' && <Zap size={12} />}
                {r.isUrgent && <AlertTriangle size={12} />}
                <span>{r.text}</span>
                {r.type === 'manual' && (
                  <button 
                    onClick={() => removeReminder(i)} 
                    className={`${r.isUrgent ? 'text-gray-900' : 'text-red-400'} hover:opacity-70`}
                  >
                    <X size={12}/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <form onSubmit={addReminder} className="flex gap-2">
        <input
          type="text"
          value={newReminder}
          onChange={(e) => setNewReminder(e.target.value)}
          placeholder="Añadir recordatorio manual..."
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-700"
        />
        <button type="submit" className="bg-purple-600 p-1 rounded-lg text-white hover:bg-purple-700 transition-colors">
          <Plus size={16}/>
        </button>
      </form>
    </div>
  );
};

export default ReminderDisplay;
