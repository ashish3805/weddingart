
import React from 'react';

interface CheckboxProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ id, label, checked, onChange, disabled = false }) => (
    <div className="flex items-center">
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="h-5 w-5 rounded border-gray-300 text-[#C19A6B] focus:ring-[#8D6E63] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        />
        <label htmlFor={id} className={`ml-2 text-md font-medium text-[#5D4037] ${disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
            {label}
        </label>
    </div>
);
