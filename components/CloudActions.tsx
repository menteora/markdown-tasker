
import React, { useState, useRef, useEffect } from 'react';
import { Cloud, UploadCloud, DownloadCloud, Loader2, LogOut } from 'lucide-react';

interface CloudActionsProps {
    isConfigured: boolean;
    isLoading: boolean;
    onBackup: () => void;
    onRestore: () => void;
    isAuthenticated: boolean;
    onSignOut: () => void;
}

const CloudActions: React.FC<CloudActionsProps> = ({ isConfigured, isLoading, onBackup, onRestore, isAuthenticated, onSignOut }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBackupClick = () => {
        onBackup();
        setIsOpen(false);
    };

    const handleRestoreClick = () => {
        onRestore();
        setIsOpen(false);
    };
    
    const handleSignOutClick = () => {
        onSignOut();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(prev => !prev)}
                disabled={!isConfigured}
                className="relative flex items-center space-x-2 p-2 rounded-md transition-colors font-semibold bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                aria-haspopup="true"
                aria-expanded={isOpen}
                title={isConfigured ? "Cloud Actions" : "Configure Supabase in Settings to enable Cloud Actions"}
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
                 {isConfigured && isAuthenticated && !isLoading && (
                    <span className="absolute -top-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-slate-700" title="Authenticated"></span>
                )}
            </button>
            {isOpen && isConfigured && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30" role="menu">
                    <div className="p-2">
                        <button
                            onClick={handleBackupClick}
                            className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-700 text-sm text-slate-200"
                            role="menuitem"
                        >
                            <UploadCloud className="w-4 h-4" />
                            <span>Backup to Cloud</span>
                        </button>
                        <button
                            onClick={handleRestoreClick}
                            className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-700 text-sm text-slate-200"
                            role="menuitem"
                        >
                            <DownloadCloud className="w-4 h-4" />
                            <span>Restore from Cloud</span>
                        </button>
                         {isAuthenticated && (
                            <>
                                <div className="border-t border-slate-700 my-2"></div>
                                <button
                                    onClick={handleSignOutClick}
                                    className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-700 text-sm text-red-400"
                                    role="menuitem"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CloudActions;