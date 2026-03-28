
import React, { useState } from 'react';

const Prompts: React.FC = () => {
    const [prompts, setPrompts] = useState([
        { id: 1, title: "Realistic Portrait", content: "A hyper-realistic portrait of a [subject], dramatic lighting, 8k resolution, detailed texture, cinematic depth of field.", tags: ["Photo", "Portrait"] },
        { id: 2, title: "Cyberpunk City", content: "Futuristic cyberpunk city street at night, neon lights, rain reflection, towering skyscrapers, flying cars, highly detailed.", tags: ["Sci-Fi", "Environment"] },
        { id: 3, title: "Logo Design", content: "Minimalist vector logo for [company name], modern style, flat design, geometric shapes, white background.", tags: ["Design", "Logo"] },
    ]);

    return (
        <div className="max-w-5xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl min-h-[70vh]">
             <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-3xl font-bold text-white">Biblioteca de Prompts</h2>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold transition-colors">
                    + Crear Prompt
                </button>
            </div>
            
            <div className="grid gap-4">
                {prompts.map(prompt => (
                    <div key={prompt.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-semibold text-purple-400">{prompt.title}</h3>
                            <div className="flex gap-2">
                                <button className="text-gray-400 hover:text-white p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                                <button className="text-gray-400 hover:text-white p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                            </div>
                        </div>
                        <p className="text-gray-300 font-mono text-sm bg-gray-800 p-3 rounded mb-3 select-all">
                            {prompt.content}
                        </p>
                        <div className="flex gap-2">
                            {prompt.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded-full">{tag}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Prompts;
