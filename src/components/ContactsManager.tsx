import React, { useState } from 'react';
import { Contact } from '../types';
import { getStoredContacts, saveStoredContacts } from '../utils/bridge';
import { Users, Plus, Phone, Trash2, Edit2, Search, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContactsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContactToCall?: (contact: Contact) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  isOpen,
  onClose,
  onSelectContactToCall,
}) => {
  const [contacts, setContacts] = useState<Contact[]>(getStoredContacts());
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newPhone, setNewPhone] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newContact: Contact = {
      id: 'c_' + Date.now(),
      name: newName,
      relationship: newRelationship,
      phoneNumber: newPhone,
      avatarColor: 'bg-indigo-500',
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveStoredContacts(updated);
    setNewName('');
    setNewRelationship('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveStoredContacts(updated);
  };

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.relationship && c.relationship.toLowerCase().includes(search.toLowerCase())) ||
      c.phoneNumber.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#080812] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Device Address Book</h3>
              <p className="text-xs text-slate-400">
                Contacts searchable by Arushi via voice commands
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Add Bar */}
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts (e.g. Rahul, Mom, Dad)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAdd}
              className="p-4 bg-white/[0.02] border-b border-white/10 space-y-2.5 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Full Name (e.g. Rahul)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Relation (e.g. Brother)"
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No contacts found matching "{search}"
            </div>
          ) : (
            filtered.map((contact) => (
              <div
                key={contact.id}
                className="pt-2 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                      contact.avatarColor || 'bg-slate-700'
                    }`}
                  >
                    {contact.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">
                        {contact.name}
                      </span>
                      {contact.relationship && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-400">
                          {contact.relationship}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      {contact.phoneNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onSelectContactToCall && (
                    <button
                      onClick={() => {
                        onSelectContactToCall(contact);
                        onClose();
                      }}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                      title="Direct Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
