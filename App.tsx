import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, Search, Phone, MapPin, Building2, 
  Calendar, Camera, ArrowLeft, Trash2, 
  Download, Upload, UserPlus, X, Edit2, Linkedin, Info, CheckSquare, Square, Link as LinkIcon, Save
} from 'lucide-react';
import { Person, Note, RelationshipType, SortOption, Relationship } from './types';

// --- Constants & Helpers ---

const STORAGE_KEY = 'people_connect_db';

const generateId = () => Math.random().toString(36).substr(2, 9);

const compressImage = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 300;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

// --- Components ---

const View = {
  LIST: 'LIST',
  DETAIL: 'DETAIL',
  EDIT: 'EDIT',
};

export default function App() {
  // State
  const [people, setPeople] = useState<Person[]>([]);
  const [currentView, setCurrentView] = useState<string>(View.LIST);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  
  // View Options State (for controlling initial tab open)
  const [initialDetailTab, setInitialDetailTab] = useState<'info' | 'notes' | 'relations'>('info');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<RelationshipType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Load Data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPeople(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  }, [people]);

  // Derived State
  const selectedPerson = useMemo(() => 
    people.find(p => p.id === selectedPersonId), 
  [people, selectedPersonId]);

  const filteredPeople = useMemo(() => {
    let result = people.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.institute.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.notes.some(n => n.content.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filterType !== 'ALL') {
          const hasType = p.relationships.some(r => r.type === filterType);
          if (!hasType) return false;
      }
      return matchesSearch;
    });

    return result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'country') return a.country.localeCompare(b.country);
      return b.createdAt - a.createdAt;
    });
  }, [people, searchQuery, filterType, sortBy]);

  // Actions
  const handleSavePerson = (person: Person) => {
    // Check if updating existing or adding new
    const existingIndex = people.findIndex(p => p.id === person.id);
    
    if (existingIndex >= 0) {
      // Edit mode
      setPeople(prev => prev.map(p => p.id === person.id ? person : p));
      
      // If we are editing the currently viewed person, return to detail view
      if (selectedPersonId === person.id) {
          setCurrentView(View.DETAIL);
          setInitialDetailTab('info'); // Default to info on edit
      }
    } else {
      // Add mode
      setPeople(prev => [...prev, person]);
      
      // Redirect to the new person's detail view and open 'notes' tab
      setSelectedPersonId(person.id);
      setInitialDetailTab('notes'); 
      setCurrentView(View.DETAIL);
    }
  };

  const handleDeletePerson = (id: string) => {
    if (window.confirm("Are you sure you want to delete this contact? This action cannot be undone.")) {
      setPeople(prev => {
        // 1. Remove the person
        const withoutPerson = prev.filter(p => p.id !== id);
        // 2. Remove references to this person from everyone else
        return withoutPerson.map(p => ({
          ...p,
          relationships: p.relationships.filter(r => r.targetId !== id)
        }));
      });
      
      // Reset view if we deleted the active person
      if (selectedPersonId === id) {
        setSelectedPersonId(null);
        setCurrentView(View.LIST);
      }
    }
  };

  const handleUpdateAnyPerson = (updated: Person) => {
      setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(people));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "people_connect_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) {
            setPeople(parsed);
            alert("Database imported successfully!");
          }
        }
      } catch (err) {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
  };

  const handleAddNew = () => {
      setSelectedPersonId(null);
      setCurrentView(View.EDIT);
  };

  // --- Views ---

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      
      {/* LEFT PANEL (List) */}
      <div className={`
          flex-col bg-white border-r border-slate-200 h-full w-full md:w-1/3 min-w-[320px] max-w-md z-10
          ${(currentView !== View.LIST && window.innerWidth < 768) ? 'hidden' : 'flex'}
          md:flex
      `}>
         {/* Header */}
        <header className="bg-indigo-600 text-white p-4 pt-6 shadow-md z-20">
            <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5" /> PeopleConnect
            </h1>
            <div className="flex gap-2">
                <button 
                  onClick={handleAddNew} 
                  className="p-1.5 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-colors"
                  title="Add Person"
                >
                    <Plus className="w-4 h-4" />
                </button>
                <label className="p-1.5 bg-indigo-500 rounded-full hover:bg-indigo-400 cursor-pointer transition-colors" title="Import">
                    <Upload className="w-4 h-4" />
                    <input type="file" className="hidden" accept=".json" onChange={importData} />
                </label>
                <button onClick={exportData} className="p-1.5 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-colors" title="Export">
                    <Download className="w-4 h-4" />
                </button>
            </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-indigo-200" />
            <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-indigo-700/50 text-white placeholder-indigo-200 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            {(['name', 'country', 'createdAt'] as SortOption[]).map((opt) => (
                <button 
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`text-xs px-3 py-1 rounded-full border ${sortBy === opt ? 'bg-white text-indigo-700 font-semibold' : 'border-indigo-400 text-indigo-100'}`}
                >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
            ))}
            </div>
        </header>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-24 bg-slate-50">
            {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Search className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No people found.</p>
            </div>
            ) : (
            filteredPeople.map(person => (
                <div 
                key={person.id}
                onClick={() => {
                    setSelectedPersonId(person.id);
                    setCurrentView(View.DETAIL);
                }}
                className={`
                    p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all
                    ${selectedPersonId === person.id 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'}
                `}
                >
                {person.photo ? (
                    <img src={person.photo} alt={person.name} className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {person.name.charAt(0)}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate text-sm">{person.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{person.institute || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium truncate max-w-[80px]">
                         {person.relationships.find(r => r.targetId === 'SELF')?.type || 'Contact'}
                       </span>
                    </div>
                </div>
                </div>
            ))
            )}
        </div>
        
        {/* Mobile FAB */}
        <button 
            onClick={handleAddNew}
            className="md:hidden fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 active:scale-90 transition-all z-50"
        >
            <Plus className="w-6 h-6" />
        </button>

      </div>

      {/* RIGHT PANEL (Detail / Edit) */}
      <div className={`
          flex-1 bg-slate-50 h-full overflow-hidden relative
          ${(currentView === View.LIST && window.innerWidth < 768) ? 'hidden' : 'flex'}
      `}>
          {currentView === View.EDIT || (currentView === View.DETAIL && !selectedPersonId) ? (
               // Create New / Edit Mode
               <PersonEditor 
                 initialData={selectedPerson || undefined}
                 allPeople={people}
                 onSave={handleSavePerson}
                 onCancel={() => {
                    if (people.length > 0) {
                        setCurrentView(View.DETAIL);
                        if (!selectedPersonId) setCurrentView(View.LIST);
                    } else {
                        setCurrentView(View.LIST);
                    }
                 }}
               />
          ) : selectedPerson ? (
               // Detail Mode
               <PersonDetail 
                 key={selectedPerson.id} // Important: Forces re-mount when person changes, resetting internal state like 'activeTab'
                 person={selectedPerson}
                 initialTab={initialDetailTab}
                 allPeople={people}
                 onBack={() => {
                    setSelectedPersonId(null);
                    setCurrentView(View.LIST);
                 }}
                 onEdit={() => setCurrentView(View.EDIT)}
                 onDelete={() => handleDeletePerson(selectedPerson.id)}
                 onUpdateAnyPerson={handleUpdateAnyPerson}
               />
          ) : (
              // Empty State (Desktop)
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <Users className="w-24 h-24 mb-4 opacity-10" />
                  <p className="text-lg font-medium">Select a person to view details</p>
                  <button 
                    onClick={handleAddNew}
                    className="mt-6 flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-all"
                  >
                      <Plus className="w-5 h-5" /> Add Person
                  </button>
              </div>
          )}
      </div>

    </div>
  );
}

// --- Sub-Components ---

// 1. Person Editor (Add/Edit)
function PersonEditor({ initialData, allPeople, onSave, onCancel }: { 
  initialData?: Person, 
  allPeople: Person[], 
  onSave: (p: Person) => void, 
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState<Person>(initialData || {
    id: generateId(),
    name: '',
    phone: '',
    country: '',
    institute: '',
    linkedin: '',
    specialInfo: '',
    notes: [],
    relationships: [],
    createdAt: Date.now()
  });

  // Determine initial role state
  const initialSelfRelation = initialData?.relationships.find(r => r.targetId === 'SELF')?.type;
  const standardTypes = Object.values(RelationshipType) as string[];
  
  const [roleCategory, setRoleCategory] = useState<RelationshipType>(() => {
      if (!initialSelfRelation) return RelationshipType.FRIEND;
      if (standardTypes.includes(initialSelfRelation) && initialSelfRelation !== RelationshipType.OTHER) {
          return initialSelfRelation as RelationshipType;
      }
      return RelationshipType.OTHER;
  });

  const [customRole, setCustomRole] = useState<string>(() => {
      if (!initialSelfRelation) return '';
      if (!standardTypes.includes(initialSelfRelation) || initialSelfRelation === RelationshipType.OTHER) {
          return initialSelfRelation === RelationshipType.OTHER ? '' : initialSelfRelation;
      }
      return '';
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const compressed = await compressImage(result);
          setFormData(prev => ({ ...prev, photo: compressed }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Name is required");
    
    const updatedPerson = { ...formData };
    
    const finalRole = roleCategory === RelationshipType.OTHER 
        ? (customRole.trim() || RelationshipType.OTHER) 
        : roleCategory;

    // Update the 'SELF' or primary tag
    const selfIndex = updatedPerson.relationships.findIndex(r => r.targetId === 'SELF');
    if (selfIndex >= 0) {
        updatedPerson.relationships[selfIndex].type = finalRole;
    } else {
         updatedPerson.relationships.push({ targetId: 'SELF', type: finalRole });
    }

    onSave(updatedPerson);
  };

  return (
    <div className="h-full bg-white flex flex-col w-full animate-fade-in">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full md:hidden"><X className="w-6 h-6 text-slate-500" /></button>
        <button onClick={onCancel} className="hidden md:block px-4 py-2 text-slate-500 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
        <h2 className="font-bold text-lg">{initialData ? 'Edit Profile' : 'New Person'}</h2>
        <button onClick={handleSubmit} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Save</button>
      </div>
      
      <div className="p-6 space-y-6 overflow-y-auto pb-20 max-w-2xl mx-auto w-full">
        {/* Photo */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            {formData.photo ? (
              <img src={formData.photo} className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-md" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                <Camera className="w-10 h-10 text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Edit2 className="w-8 h-8 text-white" />
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
            <input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none" 
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role/Type</label>
                <select 
                  value={roleCategory}
                  onChange={e => setRoleCategory(e.target.value as RelationshipType)}
                  className="w-full bg-slate-50 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500"
                >
                  {Object.values(RelationshipType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {roleCategory === RelationshipType.OTHER && (
                    <input 
                      type="text"
                      value={customRole}
                      onChange={e => setCustomRole(e.target.value)}
                      placeholder="Specify relationship..."
                      className="mt-2 w-full bg-slate-50 p-2 rounded-lg text-sm border focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                )}
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                <input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-50 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500" 
                  placeholder="+1 234..."
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Institute / Org</label>
                <input 
                value={formData.institute} 
                onChange={e => setFormData({...formData, institute: e.target.value})}
                className="w-full bg-slate-50 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500" 
                placeholder="e.g. Google, University..."
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Country</label>
                <input 
                value={formData.country} 
                onChange={e => setFormData({...formData, country: e.target.value})}
                className="w-full bg-slate-50 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500" 
                placeholder="e.g. USA"
                />
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Linkedin className="w-3 h-3" /> LinkedIn Profile
             </label>
             <input 
                value={formData.linkedin || ''} 
                onChange={e => setFormData({...formData, linkedin: e.target.value})}
                className="w-full bg-slate-50 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500" 
                placeholder="https://linkedin.com/in/..."
             />
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Special Info
             </label>
             <textarea 
                value={formData.specialInfo || ''} 
                onChange={e => setFormData({...formData, specialInfo: e.target.value})}
                className="w-full bg-slate-50 p-3 rounded-lg outline-none border border-slate-200 focus:border-indigo-500 resize-none h-24" 
                placeholder="Any special details (e.g., allergies, gift ideas, fun facts)..."
             />
          </div>

        </div>
      </div>
    </div>
  );
}

// 2. Person Detail
function PersonDetail({ person, allPeople, initialTab = 'info', onBack, onEdit, onDelete, onUpdateAnyPerson }: { 
  person: Person, 
  allPeople: Person[],
  initialTab?: 'info' | 'notes' | 'relations',
  onBack: () => void, 
  onEdit: () => void, 
  onDelete: () => void,
  onUpdateAnyPerson: (p: Person) => void
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'relations'>(initialTab);
  const [newNote, setNewNote] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);

  // Special Info Edit State
  const [isEditingSpecialInfo, setIsEditingSpecialInfo] = useState(false);
  const [specialInfoBuffer, setSpecialInfoBuffer] = useState(person.specialInfo || '');

  // Relationship Linking State
  const [isLinking, setIsLinking] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [linkCategory, setLinkCategory] = useState<RelationshipType>(RelationshipType.COLLEAGUE);
  const [linkCustom, setLinkCustom] = useState('');
  const [linkNote, setLinkNote] = useState('');

  const saveSpecialInfo = () => {
    onUpdateAnyPerson({ ...person, specialInfo: specialInfoBuffer });
    setIsEditingSpecialInfo(false);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const selectedDate = new Date(noteDate);
    const note: Note = {
      id: generateId(),
      date: selectedDate.toISOString(),
      content: newNote
    };
    const updatedNotes = [note, ...person.notes].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    onUpdateAnyPerson({ ...person, notes: updatedNotes });
    setNewNote('');
  };

  const deleteNote = (noteId: string) => {
    if(!window.confirm("Delete this note?")) return;
    const updatedNotes = person.notes.filter(n => n.id !== noteId);
    onUpdateAnyPerson({ ...person, notes: updatedNotes });
  };

  const handleToggleSelectLink = (id: string) => {
      const newSet = new Set(selectedLinkIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedLinkIds(newSet);
  };

  const addRelationships = () => {
    if (selectedLinkIds.size === 0) return;
    
    const finalLinkType = linkCategory === RelationshipType.OTHER 
        ? (linkCustom.trim() || 'Other') 
        : linkCategory;

    // Create a new array to avoid direct mutation
    let newRelationships = [...person.relationships];
    
    selectedLinkIds.forEach(targetId => {
        const existingIdx = newRelationships.findIndex(r => r.targetId === targetId);
        const rel: Relationship = { 
            targetId, 
            type: finalLinkType,
            note: linkNote 
        };
        
        if (existingIdx >= 0) {
            newRelationships[existingIdx] = rel;
        } else {
            newRelationships.push(rel);
        }
    });

    onUpdateAnyPerson({ ...person, relationships: newRelationships });
    
    // Reset
    setIsLinking(false);
    setSelectedLinkIds(new Set());
    setLinkSearch('');
    setLinkCategory(RelationshipType.COLLEAGUE);
    setLinkCustom('');
    setLinkNote('');
  };

  const removeRelationship = (rel: any, e: React.MouseEvent) => {
      e.stopPropagation();
      if(!window.confirm("Remove this relationship?")) return;

      if (rel.isDirect) {
          // Remove from current person
          const updatedRels = person.relationships.filter(r => r.targetId !== rel.id);
          onUpdateAnyPerson({ ...person, relationships: updatedRels });
      } else {
          // Implicit relationship: Remove from the *other* person
          const otherPerson = allPeople.find(p => p.id === rel.id);
          if (otherPerson) {
              const updatedOtherRels = otherPerson.relationships.filter(r => r.targetId !== person.id);
              onUpdateAnyPerson({ ...otherPerson, relationships: updatedOtherRels });
          }
      }
  };

  const displayedRelationships = useMemo(() => {
      // 1. Explicit links stored on this person
      const direct = person.relationships
        .filter(r => r.targetId !== 'SELF')
        .map(r => {
            const target = allPeople.find(p => p.id === r.targetId);
            return target ? { ...target, relationType: r.type, relationNote: r.note, isDirect: true } : null;
        })
        .filter((item): item is Person & { relationType: string, relationNote: string | undefined, isDirect: boolean } => item !== null);

      // 2. Implicit links (others pointing to this person)
      const implicit = allPeople
        .filter(p => p.id !== person.id && p.relationships.some(r => r.targetId === person.id))
        .map(p => {
             const r = p.relationships.find(rel => rel.targetId === person.id);
             return { ...p, relationType: r?.type || 'Linked', relationNote: r?.note, isDirect: false };
        });

      // Prefer direct if both exist
      const map = new Map<string, typeof direct[0]>();
      [...direct, ...implicit].forEach(item => {
          if (item) {
             if (!map.has(item.id)) map.set(item.id, item);
             else if (item.isDirect) map.set(item.id, item); // Overwrite with direct
          }
      });
      return Array.from(map.values());
  }, [person, allPeople]);

  const candidates = useMemo(() => {
      if (!linkSearch) return [];
      const lower = linkSearch.toLowerCase();
      return allPeople.filter(p => 
          p.id !== person.id && 
          (p.name.toLowerCase().includes(lower) || p.institute.toLowerCase().includes(lower))
      );
  }, [allPeople, linkSearch, person.id]);

  return (
    <div className="h-full bg-slate-50 flex flex-col w-full animate-fade-in relative">
      {/* Navbar */}
      <div className="p-4 flex items-center justify-between bg-white border-b border-slate-200 z-10 sticky top-0">
        <button onClick={onBack} className="md:hidden"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
        <span className="md:hidden font-bold text-slate-800">Profile</span> 
        <div className="flex gap-2 ml-auto">
          <button onClick={onEdit} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" title="Edit Profile"><Edit2 className="w-5 h-5" /></button>
          <button 
             onClick={(e) => {
                 e.stopPropagation();
                 onDelete();
             }} 
             className="p-2 hover:bg-red-50 rounded-full text-red-500" 
             title="Delete Person"
          >
              <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white p-6 flex flex-col md:flex-row md:items-start items-center gap-6 border-b shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        <img 
          src={person.photo || `https://ui-avatars.com/api/?name=${person.name}&background=random`} 
          className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg z-0 shrink-0" 
        />
        <div className="text-center md:text-left flex-1 min-w-0 z-0 pt-2">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{person.name}</h1>
            <p className="text-indigo-600 font-medium text-lg flex items-center justify-center md:justify-start gap-1">
                {person.institute && <><Building2 className="w-4 h-4"/> {person.institute}</>}
            </p>
            
            <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                {person.phone && (
                    <a href={`tel:${person.phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 text-sm font-medium transition-colors">
                        <Phone className="w-4 h-4" /> {person.phone}
                    </a>
                )}
                {person.country && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-700 text-sm font-medium">
                        <MapPin className="w-4 h-4" /> {person.country}
                    </div>
                )}
                {person.linkedin && (
                    <a href={person.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-sm font-medium transition-colors">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                    </a>
                )}
            </div>
            {person.specialInfo && !isEditingSpecialInfo && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800 flex items-start gap-2 max-w-lg cursor-pointer hover:bg-yellow-100 transition-colors group" onClick={() => {
                    setSpecialInfoBuffer(person.specialInfo || '');
                    setIsEditingSpecialInfo(true);
                }}>
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{person.specialInfo}</p>
                    <Edit2 className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50" />
                </div>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white sticky top-[65px] md:top-0 z-10">
        {(['info', 'notes', 'relations'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:px-8 max-w-4xl mx-auto w-full">
        
        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-4">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2">Metadata</h3>
                <div className="space-y-2 text-sm">
                   <div className="flex justify-between py-1 border-b border-slate-50">
                       <span className="text-slate-500">Role</span>
                       <span className="font-medium">{person.relationships.find(r => r.targetId === 'SELF')?.type || 'Contact'}</span>
                   </div>
                   <div className="flex justify-between py-1 border-b border-slate-50">
                       <span className="text-slate-500">Since</span>
                       <span className="font-medium">{new Date(person.createdAt).toLocaleDateString()}</span>
                   </div>
                   <div className="flex justify-between py-1 border-b border-slate-50">
                       <span className="text-slate-500">Notes Count</span>
                       <span className="font-medium">{person.notes.length}</span>
                   </div>
                </div>
             </div>
             
             {/* Special Info Editor */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-500" /> Special Info
                    </h3>
                    {!isEditingSpecialInfo && (
                        <button onClick={() => {
                            setSpecialInfoBuffer(person.specialInfo || '');
                            setIsEditingSpecialInfo(true);
                        }} className="text-xs text-indigo-600 font-medium hover:underline">
                            Edit
                        </button>
                    )}
                 </div>
                 
                 {isEditingSpecialInfo ? (
                     <div className="animate-fade-in">
                         <textarea 
                            value={specialInfoBuffer}
                            onChange={(e) => setSpecialInfoBuffer(e.target.value)}
                            className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-yellow-300 outline-none mb-2"
                            rows={3}
                            placeholder="Add allergies, gift ideas, family details..."
                         />
                         <div className="flex justify-between items-center">
                             <span className="text-xs text-slate-400">{specialInfoBuffer.length} chars</span>
                             <div className="flex gap-2">
                                <button onClick={() => setIsEditingSpecialInfo(false)} className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-md">Cancel</button>
                                <button onClick={saveSpecialInfo} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md flex items-center gap-1 font-medium hover:bg-indigo-700">
                                    <Save className="w-3 h-3" /> Save Info
                                </button>
                             </div>
                         </div>
                     </div>
                 ) : (
                     <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {person.specialInfo || <span className="text-slate-400 italic">No special info added yet.</span>}
                     </p>
                 )}
             </div>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
               <div className="mb-2">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Meeting Date</label>
                 <input 
                   type="date" 
                   value={noteDate}
                   onChange={e => setNoteDate(e.target.value)}
                   className="w-full bg-slate-50 p-2 rounded-lg text-sm outline-none border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
               <textarea 
                  className="w-full text-sm outline-none resize-none bg-transparent placeholder-slate-400 border-b border-slate-100 pb-2 mb-1"
                  rows={3}
                  placeholder="Draft a new note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
               />
               <div className="flex justify-between items-center mt-2 pt-2">
                   <div />
                   <button 
                     onClick={addNote}
                     disabled={!newNote}
                     className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50"
                   >
                       Add Note
                   </button>
               </div>
            </div>

            <div className="space-y-3">
              {person.notes.map((note) => (
                <div key={note.id} className="relative bg-yellow-50 p-4 rounded-xl border border-yellow-100 shadow-sm group">
                  <div className="flex items-center gap-2 text-yellow-700/60 text-[10px] font-bold uppercase mb-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(note.date).toLocaleDateString()}
                  </div>
                  <p className="text-slate-800 text-sm whitespace-pre-wrap">{note.content}</p>
                  <button 
                     onClick={(e) => {
                         e.stopPropagation();
                         deleteNote(note.id);
                     }}
                     className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                      <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RELATIONS TAB */}
        {activeTab === 'relations' && (
          <div className="space-y-4 max-w-2xl">
            {isLinking ? (
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
                    <h4 className="font-bold text-sm mb-3">Link People</h4>
                    
                    {/* Search & Multi-select */}
                    <div className="mb-4">
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search by name or institute..."
                                value={linkSearch}
                                onChange={e => setLinkSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                            />
                        </div>
                        {linkSearch && (
                            <div className="max-h-40 overflow-y-auto border rounded-lg bg-slate-50 p-2 space-y-1 mb-2">
                                {candidates.length === 0 && <p className="text-xs text-slate-400 p-2">No matches found.</p>}
                                {candidates.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => handleToggleSelectLink(c.id)}
                                        className={`flex items-center p-2 rounded cursor-pointer ${selectedLinkIds.has(c.id) ? 'bg-indigo-100' : 'hover:bg-indigo-50'}`}
                                    >
                                        {selectedLinkIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-indigo-600 mr-2" /> : <Square className="w-4 h-4 text-slate-400 mr-2" />}
                                        <div className="text-sm">
                                            <span className="font-medium">{c.name}</span>
                                            <span className="text-slate-500 text-xs ml-2">({c.institute})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Selected Chips */}
                        {selectedLinkIds.size > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                {Array.from(selectedLinkIds).map(id => {
                                    const p = allPeople.find(per => per.id === id);
                                    if (!p) return null;
                                    return (
                                        <div key={id} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                            {p.name}
                                            <button onClick={() => handleToggleSelectLink(id)} className="hover:text-red-500 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                             <select
                                className="w-full p-2 bg-slate-50 text-sm rounded-lg border outline-none"
                                onChange={e => setLinkCategory(e.target.value as RelationshipType)}
                                value={linkCategory}
                            >
                                {Object.values(RelationshipType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        {linkCategory === RelationshipType.OTHER && (
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specify</label>
                                <input 
                                type="text"
                                value={linkCustom}
                                onChange={e => setLinkCustom(e.target.value)}
                                placeholder="e.g. Tennis Partner"
                                className="w-full p-2 bg-slate-50 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" 
                                />
                             </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note (Optional)</label>
                        <input 
                            type="text"
                            value={linkNote}
                            onChange={e => setLinkNote(e.target.value)}
                            placeholder="e.g. Met at Google I/O 2024"
                            className="w-full p-2 bg-slate-50 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={addRelationships} 
                            disabled={selectedLinkIds.size === 0}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Links ({selectedLinkIds.size})
                        </button>
                        <button onClick={() => setIsLinking(false)} className="px-4 py-2 text-slate-500 text-sm font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                    </div>
                </div>
            ) : (
                 <button 
                    onClick={() => setIsLinking(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4" /> Add Relationships
                </button>
            )}

            <div className="space-y-2">
                {displayedRelationships.map((rel) => (
                    <div key={rel.id} className="bg-white p-3 rounded-xl flex items-start gap-3 shadow-sm border border-slate-50 group hover:border-indigo-100 transition-colors">
                        <img src={rel.photo || `https://ui-avatars.com/api/?name=${rel.name}&background=random`} className="w-10 h-10 rounded-full object-cover mt-1" />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 hover:text-indigo-600 cursor-pointer" onClick={() => {
                                        // Optional: Navigate to that person?
                                    }}>{rel.name}</h4>
                                    <p className="text-xs text-slate-500">{rel.institute}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold whitespace-nowrap">
                                        {rel.relationType}
                                     </span>
                                     <button 
                                        onClick={(e) => removeRelationship(rel, e)}
                                        className="text-slate-300 hover:text-red-500 transition-all p-1"
                                        title="Remove Relationship"
                                     >
                                         <Trash2 className="w-3 h-3" />
                                     </button>
                                </div>
                            </div>
                            {rel.relationNote && (
                                <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 bg-slate-50 p-1.5 rounded inline-block">
                                    <LinkIcon className="w-3 h-3 text-slate-400" />
                                    {rel.relationNote}
                                </div>
                            )}
                            {!rel.isDirect && (
                                <div className="mt-1 text-[10px] text-slate-400 italic">
                                    Linked by {rel.name}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}