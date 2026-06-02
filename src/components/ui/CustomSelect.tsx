'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    key: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    showPlaceholder?: boolean;
}

export function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    label,
    className = '',
    disabled = false,
    showPlaceholder = true,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.key === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape key
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSelect = (key: string) => {
        onChange(key);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-gray-700 mb-2 font-medium">{label}</label>
            )}

            {/* Trigger button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg bg-white text-left cursor-pointer transition-colors duration-150
                ${isOpen ? 'border-primary ring-1 ring-primary/20' : 'border-gray-300'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={`truncate ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                {!disabled && (
                    <ChevronDown
                        className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                    />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <ul
                    role="listbox"
                    className="
                    absolute z-50 w-full mt-1
                bg-white rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                    {showPlaceholder && (
                        <li
                            role="option"
                            aria-selected={value === ''}
                            onClick={() => handleSelect('')}
                            className="px-4 py-2 cursor-pointer select-none text-gray-500 hover:bg-primary hover:text-white transition-colors duration-100"
                        >
                            {placeholder}
                        </li>
                    )}

                    {options.map((option) => {
                        const isSelected = option.key === value;
                        return (
                            <li
                                key={option.key}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleSelect(option.key)}
                                className={`
                                    px-4 py-2 cursor-pointer select-none transition-colors duration-100
                                    hover:bg-primary hover:text-white
                                    ${isSelected ? '' : 'text-gray-700'}
                                `}
                            >
                                {option.label}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}