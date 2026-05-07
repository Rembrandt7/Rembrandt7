import React from 'react';
import { Box, Wrench, Layout, Sparkles, Move, Star, Shield, Zap, Package, Key, Sword, Globe, ChevronRight, Settings, Database } from 'lucide-react';
import { motion } from 'motion/react';

/* ─────────────────────────────────────────────────────────────────
   DATA - Corrected from PDF Source & New Tools
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

// Icon mapping - Using individual high-quality images for NO SQUASHING
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

const CustomIcon = ({ type, src, index = 0 }: { type?: keyof typeof ICONS, src?: string, index?: number }) => {
  let backgroundPos = "center";
  let backgroundSize = "cover";
  let url = src || (type ? ICONS[type] : "/stl_icons_sheet.png");

  if (type === 'starwars') {
    // 3 items horizontally - Use contain to prevent squashing
    backgroundSize = "300% auto";
    const x = (index % 3) * 50;
    backgroundPos = `${x}% center`;
  } else if (type === 'vader') {
    backgroundSize = "contain";
    backgroundPos = "center";
  } else if (type === 'generic') {
    // 5x4 grid
    backgroundSize = "500% 400%";
    const x = (index % 5) * 25;
    const y = Math.floor(index / 5) * 33.33;
    backgroundPos = `${x}% ${y}%`;
  }

  return (
    <div 
      className="w-16 h-16 rounded-2xl mb-2 bg-no-repeat shadow-lg border border-white/10 overflow-hidden flex items-center justify-center bg-gray-900/50"
    >
      <div 
        className="w-full h-full"
        style={{ 
          backgroundImage: `url(${url})`,
          backgroundPosition: backgroundPos,
          backgroundSize: backgroundSize,
          imageRendering: 'auto'
        }}
      />
    </div>
  );
};

const groups = [
  {
    title: '📦 Mega Pack +90k STL',
    color: 'border-yellow-500/30 bg-yellow-500/5',
    items: [
      { name: 'Chibis', href: 'https://drive.google.com/drive/folders/1v1JHiMbE8JFwIkmCI2aLKlnDxGwD6D_N', icon: <CustomIcon type="generic" index={0} /> },
      { name: 'Religión', href: 'https://drive.google.com/drive/folders/14nLnWtrL1cnJLcIV1xcwc0Rehxp6bzWD', icon: <CustomIcon type="generic" index={1} /> },
      { name: 'Mitología', href: 'https://drive.google.com/drive/folders/1euKsVcW6BuXK1XimljiM0oeXan1Spkey', icon: <CustomIcon type="generic" index={2} /> },
      { name: 'Utensilios', href: 'https://drive.google.com/drive/folders/10dV0-82opQyBdgAJkwZ-PiI8XCdW4s7a', icon: <CustomIcon type="generic" index={3} /> },
      { name: 'Mascotas', href: 'https://drive.google.com/drive/folders/1LuA1mOMl1PfeCdPGpYZKO0ilEZ5CKlSY', icon: <CustomIcon type="mascot" /> },
      { name: 'RPGs', href: 'https://drive.google.com/drive/folders/1_m41NbX1Egds3axAfIQhkfPJjM3SwaZP', icon: <CustomIcon type="rpg" /> },
      { name: 'Maceteros', href: 'https://drive.google.com/drive/folders/1RHE32dUp-L4h7d5KlOjE07abXhtS0jLP?usp=sharing', icon: <CustomIcon type="maceta" /> },
      { name: 'Miniaturas', href: 'https://drive.google.com/drive/folders/1Micxz6i0i6kEVue8Ha_b3Sr7zNLKfJj', icon: <CustomIcon type="miniatura" /> },
      { name: 'Cosplay', href: 'https://drive.google.com/drive/folders/1sYd7S-fIfUN1kpE7qvxstUVoj0m_DKLz', icon: <CustomIcon type="generic" index={8} /> },
      { name: 'Juegos', href: 'https://drive.google.com/drive/folders/1vqRv1-4xkiaf583-WKqWBg-EAsyNviro', icon: <CustomIcon type="juegos" /> },
      { name: 'Naturo', href: 'https://drive.google.com/drive/folders/1ChDou43EWqaU0wloTnACD8rUErTaPZhD', icon: <CustomIcon type="naruto" /> },
      { name: 'One Piece', href: 'https://drive.google.com/drive/folders/1KyolKGqLxY8a3H_s8OaBz_DAGm-aXo9V', icon: <CustomIcon type="onepiece" /> },
      { name: 'Dragon Ball', href: 'https://drive.google.com/drive/folders/1N9RjA7Z8x4r_rlVCFpP6XAvi7bjjB3Nh', icon: <CustomIcon type="dragonball" /> },
      { name: 'A. Titan', href: 'https://drive.google.com/drive/folders/1JPd2P8hJXkoRHC4cYl_MNLDXGkb2AcNR', icon: <CustomIcon type="generic" index={13} /> },
      { name: 'D. Slayer', href: 'https://drive.google.com/drive/folders/1crKk1vc-EAOOnXbWGj6InCF1RPOnNWbA', icon: <CustomIcon type="generic" index={14} /> },
      { name: 'Pack 01', href: 'https://drive.google.com/drive/folders/1uPiQgI3sq3izeMFFlTkG4wDz69H0KmVw', icon: <CustomIcon type="generic" index={19} /> },
      { name: 'Pack 02', href: 'https://drive.google.com/drive/folders/1NOz5K0FAGurD9Evotfsqn7e-E58GtSIu', icon: <CustomIcon type="generic" index={19} /> },
    ]
  },
  {
    title: '🟡 Pokémon 3D',
    color: 'border-yellow-400/30 bg-yellow-400/5',
    items: [
      { name: 'Gen 1', href: 'https://drive.google.com/drive/folders/1GbL3HUWAVo1wRmxFKR4Yvv_eO3gWpW1S', icon: <CustomIcon type="pokemon" /> },
      { name: 'Gen 2', href: 'https://drive.google.com/drive/folders/1zhcF-OuiwGbsH93p180J4ZhmmLF0NqmA', icon: <CustomIcon type="pokemon" /> },
      { name: 'Gen 3', href: 'https://drive.google.com/drive/folders/1wLUCqQZMt2uMUJj_pn31Qffns8ybqm0M', icon: <CustomIcon type="pokemon" /> },
      { name: 'Gen 4', href: 'https://drive.google.com/drive/folders/1AbtOC6nvDcPKO2LcD8I-1E6vhpWSVbhz', icon: <CustomIcon type="pokemon" /> },
    ]
  },
  {
    title: '🎭 Máscaras 3D',
    color: 'border-cyan-500/30 bg-cyan-500/5',
    items: [
      { name: 'Huntress', href: 'https://drive.google.com/drive/folders/1TNr0BVIX77PRfMaA51ZAfA-EK2LJCWgv', icon: <CustomIcon type="generic" index={16} /> },
      { name: 'Spider-Man', href: 'https://drive.google.com/drive/folders/1ucUwjfdE4SC3oAcD-f6FnGP07Etz-k79', icon: <CustomIcon type="spiderman" /> },
      { name: 'Headpool', href: 'https://drive.google.com/drive/folders/17rrxk01dq5x9AomHo2Y2Fcxo--ZyB1s4', icon: <CustomIcon type="generic" index={8} /> },
      { name: 'Pantera N.', href: 'https://drive.google.com/drive/folders/17rrxk01dq5x9AomHo2Y2Fcxo--ZyB1s4', icon: <CustomIcon type="generic" index={16} /> },
      { name: 'Colección', href: 'https://drive.google.com/drive/folders/1OWx_yq-BODAW3r-0qARMvnUu8lXUI0Dj', icon: <CustomIcon type="generic" index={16} /> },
      { name: 'Pack Plus', href: 'https://drive.google.com/drive/folders/1FrxHMJ9zalZtBs9v_So-gVyD-8Oo7J2-', icon: <CustomIcon type="generic" index={16} /> },
    ]
  },
  {
    title: '🔄 Articulados',
    color: 'border-green-500/30 bg-green-500/5',
    items: [
      { name: 'Personajes', href: 'https://drive.google.com/drive/folders/1My5S21H3nCalAAMCuQhI02_fj27vgdkj', icon: <CustomIcon type="generic" index={17} /> },
      { name: 'Modelos', href: 'https://drive.google.com/drive/folders/1m4VLV0bcEmprvAOektJ5rJvVcH7aSrIK', icon: <CustomIcon type="generic" index={17} /> },
    ]
  },
  {
    title: '🦸 Marvel & DC',
    color: 'border-red-500/30 bg-red-500/5',
    items: [
      { name: 'Marvel 1', href: 'https://drive.google.com/drive/folders/17g2yCPak1kuZWEabZPvkLDatX0g2ipft', icon: <CustomIcon type="generic" index={18} /> },
      { name: 'Marvel 2', href: 'https://drive.google.com/drive/folders/1utqBNPeqvOx_OVb5wjGs1DBStzSULsAk', icon: <CustomIcon type="generic" index={18} /> },
      { name: 'Marvel 3', href: 'https://drive.google.com/drive/folders/1PnPostJq7352wc6EsiSl2fYpS1x7Ddp4', icon: <CustomIcon type="generic" index={18} /> },
      { name: 'Pack DC', href: 'https://drive.google.com/drive/folders/1hVYaE_hIAV62nilZTlVeu2RMKuGcvV1t', icon: <CustomIcon type="generic" index={18} /> },
    ]
  },
  {
    title: '🔑 Llaveros',
    color: 'border-pink-500/30 bg-pink-500/5',
    items: [
      { name: 'Perros', href: 'https://drive.google.com/drive/folders/1fqkWXVL6Jk3rRMpw2ogQ83z5vIMjV1tx', icon: <CustomIcon type="mascot" /> },
      { name: 'Vengadores', href: 'https://drive.google.com/drive/folders/19gl2FMOZTKQJXV8-ZXtdOF5WUG0od88w', icon: <CustomIcon type="generic" index={5} /> },
      { name: 'Stitch', href: 'https://drive.google.com/drive/folders/1mlxZx8nO8kn34hDr0RoKSXDEj4QAiPHd', icon: <CustomIcon type="generic" index={0} /> },
      { name: 'Xbox', href: 'https://drive.google.com/drive/folders/1jvk9S6OojocB99eBtexX1193ManLmsRT', icon: <CustomIcon type="juegos" /> },
      { name: 'Pack 01', href: 'https://drive.google.com/file/d/14pwIzlvshO2Ap8-jFvYLF_FBNuY1Jp_I/view', icon: <CustomIcon type="generic" index={19} /> },
      { name: 'Pack 02', href: 'https://chatgpt.com/g/g-68f64e0fc9f4819199626529c338431b-ecom-ads-landings-pro-venta-al-instante', icon: <CustomIcon type="generic" index={19} /> },
    ]
  },
  {
    title: '⭐ Star Wars',
    color: 'border-orange-500/30 bg-orange-500/5',
    items: [
      { name: 'Baby Yoda', href: 'https://drive.google.com/drive/folders/1J03z6Wab-j_Mu-T3rMOOTo5bucGtUdcW', icon: <CustomIcon type="starwars" index={1} /> },
      { name: 'Lightsaber', href: 'https://drive.google.com/drive/folders/1CvLUJ-69FM3Fz-BOp8yvBINLiut--Fo0', icon: <CustomIcon type="starwars" index={2} /> },
      { name: 'Vader', href: 'https://drive.google.com/drive/folders/1sB-4bp4j7Izyg5_ozgiPFVXjk-L71BAG', icon: <CustomIcon type="vader" /> },
      { name: 'Luke', href: 'https://drive.google.com/drive/folders/1aqVl_a4emHGoZAR4lpF-jsXTXIEdNSZ9', icon: <CustomIcon type="starwars" index={2} /> },
      { name: 'Han Solo', href: 'https://drive.google.com/drive/folders/1cm6C-LBHTevB_qpVzSO1v34g1aSWE8SE', icon: <CustomIcon type="vader" /> },
      { name: 'Droid Pack', href: 'https://drive.google.com/drive/folders/1ZFrWg9cQZT4K6feIsG92YpwOUOZqV-cF', icon: <CustomIcon type="starwars" index={1} /> },
      { name: 'Completa', href: 'https://drive.google.com/drive/folders/15xPZcN7zhffGztwl9YWKmi0vVK6z0YSi', icon: <CustomIcon type="vader" /> },
    ]
  },
];

/* ─────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────── */
const ThreeDPrinting: React.FC = () => {
  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-blue-600/10 p-6 rounded-3xl border border-blue-500/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30 shrink-0">
            <Box size={32} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Estudio 3D</h2>
            <p className="text-sm text-gray-400">Recursos y herramientas de modelado.</p>
          </div>
        </div>
        
        {/* Quick Tools Row */}
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

      {/* Main Grid of Sections */}
      <div className="grid grid-cols-1 gap-6">
        {groups.map((group, gIdx) => (
          <div 
            key={gIdx} 
            className={`p-5 rounded-2xl border ${group.color} transition-all`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
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
                  className="flex flex-col items-center p-3 bg-white/5 border border-white/5 rounded-2xl group transition-all text-center h-full"
                >
                  {item.icon}
                  <span className="text-[11px] font-bold text-gray-400 group-hover:text-white uppercase tracking-wider line-clamp-2 mt-1">
                    {item.name}
                  </span>
                </motion.a>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="p-6 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl border border-white/10 text-center">
        <p className="text-sm text-gray-400">
          Explora miles de modelos organizados por categorías. Pulsa en cualquier ícono para ir al repositorio.
        </p>
      </div>
    </div>
  );
};

export default ThreeDPrinting;
