import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const Dropdown = ({ options, value, onChange, placeholder, isOpen, setIsOpen }) => (
  <div className="relative">
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors flex items-center justify-between hover:border-gray-300"
    >
      <span className={value ? 'text-gray-900' : 'text-gray-500'}>
        {value || placeholder}
      </span>
      <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto"
        >
          {options.map((option) => {
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center justify-between hover:bg-gray-50"
              >
                <span>{option}</span>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default Dropdown;