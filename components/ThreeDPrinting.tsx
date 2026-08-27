import React from 'react';
import { Box, Wrench, Layout, Sparkles, Move, Star, Shield, Zap, Package, Key, Sword, Globe, ChevronRight, Settings, Database, ExternalLink, Cloud } from 'lucide-react';
import { motion } from 'motion/react';

import ThreeDCalculator from './ThreeDCalculator';

/* ─────────────────────────────────────────────────────────────────
   DATA - Audit and Corrected from PDF (stl_pack.pdf)
───────────────────────────────────────────────────────────────── */
const libraries = [
  { name: 'MakerWorld', href: 'https://makerworld.com/es', icon: <Package size={20} className="text-teal-400" />, color: 'from-teal-500/20 to-transparent' },
  { name: 'Creality', href: 'https://www.crealitycloud.com/es', icon: <Cloud size={20} className="text-cyan-400" />, color: 'from-cyan-500/20 to-transparent' },
  { name: 'Printables', href: 'https://www.printables.com/?lang=es', icon: <Globe size={20} className="text-orange-500" />, color: 'from-orange-600/20 to-transparent' },
  { name: 'Anycubic', href: 'https://www.makeronline.com/en/', icon: <Layout size={20} className="text-emerald-400" />, color: 'from-emerald-500/20 to-transparent' },
  { name: 'Thingiverse', href: 'https://www.thingiverse.com/', icon: <Box size={20} className="text-blue-500" />, color: 'from-blue-600/20 to-transparent' },
  { name: 'MyMiniFactory', href: 'https://www.myminifactory.com/', icon: <Sparkles size={20} className="text-pink-400" />, color: 'from-pink-500/20 to-transparent' },
  { name: 'Thangs', href: 'https://thangs.com/', icon: <Wrench size={20} className="text-cyan-400" />, color: 'from-cyan-500/20 to-transparent' },
];

const tools3D = [
  { name: 'Meshy (IA)', href: 'https://www.meshy.ai/workspace', icon: <Sparkles size={20} className="text-purple-400" />, color: 'from-purple-500/20 to-transparent' },
  { name: 'Hitem3D', href: 'https://www.hitem3d.ai/create', icon: <Move size={20} className="text-blue-400" />, color: 'from-blue-500/20 to-transparent' },
  { name: 'Dora', href: 'https://www.3dkoneko.com/dora', icon: <Sparkles size={20} className="text-rose-400" />, color: 'from-rose-500/20 to-transparent' },
  { name: 'Gridfinity', href: 'https://gridfinitygenerator.com/es/editor', icon: <Database size={20} className="text-orange-400" />, color: 'from-orange-500/20 to-transparent' },
  { name: 'Multibuild', href: 'https://multibuild.io/parts', icon: <Settings size={20} className="text-indigo-400" />, color: 'from-indigo-500/20 to-transparent' },
  { 
    name: 'Fusion', 
    href: 'https://fusion.online.autodesk.com/', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-5 h-5">
        <defs>
          <linearGradient id="fusion-3d-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9B00"/>
            <stop offset="50%" stopColor="#FF5100"/>
            <stop offset="100%" stopColor="#D41400"/>
          </linearGradient>
          <linearGradient id="fusion-3d-2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D41400"/>
            <stop offset="100%" stopColor="#FF5100"/>
          </linearGradient>
          <linearGradient id="fusion-3d-3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF3300"/>
            <stop offset="100%" stopColor="#5A0000"/>
          </linearGradient>
        </defs>
        <polygon points="50,2 98,24 98,76 50,98 2,76 2,24" fill="url(#fusion-3d-1)" opacity="0.2" stroke="url(#fusion-3d-1)" strokeWidth="1.5"/>
        <polygon points="8,8 92,8 92,26 34,26 34,46 82,46 82,64 34,64 34,92 8,92" fill="url(#fusion-3d-1)"/>
        <polygon points="92,8 92,26 97,21 97,3" fill="url(#fusion-3d-2)"/>
        <polygon points="82,46 82,64 87,59 87,41" fill="url(#fusion-3d-2)"/>
        <polygon points="8,92 34,92 34,97 8,97" fill="url(#fusion-3d-2)"/>
        <polygon points="8,8 34,26 34,97 8,92" fill="url(#fusion-3d-3)" opacity="0.3"/>
      </svg>
    ), 
    color: 'from-orange-500/20 to-transparent' 
  },
  { name: 'Bumpmesh', href: 'https://bumpmesh.com/', icon: <Zap size={20} className="text-amber-400" />, color: 'from-amber-500/20 to-transparent' },
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-blue-600/10 p-6 rounded-3xl border border-blue-500/20 shadow-xl">
        <div className="flex items-center gap-4 shrink-0">
          <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30 shrink-0">
            <Globe size={32} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Librerías</h2>
            <p className="text-sm text-gray-400">Plataformas y repositorios de modelos 3D.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {libraries.map((tool, idx) => (
            <a
              key={idx}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center p-2.5 bg-gradient-to-b ${tool.color} border border-white/10 rounded-2xl transition-all hover:scale-105 hover:border-white/30 group aspect-[4/5] min-w-[75px]`}
            >
              <div className="mb-2 p-1.5 bg-gray-900/50 rounded-xl group-hover:scale-110 transition-transform">
                {tool.icon}
              </div>
              <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase tracking-wider text-center line-clamp-1">
                {tool.name}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Herramientas 3D */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-purple-600/10 p-6 rounded-3xl border border-purple-500/20 shadow-xl">
        <div className="flex items-center gap-4 shrink-0">
          <div className="p-3 bg-purple-600/20 rounded-2xl border border-purple-500/30 shrink-0">
            <Wrench size={32} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Herramientas 3D</h2>
            <p className="text-sm text-gray-400">Generadores con IA y editores de modelos.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {tools3D.map((tool, idx) => (
            <a
              key={idx}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center p-2.5 bg-gradient-to-b ${tool.color} border border-white/10 rounded-2xl transition-all hover:scale-105 hover:border-white/30 group aspect-[4/5] min-w-[75px]`}
            >
              <div className="mb-2 p-1.5 bg-gray-900/50 rounded-xl group-hover:scale-110 transition-transform">
                {tool.icon}
              </div>
              <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase tracking-wider text-center line-clamp-1">
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
