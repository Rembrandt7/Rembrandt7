
import React from 'react';
import IconButton from './common/IconButton';

interface LinksSidebarProps {
    onClose: () => void;
}

const LinkCard: React.FC<{ href: string; name: string; description: string; hoverColor: string; children: React.ReactNode }> = ({ href, name, description, hoverColor, children }) => {
    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`group relative flex flex-col items-center justify-center p-2 bg-gray-900/50 rounded-lg hover:bg-gray-700 transition-all duration-300 ring-offset-2 ring-offset-gray-900 focus:outline-none focus:ring-2 ${hoverColor}`}
        >
            {children}
            <span className="mt-1 text-xs font-semibold text-gray-200">{name}</span>
            <span className="absolute bottom-full mb-2 w-max px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {description}
            </span>
        </a>
    );
};


const LinksSidebar: React.FC<LinksSidebarProps> = ({ onClose }) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-xl h-full flex flex-col p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-100">Enlaces</h2>
                <IconButton onClick={onClose} tooltip="Cerrar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </IconButton>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                 <p className="text-sm text-gray-400 mb-4">
                    Accesos directos a herramientas y aplicaciones útiles.
                </p>
                 <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2">
                    
                    <LinkCard href="https://www.mercadolibre.com.mx/" name="Mercado Libre" description="Compras online." hoverColor="hover:ring-2 hover:ring-yellow-400 focus:ring-yellow-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-400 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.48.41-2.86 1.12-4.06l10.94 10.94C14.86 19.59 13.48 20 12 20zm5.88-3.94L6.94 5.12C8.14 4.41 9.52 4 11 4c4.41 0 8 3.59 8 8 0 1.48-.41 2.86-1.12 4.06z"/>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://www.toolify.ai/es/most-saved" name="Toolify" description="Descubre las herramientas de IA más populares." hoverColor="hover:ring-2 hover:ring-cyan-400 focus:ring-cyan-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://www.youtube.com/" name="YouTube" description="Plataforma de video online." hoverColor="hover:ring-2 hover:ring-red-600 focus:ring-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://gemini.google.com/app" name="Gemini" description="Chat con la IA más capaz de Google." hoverColor="hover:ring-2 hover:ring-blue-400 focus:ring-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L14.8 8.6L21.4 11.4L14.8 14.2L12 20.8L9.2 14.2L2.6 11.4L9.2 8.6L12 2Z" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://notebooklm.google.com/" name="NotebookLM" description="Asistente de investigación y notas con IA." hoverColor="hover:ring-2 hover:ring-emerald-400 focus:ring-emerald-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://www.kimi.com/chat/19a9f911-c5a2-8c3d-8000-09ff89fe3c2d" name="Kimi" description="Asistente de IA Kimi." hoverColor="hover:ring-2 hover:ring-indigo-400 focus:ring-indigo-400">
                         <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm-1-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 7h-2v-6h2v6z" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://web.whatsapp.com/" name="WhatsApp" description="Accede a WhatsApp desde tu navegador." hoverColor="hover:ring-2 hover:ring-green-500 focus:ring-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.502 1.906 6.344l-1.191 4.353 4.462-1.161z" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://fusion.online.autodesk.com/" name="Fusion" description="Autodesk Fusion en la nube." hoverColor="hover:ring-2 hover:ring-orange-500 focus:ring-orange-500">
                        <svg className="w-full h-full p-0.5 text-orange-500 transition-transform group-hover:scale-110" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="fusion-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FF9B00"/>
                                    <stop offset="50%" stopColor="#FF5100"/>
                                    <stop offset="100%" stopColor="#D41400"/>
                                </linearGradient>
                                <linearGradient id="fusion-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#D41400"/>
                                    <stop offset="100%" stopColor="#FF5100"/>
                                </linearGradient>
                                <linearGradient id="fusion-grad-3" x1="100%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#FF3300"/>
                                    <stop offset="100%" stopColor="#5A0000"/>
                                </linearGradient>
                            </defs>
                            <polygon points="50,2 98,24 98,76 50,98 2,76 2,24" fill="url(#fusion-grad-1)" opacity="0.15" stroke="url(#fusion-grad-1)" strokeWidth="1.5"/>
                            <polygon points="8,8 92,8 92,26 34,26 34,46 82,46 82,64 34,64 34,92 8,92" fill="url(#fusion-grad-1)"/>
                            <polygon points="92,8 92,26 97,21 97,3" fill="url(#fusion-grad-2)"/>
                            <polygon points="82,46 82,64 87,59 87,41" fill="url(#fusion-grad-2)"/>
                            <polygon points="8,92 34,92 34,97 8,97" fill="url(#fusion-grad-2)"/>
                            <polygon points="8,8 34,26 34,97 8,92" fill="url(#fusion-grad-3)" opacity="0.3"/>
                        </svg>
                    </LinkCard>

                    
                    <LinkCard href="https://app.rendair.ai/generate/image" name="Rendair" description="Generador de imágenes de Rendair AI." hoverColor="hover:ring-2 hover:ring-teal-400 focus:ring-teal-400">
                        <svg className="h-10 w-10 transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="32" cy="32" r="28" fill="#4fd1c5"/>
                            <text x="32" y="42" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" fill="black" textAnchor="middle">r</text>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://www.krea.ai/app" name="Krea" description="Herramientas de IA en tiempo real de Krea." hoverColor="hover:ring-2 hover:ring-blue-500 focus:ring-blue-500">
                         <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
                           <path d="M22 12 L22 52 M22 32 L42 12 M22 32 L42 52" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </LinkCard>
                    
                    <LinkCard href="https://aidemos.meta.com/segment-anything/gallery/" name="Sam" description="Segment Anything Model (Meta)." hoverColor="hover:ring-2 hover:ring-indigo-500 focus:ring-indigo-500">
                        <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://www.clicmayores.com/xprompt.html" name="Prompt Video" description="Generador de prompt video." hoverColor="hover:ring-2 hover:ring-orange-500 focus:ring-orange-500">
                        <svg className="h-10 w-10 text-orange-500 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                            <line x1="7" y1="2" x2="7" y2="22"></line>
                            <line x1="17" y1="2" x2="17" y2="22"></line>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <line x1="2" y1="7" x2="7" y2="7"></line>
                            <line x1="2" y1="17" x2="7" y2="17"></line>
                            <line x1="17" y1="17" x2="22" y2="17"></line>
                            <line x1="17" y1="7" x2="22" y2="7"></line>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://grok.com/" name="Grok" description="Asistente de IA de xAI." hoverColor="hover:ring-2 hover:ring-gray-400 focus:ring-gray-400">
                        <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="8"/>
                            <line x1="16" y1="48" x2="48" y2="16" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://meta.ai/" name="Meta AI" description="Conversa con la IA de última generación de Meta." hoverColor="hover:ring-2 hover:ring-purple-500 focus:ring-purple-500">
                        <svg className="h-10 w-10 text-purple-500 transition-transform group-hover:scale-110" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="8" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://chat.qwen.ai/" name="Qwen" description="Chatea con el modelo de IA de Alibaba." hoverColor="hover:ring-2 hover:ring-purple-500 focus:ring-purple-500">
                        <svg className="h-10 w-10 transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="32" cy="32" r="28" fill="#8b5cf6"/>
                            <text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle">Q</text>
                        </svg>
                    </LinkCard>
                    
                    <LinkCard href="https://gamma.app/" name="Gamma" description="Crea presentaciones y documentos con IA." hoverColor="hover:ring-2 hover:ring-blue-500 focus:ring-blue-500">
                         <svg className="h-10 w-10 transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="32" cy="32" r="28" fill="#3b82f6"/>
                            <text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle">G</text>
                        </svg>
                    </LinkCard>
                    
                    <LinkCard href="https://www.freepik.es/pikaso/spaces/a0530a3d-cd8c-4330-8475-2e9628101922" name="Freepik" description="Banco de imágenes y recursos gráficos." hoverColor="hover:ring-2 hover:ring-blue-500 focus:ring-blue-500">
                        <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="32" cy="32" r="28" fill="#3b82f6"/>
                            <text x="32" y="46" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="white" textAnchor="middle">F</text>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://www.canva.com/" name="Canva" description="Diseño gráfico para todos." hoverColor="hover:ring-2 hover:ring-cyan-400 focus:ring-cyan-400">
                        <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="32" cy="32" r="28" fill="#00c4cc"/>
                            <text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle">C</text>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://chatgpt.com/" name="ChatGPT" description="Conversa con el modelo de lenguaje de OpenAI." hoverColor="hover:ring-2 hover:ring-teal-400 focus:ring-teal-400">
                        <svg className="h-10 w-10 text-teal-400 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                             <path d="M18,4H6A2,2 0 0,0 4,6V18A2,2 0 0,0 6,20H18A2,2 0 0,0 20,18V6A2,2 0 0,0 18,4M9,8H11V10H9V8M13,8H15V10H13V8M9,12H15V16H9V12Z" />
                        </svg>
                    </LinkCard>
                    
                    <LinkCard href="https://www.upscale.media/es/upload" name="UPscale" description="Aumenta la resolución de tus imágenes con IA." hoverColor="hover:ring-2 hover:ring-cyan-400 focus:ring-cyan-400">
                        <svg className="h-10 w-10 transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="upscaleGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#14b8a6" />
                                </linearGradient>
                            </defs>
                            <rect x="16" y="16" width="40" height="40" rx="4" fill="url(#upscaleGradient)" fillOpacity="0.5"/>
                            <rect x="8" y="8" width="28" height="28" rx="4" fill="url(#upscaleGradient)"/>
                            <path d="M38 30 L46 22 M46 22 L38 22 M46 22 L46 30" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://aistudio.google.com/prompts/new_chat?model=gemini-3.1-flash-preview-image" name="NanoBanana" description="Chatea con el modelo de imagen Gemini Flash." hoverColor="hover:ring-2 hover:ring-yellow-400 focus:ring-yellow-400">
                        <svg className="h-10 w-10 text-yellow-400 transition-transform group-hover:scale-110" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 85,15 C 70,10 50,25 35,40 C 20,55 10,70 15,85 C 20,100 40,95 55,80 C 70,65 90,50 95,35 C 100,20 95,18 85,15 Z" />
                            <path d="M 88,23 L 83,28 M 78,18 L 73,23" stroke="#A16207" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://www.ilovepdf.com/es" name="PDF" description="Herramientas para trabajar con archivos PDF." hoverColor="hover:ring-2 hover:ring-red-500 focus:ring-red-500">
                        <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <rect width="56" height="56" x="4" y="4" rx="8" fill="#EF4444"/>
                            <text x="32" y="42" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="white" textAnchor="middle">PDF</text>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://labs.google/fx/es/tools/flow" name="Flow" description="Experimenta con IA para generar imágenes y videos." hoverColor="hover:ring-2 hover:ring-red-500 focus:ring-red-500">
                        <svg className="h-10 w-10 text-red-600 transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <rect width="56" height="40" x="4" y="12" rx="8" fill="currentColor"/>
                            <polygon points="28,24 42,32 28,40" fill="white" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://new.express.adobe.com/" name="Adobe Express" description="Crea diseños, videos y más con IA." hoverColor="hover:ring-2 hover:ring-red-500 focus:ring-red-500">
                        <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <rect width="56" height="56" x="4" y="4" rx="8" fill="#FF0000"/>
                            <path d="M24 48 L32 16 L40 48 M28 38 L36 38" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://aistudio.google.com/apps/drive/1H1w3ShpPgBMj73lczkI8htCVAhwQ_nB4?showPreview=true&showAssistant=true" name="Pizarra" description="Pizarra colaborativa de Google." hoverColor="hover:ring-2 hover:ring-blue-400 focus:ring-blue-400">
                        <svg className="h-10 w-10 text-white transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                           <line x1="8" y1="21" x2="16" y2="21"></line>
                           <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                    </LinkCard>
                    
                    <LinkCard href="https://aistudio.google.com/apps/drive/1k2aQBZLy96kILLEDYp5JlJX92eQJUUoJ?showPreview=true&showAssistant=true" name="Cotizador" description="Accede al cotizador de precios." hoverColor="hover:ring-2 hover:ring-lime-500 focus:ring-lime-500">
                        <svg className="h-10 w-10 text-lime-500 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://labs.google.com/mixboard/welcome" name="Mixboard" description="Mezcla conceptos y crea tableros con IA." hoverColor="hover:ring-2 hover:ring-fuchsia-500 focus:ring-fuchsia-500">
                        <svg className="h-10 w-10 text-fuchsia-500 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                             <line x1="9" y1="3" x2="9" y2="21" />
                             <line x1="15" y1="3" x2="15" y2="21" />
                             <line x1="3" y1="9" x2="21" y2="9" />
                             <line x1="3" y1="15" x2="21" y2="15" />
                        </svg>
                    </LinkCard>

                    <LinkCard href="https://labs.google/" name="Google Labs" description="Descubre los últimos experimentos de Google." hoverColor="hover:ring-2 hover:ring-indigo-500 focus:ring-indigo-500">
                         <svg className="h-10 w-10 text-indigo-500 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 2h4" />
                            <path d="M12 2v6" />
                            <path d="M12 8l-5 11a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-11" />
                            <path d="M8.5 14h7" />
                        </svg>
                    </LinkCard>

                 </div>
            </div>
        </div>
    );
};

export default LinksSidebar;
