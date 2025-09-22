
import React from 'react';
import { X } from 'lucide-react';

interface SupabaseHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sqlCommands = `-- 1. Create the table to store project backups
-- Go to "SQL Editor" -> "New Query" and run this script:
CREATE TABLE public.project_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  backup_data JSONB NOT NULL,
  client_name TEXT DEFAULT 'Interactive Markdown Tasker'
);

-- 2. Enable Row Level Security (RLS) on the new table
-- This ensures users can only access their own data.
ALTER TABLE public.project_backups ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows users to insert their own backups
CREATE POLICY "Allow users to insert their own backups"
ON public.project_backups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Create a policy that allows users to view their own backups
CREATE POLICY "Allow users to select their own backups"
ON public.project_backups
FOR SELECT
USING (auth.uid() = user_id);
`;

const SupabaseHelpModal: React.FC<SupabaseHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" aria-modal="true" role="dialog">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-slate-100">Supabase Setup Instructions</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="text-slate-300 overflow-y-auto">
            <p className="mb-4">Follow these steps in your Supabase project dashboard to enable cloud backup:</p>
            <ol className="list-decimal list-inside space-y-4">
                <li>
                    <strong>Create a Supabase Project:</strong> If you haven't already, go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">supabase.com</a> and create a new project.
                </li>
                <li>
                    <strong>Find Your Credentials:</strong>
                    <ul className="list-disc list-inside ml-4 mt-2 text-slate-400">
                        <li>Navigate to <strong>Project Settings</strong> (the gear icon).</li>
                        <li>In the <strong>API</strong> section, you will find your <strong>Project URL</strong> and <strong>Project API Keys</strong>.</li>
                        <li>Copy the <code className="bg-slate-800 px-1 rounded text-xs">URL</code> and the <code className="bg-slate-800 px-1 rounded text-xs">anon</code> <code className="bg-slate-800 px-1 rounded text-xs">public</code> key into the settings modal.</li>
                    </ul>
                </li>
                 <li>
                    <strong>Enable User Authentication:</strong>
                    <ul className="list-disc list-inside ml-4 mt-2 text-slate-400">
                        <li>Navigate to <strong>Authentication</strong> (the user icon).</li>
                        <li>In the <strong>Providers</strong> section, make sure <strong>Email</strong> is enabled.</li>
                        <li>Go to the <strong>Users</strong> tab and create a new user with the email and password you want to use for backups.</li>
                    </ul>
                </li>
                <li>
                    <strong>Create the Database Table & Policies:</strong>
                    <p className="mt-1 mb-2 text-slate-400">Go to the <strong>SQL Editor</strong> (the database icon), click <strong>New Query</strong>, and paste the following SQL script. Click <strong>Run</strong> to execute it.</p>
                    <pre className="bg-slate-800 p-4 rounded-md text-sm text-slate-200 overflow-x-auto">
                        <code>{sqlCommands}</code>
                    </pre>
                </li>
            </ol>
             <p className="mt-6 text-sm text-green-400">Once these steps are complete, you can fill in your credentials in the settings and start using the cloud backup feature.</p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseHelpModal;
