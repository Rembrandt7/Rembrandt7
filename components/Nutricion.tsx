import React, { useState, useEffect, useMemo } from 'react';
import { 
    Apple, Activity, Heart, User, Calendar as CalendarIcon, Brain, Loader2, Save, 
    ChevronLeft, ChevronRight, Plus, Minus, Droplets, Trash2, RefreshCcw, Edit2, 
    PlusCircle, Settings, Fish, Soup, Beef, Bird, Leaf, Egg, Cookie, Zap, Disc, 
    CircleDot, Box, Utensils, Coffee, Pizza, Sandwich, IceCream, Carrot, Grape, 
    Banana, Cherry, Citrus, Milk, Wine, Beer, GlassWater, ChevronUp, ChevronDown,
    Moon, Send, Clock, Dumbbell, Bike, Waves, Mountain, Timer, MapPin, X, MessageSquare, Footprints, Camera
} from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { NutritionProfile, NutritionLogEntry, FoodItem } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { cleanJsonResponse } from '../utils/jsonUtils';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import WaterBottle from './WaterBottle';
import Battery from './Battery';
import { loadADN } from '../services/memoriaService';

// Default Foods
const DEFAULT_FOODS: FoodItem[] = [
    { id: 'manzana', name: 'Manzana', calories: 95, icon: 'Apple', protein: 0.5, carbs: 25, fats: 0.3, sugar: 19 },
    { id: 'ricecake', name: 'Ricecake', calories: 35, icon: 'Cookie', protein: 0.7, carbs: 7, fats: 0.3, sugar: 0 },
    { id: 'atun', name: 'Atún en aceite de oliva (78g)', calories: 150, icon: 'Fish', protein: 18, carbs: 0, fats: 9, sugar: 0 },
    { id: 'salmas', name: 'Salmas horneadas (18g)', calories: 70, icon: 'Box', protein: 2, carbs: 14, fats: 1, sugar: 0 },
    { id: 'barrita', name: 'Barrita de proteína', calories: 200, icon: 'Zap', protein: 20, carbs: 15, fats: 7, sugar: 2 },
    { id: 'almendras', name: 'Almendras (20 pza)', calories: 140, icon: 'CircleDot', protein: 6, carbs: 6, fats: 14, sugar: 1 },
    { id: 'caldo_pescado', name: 'Caldo de pescado', calories: 150, icon: 'Soup', protein: 15, carbs: 5, fats: 8, sugar: 0 },
    { id: 'frijoles_queso_salsa', name: 'Frijoles con queso en salsa', calories: 200, icon: 'Soup', protein: 10, carbs: 25, fats: 8, sugar: 1 },
    { id: 'filete_papas', name: 'Filete pescado con papas y aderezo', calories: 500, icon: 'Fish', protein: 35, carbs: 45, fats: 20, sugar: 2 },
    { id: 'pollo_asado', name: 'Pollo asado', calories: 300, icon: 'Bird', protein: 40, carbs: 0, fats: 15, sugar: 0 },
    { id: 'ensalada_pollo', name: 'Ensalada pollo, queso, huevo y ranch', calories: 350, icon: 'Leaf', protein: 25, carbs: 10, fats: 25, sugar: 3 },
    { id: 'tortillas', name: 'Tortillas', calories: 60, icon: 'Disc', protein: 2, carbs: 12, fats: 1, sugar: 0 },
    { id: 'huevo_duro', name: 'Huevo duro', calories: 70, icon: 'Egg', protein: 6, carbs: 0.6, fats: 5, sugar: 0 },
    { id: 'queso_panela', name: 'Queso panela (40g)', calories: 100, icon: 'Box', protein: 8, carbs: 1, fats: 7, sugar: 0 },
    { id: 'cafe', name: 'Café', calories: 5, icon: 'Coffee', protein: 0.3, carbs: 0, fats: 0, sugar: 0 },
    { id: 'platano', name: 'Plátano', calories: 105, icon: 'Banana', protein: 1.3, carbs: 27, fats: 0.4, sugar: 14 },
    { id: 'yogur_griego', name: 'Yogur Griego (150g)', calories: 130, icon: 'Milk', protein: 15, carbs: 6, fats: 5, sugar: 4 },
    { id: 'avena', name: 'Avena (1/2 taza)', calories: 150, icon: 'Box', protein: 5, carbs: 27, fats: 3, sugar: 1 },
    { id: 'leche_almendras', name: 'Leche de Almendras (1 taza)', calories: 30, icon: 'Milk', protein: 1, carbs: 1, fats: 2.5, sugar: 0 },
    { id: 'pan_integral', name: 'Pan Integral (1 rebanada)', calories: 80, icon: 'Cookie', protein: 4, carbs: 15, fats: 1, sugar: 1 },
    { id: 'mantequilla_mani', name: 'Mantequilla de Maní (1 cda)', calories: 95, icon: 'CircleDot', protein: 4, carbs: 3, fats: 8, sugar: 1 },
];

const FoodIcon = ({ name, className }: { name?: string, className?: string }) => {
    switch (name) {
        case 'Apple': return <Apple className={className} />;
        case 'Fish': return <Fish className={className} />;
        case 'Soup': return <Soup className={className} />;
        case 'Beef': return <Beef className={className} />;
        case 'Bird': return <Bird className={className} />;
        case 'Leaf': return <Leaf className={className} />;
        case 'Egg': return <Egg className={className} />;
        case 'Cookie': return <Cookie className={className} />;
        case 'Zap': return <Zap className={className} />;
        case 'Disc': return <Disc className={className} />;
        case 'CircleDot': return <CircleDot className={className} />;
        case 'Box': return <Box className={className} />;
        case 'Coffee': return <Coffee className={className} />;
        case 'Pizza': return <Pizza className={className} />;
        case 'Sandwich': return <Sandwich className={className} />;
        case 'IceCream': return <IceCream className={className} />;
        case 'Carrot': return <Carrot className={className} />;
        case 'Grape': return <Grape className={className} />;
        case 'Banana': return <Banana className={className} />;
        case 'Cherry': return <Cherry className={className} />;
        case 'Citrus': return <Citrus className={className} />;
        case 'Milk': return <Milk className={className} />;
        case 'Wine': return <Wine className={className} />;
        case 'Beer': return <Beer className={className} />;
        case 'GlassWater': return <GlassWater className={className} />;
        default: return <Utensils className={className} />;
    }
};

const ActivityIcon = ({ type, className }: { type: string, className?: string }) => {
    switch (type) {
        case 'pesas': return <Dumbbell className={className} />;
        case 'correr': return <Activity className={className} />;
        case 'natacion': return <Waves className={className} />;
        case 'montaña': return <Mountain className={className} />;
        default: return <Zap className={className} />;
    }
};

const getWeekDates = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 is Sunday
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dNum = String(d.getDate()).padStart(2, '0');
        week.push(`${y}-${m}-${dNum}`);
    }
    return week;
};

const getDayName = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
};

const Nutricion: React.FC = () => {
    const { nutritionData, updateNutritionData, saveNutritionDataToSupabase, fetchNutritionDataFromSupabase } = useLinks();
    const profile = nutritionData?.profile || {};
    const logs = nutritionData?.logs || [];
    
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    
    const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [userQuestion, setUserQuestion] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);
    const mealPlanRef = React.useRef<HTMLDivElement>(null);
    const [exclusions, setExclusions] = useState<string[]>(() => {
        return nutritionData?.exclusions || ['salmón', 'nopales', 'pulpo'];
    });
    const [availableFoods, setAvailableFoods] = useState<FoodItem[]>(() => {
        return nutritionData?.availableFoods || DEFAULT_FOODS;
    });
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [foodManagerModal, setFoodManagerModal] = useState<{
        isOpen: boolean;
        editingFood?: FoodItem;
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        sugar: number;
        icon: string;
    }>({ isOpen: false, name: '', calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, icon: 'Utensils' });

    const [foodModal, setFoodModal] = useState<{
        isOpen: boolean;
        food?: FoodItem;
        index?: number;
        quantity: number;
        description: string;
    }>({ isOpen: false, quantity: 1, description: '' });

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    
    const [mealPlanQuestion, setMealPlanQuestion] = useState('');
    const [isMealPlanChatting, setIsMealPlanChatting] = useState(false);
    const [isMealPlanChatModalOpen, setIsMealPlanChatModalOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, meal: any } | null>(null);
    const [adnData, setAdnData] = useState<any>(null);

    const handleContextMenu = (e: React.MouseEvent, meal: any) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, meal });
    };

    const closeContextMenu = () => setContextMenu(null);

    useEffect(() => {
        document.addEventListener('click', closeContextMenu);
        return () => document.removeEventListener('click', closeContextMenu);
    }, []);

    useEffect(() => {
        const fetchADN = async () => {
            const data = await loadADN('remy_adn_v2.3.json');
            if (data) setAdnData(data);
        };
        fetchADN();
    }, []);

    // Debounced save to Supabase whenever nutritionData changes
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only save if there's actual data to save (to avoid saving empty state on first load)
            if (nutritionData && (nutritionData.logs.length > 0 || Object.keys(nutritionData.profile).length > 0)) {
                saveNutritionDataToSupabase(false);
            }
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [nutritionData, saveNutritionDataToSupabase]);

    const saveNutritionRef = React.useRef(saveNutritionDataToSupabase);
    useEffect(() => {
        saveNutritionRef.current = saveNutritionDataToSupabase;
    }, [saveNutritionDataToSupabase]);

    // Sync availableFoods with nutritionData
    useEffect(() => {
        if (nutritionData?.availableFoods && nutritionData.availableFoods.length > 0) {
            setAvailableFoods(nutritionData.availableFoods);
        }
    }, [nutritionData?.availableFoods]);

    // Automatic fetch on mount
    useEffect(() => {
        fetchNutritionDataFromSupabase();
    }, [fetchNutritionDataFromSupabase]);

    const toggleFavorite = (id: string) => {
        const newFoods = availableFoods.map(f => 
            f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
        );
        setAvailableFoods(newFoods);
        updateNutritionData({ ...nutritionData, availableFoods: newFoods });
        saveNutritionDataToSupabase();
    };

    const moveFood = (id: string, direction: 'up' | 'down') => {
        const index = availableFoods.findIndex(f => f.id === id);
        if (index === -1) return;
        
        const newFoods = [...availableFoods];
        if (direction === 'up' && index > 0) {
            [newFoods[index], newFoods[index - 1]] = [newFoods[index - 1], newFoods[index]];
        } else if (direction === 'down' && index < newFoods.length - 1) {
            [newFoods[index], newFoods[index + 1]] = [newFoods[index + 1], newFoods[index]];
        }
        
        // Update order property for all foods based on their new position
        const updatedWithOrder = newFoods.map((food, idx) => ({ ...food, order: idx }));
        setAvailableFoods(updatedWithOrder);
        updateNutritionData({ ...nutritionData, availableFoods: updatedWithOrder });
    };

    const sortedAvailableFoods = useMemo(() => {
        return [...availableFoods].sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
            return a.name.localeCompare(b.name);
        });
    }, [availableFoods]);

    // Daily Activity Suggestions
    const activitySuggestion = useMemo(() => {
        if (!profile.goal) return "Mantente activo hoy";
        const goal = profile.goal.toLowerCase();
        if (goal.includes('perder') || goal.includes('bajar')) {
            return "Sugerencia: 45-60 min de cardio moderado";
        } else if (goal.includes('ganar') || goal.includes('musculo')) {
            return "Sugerencia: 45-60 min de pesas / fuerza";
        }
        return "Sugerencia: 30 min de actividad diaria";
    }, [profile.goal]);

    const addActivity = async (type: 'pesas' | 'correr' | 'natacion' | 'montaña' | 'otro', name?: string) => {
        const activityName = name || type;
        
        // Initial activity object
        const newActivity: any = { 
            name: activityName, 
            duration: 30, 
            type,
            unit: type === 'correr' ? 'km' : 'min',
            distance: type === 'correr' ? 5 : undefined,
            caloriesBurned: 0
        };

        const newActivities = [...(selectedLog.activities || []), newActivity];
        handleUpdateLog('activities', newActivities);

        // Estimate calories using AI
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
            const prompt = `Estima las calorías quemadas para la siguiente actividad física:
            Actividad: ${activityName}
            Tipo: ${type}
            Duración: 30 min
            ${type === 'correr' ? 'Distancia: 5 km' : ''}
            Perfil del usuario: Peso ${profile.weight}kg, Altura ${profile.height}cm, Edad ${profile.age}, Sexo ${profile.gender}.
            
            Responde SOLO con el número estimado de calorías (un entero).`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
            });

            const calories = parseInt(response.text?.trim() || '0');
            if (!isNaN(calories)) {
                const updatedActivities = [...newActivities];
                updatedActivities[updatedActivities.length - 1].caloriesBurned = calories;
                handleUpdateLog('activities', updatedActivities);
            }
        } catch (error) {
            console.error("Error estimating calories:", error);
        }
    };

    const removeActivity = (index: number) => {
        const newActivities = [...(selectedLog.activities || [])];
        newActivities.splice(index, 1);
        handleUpdateLog('activities', newActivities);
    };

    const updateActivityValue = async (index: number, field: 'duration' | 'distance', value: number) => {
        const newActivities = [...(selectedLog.activities || [])];
        const act = { ...newActivities[index], [field]: Math.max(0, value) };
        newActivities[index] = act;
        handleUpdateLog('activities', newActivities);

        // Recalculate calories
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
            const prompt = `Estima las calorías quemadas para la siguiente actividad física:
            Actividad: ${act.name}
            Duración: ${act.duration} min
            ${act.distance ? `Distancia: ${act.distance} ${act.unit}` : ''}
            Perfil del usuario: Peso ${profile.weight}kg, Altura ${profile.height}cm, Edad ${profile.age}, Sexo ${profile.gender}.
            
            Responde SOLO con el número estimado de calorías (un entero).`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
            });

            const calories = parseInt(response.text?.trim() || '0');
            if (!isNaN(calories)) {
                const updatedActivities = [...(selectedLog.activities || [])];
                updatedActivities[index] = { ...act, caloriesBurned: calories };
                handleUpdateLog('activities', updatedActivities);
            }
        } catch (error) {
            console.error("Error updating estimated calories:", error);
        }
    };

    const updateActivityUnit = (index: number, unit: 'min' | 'km') => {
        const newActivities = [...(selectedLog.activities || [])];
        newActivities[index] = { ...newActivities[index], unit };
        handleUpdateLog('activities', newActivities);
    };

    const handleUpdateProfile = (field: keyof NutritionProfile, value: any) => {
        const newProfile = { ...profile, [field]: value };
        
        // Recalculate calorie goal if key fields change
        if (['age', 'weight', 'height', 'gender', 'activityLevel', 'goal'].includes(field)) {
            const { age, weight, height, gender, activityLevel, goal } = newProfile;
            if (age && weight && height && gender && activityLevel && goal) {
                // Harris-Benedict Equation
                let bmr = 0;
                if (gender === 'male') {
                    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
                } else {
                    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
                }

                const activityMultipliers: Record<string, number> = {
                    sedentary: 1.2,
                    light: 1.375,
                    moderate: 1.55,
                    active: 1.725,
                    very_active: 1.9
                };

                let tdee = bmr * (activityMultipliers[activityLevel] || 1.2);

                if (goal === 'lose') tdee -= 500;
                if (goal === 'gain') tdee += 500;

                newProfile.calorieGoal = Math.round(tdee);
            }
        }

        updateNutritionData({ ...nutritionData, profile: newProfile });
    };

    const selectedLog = logs.find(l => l.date === selectedDate) || { 
        id: Date.now().toString(), 
        date: selectedDate, 
        meals: '', 
        activity: '', 
        activities: [],
        waterIntake: 0, 
        calories: 0,
        consumedFoods: []
    };

    const consumedFoods = selectedLog.consumedFoods || [];

    const handleUpdateLog = (field: keyof NutritionLogEntry, value: any) => {
        const existingIndex = logs.findIndex(l => l.date === selectedDate);
        let newLogs = [...logs];
        if (existingIndex >= 0) {
            newLogs[existingIndex] = { ...newLogs[existingIndex], [field]: value };
        } else {
            newLogs.push({ ...selectedLog, [field]: value, id: Date.now().toString() });
        }
        updateNutritionData({ ...nutritionData, logs: newLogs });
    };

    const updateLogMultiple = (updates: Partial<NutritionLogEntry>) => {
        const existingIndex = logs.findIndex(l => l.date === selectedDate);
        let newLogs = [...logs];
        if (existingIndex >= 0) {
            newLogs[existingIndex] = { ...newLogs[existingIndex], ...updates };
        } else {
            newLogs.push({ ...selectedLog, ...updates, id: Date.now().toString() });
        }
        updateNutritionData({ ...nutritionData, logs: newLogs });
    };

    const addWater = (amount: number) => {
        const currentWater = selectedLog.waterIntake || 0;
        const newWater = Math.max(0, parseFloat((currentWater + amount).toFixed(2)));
        handleUpdateLog('waterIntake', newWater);
    };

    const calculateSleepHours = (sleep: string, wake: string) => {
        if (!sleep || !wake) return 0;
        const [sH, sM] = sleep.split(':').map(Number);
        const [wH, wM] = wake.split(':').map(Number);
        
        let diff = (wH * 60 + wM) - (sH * 60 + sM);
        if (diff < 0) diff += 24 * 60; // Crossed midnight
        
        return parseFloat((diff / 60).toFixed(1));
    };

    const handleUpdateSleep = (field: 'sleepTime' | 'wakeTime', value: string) => {
        const updates: Partial<NutritionLogEntry> = { [field]: value };
        const otherField = field === 'sleepTime' ? 'wakeTime' : 'sleepTime';
        const otherValue = selectedLog[otherField] || '';
        
        if (value && otherValue) {
            updates.sleepHours = calculateSleepHours(
                field === 'sleepTime' ? value : otherValue,
                field === 'wakeTime' ? value : otherValue
            );
        }
        
        updateLogMultiple(updates);
    };

    const handleGeminiError = (error: any, defaultMessage: string) => {
        const errorString = String(error);
        if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('quota')) {
            toast.error('Has excedido tu cuota de uso de la API. Por favor, intenta de nuevo más tarde o verifica tu plan en Google AI Studio.');
        } else {
            toast.error(defaultMessage);
        }
    };

    const generateWeeklyMealPlan = async () => {
        setIsGeneratingMealPlan(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const prompt = `
Eres el Dr. Remy Sanisimo, médico deportivo especializado en salud preventiva, entrenamiento funcional y nutrición clínica. 

Atiendes a Rembrandt, 39 años, arquitecto de oficina en Ciudad Apodaca, NL. Trabaja 8-10 hrs sentado frente a pantallas (Unreal Engine, AutoCAD, 3ds Max, Photoshop). Los fines de semana hace senderismo en cerros. Tiene un BYD Dolphin y paneles solares en casa.

Tu rol combina tres perfiles:
1. ENTRENADOR PERSONAL — rutinas prácticas para quien pasa mucho tiempo sentado, cortas (20-45 min), sin gimnasio obligatorio, progresivas.
2. NUTRIÓLOGO — orientación alimentaria realista para el contexto norteño/regiomontano, sin obsesión, con opciones accesibles.
3. COACH DE SALUD PREVENTIVA — monitoreo de postura, fatiga visual, estrés digital, sueño y bienestar general.

Reglas de comportamiento:
- Habla siempre en español, tono directo y motivador pero sin exagerar.
- Personaliza cada respuesta al contexto de oficina y trabajo creativo.
- Cuando Rembrandt mencione una actividad de fin de semana (cerros, caminatas), ajusta la preparación/recuperación.
- Haz seguimiento: pregunta cómo fue el entrenamiento anterior antes de dar el siguiente.
- No diagnostiques enfermedades. Para síntomas médicos, recomienda consultar a un especialista.
- Prioriza consistencia sobre perfección.

${adnData ? `\nADN del Asistente (Personalidad, Tono y Directrices Adicionales):\n${typeof adnData === 'string' ? adnData : JSON.stringify(adnData, null, 2)}\n` : ''}

Genera un plan de comidas semanal (7 días) basado en el siguiente perfil y horario.
IMPORTANTE: Separa claramente cada día. Asegúrate de que las comidas sean ACCESIBLES (fáciles de encontrar en supermercados locales de Apodaca/Monterrey como HEB, Soriana) y PRÁCTICAS para un arquitecto ocupado.

Perfil:
- Edad: ${profile.age || 'No especificada'}
- Peso: ${profile.weight ? profile.weight + ' kg' : 'No especificado'}
- Altura: ${profile.height ? profile.height + ' cm' : 'No especificada'}
- Género: ${profile.gender || 'No especificado'}
- Objetivo: ${profile.goal || 'Saludable'}
- Nivel de Actividad: ${profile.activityLevel || 'No especificado'}
- Calorías diarias objetivo: ${profile.calorieGoal || 2000}

Horario del usuario:
- 06:00 AM: Despertar
- 06:00 AM - 07:00 AM: Manejo al gimnasio
- 07:00 AM - 08:00 AM: Entrenamiento en el gimnasio
- 08:00 AM - 06:00 PM: Trabajo en oficina
- 01:00 PM - 02:00 PM: Hora de comida
- 06:00 PM - 08:00 PM: Manejo (necesita snack tipo barrita o fácil de comer en el carro)

Exclusiones (NO incluir estos alimentos): ${exclusions.join(', ')}

Para cada día, sugiere:
1. Desayuno (Hora, Alimento, Cantidad, Calorías estimadas) - considerar que entrena de 7 a 8 am.
2. Comida (Hora, Alimento, Cantidad, Calorías estimadas) - horario de 1 a 2 pm.
3. Cena (Hora, Alimento, Cantidad, Calorías estimadas)
4. Snack (Hora, Alimento, Cantidad, Calorías estimadas) - considerar snack para el manejo de 6 a 8 pm.

Responde estrictamente en formato JSON:
{
  "weeklyMealPlan": [
    {
      "date": "Lunes",
      "meals": [
        { "time": "08:00", "food": "...", "quantity": "...", "type": "desayuno", "calories": 400 },
        ...
      ]
    },
    ...
  ]
}
`;
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            weeklyMealPlan: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        date: { type: Type.STRING },
                                        meals: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    time: { type: Type.STRING },
                                                    food: { type: Type.STRING },
                                                    quantity: { type: Type.STRING },
                                                    type: { type: Type.STRING },
                                                    calories: { type: Type.NUMBER }
                                                },
                                                required: ["time", "food", "quantity", "type", "calories"]
                                            }
                                        }
                                    },
                                    required: ["date", "meals"]
                                }
                            }
                        },
                        required: ["weeklyMealPlan"]
                    }
                }
            });
            
            let result;
            try {
                result = JSON.parse(cleanJsonResponse(response.text));
            } catch (e) {
                throw new Error("No se pudo parsear el JSON de la respuesta");
            }
            updateNutritionData({ ...nutritionData, weeklyMealPlan: result.weeklyMealPlan });
            toast.success('Plan de comidas generado');
        } catch (error) {
            console.error(error);
            handleGeminiError(error, 'Error al generar el plan de comidas');
        } finally {
            setIsGeneratingMealPlan(false);
        }
    };

    const copyMealPlanAsImage = async () => {
        if (!mealPlanRef.current) return;
        
        toast.loading('Generando imagen...', { id: 'copy-image' });
        try {
            const canvas = await html2canvas(mealPlanRef.current, {
                backgroundColor: '#09090b',
                scale: 2,
                logging: false,
                useCORS: true,
                width: 1600, // Force width
                onclone: (clonedDoc) => {
                    const clonedContainer = clonedDoc.getElementById('meal-plan-capture-container');
                    if (clonedContainer) {
                        clonedContainer.style.width = '1600px';
                        clonedContainer.style.padding = '40px';
                        clonedContainer.style.display = 'block';
                        const grid = clonedContainer.querySelector('.grid');
                        if (grid) {
                            grid.setAttribute('style', 'display: grid !important; grid-template-columns: repeat(7, 1fr) !important; gap: 1rem !important; width: 100% !important;');
                            grid.classList.remove('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'xl:grid-cols-7');
                        }
                    }
                }
            });
            
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        const data = [new ClipboardItem({ [blob.type]: blob })];
                        await navigator.clipboard.write(data);
                        toast.success('¡Imagen copiada al portapapeles!', { id: 'copy-image' });
                    } catch (err) {
                        console.error('Error copying to clipboard:', err);
                        // Fallback: download the image
                        const link = document.createElement('a');
                        link.download = `plan-alimentacion-${new Date().toISOString().split('T')[0]}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        toast.info('Imagen descargada (el portapapeles no está disponible)', { id: 'copy-image' });
                    }
                }
            }, 'image/png');
        } catch (error) {
            console.error('Error generating image:', error);
            toast.error('Error al generar la imagen', { id: 'copy-image' });
        }
    };

    const chatWithMealPlan = async () => {
        setIsMealPlanChatting(true);
        try {
            if (!process.env.GEMINI_API_KEY) throw new Error("API_KEY no configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const history = nutritionData.mealPlanChatHistory || [];
            const historyText = history.map(h => `${h.role === 'user' ? 'Usuario' : 'IA'}: ${h.text}`).join('\n');
            
            const prompt = `
Eres el Dr. Remy Sanisimo, médico deportivo especializado en salud preventiva, entrenamiento funcional y nutrición clínica. 

Atiendes a Rembrandt, 39 años, arquitecto de oficina en Ciudad Apodaca, NL. Trabaja 8-10 hrs sentado frente a pantallas (Unreal Engine, AutoCAD, 3ds Max, Photoshop). Los fines de semana hace senderismo en cerros. Tiene un BYD Dolphin y paneles solares en casa.

Tu rol combina tres perfiles:
1. ENTRENADOR PERSONAL — rutinas prácticas para quien pasa mucho tiempo sentado, cortas (20-45 min), sin gimnasio obligatorio, progresivas.
2. NUTRIÓLOGO — orientación alimentaria realista para el contexto norteño/regiomontano, sin obsesión, con opciones accesibles.
3. COACH DE SALUD PREVENTIVA — monitoreo de postura, fatiga visual, estrés digital, sueño y bienestar general.

Reglas de comportamiento:
- Habla siempre en español, tono directo y motivador pero sin exagerar.
- Personaliza cada respuesta al contexto de oficina y trabajo creativo.
- Cuando Rembrandt mencione una actividad de fin de semana (cerros, caminatas), ajusta la preparación/recuperación.
- Haz seguimiento: pregunta cómo fue el entrenamiento anterior antes de dar el siguiente.
- No diagnostiques enfermedades. Para síntomas médicos, recomienda consultar a un especialista.
- Prioriza consistencia sobre perfección.

${adnData ? `\nADN del Asistente (Personalidad, Tono y Directrices Adicionales):\n${typeof adnData === 'string' ? adnData : JSON.stringify(adnData, null, 2)}\n` : ''}

El usuario quiere ajustar su plan de comidas semanal.
IMPORTANTE: Si el usuario pide cambiar una comida, eliminar algo, o agregar algo, DEBES generar el plan actualizado.
Asegúrate de que las comidas sean ACCESIBLES y PRÁCTICAS para el contexto del usuario (Apodaca/Monterrey).
Separa claramente cada día y calcula las calorías para cada comida de forma que el total diario se acerque a su objetivo (${profile.calorieGoal || 2000} kcal).

Aquí está el plan de comidas actual:
${JSON.stringify(nutritionData.weeklyMealPlan || [], null, 2)}

Cosas que al usuario NO le gusta comer actualmente (exclusiones):
${JSON.stringify(exclusions)}

Historial de conversación:
${historyText}

Petición del usuario:
${mealPlanQuestion}

Responde de manera amigable. Si el usuario pide cambios en el plan, o menciona alimentos que no le gustan, genera un JSON estrictamente con la siguiente estructura:
\`\`\`json
{
  "weeklyMealPlan": [ ... ], // El plan actualizado completo con los cambios aplicados
  "newExclusions": [ ... ] // La lista actualizada de exclusiones
}
\`\`\`
Si no hay cambios en el plan ni en las exclusiones, solo responde a su pregunta sin el bloque JSON.
`;

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
                contents: prompt,
            });

            const text = response.text || "";
            
            // Check if there's a JSON block
            let updatedData = { ...nutritionData };
            let hasUpdates = false;

            try {
                const result = JSON.parse(cleanJsonResponse(text));
                if (result.weeklyMealPlan) {
                    updatedData.weeklyMealPlan = result.weeklyMealPlan;
                    hasUpdates = true;
                }
                if (result.newExclusions) {
                    updatedData.exclusions = result.newExclusions;
                    setExclusions(result.newExclusions);
                    hasUpdates = true;
                }
                
                if (hasUpdates) {
                    toast.success('Plan y preferencias actualizados');
                }
            } catch (e) {
                console.error("Error parsing new meal plan", e);
            }

            // Update chat history
            const newHistory: { role: 'user' | 'model'; text: string; date: string }[] = [...history, 
                { role: 'user' as const, text: mealPlanQuestion, date: new Date().toISOString() },
                { role: 'model' as const, text: text.replace(/```json\n[\s\S]*?\n```/, '[Plan de comidas actualizado]'), date: new Date().toISOString() }
            ].slice(-10); // Keep last 10 messages

            updatedData.mealPlanChatHistory = newHistory;
            updateNutritionData(updatedData);
            setMealPlanQuestion('');
        } catch (error) {
            console.error("Error chatting with meal plan:", error);
            handleGeminiError(error, "Hubo un error al procesar tu petición.");
        } finally {
            setIsMealPlanChatting(false);
        }
    };

    const addMealToLog = (meal: any) => {
        // Create a temporary food item
        const newFood: FoodItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: meal.food,
            calories: meal.calories || 0,
            icon: 'Utensils'
        };
        
        const newConsumedFoods = [...consumedFoods, { food: newFood, quantity: 1, description: meal.quantity }];
        const totalCalories = newConsumedFoods.reduce((sum, cf) => sum + (cf.food.calories * cf.quantity), 0);

        updateLogMultiple({ 
            consumedFoods: newConsumedFoods, 
            calories: totalCalories 
        });
        toast.success('Comida añadida al registro diario');
    };

    const analyzeNutrition = async () => {
        setIsAnalyzing(true);
        try {
            if (!process.env.GEMINI_API_KEY) throw new Error("API_KEY no configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const history = nutritionData.aiChatHistory || [];
            const historyText = history.map(h => `${h.role === 'user' ? 'Usuario' : 'IA'}: ${h.text}`).join('\n');
            
            const currentTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

            const prompt = `
Eres el Dr. Remy Sanisimo, médico deportivo especializado en salud preventiva, entrenamiento funcional y nutrición clínica. 

Atiendes a Rembrandt, 39 años, arquitecto de oficina en Ciudad Apodaca, NL. Trabaja 8-10 hrs sentado frente a pantallas (Unreal Engine, AutoCAD, 3ds Max, Photoshop). Los fines de semana hace senderismo en cerros. Tiene un BYD Dolphin y paneles solares en casa.

Tu rol combina tres perfiles:
1. ENTRENADOR PERSONAL — rutinas prácticas para quien pasa mucho tiempo sentado, cortas (20-45 min), sin gimnasio obligatorio, progresivas.
2. NUTRIÓLOGO — orientación alimentaria realista para el contexto norteño/regiomontano, sin obsesión, con opciones accesibles.
3. COACH DE SALUD PREVENTIVA — monitoreo de postura, fatiga visual, estrés digital, sueño y bienestar general.

Reglas de comportamiento:
- Habla siempre en español, tono directo y motivador pero sin exagerar.
- Personaliza cada respuesta al contexto de oficina y trabajo creativo.
- Cuando Rembrandt mencione una actividad de fin de semana (cerros, caminatas), ajusta la preparación/recuperación.
- Haz seguimiento: pregunta cómo fue el entrenamiento anterior antes de dar el siguiente.
- No diagnostiques enfermedades. Para síntomas médicos, recomienda consultar a un especialista.
- Prioriza consistencia sobre perfección.

${adnData ? `\nADN del Asistente (Personalidad, Tono y Directrices Adicionales):\n${typeof adnData === 'string' ? adnData : JSON.stringify(adnData, null, 2)}\n` : ''}

Analiza la siguiente información del usuario y su registro diario de comidas, actividad y sueño.
Identifica errores, áreas de oportunidad y da recomendaciones prácticas.

IMPORTANTE: Considera la hora actual del día (${currentTime}). Si es temprano, es normal que el usuario haya consumido pocas calorías o agua. No lo regañes por no haber cumplido sus metas si aún queda mucho día por delante. Evalúa el progreso en función de la hora. Considera también el ejercicio realizado para el balance calórico.

Historial de conversación previa:
${historyText}

Perfil del Usuario:
- Edad: ${profile.age || 'No especificada'}
- Peso: ${profile.weight ? profile.weight + ' kg' : 'No especificado'}
- Altura: ${profile.height ? profile.height + ' cm' : 'No especificada'}
- Género: ${profile.gender || 'No especificado'}
- Objetivo: ${profile.goal || 'No especificado'}
- Nivel de Actividad: ${profile.activityLevel || 'No especificado'}
- Calorías diarias objetivo: ${profile.calorieGoal || 2000}

Registro del Día (${selectedLog.date}):
- Comidas: ${selectedLog.meals || 'Ninguna registrada'}
- Calorías estimadas consumidas: ${selectedLog.calories || 0} kcal
- Agua consumida: ${selectedLog.waterIntake || 0} litros
- Actividad Física: ${(selectedLog.activities || []).map(a => `${a.name} (${a.duration} min)`).join(', ') || 'Ninguna registrada'}
- Pasos dados: ${selectedLog.steps || 0} pasos
- Horas de Sueño: ${selectedLog.sleepHours || 0} horas

Plan de Comidas Semanal Sugerido:
${JSON.stringify(nutritionData.weeklyMealPlan || [], null, 2)}

Pregunta/Duda del Usuario:
${userQuestion || 'Ninguna pregunta específica, solo análisis general.'}

Por favor, proporciona un análisis detallado, amigable y estructurado en Markdown. Si hay una pregunta específica, respóndela prioritariamente. Da recomendaciones de sueño si las horas son bajas (< 7h).
`;

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
                contents: prompt,
            });

            const newAnalysis = response.text || "No se pudo generar el análisis.";
            setAiAnalysis(newAnalysis);

            // Update chat history
            const newHistory: { role: 'user' | 'model'; text: string; date: string }[] = [...history, 
                { role: 'user' as const, text: userQuestion || 'Análisis del día', date: new Date().toISOString() },
                { role: 'model' as const, text: newAnalysis, date: new Date().toISOString() }
            ].slice(-10); // Keep last 10 messages for context

            updateNutritionData({ ...nutritionData, aiChatHistory: newHistory });
            setUserQuestion('');
        } catch (error) {
            console.error("Error analyzing nutrition:", error);
            const errorString = String(error);
            if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('quota')) {
                setAiAnalysis("Has excedido tu cuota de uso de la API. Por favor, intenta de nuevo más tarde o verifica tu plan en Google AI Studio.");
            } else {
                setAiAnalysis("Hubo un error al analizar la información. Por favor, intenta de nuevo.");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const changeWeek = (offset: number) => {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + (offset * 7));
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const dNum = String(date.getDate()).padStart(2, '0');
        setSelectedDate(`${y}-${m}-${dNum}`);
    };

    const handleDragStart = (e: React.DragEvent, food: FoodItem) => {
        e.dataTransfer.setData('foodId', food.id);
    };

    const handleDrop = (e: React.DragEvent) => {
        const foodId = e.dataTransfer.getData('foodId');
        const food = availableFoods.find(f => f.id === foodId);
        if (food) {
            setFoodModal({
                isOpen: true,
                food,
                quantity: 1,
                description: ''
            });
        }
    };

    // Handle image paste/drop
    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, sube solo imágenes');
            return;
        }

        setIsProcessingImage(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                const base64Data = base64.split(',')[1];
                
                toast.loading('Analizando imagen...', { id: 'image-analysis' });
                
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: {
                        parts: [
                            { inlineData: { data: base64Data, mimeType: file.type } },
                            { text: "Analiza esta imagen de comida. Identifica qué es y estima sus calorías y macronutrientes (proteína, carbohidratos, grasas, azúcar). Responde en formato JSON: { \"name\": \"...\", \"calories\": 0, \"protein\": 0, \"carbs\": 0, \"fats\": 0, \"sugar\": 0 }" }
                        ]
                    }
                });

                const text = response.text;
                try {
                    const result = JSON.parse(cleanJsonResponse(text));
                    
                    setFoodManagerModal({
                        isOpen: true,
                        name: result.name || 'Alimento detectado',
                        calories: result.calories || 0,
                        protein: result.protein || 0,
                        carbs: result.carbs || 0,
                        fats: result.fats || 0,
                        sugar: result.sugar || 0,
                        icon: 'Camera'
                    });
                    toast.success('Alimento detectado con éxito', { id: 'image-analysis' });
                } catch (parseError) {
                    console.error('Error parsing AI response:', text);
                    toast.error('No se pudo procesar el análisis de la imagen', { id: 'image-analysis' });
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error processing image:', error);
            handleGeminiError(error, 'Error al procesar la imagen');
            toast.dismiss('image-analysis');
        } finally {
            setIsProcessingImage(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) handleImageUpload(file);
            }
        }
    };

    const handleDropToAI = (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageUpload(files[0]);
        }
    };

    const handleSaveAvailableFood = () => {
        const { editingFood, name, calories, protein, carbs, fats, sugar, icon } = foodManagerModal;
        if (!name || calories < 0) return;

        const foodData = { name, calories, protein, carbs, fats, sugar, icon };
        let newFoods: FoodItem[];

        if (editingFood) {
            newFoods = availableFoods.map(f => 
                f.id === editingFood.id ? { ...f, ...foodData } : f
            );
        } else {
            const newFood: FoodItem = {
                id: Math.random().toString(36).substr(2, 9),
                ...foodData
            };
            newFoods = [...availableFoods, newFood];
        }
        
        setAvailableFoods(newFoods);
        updateNutritionData({ ...nutritionData, availableFoods: newFoods });
        // Immediate save to Supabase
        saveNutritionDataToSupabase();
        setFoodManagerModal({ isOpen: false, name: '', calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, icon: 'Utensils' });
        toast.success(editingFood ? 'Alimento actualizado' : 'Alimento añadido');
    };

    const deleteAvailableFood = (id: string) => {
        const newFoods = availableFoods.filter(f => f.id !== id);
        setAvailableFoods(newFoods);
        updateNutritionData({ ...nutritionData, availableFoods: newFoods });
        // Immediate save to Supabase
        saveNutritionDataToSupabase();
        toast.success('Alimento eliminado');
    };

    const handleSaveFood = () => {
        if (!foodModal.food) return;

        const qty = foodModal.quantity;
        const description = foodModal.description;
        const newConsumedFoods = [...consumedFoods];

        if (foodModal.index !== undefined) {
            // Editing existing
            const oldItem = newConsumedFoods[foodModal.index];
            newConsumedFoods[foodModal.index] = { ...oldItem, quantity: qty, description: description || undefined };
        } else {
            // Adding new
            const existingIndex = newConsumedFoods.findIndex(cf => cf.food.id === foodModal.food!.id);
            if (existingIndex >= 0) {
                newConsumedFoods[existingIndex] = { 
                    ...newConsumedFoods[existingIndex], 
                    quantity: newConsumedFoods[existingIndex].quantity + qty,
                    description: description || newConsumedFoods[existingIndex].description
                };
            } else {
                newConsumedFoods.push({ food: foodModal.food, quantity: qty, description: description || undefined });
            }
        }

        const totalCalories = newConsumedFoods.reduce((sum, cf) => sum + (cf.food.calories * cf.quantity), 0);

        updateLogMultiple({ 
            consumedFoods: newConsumedFoods, 
            calories: totalCalories 
        });
        setFoodModal({ isOpen: false, quantity: 1, description: '' });
    };

    const resetConsumedFoods = () => {
        setIsResetModalOpen(true);
    };

    const confirmReset = () => {
        updateLogMultiple({ 
            consumedFoods: [], 
            calories: 0,
            meals: '',
            waterIntake: 0,
            sleepHours: 0,
            sleepTime: '',
            wakeTime: '',
            activities: [],
            steps: 0
        });
        setIsResetModalOpen(false);
        toast.success('Día reseteado con éxito');
    };

    const removeConsumedFood = (index: number) => {
        const newConsumedFoods = consumedFoods.filter((_, i) => i !== index);
        const totalCalories = newConsumedFoods.reduce((sum, cf) => sum + (cf.food.calories * cf.quantity), 0);
        updateLogMultiple({
            consumedFoods: newConsumedFoods,
            calories: totalCalories
        });
    };

    const editConsumedFood = (index: number) => {
        const item = consumedFoods[index];
        setFoodModal({
            isOpen: true,
            food: item.food,
            index,
            quantity: item.quantity,
            description: item.description || ''
        });
    };

    const addMoreConsumedFood = (index: number) => {
        const newConsumedFoods = [...consumedFoods];
        newConsumedFoods[index] = { ...newConsumedFoods[index], quantity: newConsumedFoods[index].quantity + 1 };
        const totalCalories = newConsumedFoods.reduce((sum, cf) => sum + (cf.food.calories * cf.quantity), 0);
        updateLogMultiple({
            consumedFoods: newConsumedFoods,
            calories: totalCalories
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <h2 className="text-2xl font-bold text-white">Plan de Comidas Semanal</h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsMealPlanChatModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-emerald-900/20">
                        <MessageSquare size={16} /> Ajustar Plan
                    </button>
                    <button onClick={analyzeNutrition} disabled={isAnalyzing} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-purple-900/20">
                        {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />} Análisis
                    </button>
                </div>
            </div>
            
            {/* Meal Plan Chat Modal */}
            {isMealPlanChatModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-800/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <MessageSquare className="text-emerald-400" size={20} /> Ajustar Plan Semanal con IA
                            </h3>
                            <button onClick={() => setIsMealPlanChatModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {(nutritionData?.mealPlanChatHistory || []).map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {(!nutritionData?.mealPlanChatHistory || nutritionData.mealPlanChatHistory.length === 0) && (
                                <div className="text-center text-zinc-500 text-sm py-8 flex flex-col items-center gap-3">
                                    <MessageSquare size={48} className="text-zinc-700" />
                                    <p>¿No te gusta alguna comida? ¿Quieres más proteínas?</p>
                                    <p>Pídeselo a la IA. También puedes decirle qué alimentos no te gustan para que los guarde en tus preferencias.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/10 bg-zinc-800/50 flex gap-2">
                            <input 
                                type="text"
                                value={mealPlanQuestion}
                                onChange={(e) => setMealPlanQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isMealPlanChatting && mealPlanQuestion.trim() && chatWithMealPlan()}
                                placeholder="Ej: Cambia la cena del martes por algo con pollo..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                            />
                            <button 
                                onClick={chatWithMealPlan}
                                disabled={isMealPlanChatting || !mealPlanQuestion.trim()}
                                className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isMealPlanChatting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Modal */}
            {aiAnalysis && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-800/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Brain className="text-emerald-400" size={20} /> Análisis y Recomendaciones
                            </h3>
                            <button onClick={() => setAiAnalysis(null)} className="text-zinc-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar markdown-body text-zinc-300">
                            <Markdown>{aiAnalysis}</Markdown>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">¿Resetear Día?</h3>
                        <p className="text-zinc-400 mb-6 text-sm">Esta acción borrará todo el registro de comidas, agua, sueño y actividades de hoy. No se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsResetModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmReset}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-bold"
                            >
                                Sí, borrar todo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Food Manager Modal (Gear Icon) */}
            {foodManagerModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Settings className="text-zinc-400" /> 
                            {foodManagerModal.editingFood ? 'Editar Alimento Maestro' : 'Nuevo Alimento Maestro'}
                        </h3>
                        
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Nombre</label>
                                <input 
                                    type="text" 
                                    value={foodManagerModal.name}
                                    onChange={e => setFoodManagerModal(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                    placeholder="Nombre del alimento"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Calorías</label>
                                    <input 
                                        type="number" 
                                        value={foodManagerModal.calories}
                                        onChange={e => setFoodManagerModal(prev => ({ ...prev, calories: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Proteína (g)</label>
                                    <input 
                                        type="number" 
                                        value={foodManagerModal.protein}
                                        onChange={e => setFoodManagerModal(prev => ({ ...prev, protein: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Carbohidratos (g)</label>
                                    <input 
                                        type="number" 
                                        value={foodManagerModal.carbs}
                                        onChange={e => setFoodManagerModal(prev => ({ ...prev, carbs: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Grasas (g)</label>
                                    <input 
                                        type="number" 
                                        value={foodManagerModal.fats}
                                        onChange={e => setFoodManagerModal(prev => ({ ...prev, fats: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Azúcar Añadido (g)</label>
                                    <input 
                                        type="number" 
                                        value={foodManagerModal.sugar}
                                        onChange={e => setFoodManagerModal(prev => ({ ...prev, sugar: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Icono</label>
                                <div className="grid grid-cols-6 gap-2 bg-black/30 p-3 rounded-lg border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                                    {['Apple', 'Fish', 'Soup', 'Beef', 'Bird', 'Leaf', 'Egg', 'Cookie', 'Zap', 'Disc', 'CircleDot', 'Box', 'Coffee', 'Pizza', 'Sandwich', 'IceCream', 'Carrot', 'Grape', 'Banana', 'Cherry', 'Citrus', 'Milk', 'Wine', 'Beer', 'GlassWater', 'Utensils'].map(iconName => (
                                        <button 
                                            key={iconName}
                                            onClick={() => setFoodManagerModal(prev => ({ ...prev, icon: iconName }))}
                                            className={`p-2 rounded-lg transition-all ${foodManagerModal.icon === iconName ? 'bg-emerald-500 text-white' : 'hover:bg-white/10 text-zinc-400'}`}
                                        >
                                            <FoodIcon name={iconName} className="w-5 h-5" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setFoodManagerModal({ isOpen: false, name: '', calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, icon: 'Utensils' })}
                                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSaveAvailableFood}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Food Modal */}
            {foodModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Apple className="text-emerald-400" /> 
                            {foodModal.index !== undefined ? 'Editar Alimento' : 'Añadir Alimento'}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Alimento</label>
                                <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-white font-medium">
                                    {foodModal.food?.name}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Cantidad / Porciones</label>
                                <div className="flex items-center gap-4 bg-black/30 p-2 rounded-lg border border-white/5">
                                    <button 
                                        onClick={() => setFoodModal(prev => ({ ...prev, quantity: Math.max(0.5, prev.quantity - 0.5) }))}
                                        className="p-2 hover:bg-white/10 rounded-md text-white transition-colors"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <input 
                                        type="number" 
                                        value={foodModal.quantity}
                                        onChange={e => setFoodModal(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                                        className="bg-transparent text-center text-xl font-bold text-white w-full outline-none"
                                    />
                                    <button 
                                        onClick={() => setFoodModal(prev => ({ ...prev, quantity: prev.quantity + 0.5 }))}
                                        className="p-2 hover:bg-white/10 rounded-md text-white transition-colors"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Descripción Nutricional (Opcional)</label>
                                <textarea 
                                    value={foodModal.description}
                                    onChange={e => setFoodModal(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-sm text-white h-20 resize-none focus:border-emerald-500/50 outline-none transition-colors"
                                    placeholder="Ej: Con salsa verde, sin sal, etc."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setFoodModal({ isOpen: false, quantity: 1, description: '' })}
                                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSaveFood}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium"
                                >
                                    {foodModal.index !== undefined ? 'Actualizar' : 'Añadir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-emerald-400">
                    <Apple /> Nutrición y Bienestar
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => fetchNutritionDataFromSupabase(true)}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors border border-white/5"
                        title="Cargar datos desde la nube"
                    >
                        <RefreshCcw size={18} className="text-emerald-400" />
                        Cargar Datos
                    </button>
                    <button 
                        onClick={() => saveNutritionDataToSupabase()}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        <Save size={18} />
                        Guardar Datos
                    </button>
                </div>
            </div>

            {/* Top Row: Calendar and Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendario Semanal */}
                <div className="lg:col-span-1 bg-zinc-900/80 border border-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ChevronLeft size={20} className="text-white" />
                        </button>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <CalendarIcon size={16} className="text-orange-400" /> Calendario
                        </h3>
                        <button onClick={() => changeWeek(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ChevronRight size={20} className="text-white" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {weekDates.map(date => {
                            const isSelected = date === selectedDate;
                            const isToday = date === todayStr;
                            const hasData = logs.some(l => l.date === date && (l.meals || l.activity || (l.consumedFoods && l.consumedFoods.length > 0)));
                            
                            return (
                                <button
                                    key={date}
                                    onClick={() => setSelectedDate(date)}
                                    className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                                        isSelected 
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                                            : 'bg-black/40 text-white/70 hover:bg-white/10'
                                    } ${isToday && !isSelected ? 'border border-orange-500/50' : 'border border-transparent'}`}
                                >
                                    <span className="text-[10px] font-medium uppercase mb-0.5">{getDayName(date)}</span>
                                    <span className="text-sm font-bold">{date.split('-')[2]}</span>
                                    {hasData && (
                                        <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-orange-400'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Perfil Personal */}
                <div className="lg:col-span-2 bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <User className="text-blue-400" /> Perfil Personal
                        </h3>
                        <button 
                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                            className="text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-1 rounded transition-colors"
                        >
                            {isEditingProfile ? 'Cerrar Edición' : 'Editar'}
                        </button>
                    </div>

                    {isEditingProfile ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            <div>
                                <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-wider">Edad</label>
                                <input type="number" value={profile.age || ''} onChange={e => handleUpdateProfile('age', parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-wider">Peso (kg)</label>
                                <input type="number" value={profile.weight || ''} onChange={e => handleUpdateProfile('weight', parseFloat(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-wider">Altura (cm)</label>
                                <input type="number" value={profile.height || ''} onChange={e => handleUpdateProfile('height', parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-wider">Género</label>
                                <select value={profile.gender || ''} onChange={e => handleUpdateProfile('gender', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none transition-colors">
                                    <option value="">...</option>
                                    <option value="male">M</option>
                                    <option value="female">F</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-wider">Actividad</label>
                                <select value={profile.activityLevel || ''} onChange={e => handleUpdateProfile('activityLevel', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none transition-colors">
                                    <option value="sedentary">Sed</option>
                                    <option value="light">Lig</option>
                                    <option value="moderate">Mod</option>
                                    <option value="active">Act</option>
                                    <option value="very_active">V.Act</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-wider">Objetivo</label>
                                <select value={profile.goal || ''} onChange={e => handleUpdateProfile('goal', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none transition-colors">
                                    <option value="lose">Bajar</option>
                                    <option value="maintain">Mant</option>
                                    <option value="gain">Subir</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-white/50 mb-1 uppercase tracking-wider">Meta Kcal</label>
                                <input type="number" value={profile.calorieGoal || ''} onChange={e => handleUpdateProfile('calorieGoal', parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" placeholder="Auto" />
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar pb-2">
                            <div className="flex gap-4 min-w-max">
                                <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Edad</span>
                                    <span className="text-white font-bold">{profile.age || '--'} años</span>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Peso</span>
                                    <span className="text-white font-bold">{profile.weight || '--'} kg</span>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Altura</span>
                                    <span className="text-white font-bold">{profile.height || '--'} cm</span>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Género</span>
                                    <span className="text-white font-bold capitalize">{profile.gender === 'male' ? 'M' : profile.gender === 'female' ? 'F' : '--'}</span>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Actividad</span>
                                    <span className="text-white font-bold capitalize">{profile.activityLevel || '--'}</span>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Objetivo</span>
                                    <span className="text-white font-bold capitalize">{profile.goal || '--'}</span>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Meta Kcal</span>
                                    <span className="text-orange-400 font-bold">{profile.calorieGoal || '--'} kcal</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Middle Row: Available Foods, Registro Diario, Detalles del Día */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 flex-1 min-h-0">
                {/* Available Foods */}
                <div 
                    className="lg:col-span-3 bg-zinc-900/80 border border-white/10 rounded-xl p-4 flex flex-col min-h-0"
                    onDrop={(e) => {
                        const mealData = e.dataTransfer.getData('meal');
                        if (mealData) {
                            const meal = JSON.parse(mealData);
                            const newFood: FoodItem = {
                                id: Math.random().toString(36).substr(2, 9),
                                name: meal.food,
                                calories: 0,
                                icon: 'Utensils'
                            };
                            const newFoods = [...availableFoods, newFood];
                            setAvailableFoods(newFoods);
                            updateNutritionData({ ...nutritionData, availableFoods: newFoods });
                            saveNutritionDataToSupabase();
                            toast.success('Alimento añadido a disponibles');
                        }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Apple size={20} className="text-emerald-400" /> Alimentos
                        </h3>
                        <button 
                            onClick={() => setFoodManagerModal({ isOpen: true, name: '', calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, icon: 'Utensils' })}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 transition-colors"
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
                        {sortedAvailableFoods.map(food => (
                            <div 
                                key={food.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, food)}
                                className="bg-zinc-800/50 p-2 rounded-xl cursor-grab text-white border border-white/5 hover:border-emerald-500/50 transition-all flex flex-col group hover:scale-[1.01] active:scale-95 relative"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-500/10 rounded-lg shrink-0">
                                        <FoodIcon name={food.icon} className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-bold text-sm leading-tight break-words">{food.name}</span>
                                        <span className="text-xs text-zinc-500">{food.calories} kcal</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(food.id);
                                            }}
                                            className={`p-1 rounded-full transition-colors ${food.isFavorite ? 'text-red-500' : 'text-zinc-600 hover:text-red-400'}`}
                                        >
                                            <Heart size={14} fill={food.isFavorite ? 'currentColor' : 'none'} />
                                        </button>
                                        
                                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveFood(food.id, 'up'); }}
                                                className="p-0.5 hover:bg-white/10 rounded text-zinc-400"
                                            >
                                                <ChevronUp size={10} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveFood(food.id, 'down'); }}
                                                className="p-0.5 hover:bg-white/10 rounded text-zinc-400"
                                            >
                                                <ChevronDown size={10} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteAvailableFood(food.id);
                                                }}
                                                className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={8} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFoodManagerModal({
                                                        isOpen: true,
                                                        editingFood: food,
                                                        name: food.name,
                                                        calories: food.calories,
                                                        protein: food.protein || 0,
                                                        carbs: food.carbs || 0,
                                                        fats: food.fats || 0,
                                                        sugar: food.sugar || 0,
                                                        icon: food.icon || 'Utensils'
                                                    });
                                                }}
                                                className="p-1 hover:bg-blue-500/20 rounded text-blue-400"
                                                title="Editar"
                                            >
                                                <Edit2 size={8} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-3 text-center italic">Arrastra para agregar</p>
                </div>

                {/* Registro Diario */}
                <div className="lg:col-span-5 space-y-6 min-h-0">
                    <div 
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="bg-zinc-900/80 border-2 border-dashed border-emerald-500/20 rounded-xl p-6 min-h-[500px]"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <PlusCircle className="text-emerald-400" /> Registro Diario
                            </h3>
                            {consumedFoods.length > 0 && (
                                <button 
                                    onClick={resetConsumedFoods}
                                    className="flex items-center gap-1 text-sm font-bold bg-red-600/10 text-red-400 hover:bg-red-600/20 px-4 py-2 rounded-lg transition-colors border border-red-600/20"
                                >
                                    <RefreshCcw size={16} /> Resetear Día
                                </button>
                            )}
                        </div>

                        {/* Consumed Foods List */}
                        <div className="space-y-3 mb-8">
                            {consumedFoods.length === 0 ? (
                                <div className="text-center py-12 border border-white/5 rounded-xl bg-black/20">
                                    <Apple size={40} className="mx-auto text-zinc-700 mb-3 opacity-20" />
                                    <p className="text-zinc-500 text-sm">No has registrado alimentos hoy</p>
                                    <p className="text-zinc-600 text-xs mt-1">Arrastra alimentos aquí para comenzar</p>
                                </div>
                            ) : (
                                consumedFoods.map((cf, index) => (
                                    <div 
                                        key={index}
                                        className="group relative bg-zinc-800/30 border border-white/5 p-4 rounded-xl hover:bg-zinc-800/50 transition-all"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1 p-2.5 bg-emerald-500/10 rounded-xl">
                                                    <FoodIcon name={cf.food.icon} className="w-6 h-6 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-lg text-white">{cf.food.name}</h4>
                                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                                                            x{cf.quantity}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* More nutritional data below the name */}
                                                    <div className="flex flex-wrap gap-4 mt-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Proteína</span>
                                                            <span className="text-sm font-bold text-emerald-400">{(cf.food.protein || 0) * cf.quantity}g</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Carbohidratos</span>
                                                            <span className="text-sm font-bold text-blue-400">{(cf.food.carbs || 0) * cf.quantity}g</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Grasas</span>
                                                            <span className="text-sm font-bold text-orange-400">{(cf.food.fats || 0) * cf.quantity}g</span>
                                                        </div>
                                                        {cf.food.sugar !== undefined && cf.food.sugar > 0 && (
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Azúcar</span>
                                                                <span className="text-sm font-bold text-red-400">{(cf.food.sugar || 0) * cf.quantity}g</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {cf.description && (
                                                        <p className="text-xs text-zinc-400 mt-3 italic bg-black/20 p-2 rounded-lg border border-white/5">{cf.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-emerald-400">{(cf.food.calories * cf.quantity).toFixed(0)}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">kcal totales</p>
                                                <p className="text-[10px] text-zinc-600 mt-1">{cf.food.calories} kcal/ud</p>
                                            </div>
                                        </div>
                                        
                                        {/* Actions Overlay */}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => addMoreConsumedFood(index)}
                                                className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 rounded-lg transition-colors"
                                                title="Añadir más"
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button 
                                                onClick={() => editConsumedFood(index)}
                                                className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => removeConsumedFood(index)}
                                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Detalles del Día (Vertical) */}
                <div className="lg:col-span-2 bg-zinc-900/80 border border-white/10 rounded-xl p-6 flex flex-col space-y-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-orange-400" /> Detalles
                    </h3>

                    <div className="flex flex-col items-center space-y-8 py-4 bg-black/40 rounded-2xl border border-white/5">
                        {/* Water */}
                        <div className="flex flex-col items-center gap-3">
                            <WaterBottle current={selectedLog.waterIntake || 0} max={3} />
                            <div className="text-center">
                                <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Agua (L)</span>
                                <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-white/5">
                                    <button onClick={() => addWater(-0.25)} className="p-1.5 hover:bg-white/10 rounded-md text-white transition-colors"><Minus size={14} /></button>
                                    <span className="text-sm font-bold text-white w-10 text-center">{selectedLog.waterIntake || 0}</span>
                                    <button onClick={() => addWater(0.25)} className="p-1.5 hover:bg-white/10 rounded-md text-white transition-colors"><Plus size={14} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="w-24 h-px bg-white/5"></div>

                        {/* Calories */}
                        <div className="flex flex-col items-center gap-3">
                            <Battery current={selectedLog.calories || 0} max={profile.calorieGoal || 2000} />
                            <div className="text-center">
                                <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Calorías</span>
                                <div className="bg-zinc-900/50 px-3 py-1 rounded-lg border border-white/5">
                                    <span className="text-sm font-bold text-white">{selectedLog.calories || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-24 h-px bg-white/5"></div>

                        {/* Sleep */}
                        <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
                            <div className="relative">
                                <Moon className="w-12 h-12 text-indigo-400" />
                                <div className="absolute -top-1 -right-1 bg-indigo-500 text-xs font-bold px-2 py-0.5 rounded-full border border-black">
                                    {selectedLog.sleepHours || 0}h
                                </div>
                            </div>
                            <div className="text-center w-full">
                                <span className="block text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Horario de Sueño</span>
                                <div className="flex flex-col gap-3 w-full">
                                    <div className="flex items-center justify-between gap-2 bg-zinc-900/80 p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Moon size={16} className="text-indigo-400" />
                                            <span className="text-xs text-zinc-400 font-medium">Dormir</span>
                                        </div>
                                        <input 
                                            type="time" 
                                            value={selectedLog.sleepTime || ''} 
                                            onChange={(e) => handleUpdateSleep('sleepTime', e.target.value)}
                                            className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-2 bg-zinc-900/80 p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-amber-400" />
                                            <span className="text-xs text-zinc-400 font-medium">Despertar</span>
                                        </div>
                                        <input 
                                            type="time" 
                                            value={selectedLog.wakeTime || ''} 
                                            onChange={(e) => handleUpdateSleep('wakeTime', e.target.value)}
                                            className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-24 h-px bg-white/5"></div>

                        {/* Activity Progress */}
                        <div className="flex flex-col items-center gap-3">
                            <div className={`relative transition-transform duration-500 ${(selectedLog.activities?.length || 0) > 0 ? 'animate-spin-slow' : ''}`}>
                                <Activity className="w-12 h-12 text-orange-400" />
                                <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full"></div>
                                <div 
                                    className="absolute inset-0 border-2 border-orange-500 rounded-full transition-all duration-1000"
                                    style={{ 
                                        clipPath: `inset(${100 - Math.min(100, (selectedLog.activities?.length || 0) * 25)}% 0 0 0)`,
                                        opacity: (selectedLog.activities?.length || 0) > 0 ? 1 : 0
                                    }}
                                ></div>
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Actividad</span>
                                <div className="flex flex-col gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="¿Qué hiciste hoy?"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addActivity('otro', (e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                        className="bg-zinc-900/50 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-orange-500/50 transition-all w-full mb-1"
                                    />
                                    <div className="flex flex-wrap justify-center gap-1 max-w-[120px]">
                                        {['pesas', 'correr', 'natacion', 'montaña', 'otro'].map((type) => (
                                            <button 
                                                key={type}
                                                onClick={() => addActivity(type as any)}
                                                className="p-1.5 bg-zinc-900/50 hover:bg-white/10 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-all"
                                                title={type}
                                            >
                                                <ActivityIcon type={type} className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-24 h-px bg-white/5"></div>

                        {/* Activities List */}
                        <div className="w-full px-2 space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {selectedLog.activities?.map((act, idx) => (
                                <div key={idx} className="bg-black/40 p-3 rounded-xl border border-white/10 flex flex-col gap-3 group relative hover:border-orange-500/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ActivityIcon type={act.type || 'otro'} className="w-5 h-5 text-orange-400" />
                                            <span className="text-sm font-bold text-white uppercase truncate max-w-[120px]">{act.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {act.caloriesBurned !== undefined && (
                                                <span className="text-[10px] font-black text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded border border-orange-400/20">
                                                    {act.caloriesBurned} KCAL
                                                </span>
                                            )}
                                            <button onClick={() => removeActivity(idx)} className="text-zinc-500 hover:text-red-400 transition-colors p-1">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {act.unit === 'min' ? (
                                            <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-2 rounded-lg border border-white/5 flex-1">
                                                <Timer size={14} className="text-zinc-400" />
                                                <input 
                                                    type="number" 
                                                    value={act.duration} 
                                                    onChange={(e) => updateActivityValue(idx, 'duration', parseInt(e.target.value))}
                                                    className="bg-transparent text-sm font-bold text-white w-full outline-none"
                                                />
                                                <span className="text-xs text-zinc-500 font-medium">min</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-2 rounded-lg border border-white/5 flex-1">
                                                <MapPin size={14} className="text-zinc-400" />
                                                <input 
                                                    type="number" 
                                                    value={act.distance} 
                                                    onChange={(e) => updateActivityValue(idx, 'distance', parseFloat(e.target.value))}
                                                    className="bg-transparent text-sm font-bold text-white w-full outline-none"
                                                />
                                                <span className="text-xs text-zinc-500 font-medium">km</span>
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => updateActivityUnit(idx, act.unit === 'min' ? 'km' : 'min')}
                                            className="px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors uppercase font-bold"
                                        >
                                            {act.unit}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Footprints className="text-emerald-400 w-5 h-5" />
                                <span className="text-sm font-bold text-white uppercase tracking-wider">Pasos</span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10 flex-1 max-w-[150px]">
                                <input 
                                    type="number" 
                                    value={selectedLog.steps || ''} 
                                    onChange={(e) => handleUpdateLog('steps', parseInt(e.target.value) || 0)}
                                    className="bg-transparent text-lg font-bold text-white w-full outline-none text-right"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-4 border-t border-white/5">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-zinc-500">Progreso de Calorías</span>
                            <span className="text-yellow-400 font-bold">{Math.round(((selectedLog.calories || 0) / (profile.calorieGoal || 2000)) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                                style={{ width: `${Math.min(100, ((selectedLog.calories || 0) / (profile.calorieGoal || 2000)) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Text Notes */}
                    <div className="flex-1 flex flex-col space-y-2">
                        <div className="flex items-center justify-between text-sm text-zinc-400">
                            <div className="flex items-center gap-2">
                                <Edit2 size={16} />
                                <span>Notas</span>
                            </div>
                        </div>
                        <textarea 
                            value={selectedLog.meals || ''} 
                            onChange={e => handleUpdateLog('meals', e.target.value)} 
                            className="w-full flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white resize-none focus:border-orange-500/50 outline-none transition-all placeholder:text-zinc-700 shadow-inner min-h-[150px]"
                            placeholder="Notas sobre tu día..."
                        />
                    </div>
                </div>
            </div>

            {/* Weekly Meal Plan Section */}
            <div className="mt-12 bg-zinc-900/80 border border-white/10 rounded-2xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <CalendarIcon className="text-emerald-400 w-8 h-8" /> Plan de Comidas Semanal
                        </h2>
                        <p className="text-zinc-400 mt-2">Sugerencias inteligentes basadas en tu perfil y objetivos.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex flex-wrap gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/5">
                            <button 
                                onClick={() => setIsMealPlanChatModalOpen(true)}
                                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg transition-colors border border-emerald-500/20 text-sm font-bold"
                            >
                                <MessageSquare size={16} /> Ajustar Plan
                            </button>
                            <button 
                                onClick={analyzeNutrition}
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg transition-colors border border-purple-500/20 text-sm font-bold disabled:opacity-50"
                            >
                                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                                Análisis IA
                            </button>
                            <button 
                                onClick={copyMealPlanAsImage}
                                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors border border-white/10 text-sm font-bold"
                                title="Copiar plan como imagen"
                            >
                                <Camera size={16} /> Compartir
                            </button>
                        </div>
                        <button 
                            onClick={generateWeeklyMealPlan}
                            disabled={isGeneratingMealPlan}
                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-black font-bold py-2 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
                        >
                            {isGeneratingMealPlan ? <Loader2 className="animate-spin" /> : <RefreshCcw size={16} />}
                            {isGeneratingMealPlan ? 'Generando...' : 'Nuevo Plan'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5 mb-6">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-2">Exclusiones:</span>
                    <div className="flex flex-wrap gap-1">
                        {exclusions.map((ex, idx) => (
                            <span key={idx} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                                {ex}
                                <button onClick={() => setExclusions(exclusions.filter((_, i) => i !== idx))}><X size={10} /></button>
                            </span>
                        ))}
                        <button 
                            onClick={() => {
                                const food = prompt('Alimento a excluir:');
                                if (food) setExclusions([...exclusions, food]);
                            }}
                            className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                            + Añadir
                        </button>
                    </div>
                </div>

                <div ref={mealPlanRef} id="meal-plan-capture-container" className="p-4 bg-zinc-950 rounded-2xl border border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        {(nutritionData?.weeklyMealPlan || []).map((day, idx) => {
                            const meals = day.meals || [];
                            const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
                            const calorieGoal = profile.calorieGoal || 2000;
                            const diff = totalCalories - calorieGoal;
                            const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                            const displayDay = (day.date && day.date.includes('-')) ? getDayName(day.date) : (day.date || dayNames[idx % 7]);

                            return (
                                <div key={idx} className="bg-black/40 rounded-xl border border-white/5 overflow-hidden flex flex-col">
                                    <div className="bg-emerald-500/20 p-4 border-b border-white/10 flex flex-col items-center justify-center min-h-[100px]">
                                        <h3 className="text-2xl font-black text-white text-center uppercase tracking-tighter drop-shadow-md leading-none mb-2">
                                            {displayDay}
                                        </h3>
                                        <div className="text-xl text-white/90 text-center font-bold drop-shadow-lg flex items-baseline gap-1">
                                            {totalCalories} <span className="text-[10px] uppercase opacity-60">kcal</span>
                                        </div>
                                    </div>
                                    <div className="p-3 space-y-4 flex-1">
                                        {meals.map((meal, mIdx) => (
                                            <div 
                                                key={mIdx} 
                                                className="space-y-1.5 cursor-grab bg-black/20 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 relative"
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('meal', JSON.stringify(meal));
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, meal)}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{meal.type}</span>
                                                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">{meal.time}</span>
                                                </div>
                                                <p className="text-sm font-bold text-white leading-tight">{meal.food}</p>
                                                <p className="text-[11px] text-zinc-400 italic">{meal.quantity}</p>
                                                {meal.calories && (
                                                    <p className="text-[10px] text-orange-400 font-medium mt-1">
                                                        {meal.calories} kcal
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-white/5 bg-black/20 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] text-zinc-500 uppercase font-bold">Meta</span>
                                            <span className="text-xs text-zinc-300 font-bold">{calorieGoal} kcal</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1 border-t border-white/5">
                                            <span className="text-[9px] text-zinc-500 uppercase font-bold">Diferencia</span>
                                            <span className={`text-xs font-black ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                                {diff > 0 ? `+${diff}` : diff} kcal
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(!nutritionData?.weeklyMealPlan || nutritionData.weeklyMealPlan.length === 0) && (
                            <div className="col-span-full py-20 text-center bg-black/20 rounded-xl border border-dashed border-white/10">
                                <Utensils className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-500 font-medium">No hay un plan generado aún.</p>
                                <p className="text-zinc-600 text-sm">Haz clic en "Generar Plan Semanal" para comenzar.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Análisis de IA (Hidden, triggered by button) */}
            <div 
                onPaste={handlePaste}
                onDrop={handleDropToAI}
                onDragOver={(e) => e.preventDefault()}
                className="hidden"
            >
                {isProcessingImage && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                        <p className="text-white font-bold">Procesando imagen...</p>
                    </div>
                )}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Brain className="text-purple-400" /> Análisis y Recomendaciones
                    </h3>
                    <button 
                        onClick={analyzeNutrition}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
                        Analizar mi día
                    </button>
                </div>

                <div className="flex-1 bg-black/30 border border-white/5 rounded-lg p-4 overflow-y-auto mb-4">
                    {aiAnalysis ? (
                        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10">
                            <Markdown>{aiAnalysis}</Markdown>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-white/40">
                            <Brain size={48} className="mb-4 opacity-20" />
                            <p>Llena tu perfil y registro diario, luego presiona "Analizar mi día" para recibir feedback personalizado de la IA.</p>
                        </div>
                    )}
                </div>

                {/* Question Input */}
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && analyzeNutrition()}
                        placeholder="Escribe tus dudas o preguntas aquí..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500/50 outline-none transition-all"
                    />
                    <button 
                        onClick={analyzeNutrition}
                        disabled={isAnalyzing || !userQuestion.trim()}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-50 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button 
                        onClick={() => {
                            addMealToLog(contextMenu.meal);
                            closeContextMenu();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors flex items-center gap-2"
                    >
                        <Plus size={14} /> Añadir a comidas de hoy
                    </button>
                </div>
            )}
        </div>
    );
};

export default Nutricion;

