
import React from 'react';
import { AttireOption } from '../types';

interface AttireSelectorProps {
    title: string;
    options: AttireOption[];
    selectedValue: string;
    onChange: (id: string) => void;
}

export const AttireSelector: React.FC<AttireSelectorProps> = ({ title, options, selectedValue, onChange }) => {
    return (
        <div>
            <h3 className="text-xl font-semibold text-center mb-4 text-[#5D4037]">{title}</h3>
            <div className="grid grid-cols-3 gap-3">
                {options.map((option) => (
                    <div
                        key={option.id}
                        onClick={() => onChange(option.id)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(option.id)}
                        className={`p-3 rounded-lg cursor-pointer border-2 transition-all duration-200 ${selectedValue === option.id ? 'border-[#8D6E63] ring-2 ring-[#C19A6B] shadow-lg' : 'border-transparent hover:border-gray-300'}`}
                        role="radio"
                        aria-checked={selectedValue === option.id}
                        tabIndex={0}
                    >
                        <img src={option.imageUrl} alt={option.name} className="w-full h-auto aspect-square rounded-md object-cover mb-2" />
                        <p className="font-bold text-sm text-center text-[#5D4037]">{option.name}</p>
                        <p className="text-xs text-center text-gray-500 hidden sm:block">{option.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
