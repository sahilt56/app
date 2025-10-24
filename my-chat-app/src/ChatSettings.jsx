// src/ChatSettings.jsx
import React from 'react';

// Simple list of background color options (Tailwind classes)
const colorOptions = [
  { name: 'Default', bgClass: 'bg-[#e5ddd5]', pattern: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23e5ddd5\' fill-opacity=\'.4\'/%3E%3C/svg%3E")' },
  { name: 'Light Gray', bgClass: 'bg-gray-200', pattern: 'none' },
  { name: 'Light Blue', bgClass: 'bg-blue-100', pattern: 'none' },
  { name: 'Light Green', bgClass: 'bg-green-100', pattern: 'none' },
  { name: 'Light Pink', bgClass: 'bg-pink-100', pattern: 'none' },
  { name: 'Solid White', bgClass: 'bg-white', pattern: 'none' },
];

function ChatSettings({ currentBgClass, onChangeBg, onClose }) {
  return (
    // Simple Modal Structure (you can replace with a better modal library later)
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Chat Background</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {colorOptions.map((option) => (
            <div
              key={option.name}
              onClick={() => onChangeBg(option.bgClass, option.pattern)}
              className={`h-20 rounded border-2 cursor-pointer transition-all ${
                currentBgClass === option.bgClass ? 'border-teal-500 ring-2 ring-teal-300' : 'border-gray-300 hover:border-teal-400'
              } ${option.bgClass}`} // Apply background color for preview
              style={option.bgClass === 'bg-[#e5ddd5]' ? { backgroundImage: option.pattern } : {}} // Apply pattern only for default
              title={option.name}
            >
             {/* Optional: Add checkmark if selected */}
             {currentBgClass === option.bgClass && (
                 <div className="flex justify-center items-center h-full">
                    <svg className="w-6 h-6 text-teal-600 bg-white rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
             )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChatSettings;

