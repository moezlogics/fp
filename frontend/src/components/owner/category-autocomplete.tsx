"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Plus, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CategoryAutocompleteProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
}

export default function CategoryAutocomplete({
    options,
    value,
    onChange,
    placeholder = "Select or type a category...",
    label
}: CategoryAutocompleteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync search with value initially
    useEffect(() => {
        setSearch(value);
    }, [value]);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        return options.filter(opt =>
            opt.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    const showCreateOption = search.trim() !== "" && 
        !options.some(opt => opt.toLowerCase() === search.toLowerCase().trim());

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch(value); // Reset search to current value on blur
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);

    const handleSelect = (val: string) => {
        onChange(val);
        setSearch(val);
        setIsOpen(false);
    };

    return (
        <div className="space-y-1.5 relative" ref={containerRef}>
            {label && (
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    {label}
                </label>
            )}
            
            <div className="relative group">
                <input
                    type="text"
                    value={search}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            value === opt 
                                                ? "bg-primary/10 text-primary" 
                                                : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        {opt}
                                        {value === opt && <Check className="w-4 h-4" />}
                                    </button>
                                ))
                            ) : !showCreateOption && (
                                <div className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
                                    No categories found
                                </div>
                            )}

                            {showCreateOption && (
                                <button
                                    type="button"
                                    onClick={() => handleSelect(search.trim())}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black text-primary hover:bg-primary/5 transition-all border-t border-gray-50 mt-1"
                                >
                                    <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-white" />
                                    </div>
                                    <span>Create "{search.trim()}"</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
