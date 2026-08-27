import React from 'react';
import { Box, Wrench, Layout, Sparkles, Move, Star, Shield, Zap, Package, Key, Sword, Globe, ChevronRight, Settings, Database, ExternalLink, Cloud } from 'lucide-react';
import { motion } from 'motion/react';

import ThreeDCalculator from './ThreeDCalculator';

/* ─────────────────────────────────────────────────────────────────
   DATA - Audit and Corrected from PDF (stl_pack.pdf)
───────────────────────────────────────────────────────────────── */
const libraries = [
  { 
    name: 'MakerWorld', 
    href: 'https://makerworld.com/es', 
    icon: (
      <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    ), 
    color: 'from-teal-500/20 to-transparent' 
  },
  { 
    name: 'Creality', 
    href: 'https://www.crealitycloud.com/es', 
    icon: <Cloud size={20} className="text-cyan-400" />, 
    color: 'from-cyan-500/20 to-transparent' 
  },
  { 
    name: 'Anycubic', 
    href: 'https://www.makeronline.com/en/', 
    icon: (
      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ), 
    color: 'from-emerald-500/20 to-transparent' 
  },
  { 
    name: 'Cults3D', 
    href: 'https://cults3d.com/es', 
    icon: (
      <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
      </svg>
    ), 
    color: 'from-purple-500/20 to-transparent' 
  },
  { 
    name: 'Printables', 
    href: 'https://www.printables.com/?lang=es', 
    icon: <Globe size={20} className="text-orange-500" />, 
    color: 'from-orange-600/20 to-transparent' 
  },
  { 
    name: 'Thingiverse', 
    href: 'https://www.thingiverse.com/', 
    icon: (
      <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    ), 
    color: 'from-blue-600/20 to-transparent' 
  },
  { 
    name: 'MyMiniFactory', 
    href: 'https://www.myminifactory.com/', 
    icon: (
      <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 19h20L12 2zm0 4.83L18.17 17H5.83L12 6.83z"/>
      </svg>
    ), 
    color: 'from-green-500/20 to-transparent' 
  },
  { 
    name: 'Thangs', 
    href: 'https://thangs.com/', 
    icon: (
      <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 15.18l7 3.5v-7.18l-7-3.5v7.18zm16 0l-7 3.5v-7.18l7-3.5v7.18z"/>
      </svg>
    ), 
    color: 'from-orange-500/20 to-transparent' 
  },
];

const tools3D = [
  { 
    name: 'Meshy (IA)', 
    href: 'https://www.meshy.ai/workspace', 
    icon: (
      <img 
        src="data:image/jpeg;base64,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" 
        alt="Meshy" 
        className="w-5 h-5 rounded object-cover" 
      />
    ), 
    color: 'from-purple-500/20 to-transparent' 
  },
  { 
    name: 'Hitem3D', 
    href: 'https://www.hitem3d.ai/create', 
    icon: (
      <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l-8-4 8-4 8 4-8 4zm-8 3l8 4 8-4v3l-8 4-8-4v-3z"/>
      </svg>
    ), 
    color: 'from-blue-500/20 to-transparent' 
  },
  { 
    name: 'Tripo', 
    href: 'https://studio.tripo3d.ai/', 
    icon: (
      <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L1 21h22L12 2zm0 4.5l6.5 11.5h-13L12 6.5z"/>
      </svg>
    ), 
    color: 'from-yellow-500/20 to-transparent' 
  },
  { 
    name: 'Dora', 
    href: 'https://www.3dkoneko.com/dora', 
    icon: <Sparkles size={20} className="text-rose-400" />, 
    color: 'from-rose-500/20 to-transparent' 
  },
  { 
    name: 'Gridfinity', 
    href: 'https://gridfinitygenerator.com/es/editor', 
    icon: <Database size={20} className="text-orange-400" />, 
    color: 'from-orange-500/20 to-transparent' 
  },
  { 
    name: 'Multibuild', 
    href: 'https://multibuild.io/parts', 
    icon: <Settings size={20} className="text-indigo-400" />, 
    color: 'from-indigo-500/20 to-transparent' 
  },
  { 
    name: 'Fusion', 
    href: 'https://fusion.online.autodesk.com/', 
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <rect width="24" height="24" rx="5" fill="#FF5100"/>
        <path d="M6 5h12v3.5h-8.5v3h7v3.5h-7v4H6V5z" fill="#FFFFFF"/>
      </svg>
    ), 
    color: 'from-orange-500/20 to-transparent' 
  },
  { 
    name: 'Bumpmesh', 
    href: 'https://bumpmesh.com/', 
    icon: <Zap size={20} className="text-amber-400" />, 
    color: 'from-amber-500/20 to-transparent' 
  },
];

// Helper to create reliable Drive links
const driveFolder = (id: string) => `https://drive.google.com/drive/folders/${id}`;
const driveFile = (id: string) => `https://drive.google.com/file/d/${id}/view`;

const groups = [
  {
    title: '📦 Mega Pack +90k STL',
    color: 'border-blue-500/30 bg-blue-500/5',
    items: [
      { name: 'Chibis', href: driveFolder('1v1JHiMbE8JFwIkmCI2aLKlnDxGwD6D_N'), type: 'generic', index: 0 },
      { name: 'Religión', href: driveFolder('14nLnWtrL1cnJLcIV1xcwc0Rehxp6bzWD'), type: 'generic', index: 1 },
      { name: 'Mitología', href: driveFolder('1euKsVcW6BuXK1XimljiM0oeXan1Spkey'), type: 'generic', index: 2 },
      { name: 'Utensilios', href: driveFolder('10dV0-82opQyBdgAJkwZ-PiI8XCdW4s7a'), type: 'generic', index: 3 },
      { name: 'Mascotas', href: driveFolder('1LuA1mOMl1PfeCdPGpYZKO0ilEZ5CKlSY'), type: 'mascot' },
      { name: 'RPGs', href: driveFolder('1_m41NbX1Egds3axAfIQhkfPJjM3SwaZP'), type: 'rpg' },
      { name: 'Macetas', href: 'https://drive.google.com/drive/folders/1RHE32dUp-L4h7d5KlOjE07abXhtS0jLP?usp=sharing', type: 'maceta' },
      { name: 'Miniaturas', href: driveFolder('1Micxz6i0i6kEVuue8Ha_b3Sr7zNLKfJj'), type: 'miniatura' },
      { name: 'Cosplay', href: driveFolder('1sYd7S-fIfUN1kpE7qvxstUVoj0m_DKLz'), type: 'generic', index: 4 },
      { name: 'Videojuegos', href: driveFolder('1vqRv1-4xkiaf583-WKQWBg-EAsyNviro'), type: 'juegos' },
    ]
  },
  {
    title: '🧧 Anime Legends',
    color: 'border-red-500/30 bg-red-500/5',
    items: [
      { name: 'Naruto', href: driveFolder('1ChDou43EWqaU0wloTnACD8rUErTaPZhD'), type: 'naruto' },
      { name: 'One Piece', href: driveFolder('1KyoIKGqLxY8a3H_s8OaBz_DAGm-aXo9V'), type: 'onepiece' },
      { name: 'Dragon Ball', href: driveFolder('1N9RjA7Z8x4r_rlVcFpP6XAvi7bjjB3Nh'), type: 'dragonball' },
      { name: 'A. Titan', href: driveFolder('1JPd2P8hJXkoRHC4cYl_MNLDXGkb2AcNR'), type: 'generic', index: 11 },
      { name: 'D. Slayer', href: driveFolder('1crKk1vc-EAOOnXbWGj6InCF1RPOnNWbA'), type: 'generic', index: 12 },
      { name: 'Pack 01', href: driveFolder('1uPiQgI3sq3izeMFFlTkG4wDz69H0KmVw'), type: 'generic', index: 5 },
      { name: 'Pack 02', href: driveFolder('1NOz5K0FAGurD9Evotfsqn7e-E58GtSIu'), type: 'generic', index: 5 },
    ]
  },
  {
    title: '🐭 Pokémon World',
    color: 'border-yellow-500/30 bg-yellow-500/5',
    items: [
      { name: 'Gen 1', href: driveFolder('1GbL3HUWAVo1wRmxFKR4Yyv_eO3gWpW1S'), type: 'pokemon' },
      { name: 'Gen 2', href: driveFolder('1zhcF-OuiwGbsH93p180J4ZhmmLF0NqmA'), type: 'pokemon' },
      { name: 'Gen 3', href: driveFolder('1wLUCqQZMt2uMUJj_pn31Qflns8ybqm0M'), type: 'pokemon' },
      { name: 'Gen 4', href: driveFolder('1AbtOC6nvDcPKO2LcD8I-1E6vhpWSVbhz'), type: 'pokemon' },
    ]
  },
  {
    title: '🕷️ Máscaras 3D',
    color: 'border-cyan-500/30 bg-cyan-500/5',
    items: [
      { name: 'Huntress', href: driveFolder('1TNr0BVIX77PRfMaA51ZAfA-EK2LJCWgv'), type: 'generic', index: 7 },
      { name: 'Spider 2099', href: driveFolder('1ucUwjfdE4SC3oAcD-f6FnGP07Etz-k79'), type: 'spiderman' },
      { name: 'Headpool', href: driveFolder('17rrxk01dq5x9AomHo2Y2Fcxo--ZyB1s4'), type: 'generic', index: 8 },
      { name: 'Pantera N.', href: driveFolder('17rrxk01dq5x9AomHo2Y2Fcxo--ZyB1s4'), type: 'generic', index: 16 },
      { name: 'Colección', href: driveFolder('1OWx_yq-BODAW3r-0qARMvnUu8lXUI0Dj'), type: 'generic', index: 16 },
      { name: 'Pack Plus', href: driveFolder('1FrxHMJ9zalZtBs9v_So-gVyD-8Oo7J2-'), type: 'generic', index: 16 },
    ]
  },
  {
    title: '🛡️ Marvel & DC Heroes',
    color: 'border-indigo-500/30 bg-indigo-500/5',
    items: [
      { name: 'Marvel 01', href: driveFolder('17g2yCPak1kuZWEabZPvkLDatX0g2ipft'), type: 'generic', index: 6 },
      { name: 'Marvel 02', href: driveFolder('1utqBNPeqvOx_QVb5wjGs1DBStzSULsAk'), type: 'generic', index: 6 },
      { name: 'Marvel 03', href: driveFolder('1PnPostJq7352wc6EsiSl2fYp1x7Ddp4'), type: 'generic', index: 6 },
      { name: 'DC Pack', href: driveFolder('1hVYaE_hIAV62nilZTlVeu2RMKuGcvV1t'), type: 'generic', index: 7 },
    ]
  },
  {
    title: '🔄 Articulados',
    color: 'border-green-500/30 bg-green-500/5',
    items: [
      { name: 'Personajes', href: driveFolder('1My5S21H3nCalAAMCuQhI02_fj27vgdkj'), type: 'generic', index: 17 },
      { name: 'Modelos', href: driveFolder('1m4VLV0bcEmprvAOektJ5rJvVcH7aSrIK'), type: 'generic', index: 17 },
    ]
  },
  {
    title: '🔑 Llaveros',
    color: 'border-pink-500/30 bg-pink-500/5',
    items: [
      { name: 'Perros', href: driveFolder('1fqkWXVL6Jk3rRMpw2ogQ83z5vIMjV1tx'), type: 'mascot' },
      { name: 'Vengadores', href: driveFolder('19gl2FMOZTKQJXV8-ZXtdOF5WUG0od88w'), type: 'generic', index: 5 },
      { name: 'Stitch', href: driveFolder('1mlxZx8nO8kn34hDr0RoKSXDEj4QAiPHd'), type: 'generic', index: 0 },
      { name: 'Xbox', href: driveFolder('1jvk9S6OojocB99eBtexX1193ManLmsRT'), type: 'juegos' },
      { name: 'Pack 01', href: driveFile('14pwIzlvshO2Ap8-jFvYLF_FBNuY1Jp_I'), type: 'generic', index: 19 },
      { name: 'Pack 02', href: 'https://chatgpt.com/g/g-68f64e0fc9f4819199626529c338431b-ecom-ads-landings-pro-venta-al-instante', type: 'generic', index: 19 },
    ]
  },
  {
    title: '⭐ Star Wars',
    color: 'border-orange-500/30 bg-orange-500/5',
    items: [
      { name: 'Baby Yoda', href: driveFolder('1J03z6Wab-j_Mu-T3rMOOTo5bucGtUdcW'), type: 'starwars', index: 1 },
      { name: 'C3PO', href: driveFolder('1CvLUJ-69FM3Fz-BOp8yvBINLiut--Fo0'), type: 'starwars', index: 2 },
      { name: 'Darth Vader', href: driveFolder('1sB-4bp4j7Izyg5_ozgiPFVXjk-L71BAG'), type: 'vader' },
      { name: 'Luke', href: driveFolder('1aqVl_a4emHGoZAR4lpF-jsXTXIEdNSZ9'), type: 'starwars', index: 2 },
      { name: 'Han Solo', href: driveFolder('1cm6C-LBHTevB_qpVzSO1v34g1aSWE8SE'), type: 'vader' },
      { name: 'R2D2', href: driveFolder('1ZFrWg9cQZT4K6feIsG92YpwOUOZqV-cF'), type: 'starwars', index: 1 },
      { name: 'Colección', href: driveFolder('15xPZcN7zhffGztwl9YWKmi0vVK6z0YSi'), type: 'vader' },
    ]
  },
];

// Icon mapping
const ICONS = {
  pokemon: "/pokemon_icon.png",
  naruto: "/naruto_icon.png",
  onepiece: "/one_piece_icon.png",
  dragonball: "/dragon_ball_icon.png",
  spiderman: "/spiderman_icon.png",
  maceta: "/maceta_icon.png",
  miniatura: "/miniatura_icon.png",
  mascot: "/mascot_icon.png",
  rpg: "/rpg_icon.png",
  juegos: "/juegos_icon.png",
  starwars: "/star_wars_icons.png",
  vader: "/vader_new.png",
  generic: "/stl_icons_sheet.png"
};

const CustomIcon = ({ type, src, index = 0 }: { type: keyof typeof ICONS, src?: string, index?: number }) => {
  let backgroundPos = "center";
  let backgroundSize = "cover";
  let url = src || ICONS[type];

  if (type === 'starwars') {
    backgroundSize = "300% auto";
    const x = (index % 3) * 50;
    backgroundPos = `${x}% center`;
  } else if (type === 'generic') {
    backgroundSize = "500% 400%";
    const x = (index % 5) * 25;
    const y = Math.floor(index / 5) * 33.33;
    backgroundPos = `${x}% ${y}%`;
  } else {
    backgroundSize = "contain";
    backgroundPos = "center";
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-no-repeat shadow-md border border-white/10 overflow-hidden flex items-center justify-center bg-gray-900/50 shrink-0">
      <div 
        className="w-full h-full transition-transform duration-500 group-hover:scale-110"
        style={{
          backgroundImage: `url(${url})`,
          backgroundPosition: backgroundPos,
          backgroundSize: backgroundSize,
          backgroundRepeat: 'no-repeat'
        }}
      />
    </div>
  );
};

const GroupCard = ({ group, className }: { group: typeof groups[0], className?: string }) => (
  <div className={`p-4 bg-slate-900/10 rounded-2xl border ${group.color} transition-all duration-300 hover:bg-slate-900/20 flex flex-col justify-between h-full ${className}`}>
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[10px] text-white flex items-center gap-2 uppercase tracking-widest opacity-80">
          {group.title}
          <div className="h-px flex-1 bg-white/5 min-w-[5px] ml-2" />
        </h3>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-4 gap-2">
        {group.items.map((item, iIdx) => (
          <motion.a
            key={iIdx}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
            className="flex flex-col items-center p-1 bg-white/5 border border-white/5 rounded-xl group transition-all text-center relative"
          >
            <CustomIcon type={item.type as any} index={item.index} />
            <span className="text-[8px] font-bold text-gray-500 group-hover:text-white uppercase tracking-tighter line-clamp-1 mt-1.5 w-full px-0.5">
              {item.name}
            </span>
            <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink size={6} className="text-blue-400" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  </div>
);

const ThreeDPrinting: React.FC = () => {
  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-20">
      {/* Librerías */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-blue-600/10 p-4 sm:p-5 rounded-2xl border border-blue-500/20 shadow-lg">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-blue-600/20 rounded-xl border border-blue-500/30 shrink-0">
            <Globe size={22} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Librerías</h2>
            <p className="text-xs text-gray-400">Plataformas y repositorios de modelos 3D.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 flex-1 xl:max-w-[75%]">
          {libraries.map((tool, idx) => (
            <a
              key={idx}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center p-2 bg-gradient-to-b ${tool.color} border border-white/10 rounded-2xl transition-all hover:scale-105 hover:border-white/30 group min-w-[65px] h-[78px] shadow-sm`}
            >
              <div className="mb-1.5 p-1 bg-gray-900/60 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center w-8 h-8 shrink-0">
                {tool.icon}
              </div>
              <span className="text-[9px] font-bold text-gray-300 group-hover:text-white uppercase tracking-wider text-center line-clamp-1 w-full px-0.5">
                {tool.name}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Herramientas 3D */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-purple-600/10 p-4 sm:p-5 rounded-2xl border border-purple-500/20 shadow-lg">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-purple-600/20 rounded-xl border border-purple-500/30 shrink-0">
            <Wrench size={22} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Herramientas 3D</h2>
            <p className="text-xs text-gray-400">Generadores con IA y editores de modelos.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 flex-1 xl:max-w-[75%]">
          {tools3D.map((tool, idx) => (
            <a
              key={idx}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center p-2 bg-gradient-to-b ${tool.color} border border-white/10 rounded-2xl transition-all hover:scale-105 hover:border-white/30 group min-w-[65px] h-[78px] shadow-sm`}
            >
              <div className="mb-1.5 p-1 bg-gray-900/60 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center w-8 h-8 shrink-0">
                {tool.icon}
              </div>
              <span className="text-[9px] font-bold text-gray-300 group-hover:text-white uppercase tracking-wider text-center line-clamp-1 w-full px-0.5">
                {tool.name}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Calculator Section */}
      <ThreeDCalculator />

      {/* Main Grid Reorganized - 4 Symmetrical Balanced Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Column 1 (Total: 12 items) */}
        <div className="flex flex-col gap-6">
          <GroupCard group={groups[0]} /> {/* Mega Pack: 10 items */}
          <GroupCard group={groups[5]} /> {/* Articulados: 2 items */}
        </div>

        {/* Column 2 (Total: 11 items) */}
        <div className="flex flex-col gap-6">
          <GroupCard group={groups[1]} /> {/* Anime Legends: 7 items */}
          <GroupCard group={groups[2]} /> {/* Pokémon World: 4 items */}
        </div>

        {/* Column 3 (Total: 11 items) */}
        <div className="flex flex-col gap-6">
          <GroupCard group={groups[7]} /> {/* Star Wars: 7 items */}
          <GroupCard group={groups[4]} /> {/* Marvel & DC: 4 items */}
        </div>

        {/* Column 4 (Total: 12 items) */}
        <div className="flex flex-col gap-6">
          <GroupCard group={groups[3]} /> {/* Máscaras 3D: 6 items */}
          <GroupCard group={groups[6]} /> {/* Llaveros: 6 items */}
        </div>
      </div>
      
      <div className="p-6 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl border border-white/10 text-center">
        <p className="text-sm text-gray-400">
          Recursos 3D optimizados para alta densidad de información.
        </p>
      </div>
    </div>
  );
};

export default ThreeDPrinting;
