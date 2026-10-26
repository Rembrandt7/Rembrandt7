import React, { useState } from 'react';
import { Contact } from '../types';
import { User, Phone, Mail, Briefcase, Plus, Search, Trash2, X, Save, FileText, Edit2, MessageCircle, Send } from 'lucide-react';

interface ContactsViewProps {
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ contacts, onAddContact, onUpdateContact, onDeleteContact }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Contact>>({});

  const handleOpenAdd = () => {
    setFormData({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setFormData(contact);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (formData.name) {
      const contactData: Contact = {
        id: formData.id || Date.now().toString(),
        name: formData.name || '',
        alias: formData.alias || '',
        phone: formData.phone || '',
        email: formData.email || '',
        profession: formData.profession || '',
        notes: formData.notes || ''
      };

      if (formData.id) {
        onUpdateContact(contactData);
      } else {
        onAddContact(contactData);
      }
      setIsModalOpen(false);
      setFormData({});
    } else {
        alert("El nombre es obligatorio");
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.alias.toLowerCase().includes(search.toLowerCase()) ||
    c.profession.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-6 h-6 text-purple-600" />
            Agenda de Contactos
          </h2>
          <p className="text-slate-500 text-sm">Gestiona tus conexiones profesionales y personales.</p>
        </div>
        <div className="flex gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 w-full md:w-64"
                />
            </div>
            <button 
                onClick={handleOpenAdd}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-200"
            >
                <Plus className="w-4 h-4" /> Nuevo Contacto
            </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2">
         {filteredContacts.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                 <User className="w-12 h-12 mb-2 opacity-20" />
                 <p>No hay contactos encontrados.</p>
             </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredContacts.map(contact => (
                    <div key={contact.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all group relative">
                        {/* Actions */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                             <button 
                                onClick={() => handleOpenEdit(contact)}
                                className="p-1.5 text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded"
                                title="Editar"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => { if(confirm('¿Eliminar contacto?')) onDeleteContact(contact.id) }}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
                                {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{contact.name}</h3>
                                {contact.alias && <p className="text-xs text-slate-500 font-medium">"{contact.alias}"</p>}
                                <p className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                    {contact.profession || 'Sin profesión'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-3 text-sm text-slate-600">
                            {contact.phone && (
                                <div className="flex items-center justify-between group/phone">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{contact.phone}</span>
                                    </div>
                                    <a 
                                        href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-green-200 transition-colors opacity-80 hover:opacity-100"
                                        title="Enviar WhatsApp"
                                    >
                                        <MessageCircle className="w-3 h-3" /> WhatsApp
                                    </a>
                                </div>
                            )}
                            {contact.email && (
                                <div className="flex items-center justify-between group/email">
                                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate text-xs">{contact.email}</span>
                                    </div>
                                    <a 
                                        href={`mailto:${contact.email}`}
                                        className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-blue-200 transition-colors shrink-0 opacity-80 hover:opacity-100"
                                        title="Enviar Correo"
                                    >
                                        <Send className="w-3 h-3" /> Enviar
                                    </a>
                                </div>
                            )}
                            {contact.notes && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-start gap-2">
                                        <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                        <p className="text-xs text-slate-500 italic line-clamp-3">{contact.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
         )}
      </div>

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-purple-50">
                      <h3 className="font-bold text-purple-900">{formData.id ? 'Editar Contacto' : 'Nuevo Contacto'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-500" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Nombre *</label>
                              <input 
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-slate-900 font-bold placeholder-slate-400"
                                  value={formData.name || ''}
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                                  placeholder="Juan Pérez"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Alias</label>
                              <input 
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-slate-900 font-medium placeholder-slate-400"
                                  value={formData.alias || ''}
                                  onChange={e => setFormData({...formData, alias: e.target.value})}
                                  placeholder="El mecánico"
                              />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                              <input 
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-slate-900 font-medium placeholder-slate-400"
                                  value={formData.phone || ''}
                                  onChange={e => setFormData({...formData, phone: e.target.value})}
                                  placeholder="+52..."
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Profesión</label>
                              <input 
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-slate-900 font-medium placeholder-slate-400"
                                  value={formData.profession || ''}
                                  onChange={e => setFormData({...formData, profession: e.target.value})}
                                  placeholder="Ingeniero"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                          <input 
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-slate-900 font-medium placeholder-slate-400"
                              value={formData.email || ''}
                              onChange={e => setFormData({...formData, email: e.target.value})}
                              placeholder="correo@ejemplo.com"
                          />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Notas</label>
                          <textarea 
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-slate-900 font-medium h-24 resize-none placeholder-slate-400"
                              value={formData.notes || ''}
                              onChange={e => setFormData({...formData, notes: e.target.value})}
                              placeholder="Detalles importantes..."
                          />
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                      <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2">
                          <Save className="w-4 h-4" /> Guardar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ContactsView;