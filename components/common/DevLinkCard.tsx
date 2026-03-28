import React from 'react';

interface DevCardProps {
    href?: string;
    onClick?: () => void;
    name: string;
    description?: string;
    colorClass: string;
    children: React.ReactNode;
}

export const DevLinkCard: React.FC<DevCardProps> = ({ href, onClick, name, description, colorClass, children }) => {
    const content = (
        <>
            <div className="mb-4 transform transition-transform group-hover:scale-110 duration-300">
                {children}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
            {description && <p className="text-sm text-gray-400 text-center">{description}</p>}
        </>
    );

    const baseClass = `group relative flex flex-col items-center justify-center p-8 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all duration-300 border border-gray-700 hover:border-gray-500 hover:shadow-2xl hover:-translate-y-1 w-full max-w-sm cursor-pointer ${colorClass}`;

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass}>
                {content}
            </a>
        );
    }

    return (
        <button onClick={onClick} className={baseClass}>
            {content}
        </button>
    );
};
