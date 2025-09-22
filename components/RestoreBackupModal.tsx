import React from 'react';
import { X, History, Download } from 'lucide-react';
import type { BackupRecord } from '../types';

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupRecord[];
  onSelectBackup: (backupId: string) => void;
}

const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({ isOpen, onClose, backups, onSelectBackup }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 border border-slate-700 flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-100 flex items-center"><History className="w-5 h-5 mr-2" /> Select a Backup to Restore</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-slate-300 mb-6 overflow-y-auto">
          {backups.length > 0 ? (
            <div className="space-y-2">
                {backups.map(backup => (
                    <div key={backup.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-md">
                        <div>
                            <p className="font-medium text-slate-200">{new Date(backup.created_at).toLocaleString()}</p>
                            <p className="text-xs text-slate-400">{backup.client_name || 'Backup'}</p>
                        </div>
                        <button 
                            onClick={() => onSelectBackup(backup.id)} 
                            className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold text-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span>Restore</span>
                        </button>
                    </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">No backups found in the cloud.</p>
          )}
        </div>
        <div className="flex justify-end mt-auto pt-4 border-t border-slate-700 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">
              Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreBackupModal;
