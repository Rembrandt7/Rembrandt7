import React from 'react';
import { Box, Wrench, Layout, Sparkles, Move, Star, Shield, Zap, Package, Key, Sword, Globe, ChevronRight, Settings, Database, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

import ThreeDCalculator from './ThreeDCalculator';

/* ─────────────────────────────────────────────────────────────────
   DATA - Audit and Corrected from PDF (stl_pack.pdf)
───────────────────────────────────────────────────────────────── */
const tools = [
  { name: 'Meshy (IA)', href: 'https://www.meshy.ai/workspace', icon: <Box size={16} /> },
  { name: 'Hitem3D', href: 'https://www.hitem3d.ai/create', icon: <Move size={16} /> },
  { name: 'Rendair', href: 'https://app.rendair.ai/generate/image', icon: <Layout size={16} /> },
  { name: 'Gridfinity', href: 'https://gridfinitygenerator.com/es/editor', icon: <Database size={16} /> },
  { name: 'Multibuild', href: 'https://multibuild.io/parts', icon: <Settings size={16} /> },
  { name: 'MyMiniFactory', href: 'https://www.myminifactory.com/', icon: <Sparkles size={16} /> },
  { name: 'Thangs', href: 'https://thangs.com/', icon: <Wrench size={16} /> },
  { name: 'Thingiverse', href: 'https://www.thingiverse.com/', icon: <Box size={16} /> },
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
    <div className="w-16 h-16 rounded-2xl mb-2 bg-no-repeat shadow-lg border border-white/10 overflow-hidden flex items-center justify-center bg-gray-900/50">
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
  <div className={`p-5 rounded-2xl border ${group.color} transition-all ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-bold text-lg text-white flex items-center gap-2 uppercase tracking-tighter">
        {group.title}
        <div className="h-px flex-1 bg-white/10 min-w-[20px] ml-4" />
      </h3>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
      {group.items.map((item, iIdx) => (
        <motion.a
          key={iIdx}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
          className="flex flex-col items-center p-3 bg-white/5 border border-white/5 rounded-2xl group transition-all text-center h-full relative overflow-hidden"
        >
          <CustomIcon type={item.type as any} index={item.index} />
          <span className="text-[10px] font-bold text-gray-400 group-hover:text-white uppercase tracking-wider line-clamp-2 mt-1 px-1">
            {item.name}
          </span>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink size={10} className="text-blue-400" />
          </div>
        </motion.a>
      ))}
    </div>
  </div>
);

const ThreeDPrinting: React.FC = () => {
  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-blue-600/10 p-6 rounded-3xl border border-blue-500/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30 shrink-0">
            <Box size={32} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Estudio 3D</h2>
            <p className="text-sm text-gray-400">Modelos 3D categorizados y optimizados.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {tools.map((tool, idx) => (
            <a
              key={idx}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-medium text-white transition-all hover:scale-105"
            >
              {tool.icon}
              {tool.name}
            </a>
          ))}
        </div>
      </div>

      {/* Calculator Section */}
      <ThreeDCalculator />

      {/* Main Grid Reorganized */}
      <div className="space-y-6">
        {/* Mega Pack - Full Width */}
        <GroupCard group={groups[0]} />

        {/* Anime + Articulados - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-8">
              <GroupCard group={groups[1]} />
           </div>
           <div className="lg:col-span-4">
              <GroupCard group={groups[5]} />
           </div>
        </div>

        {/* Pokemon + Marvel/DC - Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-5"> {/* Pokémon narrower, 5 cols instead of 6 or 8 */}
              <GroupCard group={groups[2]} />
           </div>
           <div className="lg:col-span-7">
              <GroupCard group={groups[4]} />
           </div>
        </div>

        {/* Máscaras + Llaveros - Row 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-6">
              <GroupCard group={groups[3]} />
           </div>
           <div className="lg:col-span-6">
              <GroupCard group={groups[6]} />
           </div>
        </div>

        {/* Star Wars - Full Width */}
        <GroupCard group={groups[7]} />
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
