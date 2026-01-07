
import React, { useState } from 'react';
import { X, Calculator as CalcIcon } from 'lucide-react';

const Calculator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [display, setDisplay] = useState('');
  
  const handleClick = (val: string) => {
    if (val === '=') {
      try {
        // eslint-disable-next-line no-eval
        setDisplay(eval(display).toString());
      } catch {
        setDisplay('Error');
      }
    } else if (val === 'C') {
      setDisplay('');
    } else {
      setDisplay(prev => prev + val);
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
    'C'
  ];

  return (
    <div className="fixed bottom-24 right-6 w-64 bg-white shadow-2xl rounded-2xl border border-slate-200 z-[100] overflow-hidden">
      <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalcIcon className="w-4 h-4" />
          <span className="text-sm font-bold">Scientific Utility</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 bg-slate-50">
        <div className="bg-white border-2 border-slate-200 rounded-lg p-3 mb-4 h-12 text-right text-xl font-mono truncate">
          {display || '0'}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {buttons.map(btn => (
            <button
              key={btn}
              onClick={() => handleClick(btn)}
              className={`p-3 rounded-lg font-bold text-sm transition-colors
                ${btn === '=' ? 'bg-indigo-600 text-white col-span-2' : 'bg-white hover:bg-slate-100 text-slate-700 shadow-sm border border-slate-200'}
                ${btn === 'C' ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : ''}
              `}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calculator;
