import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Plus, Trash2, Edit3, Save, Download, Upload, 
  Search, Maximize2, Minimize2, Music, Volume2, Type, FastForward, 
  ChevronUp, ChevronDown, Check, X, RefreshCw, Eye, Sparkles, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

export interface SongItem {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  content: string; // Lyrics and chords
  scrollSpeed: number; // 1 to 10
  fontSize: number; // in pixels
  createdAt: number;
  updatedAt: number;
}

const SAMPLE_SONGS: SongItem[] = [
  {
    id: 'sample-1',
    title: 'De Música Ligera',
    artist: 'Soda Stereo',
    key: 'Sim / Bm',
    scrollSpeed: 3,
    fontSize: 20,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
    content: `[Intro]
Bm    G    D    A
Bm    G    D    A

[Verso 1]
Bm          G          D          A
Ella durmió al calor de las masas
Bm          G          D          A
Y yo desperté queriendo soñarla
Bm          G          D          A
Algún tiempo atrás pensé en escribirle
Bm          G          D          A
Que nunca sorteé las trampas del amor

[Coro]
Bm       G      D       A
De aquel amor de música ligera
Bm       G      D       A
Nada nos libra, nada más queda
Bm       G      D       A
De aquel amor de música ligera
Bm       G      D       A
Nada nos libra, nada más queda

[Verso 2]
Bm          G          D          A
No le envié cenizas de rosas
Bm          G          D          A
Ni quise evitar un roce secreto
Bm          G          D          A
Algún tiempo atrás pensé en escribirle
Bm          G          D          A
Que nunca sorteé las trampas del amor

[Coro]
Bm       G      D       A
De aquel amor de música ligera
Bm       G      D       A
Nada nos libra, nada más queda
Bm       G      D       A
De aquel amor de música ligera
Bm       G      D       A
Nada nos libra, nada más queda

[Solo]
Bm    G    D    A
Bm    G    D    A

[Final]
Bm       G      D       A
Nada más queda...
Bm       G      D       A
Nada más queda...
Bm       G      D       A
Nada más queda...`
  },
  {
    id: 'sample-2',
    title: 'Flaca',
    artist: 'Andrés Calamaro',
    key: 'Sol / G',
    scrollSpeed: 2,
    fontSize: 20,
    createdAt: Date.now() - 200000,
    updatedAt: Date.now() - 200000,
    content: `[Intro]
G    B7    Em    C    G    D    G    D

[Verso 1]
G                 B7
Flaca, no me claves
                 Em
Tus puñales por la espalda
   C                    G
Tan profundo, no me duelen
       D              G     D
No me hacen más que daño

[Verso 2]
G                  B7
Lejos, en el centro
                    Em
De la tierra, las raíces
     C                G
Del amor donde estaban
       D             G     D
Quedarán para siempre

[Coro]
G                       B7
Entre el no me olvides tan poco
                   Em
Y el jamás te vi pasar
    C           G           D             G    D
Por esas despedidas que no dejan de doler

[Outro]
G    B7    Em    C    G    D    G`
  }
];

// Semitone chords for transposition
const CHORDS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORDS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHORDS_LATIN = ['DO', 'DO#', 'RE', 'RE#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'];

// Heuristic to detect if a line is a chord line (like in LaCuerda.net)
const isChordLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return false; // section header like [Coro]

  // Tokenize words
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;

  // Regex to match chord notation (Anglo or Latin)
  const chordRegex = /^(A|B|C|D|E|F|G|Do|Re|Mi|Fa|Sol|La|Si)(b|#)?(m|maj|min|aug|dim|sus[24]?|[0-9]+)?(\/[A-G](b|#)?)?$/i;

  let chordCount = 0;
  for (const token of tokens) {
    const clean = token.replace(/[\(\)\[\],;]/g, '');
    if (chordRegex.test(clean)) {
      chordCount++;
    }
  }

  // If more than 60% of tokens are chords, it's a chord line
  return chordCount / tokens.length >= 0.6;
};

// Transpose a single chord string
const transposeChord = (chord: string, steps: number): string => {
  const match = chord.match(/^([A-G](?:#|b)?|Do|Re|Mi|Fa|Sol|La|Si)(.*)$/i);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  // Check latin
  const latinIdx = CHORDS_LATIN.findIndex(c => c.toLowerCase() === root.toLowerCase());
  if (latinIdx !== -1) {
    const newIdx = (latinIdx + steps + 12) % 12;
    return CHORDS_LATIN[newIdx] + suffix;
  }

  // Check Anglo sharp
  let angloIdx = CHORDS_SHARP.findIndex(c => c.toLowerCase() === root.toLowerCase());
  if (angloIdx === -1) {
    angloIdx = CHORDS_FLAT.findIndex(c => c.toLowerCase() === root.toLowerCase());
  }

  if (angloIdx !== -1) {
    const newIdx = (angloIdx + steps + 12) % 12;
    return CHORDS_SHARP[newIdx] + suffix;
  }

  return chord;
};

// Transpose whole text by semitone steps
const transposeText = (text: string, steps: number): string => {
  if (steps === 0) return text;
  return text.split('\n').map(line => {
    if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
      return line;
    }
    if (isChordLine(line)) {
      return line.replace(/(\b[A-G](?:#|b)?(?:m|maj|min|aug|dim|sus[24]?|[0-9]+)?(?:\/[A-G](?:#|b)?)?|\b(?:Do|Re|Mi|Fa|Sol|La|Si)(?:#)?(?:m|maj|min|aug|dim|sus[24]?|[0-9]+)?)\b/gi, (match) => {
        return transposeChord(match, steps);
      });
    }
    // Also transpose bracketed chords inside lyrics: [Am] -> [Bm]
    return line.replace(/\[([A-G](?:#|b)?.*?|Do.*?|Re.*?|Mi.*?|Fa.*?|Sol.*?|La.*?|Si.*?)\]/gi, (match, inner) => {
      return `[${transposeChord(inner, steps)}]`;
    });
  }).join('\n');
};

const TeleprompterTab: React.FC = () => {
  // Songs collection
  const [songs, setSongs] = useState<SongItem[]>(() => {
    const local = localStorage.getItem('rembrandt_musica_json');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed.songs) && parsed.songs.length > 0) return parsed.songs;
      } catch (e) {}
    }
    return SAMPLE_SONGS;
  });

  const [activeSongId, setActiveSongId] = useState<string>(() => {
    return songs[0]?.id || '';
  });

  // Teleprompter Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(3); // 1 to 10
  const [fontSize, setFontSize] = useState<number>(22); // in px
  const [transposition, setTransposition] = useState<number>(0); // semitone steps (-6 to +6)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Loading & Saving states
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isSavingRemote, setIsSavingRemote] = useState(false);

  // Edit / Add modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongItem | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalArtist, setModalArtist] = useState('');
  const [modalKey, setModalKey] = useState('');
  const [modalContent, setModalContent] = useState('');

  // Refs for scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active song reference
  const currentSong = useMemo(() => {
    return songs.find(s => s.id === activeSongId) || songs[0] || null;
  }, [songs, activeSongId]);

  // Synchronize song specific preferences when switching song
  useEffect(() => {
    if (currentSong) {
      if (currentSong.scrollSpeed) setScrollSpeed(currentSong.scrollSpeed);
      if (currentSong.fontSize) setFontSize(currentSong.fontSize);
      setTransposition(0); // reset transposition on song change
      setIsPlaying(false);
    }
  }, [activeSongId]);

  // Save to localStorage whenever songs change
  useEffect(() => {
    localStorage.setItem('rembrandt_musica_json', JSON.stringify({ version: 1, updatedAt: Date.now(), songs }));
  }, [songs]);

  // Sync from Supabase on mount
  const fetchMusicaFromSupabase = useCallback(async (silent = false) => {
    setIsLoadingRemote(true);
    try {
      const { data, error } = await supabase.storage.from('savejson').download('musica.json');
      if (error) {
        if (error.message?.includes('Object not found') || (error as any).name === 'StorageApiError') {
          // If remote doesn't exist yet, upload the initial songs
          saveMusicaToSupabase(songs, true);
          return;
        }
        throw error;
      }

      if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        if (Array.isArray(json.songs) && json.songs.length > 0) {
          setSongs(json.songs);
          if (!silent) toast.success('Canciones cargadas desde Supabase (musica.json)');
        }
      }
    } catch (err) {
      console.error('Error fetching musica.json:', err);
      if (!silent) toast.error('Error al sincronizar musica.json');
    } finally {
      setIsLoadingRemote(false);
    }
  }, [songs]);

  useEffect(() => {
    fetchMusicaFromSupabase(true);
  }, []);

  // Save to Supabase storage
  const saveMusicaToSupabase = async (songsList = songs, silent = false) => {
    setIsSavingRemote(true);
    try {
      const payload = {
        version: 1,
        updatedAt: Date.now(),
        songs: songsList,
      };
      const jsonString = JSON.stringify(payload, null, 2);

      const { error } = await supabase.storage.from('savejson').upload('musica.json', jsonString, {
        upsert: true,
        contentType: 'application/json',
      });

      if (error) throw error;
      if (!silent) toast.success('Canciones guardadas en Supabase (musica.json)');
    } catch (err) {
      console.error('Error saving musica.json:', err);
      if (!silent) toast.error('Error al guardar en Supabase');
    } finally {
      setIsSavingRemote(false);
    }
  };

  // Continuous smooth auto-scroll loop with sub-pixel accumulator
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const container = scrollContainerRef.current;
    if (container) {
      // If user starts play while already at bottom, auto-rewind to top
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 25) {
        container.scrollTop = 0;
      }
      scrollPosRef.current = container.scrollTop;
    }

    let lastTime = performance.now();

    const scrollStep = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      const container = scrollContainerRef.current;
      if (container) {
        // Speed formula: scrollSpeed 1 to 10
        // Speed 1 = 15 px/s, Speed 3 = 45 px/s, Speed 5 = 80 px/s, Speed 10 = 180 px/s
        const pixelsPerSecond = Math.max(12, scrollSpeed * 15);
        const moveAmount = (pixelsPerSecond * Math.min(delta, 100)) / 1000;

        scrollPosRef.current += moveAmount;
        container.scrollTop = scrollPosRef.current;

        // Check if reached the end (only if scrollable)
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll > 30 && container.scrollTop >= maxScroll - 5) {
          setIsPlaying(false);
          toast.info('Fin de la canción alcanzado');
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(scrollStep);
    };

    animFrameRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, scrollSpeed]);

  // Spacebar hotkey to toggle Play / Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditModalOpen || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setScrollSpeed(prev => Math.min(10, prev + 0.5));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setScrollSpeed(prev => Math.max(0.5, prev - 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      fullScreenContainerRef.current?.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleRestartScroll = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      scrollPosRef.current = 0;
    }
  };

  // Song CRUD
  const handleOpenAddModal = () => {
    setEditingSong(null);
    setModalTitle('');
    setModalArtist('');
    setModalKey('');
    setModalContent('');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (song: SongItem) => {
    setEditingSong(song);
    setModalTitle(song.title);
    setModalArtist(song.artist || '');
    setModalKey(song.key || '');
    setModalContent(song.content);
    setIsEditModalOpen(true);
  };

  const handleSaveModalSong = () => {
    if (!modalTitle.trim()) {
      toast.error('El título de la canción es obligatorio');
      return;
    }
    if (!modalContent.trim()) {
      toast.error('Pega o escribe la letra y acordes de la canción');
      return;
    }

    let updatedList: SongItem[];

    if (editingSong) {
      updatedList = songs.map(s => s.id === editingSong.id ? {
        ...s,
        title: modalTitle.trim(),
        artist: modalArtist.trim() || undefined,
        key: modalKey.trim() || undefined,
        content: modalContent,
        updatedAt: Date.now(),
      } : s);
      toast.success('Canción actualizada');
    } else {
      const newSong: SongItem = {
        id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: modalTitle.trim(),
        artist: modalArtist.trim() || undefined,
        key: modalKey.trim() || undefined,
        content: modalContent,
        scrollSpeed: 3,
        fontSize: 22,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updatedList = [newSong, ...songs];
      setActiveSongId(newSong.id);
      toast.success('Canción guardada');
    }

    setSongs(updatedList);
    saveMusicaToSupabase(updatedList, true);
    setIsEditModalOpen(false);
  };

  const handleDeleteSong = (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${title}" de tu repertorio?`)) return;
    const updated = songs.filter(s => s.id !== id);
    setSongs(updated);
    if (activeSongId === id && updated.length > 0) {
      setActiveSongId(updated[0].id);
    }
    saveMusicaToSupabase(updated, true);
    toast.success('Canción eliminada');
  };

  // Export & Import JSON
  const handleExportJson = () => {
    const payload = { version: 1, updatedAt: Date.now(), songs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'musica.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Archivo musica.json descargado');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.songs) && parsed.songs.length > 0) {
          setSongs(parsed.songs);
          setActiveSongId(parsed.songs[0].id);
          await saveMusicaToSupabase(parsed.songs, true);
          toast.success(`${parsed.songs.length} canciones importadas con éxito`);
        } else if (Array.isArray(parsed)) {
          setSongs(parsed);
          await saveMusicaToSupabase(parsed, true);
          toast.success(`${parsed.length} canciones importadas con éxito`);
        } else {
          toast.error('El archivo no contiene un repertorio de canciones válido');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al procesar el archivo .json');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered song list
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase();
    return songs.filter(s => 
      s.title.toLowerCase().includes(q) || 
      (s.artist && s.artist.toLowerCase().includes(q)) ||
      (s.key && s.key.toLowerCase().includes(q))
    );
  }, [songs, searchQuery]);

  // Transposed lyrics content for active song
  const renderedContent = useMemo(() => {
    if (!currentSong) return '';
    return transposeText(currentSong.content, transposition);
  }, [currentSong, transposition]);

  return (
    <div 
      ref={fullScreenContainerRef}
      className={`w-full flex flex-col transition-all select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black h-screen' : 'h-[calc(100vh-140px)] min-h-[500px]'
      }`}
    >
      {/* TOP BAR / CONTROLS */}
      <div className="bg-zinc-900/90 border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-2">
          {!isFullscreen && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white transition-colors"
              title={isSidebarOpen ? "Ocultar repertorio" : "Mostrar repertorio"}
            >
              <Music size={16} className="text-amber-400" />
            </button>
          )}

          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate max-w-[200px] sm:max-w-xs">
              {currentSong ? currentSong.title : 'Teleprompter de Música'}
            </h2>
            {currentSong?.artist && (
              <p className="text-[11px] text-zinc-400 truncate">{currentSong.artist} {currentSong.key ? `• Tono: ${currentSong.key}` : ''}</p>
            )}
          </div>

          {currentSong && (
            <button
              onClick={() => handleOpenEditModal(currentSong)}
              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-500/30 shadow-sm ml-1"
              title="Editar o pegar letra y acordes"
            >
              <Edit3 size={13} />
              <span>Editar / Pegar</span>
            </button>
          )}
        </div>

        {/* TELEPROMPTER FLOATING ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play / Pause Primary Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30 animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
            title="Espacio para Reproducir / Pausar"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'Pausar' : 'Iniciar'}</span>
          </button>

          {/* Restart to top */}
          <button
            onClick={handleRestartScroll}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-colors"
            title="Reiniciar al inicio"
          >
            <RotateCcw size={15} />
          </button>

          {/* Speed Controls */}
          <div className="flex items-center gap-1 bg-zinc-950/80 px-2 py-1 rounded-xl border border-white/10">
            <span className="text-[10px] text-zinc-400 font-bold uppercase hidden sm:inline">Vel:</span>
            <button
              onClick={() => setScrollSpeed(prev => Math.max(0.5, prev - 0.5))}
              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
              title="Disminuir velocidad"
            >
              <ChevronDown size={14} />
            </button>
            <span className="font-mono text-xs font-bold text-amber-400 w-7 text-center">{scrollSpeed}x</span>
            <button
              onClick={() => setScrollSpeed(prev => Math.min(10, prev + 0.5))}
              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
              title="Aumentar velocidad"
            >
              <ChevronUp size={14} />
            </button>
          </div>

          {/* Font Size Controls */}
          <div className="flex items-center gap-1 bg-zinc-950/80 px-2 py-1 rounded-xl border border-white/10">
            <Type size={13} className="text-zinc-400 hidden sm:inline" />
            <button
              onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white text-xs font-bold"
              title="Reducir tamaño de letra"
            >
              A-
            </button>
            <span className="font-mono text-xs font-bold text-white w-6 text-center">{fontSize}</span>
            <button
              onClick={() => setFontSize(prev => Math.min(42, prev + 2))}
              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white text-xs font-bold"
              title="Aumentar tamaño de letra"
            >
              A+
            </button>
          </div>

          {/* Transposition (+1 / -1) */}
          <div className="flex items-center gap-1 bg-zinc-950/80 px-2 py-1 rounded-xl border border-white/10">
            <span className="text-[10px] text-zinc-400 font-bold hidden sm:inline">Tono:</span>
            <button
              onClick={() => setTransposition(prev => Math.max(-6, prev - 1))}
              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white text-xs font-bold"
              title="Bajar medio tono"
            >
              -½
            </button>
            <span className={`font-mono text-xs font-bold w-6 text-center ${transposition !== 0 ? 'text-purple-400 font-black' : 'text-zinc-400'}`}>
              {transposition > 0 ? `+${transposition}` : transposition}
            </span>
            <button
              onClick={() => setTransposition(prev => Math.min(6, prev + 1))}
              className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white text-xs font-bold"
              title="Subir medio tono"
            >
              +½
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-colors"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* MAIN BODY: SIDEBAR + PROMPTER CANVAS */}
      <div className="flex flex-grow overflow-hidden relative">
        {/* REPERTORIO / SONGS DRAWER */}
        <AnimatePresence>
          {isSidebarOpen && !isFullscreen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full bg-zinc-950/95 border-r border-white/10 flex flex-col shrink-0 overflow-hidden z-10"
            >
              {/* Header & Add Button */}
              <div className="p-3 border-b border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Music size={14} className="text-amber-400" />
                    Canciones ({songs.length})
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => saveMusicaToSupabase(songs, false)}
                      disabled={isSavingRemote}
                      className="p-1 hover:bg-white/10 rounded text-emerald-400 transition-colors"
                      title="Guardar archivo musica.json en Supabase"
                    >
                      <Save size={14} className={isSavingRemote ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => fetchMusicaFromSupabase(false)}
                      disabled={isLoadingRemote}
                      className="p-1 hover:bg-white/10 rounded text-blue-400 transition-colors"
                      title="Sincronizar desde Supabase"
                    >
                      <RefreshCw size={14} className={isLoadingRemote ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={handleExportJson}
                      className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Descargar musica.json"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Importar musica.json"
                    >
                      <Upload size={14} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImportJson} 
                      accept=".json" 
                      className="hidden" 
                    />
                  </div>
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar canción..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={handleOpenAddModal}
                  className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>Nueva Canción</span>
                </button>
              </div>

              {/* Songs List */}
              <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredSongs.map((song) => {
                  const isSelected = song.id === activeSongId;
                  return (
                    <div
                      key={song.id}
                      onClick={() => setActiveSongId(song.id)}
                      className={`group p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200' 
                          : 'hover:bg-white/5 border border-transparent text-zinc-300'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <p className="font-bold text-xs truncate text-white">{song.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{song.artist || 'Sin artista'} {song.key ? `• ${song.key}` : ''}</p>
                      </div>

                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(song);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
                          title="Editar letra y acordes"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSong(song.id, song.title);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredSongs.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    No se encontraron canciones.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROMPTER CANVAS (SCROLLING TEXT WITH CHORDS) */}
        <div 
          ref={scrollContainerRef}
          onScroll={() => {
            if (scrollContainerRef.current && !isPlaying) {
              scrollPosRef.current = scrollContainerRef.current.scrollTop;
            }
          }}
          onWheel={() => {
            if (scrollContainerRef.current) {
              scrollPosRef.current = scrollContainerRef.current.scrollTop;
            }
          }}
          onTouchMove={() => {
            if (scrollContainerRef.current) {
              scrollPosRef.current = scrollContainerRef.current.scrollTop;
            }
          }}
          className="flex-grow overflow-y-auto h-full bg-black/90 p-6 sm:p-12 md:p-16 custom-scrollbar text-white flex flex-col items-center"
          style={{
            scrollBehavior: isPlaying ? 'auto' : 'smooth',
          }}
        >
          {currentSong ? (
            <div className="w-full max-w-4xl py-6 pb-96 space-y-4">
              {/* Song Header */}
              <div className="text-center pb-8 border-b border-white/10 space-y-1">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-400 tracking-tight">
                  {currentSong.title}
                </h1>
                {currentSong.artist && (
                  <p className="text-base sm:text-lg text-zinc-400 font-medium">
                    {currentSong.artist}
                  </p>
                )}
                {currentSong.key && (
                  <span className="inline-block mt-2 text-xs font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                    Tono Base: {currentSong.key} {transposition !== 0 && `(Transp: ${transposition > 0 ? `+${transposition}` : transposition})`}
                  </span>
                )}
              </div>

              {/* Rendered Lyrics & Chords (LaCuerda.net style) */}
              <div 
                className="font-mono leading-relaxed select-text tracking-wide whitespace-pre"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
              >
                {renderedContent.split('\n').map((line, index) => {
                  const trimmed = line.trim();

                  // Section headers like [Coro], [Intro], [Verso 1]
                  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    return (
                      <div 
                        key={index} 
                        className="text-purple-400 font-sans font-bold text-sm sm:text-base mt-6 mb-2 tracking-wider uppercase opacity-90 border-l-2 border-purple-500 pl-2 select-none"
                      >
                        {trimmed.slice(1, -1)}
                      </div>
                    );
                  }

                  // Chord Line (Render in bright amber / gold)
                  if (isChordLine(line)) {
                    return (
                      <div 
                        key={index} 
                        className="text-amber-400 font-bold select-all tracking-normal"
                        style={{ color: '#fbbf24', textShadow: '0 0 12px rgba(251, 191, 36, 0.25)' }}
                      >
                        {line || ' '}
                      </div>
                    );
                  }

                  // Lyric Line (Render in bright white)
                  return (
                    <div 
                      key={index} 
                      className="text-zinc-100 font-normal tracking-wide"
                    >
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
              <Music size={48} className="opacity-30" />
              <p className="text-sm">Selecciona una canción o agrega una nueva para empezar.</p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs rounded-xl"
              >
                + Agregar Canción
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD / EDIT SONG */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/15 rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4 shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Music className="text-amber-400" size={18} />
                  {editingSong ? 'Editar Canción' : 'Nueva Canción para Teleprompter'}
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-grow">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                      Título de la Canción *
                    </label>
                    <input
                      type="text"
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      placeholder="Ej. De Música Ligera..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                      Tono / Clave
                    </label>
                    <input
                      type="text"
                      value={modalKey}
                      onChange={(e) => setModalKey(e.target.value)}
                      placeholder="Ej. Bm, Sol, Do..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Artista / Banda
                  </label>
                  <input
                    type="text"
                    value={modalArtist}
                    onChange={(e) => setModalArtist(e.target.value)}
                    placeholder="Ej. Soda Stereo, Andrés Calamaro..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-zinc-300 uppercase">
                      Letra con Acordes (Formato LaCuerda.net) *
                    </label>
                    <span className="text-[11px] text-amber-400/80">
                      💡 Pon los acordes en su propia línea justo sobre la palabra
                    </span>
                  </div>
                  <textarea
                    value={modalContent}
                    onChange={(e) => setModalContent(e.target.value)}
                    placeholder={`[Intro]\nBm    G    D    A\n\n[Verso 1]\nBm          G          D          A\nElla durmió al calor de las masas...\n\n[Coro]\nBm       G      D       A\nDe aquel amor de música ligera...`}
                    rows={12}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-amber-500 custom-scrollbar whitespace-pre"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalSong}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  Guardar Canción
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeleprompterTab;
