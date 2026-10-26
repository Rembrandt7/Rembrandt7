import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Wrench, Layout, Sparkles, Move, Star, Shield, Zap, Package, Key, Sword, Globe, ChevronRight, Settings, Database, ExternalLink, Cloud, Search, X, Calculator, TrendingUp, FolderArchive, Layers, Scissors, Eye, Flame, FolderDown, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';

import ThreeDCalculator from './ThreeDCalculator';
import ThreeDSuggestions from './ThreeDSuggestions';
import { useLinks } from '../contexts/LinkContext';

/* ─────────────────────────────────────────────────────────────────
   DATA - Audit and Corrected from PDF (stl_pack.pdf)
───────────────────────────────────────────────────────────────── */
const downloadLibraries = [
  { 
    name: 'MakerWorld', 
    href: 'https://makerworld.com/es', 
    description: 'Biblioteca oficial de Bambu Lab con perfiles 3MF listos para imprimir en 1 clic y modelos multicolor AMS.',
    icon: <img src="/makerworld_premium.png" alt="MakerWorld" className="w-6 h-6 rounded object-contain" />, 
    color: 'from-teal-500/20 to-transparent' 
  },
  { 
    name: 'Creality', 
    href: 'https://www.crealitycloud.com/es', 
    description: 'Repositorio de Creality Cloud con miles de modelos STL/G-code, figuras y accesorios para impresoras FDM.',
    icon: <Cloud size={24} className="text-cyan-400" />, 
    color: 'from-cyan-500/20 to-transparent' 
  },
  { 
    name: 'Anycubic', 
    href: 'https://www.makeronline.com/en/', 
    description: 'MakerOnline (Anycubic): comunidad de modelos 3D gratuitos optimizados para serie Kobra y resina.',
    icon: (
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ), 
    color: 'from-emerald-500/20 to-transparent' 
  },
  { 
    name: 'Snapmaker', 
    href: 'https://space.snapmaker.com/en', 
    description: 'Comunidad Snapmaker con proyectos de impresión 3D, grabado láser y diseño funcional.',
    icon: (
      <svg className="w-6 h-6 text-blue-500" viewBox="0 0 36 36" fill="currentColor">
        <path d="M23.2899 9.13976C21.7574 8.82421 20.5055 9.02036 19.5311 9.72254C18.5567 10.4247 17.8864 11.6016 17.5232 13.2505L16.3835 18.396H16.3864L15.3677 22.9928C15.1758 23.8627 14.8864 24.4711 14.5026 24.8207C14.1187 25.1704 13.5842 25.2727 12.9022 25.1334C12.4593 25.0425 11.9868 24.8776 11.4789 24.6388L10.9238 27.1291C11.414 27.3792 12.0104 27.5754 12.7132 27.7175C14.2457 28.0331 15.4976 27.8369 16.472 27.1348C17.4464 26.4326 18.1167 25.2557 18.4799 23.6068L19.6197 18.4613H19.6167L20.6354 13.8645C20.8273 12.9946 21.1167 12.3863 21.5006 12.0366C21.8844 11.6869 22.4189 11.5846 23.1009 11.7239C23.5439 11.8148 24.0163 11.9797 24.5242 12.2185L25.0763 9.72538C24.5891 9.4809 23.9927 9.28475 23.2899 9.13976Z" />
      </svg>
    ), 
    color: 'from-blue-600/20 to-transparent' 
  },
  { 
    name: 'Printables', 
    href: 'https://www.printables.com/es', 
    description: 'La plataforma comunitaria de Josef Průša con miles de diseños verificados, concursos y perfiles G-code.',
    icon: (
      <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8L19.2 8 12 11.2 4.8 8 12 4.8zM4 9.5l7 3.5v7l-7-3.5V9.5zm9 10.5v-7l7-3.5v7l-7 3.5z"/>
      </svg>
    ), 
    color: 'from-orange-500/20 to-transparent' 
  },
  { 
    name: 'Cults3D', 
    href: 'https://cults3d.com/es', 
    description: 'Marketplace de modelos 3D premium y gratuitos con las mejores figuras de anime, arte y cosplay.',
    icon: <Sparkles size={24} className="text-purple-400" />, 
    color: 'from-purple-500/20 to-transparent' 
  },
  { 
    name: 'Thingiverse', 
    href: 'https://www.thingiverse.com/', 
    description: 'La biblioteca de modelos 3D abiertos más longeva del mundo, ideal para repuestos, mejoras y piezas DIY.',
    icon: (
      <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z"/>
      </svg>
    ), 
    color: 'from-sky-500/20 to-transparent' 
  },
  { 
    name: 'Thangs', 
    href: 'https://thangs.com/', 
    description: 'Motor de búsqueda inteligente que rastrea geométricamente modelos en todas las plataformas 3D a la vez.',
    icon: <Search size={24} className="text-indigo-400" />, 
    color: 'from-indigo-500/20 to-transparent' 
  },
  { 
    name: 'MyMiniFactory', 
    href: 'https://www.myminifactory.com/', 
    description: 'Modelos 3D garantizados y testeados para impresión, figuras de rol tabletop, bustos y miniaturas detalladas.',
    icon: <Shield size={24} className="text-amber-400" />, 
    color: 'from-amber-500/20 to-transparent' 
  },
  { 
    name: 'GrabCAD', 
    href: 'https://grabcad.com/library', 
    description: 'Comunidad de ingenieros y diseñadores mecánicos con más de 5 millones de archivos CAD, ensambles y partes.',
    icon: <Wrench size={24} className="text-red-400" />, 
    color: 'from-red-500/20 to-transparent' 
  },
  { 
    name: 'Instructables', 
    href: 'https://www.instructables.com/', 
    description: 'Tutoriales paso a paso de proyectos de impresión 3D combinados con electrónica, madera y manualidades.',
    icon: <Zap size={24} className="text-yellow-400" />, 
    color: 'from-yellow-500/20 to-transparent' 
  },
];

// Nueva categoría especializada: Imagen a 3D (IA y generadores)
const imageTo3DTools = [
  { 
    name: 'Meshy (IA)', 
    href: 'https://www.meshy.ai/', 
    description: 'Generador de modelos 3D con Inteligencia Artificial a partir de texto o imágenes en segundos con texturas PBR completas.',
    icon: (
      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-sm">
        M
      </div>
    ), 
    color: 'from-fuchsia-600/25 to-transparent' 
  },
  { 
    name: 'Hitem3D', 
    href: 'https://hitem3d.com/', 
    description: 'Herramienta de conversión de imágenes 2D y bocetos a malla 3D optimizada para modelistas e impresores.',
    icon: (
      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-purple-400 flex items-center justify-center text-white font-black text-xs shadow-sm">
        H3
      </div>
    ), 
    color: 'from-violet-600/25 to-transparent' 
  },
  { 
    name: 'Tripo (IA)', 
    href: 'https://www.tripo3d.ai/', 
    description: 'Potente IA de texto a 3D e imagen a 3D ultrarrápida: genera geometría limpia en menos de 8 segundos.',
    icon: (
      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
        TR
      </div>
    ), 
    color: 'from-cyan-600/25 to-transparent' 
  },
  { 
    name: 'ImageToSTL', 
    href: 'https://imagetostl.com/es', 
    description: 'Conversor rápido y gratuito de fotos PNG/JPG a relieve STL, además de cambiar formatos entre STL, OBJ, 3MF y FBX.',
    icon: <Layers size={24} className="text-rose-400" />, 
    color: 'from-rose-500/25 to-transparent' 
  },
  { 
    name: 'Dora (3D)', 
    href: 'https://www.dora.run/ai', 
    description: 'Crea escenas interactivas y modelos espaciales 3D interactivos con IA para previsualizar productos en la web.',
    icon: <Sparkles size={24} className="text-pink-400" />, 
    color: 'from-pink-500/25 to-transparent' 
  },
];

const tools3D = [
  { 
    name: 'Bambu Cloud', 
    href: 'https://bambulab.com/', 
    description: 'Ecosistema de corte en la nube de Bambu Studio con monitoreo remoto de cámaras y calibración automática.',
    icon: (
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z"/>
      </svg>
    ), 
    color: 'from-emerald-500/20 to-transparent' 
  },
  { 
    name: 'SVG2STL', 
    href: 'https://svg2stl.com/', 
    description: 'Convierte logotipos vectoriales SVG en archivos 3D STL con grosor personalizable para imprimir llaveros o placas de marca.',
    icon: <Sparkles size={24} className="text-emerald-400" />, 
    color: 'from-emerald-500/20 to-transparent' 
  },
  { 
    name: 'ItsLitho', 
    href: 'https://tool.itslitho.com/', 
    description: 'Convierte cualquier fotografía familiar o de mascotas en una litofanía 3D (lámpara, cilindro, esfera o llavero a contraluz).',
    icon: <Star size={24} className="text-amber-300" />, 
    color: 'from-amber-500/20 to-transparent' 
  },
  { 
    name: 'LithophaneMkr', 
    href: 'https://lithophanemaker.com/', 
    description: 'Generador de lámparas nocturnas, esferas lunares con fotos y marcos iluminados listos para imprimir sin soportes.',
    icon: <Zap size={24} className="text-yellow-300" />, 
    color: 'from-yellow-500/20 to-transparent' 
  },
  { 
    name: 'Tinkercad', 
    href: 'https://www.tinkercad.com/dashboard', 
    description: 'Editor CAD gratuito en el navegador: ideal para poner nombres a piezas, agregar argolla de llavero o perforar hueco de clicker.',
    icon: <Box size={24} className="text-red-400" />, 
    color: 'from-red-500/20 to-transparent' 
  },
  { 
    name: 'STLBuddy', 
    href: 'https://stlbuddy.com/model-splitter', 
    description: 'Cortador de archivos STL: divide modelos grandes en varias partes con conectores para que quepan en tu impresora.',
    icon: <Scissors size={24} className="text-cyan-400" />, 
    color: 'from-cyan-500/20 to-transparent' 
  },
  { 
    name: 'TouchTerrain', 
    href: 'https://touchterrain.geol.iastate.edu/', 
    description: 'Genera maquetas y cuadros topográficos 3D en relieve de cualquier montaña, volcán o ciudad del mundo en archivo STL.',
    icon: <Globe size={24} className="text-lime-400" />, 
    color: 'from-lime-500/20 to-transparent' 
  },
  { 
    name: 'Boxes.py', 
    href: 'https://boxes.hackerspace-bamberg.de/', 
    description: 'Generador paramétrico de cajas organizadoras, estuches con bisagra y gavetas a la medida exacta que necesites.',
    icon: <Package size={24} className="text-amber-400" />, 
    color: 'from-amber-600/20 to-transparent' 
  },
  { 
    name: 'Gridfinity', 
    href: 'https://gridfinitygenerator.com/es/editor', 
    description: 'Generador online de charolas, bloques y bases modulares Gridfinity para organizar cajones de herramientas y escritorio.',
    icon: <Database size={24} className="text-orange-400" />, 
    color: 'from-orange-500/20 to-transparent' 
  },
  { 
    name: 'Multibuild', 
    href: 'https://multibuild.io/parts', 
    description: 'Catálogo de paneles de pared modulares, ganchos y soportes de taller tipo Multiboard para organizar tu espacio.',
    icon: <Settings size={24} className="text-indigo-400" />, 
    color: 'from-indigo-500/20 to-transparent' 
  },
  { 
    name: 'Fusion 360', 
    href: 'https://fusion.online.autodesk.com/', 
    description: 'Acceso directo a Autodesk Fusion 360 Online para modelado mecánico y paramétrico de alta precisión.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <rect width="24" height="24" rx="5" fill="#FF5100"/>
        <path d="M6 5h12v3.5h-8.5v3h7v3.5h-7v4H6V5z" fill="#FFFFFF"/>
      </svg>
    ), 
    color: 'from-orange-500/20 to-transparent' 
  },
  { 
    name: 'Bumpmesh', 
    href: 'https://bumpmesh.com/', 
    description: 'Aplica texturas en relieve 3D (madera, ladrillo, piel, patrones geométricos) sobre cualquier imagen o superficie STL.',
    icon: <Zap size={24} className="text-amber-400" />, 
    color: 'from-amber-500/20 to-transparent' 
  },
  { 
    name: 'Letras ProLED', 
    href: 'https://proled3d.com/?lang=es', 
    description: 'Diseñador de letras corpóreas 3D y letreros luminosos con canal para tiras LED (muy rentable para negocios y eventos).',
    icon: (
      <svg className="w-6 h-6 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/>
      </svg>
    ), 
    color: 'from-pink-500/20 to-transparent' 
  },
  { 
    name: 'Guilloche', 
    href: 'https://guillochegenerator.com/', 
    description: 'Generador de patrones geométricos hipnóticos tipo espirográfico para posavasos, tapas decorativas y arte en relieve.',
    icon: (
      <svg className="w-6 h-6 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(0 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(45 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(90 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(135 12 12)" />
      </svg>
    ), 
    color: 'from-teal-500/20 to-transparent' 
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

const GroupCard = ({ group, className, itemsOverride }: { group: typeof groups[0], className?: string, itemsOverride?: typeof groups[0]['items'] }) => {
  const displayItems = itemsOverride || group.items;
  if (displayItems.length === 0) return null;

  return (
    <div className={`p-4 bg-slate-900/10 rounded-2xl border ${group.color} transition-all duration-300 hover:bg-slate-900/20 flex flex-col justify-between h-full ${className || ''}`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[10px] text-white flex items-center gap-2 uppercase tracking-widest opacity-80">
            {group.title}
            <div className="h-px flex-1 bg-white/5 min-w-[5px] ml-2" />
          </h3>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-4 gap-2">
          {displayItems.map((item, iIdx) => (
            <motion.a
              key={iIdx}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
              className="flex flex-col items-center p-1 bg-white/5 border border-white/5 rounded-xl group transition-all text-center relative"
            >
              <CustomIcon type={item.type as any} index={item.index} />
              <span className="text-[8px] font-bold text-gray-400 group-hover:text-white uppercase tracking-tighter line-clamp-1 mt-1.5 w-full px-0.5">
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
};

type SubTab = 'sugerencias' | 'taller' | 'ventas' | 'catalogo' | 'visualizador' | 'todo';

export type SectionId = 'descargas' | 'imagen3d' | 'herramientas' | 'sugerencias' | 'visualizador' | 'catalogo' | 'ventas';

interface SectionConfig {
  id: SectionId;
  title: string;
  badge: string;
  subtitle: string;
  icon: (active: boolean) => React.ReactNode;
  activeBorder: string;
  activeBg: string;
  badgeColor: string;
  glowColor: string;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'descargas',
    title: 'Descargas',
    badge: '11 Sitios',
    subtitle: 'MakerWorld, Printables, Cults, Thingiverse...',
    icon: (active) => <FolderDown className={`w-6 h-6 ${active ? 'text-cyan-300' : 'text-cyan-400'}`} />,
    activeBorder: 'border-cyan-400/60',
    activeBg: 'bg-cyan-500/15',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    glowColor: 'shadow-cyan-900/30',
  },
  {
    id: 'sugerencias',
    title: 'Sugerencias',
    badge: '4 del Día',
    subtitle: 'Modelos nuevos rotativos de alta demanda',
    icon: (active) => <Flame className={`w-6 h-6 ${active ? 'text-rose-300' : 'text-rose-400'}`} />,
    activeBorder: 'border-rose-400/60',
    activeBg: 'bg-rose-500/15',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    glowColor: 'shadow-rose-900/30',
  },
  {
    id: 'imagen3d',
    title: 'Imagen a 3D',
    badge: 'IA & Rápido',
    subtitle: 'Meshy (IA), Hitem3D, Tripo, ImageToSTL...',
    icon: (active) => <Wand2 className={`w-6 h-6 ${active ? 'text-fuchsia-300' : 'text-fuchsia-400'}`} />,
    activeBorder: 'border-fuchsia-400/60',
    activeBg: 'bg-fuchsia-500/15',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30',
    glowColor: 'shadow-fuchsia-900/30',
  },
  {
    id: 'herramientas',
    title: 'Herramientas 3D',
    badge: '13 Utilidades',
    subtitle: 'Litofanías, Slicers, Tinkercad, Fusion...',
    icon: (active) => <Wrench className={`w-6 h-6 ${active ? 'text-amber-300' : 'text-amber-400'}`} />,
    activeBorder: 'border-amber-400/60',
    activeBg: 'bg-amber-500/15',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    glowColor: 'shadow-amber-900/30',
  },
  {
    id: 'visualizador',
    title: 'Visualizador 3D',
    badge: 'STL / 3MF',
    subtitle: 'Inspección, pintura 3D y corte con ensamble',
    icon: (active) => <Eye className={`w-6 h-6 ${active ? 'text-sky-300' : 'text-sky-400'}`} />,
    activeBorder: 'border-sky-400/60',
    activeBg: 'bg-sky-500/15',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    glowColor: 'shadow-sky-900/30',
  },
  {
    id: 'catalogo',
    title: 'Catálogo STL',
    badge: '+90k Modelos',
    subtitle: 'Star Wars, Anime, Chibis, Miniaturas, Packs',
    icon: (active) => <FolderArchive className={`w-6 h-6 ${active ? 'text-purple-300' : 'text-purple-400'}`} />,
    activeBorder: 'border-purple-400/60',
    activeBg: 'bg-purple-500/15',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    glowColor: 'shadow-purple-900/30',
  },
  {
    id: 'ventas',
    title: 'Ventas y Pedidos',
    badge: 'CRM & Costos',
    subtitle: 'Control de pedidos, clientes y anticipos',
    icon: (active) => <TrendingUp className={`w-6 h-6 ${active ? 'text-emerald-300' : 'text-emerald-400'}`} />,
    activeBorder: 'border-emerald-400/60',
    activeBg: 'bg-emerald-500/15',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    glowColor: 'shadow-emerald-900/30',
  },
];

const ThreeDPrinting: React.FC = () => {
  const { activeTabId, config } = useLinks();
  // Por defecto siempre abren "descargas" y "sugerencias" del día. Máximo 2 abiertas a la vez; si se abre una 3ra, la 1ra se cierra (FIFO).
  const [openSections, setOpenSections] = useState<SectionId[]>(['descargas', 'sugerencias']);
  const [searchQuery, setSearchQuery] = useState('');

  const viewerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const externalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Siempre que se entre al apartado de Impresión 3D, aseguramos que abran Descargas y Sugerencias del Día
  useEffect(() => {
    const activeTabObj = config?.tabs?.find(t => t.id === activeTabId);
    const is3DTab = activeTabId === '3d-print' || activeTabObj?.componentKey === 'Impresión 3D';
    if (is3DTab) {
      setOpenSections(['descargas', 'sugerencias']);
      window.dispatchEvent(new CustomEvent('refresh-3d-daily-suggestions'));
    }
  }, [activeTabId, config?.tabs]);

  const toggleSection = (id: SectionId) => {
    setOpenSections(prev => {
      // Si ya está abierta, se cierra
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      // Si ya hay 2 abiertas, quitamos la más antigua (índice 0) y agregamos la nueva al final
      if (prev.length >= 2) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleExternalViewerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      viewerIframeRef.current?.contentWindow?.postMessage(
        { type: 'LOAD_MODEL', name: file.name, size: file.size, buffer },
        '*'
      );
    } catch (err) {
      console.error('Error reading 3D file:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Abre en automático la calculadora flotante del lado derecho al entrar a Impresión 3D
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('open-calculator-widget', { detail: { mode: '3d' } }));
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!cleanQuery) return groups;
    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(item => 
          item.name.toLowerCase().includes(cleanQuery) || 
          g.title.toLowerCase().includes(cleanQuery)
        )
      }))
      .filter(g => g.items.length > 0);
  }, [cleanQuery]);

  const filteredDownloads = useMemo(() => {
    if (!cleanQuery) return downloadLibraries;
    return downloadLibraries.filter(l =>
      l.name.toLowerCase().includes(cleanQuery) ||
      (l.description && l.description.toLowerCase().includes(cleanQuery))
    );
  }, [cleanQuery]);

  const filteredImageTo3D = useMemo(() => {
    if (!cleanQuery) return imageTo3DTools;
    return imageTo3DTools.filter(t =>
      t.name.toLowerCase().includes(cleanQuery) ||
      (t.description && t.description.toLowerCase().includes(cleanQuery))
    );
  }, [cleanQuery]);

  const filteredTools = useMemo(() => {
    if (!cleanQuery) return tools3D;
    return tools3D.filter(t =>
      t.name.toLowerCase().includes(cleanQuery) ||
      (t.description && t.description.toLowerCase().includes(cleanQuery))
    );
  }, [cleanQuery]);

  const totalMatches = useMemo(() => {
    const groupMatches = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
    return groupMatches + filteredDownloads.length + filteredImageTo3D.length + filteredTools.length;
  }, [filteredGroups, filteredDownloads, filteredImageTo3D, filteredTools]);

  return (
    <div className="p-3 sm:p-4 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-24">
      
      {/* 7 GRANDES BOTONES DE NAVEGACIÓN (MÁXIMO 2 SECCIONES ABIERTAS A LA VEZ) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Módulos de Impresión 3D
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/5 border border-white/10 text-slate-300">
              {openSections.length} de 2 abiertas
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Al abrir una 3ra opción, la primera abierta se cierra automáticamente
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {SECTIONS.map(section => {
            const isOpen = openSections.includes(section.id);
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer relative ${
                  isOpen
                    ? `${section.activeBg} ${section.activeBorder} shadow-lg ${section.glowColor} ring-1 ring-white/20`
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                {/* Header del botón */}
                <div className="flex items-start justify-between gap-1.5 w-full mb-2">
                  <div className={`p-2 rounded-xl bg-slate-950/70 border border-white/10 shadow-sm shrink-0 group-hover:scale-105 transition-transform ${
                    isOpen ? 'ring-1 ring-white/30' : ''
                  }`}>
                    {section.icon(isOpen)}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider border ${
                      isOpen
                        ? 'bg-white/20 text-white border-white/30'
                        : section.badgeColor
                    }`}>
                      {isOpen ? 'Abierto' : section.badge}
                    </span>
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-white transition-transform ${
                      isOpen ? 'rotate-180 text-white' : ''
                    }`}>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* Texto del botón */}
                <div className="min-w-0 w-full">
                  <h3 className={`text-xs sm:text-sm font-black truncate ${
                    isOpen ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {section.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-snug">
                    {section.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MENSAJE CUANDO TODAS ESTÁN CERRADAS */}
      {openSections.length === 0 && (
        <div className="p-8 text-center bg-slate-900/40 border border-white/10 rounded-3xl space-y-2 animate-in fade-in duration-200">
          <p className="text-sm font-bold text-slate-300">
            Haz clic en cualquiera de los botones de arriba para abrir su contenido.
          </p>
          <p className="text-xs text-slate-500">
            Puedes tener hasta 2 abiertas simultáneamente (Descargas, Sugerencias, Visualizador, Catálogo, etc.).
          </p>
        </div>
      )}

      {/* CONTENEDOR DE SECCIONES ABIERTAS */}
      <div className="space-y-5">
        
        {/* 1. SECCIÓN: DESCARGAS */}
        {openSections.includes('descargas') && (
          <div className="flex flex-col gap-3 bg-cyan-600/10 p-4 sm:p-5 rounded-2xl border border-cyan-500/25 shadow-xl w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
                  <FolderDown size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Sitios de Descarga & Repositorios STL / 3MF
                  </h3>
                  <p className="text-[11px] text-cyan-200/80">
                    11 plataformas oficiales verificadas para conseguir modelos 3D
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('descargas')}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                title="Cerrar Descargas"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-11 gap-2.5 w-full">
              {filteredDownloads.map((tool, idx) => (
                <a
                  key={idx}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${tool.name}: ${tool.description}`}
                  className={`relative flex flex-col items-center justify-center p-2.5 bg-gradient-to-b ${tool.color} border border-white/10 rounded-2xl transition-all hover:scale-105 hover:border-cyan-400/50 hover:z-30 group min-h-[90px] shadow-sm text-center`}
                >
                  <div className="mb-2 p-2 bg-gray-900/70 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center w-10 h-10 shrink-0">
                    {tool.icon}
                  </div>
                  <span className="text-[10px] font-bold text-gray-200 group-hover:text-white uppercase tracking-wider line-clamp-1 w-full px-0.5">
                    {tool.name}
                  </span>
                  {/* Tooltip flotante */}
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-2.5 bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-2xl z-50 text-left">
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-0.5 flex items-center justify-between">
                      <span>{tool.name}</span>
                      <ExternalLink size={10} className="text-cyan-400/70" />
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug font-normal">
                      {tool.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 2. SECCIÓN: SUGERENCIAS DEL DÍA */}
        {openSections.includes('sugerencias') && (
          <div className="flex flex-col gap-3 bg-rose-600/10 p-4 sm:p-5 rounded-2xl border border-rose-500/25 shadow-xl w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-rose-500/15 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Sugerencias del Día · 4 Modelos de Alta Demanda
                  </h3>
                  <p className="text-[11px] text-rose-200/80">
                    Rotación automática de modelos nuevos con parámetros calculados y listos para imprimir
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('sugerencias')}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                title="Cerrar Sugerencias"
              >
                <X size={16} />
              </button>
            </div>

            <ThreeDSuggestions
              onSendToCalculator={() => {
                window.dispatchEvent(new CustomEvent('open-calculator-widget', { detail: { mode: '3d' } }));
              }}
            />
          </div>
        )}

        {/* 3. SECCIÓN: IMAGEN A 3D */}
        {openSections.includes('imagen3d') && (
          <div className="flex flex-col gap-3 bg-fuchsia-600/10 p-4 sm:p-5 rounded-2xl border border-fuchsia-500/25 shadow-xl w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-fuchsia-500/15 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/30 text-fuchsia-300">
                  <Wand2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Imagen a 3D · Inteligencia Artificial & Conversores
                  </h3>
                  <p className="text-[11px] text-fuchsia-200/80">
                    Genera geometrías 3D a partir de fotos o bocetos 2D en segundos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('imagen3d')}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                title="Cerrar Imagen a 3D"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
              {filteredImageTo3D.map((tool, idx) => (
                <a
                  key={idx}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${tool.name}: ${tool.description}`}
                  className={`relative flex flex-col items-center justify-center p-3.5 bg-gradient-to-b ${tool.color} border border-fuchsia-500/20 rounded-2xl transition-all hover:scale-105 hover:border-fuchsia-400 hover:z-30 group min-h-[96px] shadow-md text-center`}
                >
                  <div className="mb-2 p-2 bg-gray-900/80 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center w-11 h-11 shrink-0">
                    {tool.icon}
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider line-clamp-1 w-full px-0.5">
                    {tool.name}
                  </span>
                  <span className="text-[10px] text-fuchsia-300/80 font-medium line-clamp-1 mt-0.5">
                    {tool.description.split(':')[0]}
                  </span>
                  {/* Tooltip flotante */}
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 w-60 p-2.5 bg-slate-950/95 backdrop-blur-md border border-fuchsia-500/40 rounded-xl shadow-2xl z-50 text-left">
                    <div className="text-[10px] font-black text-fuchsia-400 uppercase tracking-wider mb-0.5 flex items-center justify-between">
                      <span>{tool.name}</span>
                      <ExternalLink size={10} className="text-fuchsia-400/70" />
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug font-normal">
                      {tool.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: HERRAMIENTAS 3D */}
        {openSections.includes('herramientas') && (
          <div className="flex flex-col gap-3 bg-amber-600/10 p-4 sm:p-5 rounded-2xl border border-amber-500/25 shadow-xl w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-amber-500/15 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Herramientas 3D · Slicers, Litofanías & Editores
                  </h3>
                  <p className="text-[11px] text-amber-200/80">
                    13 utilidades de modelado rápido, división STL y cajas paramétricas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('herramientas')}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                title="Cerrar Herramientas 3D"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-13 gap-2 w-full">
              {filteredTools.map((tool, idx) => (
                <a
                  key={idx}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${tool.name}: ${tool.description}`}
                  className={`relative flex flex-col items-center justify-center p-2.5 bg-gradient-to-b ${tool.color} border border-white/10 rounded-2xl transition-all hover:scale-105 hover:border-amber-400/50 hover:z-30 group min-h-[90px] shadow-sm text-center`}
                >
                  <div className="mb-2 p-2 bg-gray-900/70 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center w-10 h-10 shrink-0">
                    {tool.icon}
                  </div>
                  <span className="text-[10px] font-bold text-gray-200 group-hover:text-white uppercase tracking-wider line-clamp-1 w-full px-0.5">
                    {tool.name}
                  </span>
                  {/* Tooltip flotante */}
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-2.5 bg-slate-950/95 backdrop-blur-md border border-amber-500/40 rounded-xl shadow-2xl z-50 text-left">
                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-0.5 flex items-center justify-between">
                      <span>{tool.name}</span>
                      <ExternalLink size={10} className="text-amber-400/70" />
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug font-normal">
                      {tool.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 5. SECCIÓN: VISUALIZADOR 3D */}
        {openSections.includes('visualizador') && (
          <div className="flex flex-col gap-3 bg-sky-600/10 p-4 sm:p-5 rounded-2xl border border-sky-500/25 shadow-xl w-full animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-500/15 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Estudio & Visualizador 3D (STL / 3MF)
                  </h3>
                  <p className="text-[11px] text-sky-200/80">
                    Pintura 3D, inspección de capas, corte con conectores y compatibilidad A1 mini / Kobra
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <input
                  ref={externalFileInputRef}
                  type="file"
                  accept=".stl,.3mf,.STL,.3MF"
                  onChange={handleExternalViewerFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => externalFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 border border-sky-400/40 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:scale-105"
                  title="Seleccionar archivo .STL o .3MF desde tu equipo"
                >
                  <Package size={14} />
                  <span>Abrir STL / 3MF</span>
                </button>
                <a
                  href="/visualizador3d/index.html?v=68"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:scale-105"
                  title="Abrir en ventana o pestaña independiente completa"
                >
                  <ExternalLink size={14} />
                  <span>Pestaña Nueva</span>
                </a>
                <button
                  type="button"
                  onClick={() => toggleSection('visualizador')}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors ml-1"
                  title="Cerrar Visualizador 3D"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="relative w-full h-[740px] md:h-[820px] bg-slate-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <iframe
                ref={viewerIframeRef}
                src="/visualizador3d/index.html?v=68"
                className="w-full h-full border-none"
                title="Visualizador 3D STL & 3MF"
                allow="fullscreen"
              />
            </div>
          </div>
        )}

        {/* 6. SECCIÓN: CATÁLOGO STL */}
        {openSections.includes('catalogo') && (
          <div className="flex flex-col gap-4 bg-purple-600/10 p-4 sm:p-5 rounded-2xl border border-purple-500/25 shadow-xl w-full animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-500/15 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
                  <FolderArchive size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Catálogo STL (+90,000 Modelos en Drive)
                  </h3>
                  <p className="text-[11px] text-purple-200/80">
                    Colección clasificada por carpetas y packs listos para descargar
                  </p>
                </div>
              </div>

              {/* Buscador dentro del catálogo */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar STL (Vader, Naruto, Chibis...)"
                    className="w-full bg-slate-900/90 border border-purple-400/30 rounded-xl pl-9 pr-8 py-1.5 text-xs font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                      title="Limpiar búsqueda"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleSection('catalogo')}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                  title="Cerrar Catálogo STL"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Alerta de resultados de búsqueda */}
            {cleanQuery && (
              <div className="flex items-center justify-between p-3 bg-purple-500/15 border border-purple-500/30 rounded-xl text-xs">
                <span className="text-purple-200 font-bold flex items-center gap-2">
                  <Search size={14} />
                  <span>
                    Resultados para "<strong className="text-white">{searchQuery}</strong>":{' '}
                    <span className="text-emerald-400 font-black">{totalMatches} encontrados</span>
                  </span>
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-black uppercase text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all"
                >
                  Limpiar filtro
                </button>
              </div>
            )}

            {/* Mensaje cuando no hay resultados en la búsqueda */}
            {cleanQuery && totalMatches === 0 && (
              <div className="p-8 text-center bg-slate-900/30 border border-white/5 rounded-2xl space-y-1.5">
                <p className="text-sm font-bold text-gray-300">No se encontraron modelos con "{searchQuery}".</p>
                <p className="text-xs text-gray-500">Prueba buscando por categoría como "Anime", "Star Wars", "Macetas", "Chibis" o el nombre de un personaje.</p>
              </div>
            )}

            {/* Grid de STLs */}
            {cleanQuery ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {filteredGroups.map((group, idx) => (
                  <GroupCard key={idx} group={group} itemsOverride={group.items} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="flex flex-col gap-4">
                  <GroupCard group={groups[0]} />
                  <GroupCard group={groups[5]} />
                </div>
                <div className="flex flex-col gap-4">
                  <GroupCard group={groups[1]} />
                  <GroupCard group={groups[2]} />
                </div>
                <div className="flex flex-col gap-4">
                  <GroupCard group={groups[7]} />
                  <GroupCard group={groups[4]} />
                </div>
                <div className="flex flex-col gap-4">
                  <GroupCard group={groups[3]} />
                  <GroupCard group={groups[6]} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. SECCIÓN: VENTAS Y PEDIDOS */}
        {openSections.includes('ventas') && (
          <div className="flex flex-col gap-3 bg-emerald-600/10 p-4 sm:p-5 rounded-2xl border border-emerald-500/25 shadow-xl w-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Ventas & Pedidos de Impresión 3D
                  </h3>
                  <p className="text-[11px] text-emerald-200/80">
                    Historial de encargos, estados de cobro, costos y registro de anticipos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('ventas')}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                title="Cerrar Ventas y Pedidos"
              >
                <X size={16} />
              </button>
            </div>

            <ThreeDCalculator viewMode="ventas" />
          </div>
        )}

      </div>
    </div>
  );
};

export default ThreeDPrinting;
