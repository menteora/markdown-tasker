import React, { useState } from 'react';
import { X, FileDown } from 'lucide-react';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (selectedDate: string) => void;
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate(selectedDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-100">Generate Daily Report</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-slate-300 mb-6">
          <label htmlFor="report-date" className="block text-sm font-medium text-slate-300 mb-2">
            Select the date for the update report.
          </label>
          <input
            id="report-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex justify-end space-x-3">
           <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
            Cancel
          </button>
          <button onClick={handleGenerate} className="flex items-center space-x-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold">
            <FileDown className="w-4 h-4" />
            <span>Generate</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyReportModal;
