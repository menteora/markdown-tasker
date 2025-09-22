import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { useProject } from '../contexts/ProjectContext';

const sanitizeAlias = (alias: string): string => {
    return alias.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

const UserRow: React.FC<{
  user: User;
  onUpdate: (oldAlias: string, user: User) => void;
  onDelete: (userAlias: string) => void;
}> = ({ user, onUpdate, onDelete }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [alias, setAlias] = useState(user.alias);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setAlias(user.alias);
  }, [user]);

  const handleUpdate = () => {
    const updatedUser: User = { 
        ...user, 
        name, 
        email, 
        alias: sanitizeAlias(alias) 
    };
    onUpdate(user.alias, updatedUser);
  };
  
  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlias(sanitizeAlias(e.target.value));
  };

  const hasChanges = name !== user.name || email !== user.email || alias !== user.alias;

  return (
    <div className="flex items-center space-x-4 p-4 bg-slate-800 rounded-lg">
      <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor={`name-${user.alias}`} className="block text-sm font-medium text-slate-400 mb-1">Name / Description</label>
          <input
            id={`name-${user.alias}`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor={`alias-${user.alias}`} className="block text-sm font-medium text-slate-400 mb-1">Alias</label>
          <input
            id={`alias-${user.alias}`}
            type="text"
            value={alias}
            onChange={handleAliasChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor={`email-${user.alias}`} className="block text-sm font-medium text-slate-400 mb-1">Email(s)</label>
          <input
            id={`email-${user.alias}`}
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={handleUpdate}
          disabled={!hasChanges}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          onClick={() => onDelete(user.alias)}
          className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition-colors font-semibold"
        >
          Delete
        </button>
      </div>
    </div>
  );
};


const UserManagement: React.FC = () => {
    const { users, addUser, updateUser, deleteUser } = useProject();
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newAlias, setNewAlias] = useState('');
    const [isAliasManuallyEdited, setIsAliasManuallyEdited] = useState(false);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setNewName(name);
        if (!isAliasManuallyEdited) {
            setNewAlias(sanitizeAlias(name));
        }
    };

    const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewAlias(sanitizeAlias(e.target.value));
        setIsAliasManuallyEdited(true);
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        const finalAlias = sanitizeAlias(newAlias.trim());
        if (newName.trim() && newEmail.trim() && finalAlias) {
            addUser({ name: newName.trim(), email: newEmail.trim(), alias: finalAlias });
            setNewName('');
            setNewEmail('');
            setNewAlias('');
            setIsAliasManuallyEdited(false);
        }
    };

    return (
        <div className="p-8 overflow-y-auto h-full text-slate-200 pb-24">
            <div className="max-w-5xl mx-auto">
                <div className="bg-slate-800 rounded-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-4">Add New Assignee</h2>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="new-name" className="block text-sm font-medium text-slate-400 mb-1">Name / Description</label>
                                <input
                                    id="new-name"
                                    type="text"
                                    value={newName}
                                    onChange={handleNameChange}
                                    placeholder="e.g., John Doe or 'Frontend Team'"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>
                             <div>
                                <label htmlFor="new-alias" className="block text-sm font-medium text-slate-400 mb-1">Alias</label>
                                <input
                                    id="new-alias"
                                    type="text"
                                    value={newAlias}
                                    onChange={handleAliasChange}
                                    placeholder="e.g., john_doe"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="new-email" className="block text-sm font-medium text-slate-400 mb-1">Email(s)</label>
                                <input
                                    id="new-email"
                                    type="text"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="john.doe@example.com"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors font-semibold">
                                Add Assignee
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-4">
                    <h2 className="text-2xl font-bold mb-4 border-b border-slate-700 pb-2">Existing Assignees</h2>
                    {users.length > 0 ? (
                        users.map(user => (
                            <UserRow key={user.alias} user={user} onUpdate={updateUser} onDelete={deleteUser} />
                        ))
                    ) : (
                        <p className="text-slate-400 text-center py-4">No assignees found. Add one using the form above.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
