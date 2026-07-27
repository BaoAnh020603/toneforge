import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Button } from '../components/ui/button';
import { X, AlertCircle } from 'lucide-react';

interface AlertContextType {
  showAlert: (message: string, title?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Thông báo');

  const showAlert = (msg: string, titleMsg: string = 'Thông báo') => {
    setMessage(msg);
    setTitle(titleMsg);
    setIsOpen(true);
  };

  const closeAlert = () => setIsOpen(false);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={closeAlert}
          />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
              </div>
              <button 
                onClick={closeAlert}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-slate-300 text-sm whitespace-pre-wrap mb-6">
              {message}
            </div>
            
            <div className="flex justify-end w-full">
              <Button 
                onClick={closeAlert}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl py-3"
              >
                Đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
