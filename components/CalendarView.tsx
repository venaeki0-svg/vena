import React, { useState, useMemo, useEffect } from 'react';
import { Project, PaymentStatus, TeamMember, Profile, AssignedTeamMember, ProjectStatusConfig } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, UsersIcon, FileTextIcon, PlusIcon, MapPinIcon } from '../constants';
import Modal from './Modal';

interface CalendarViewProps {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    teamMembers: TeamMember[];
    profile: Profile;
}

const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

export const CalendarView: React.FC<CalendarViewProps> = ({ projects, setProjects, teamMembers, profile }) => {
    // STATE
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'Month' | 'Agenda'>('Month');
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Project | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [panelMode, setPanelMode] = useState<'detail' | 'edit'>('detail');
    
    // Filter state
    const [isClientProjectVisible, setIsClientProjectVisible] = useState(true);
    const [visibleEventTypes, setVisibleEventTypes] = useState<Set<string>>(() => new Set(profile.eventTypes));
    
    const initialFormState = useMemo(() => ({
        id: '',
        projectName: '',
        projectType: profile.eventTypes[0] || 'Lainnya',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        notes: '',
        team: [] as AssignedTeamMember[],
        image: ''
    }), [profile.eventTypes]);
    
    const [eventForm, setEventForm] = useState(initialFormState);
    
    useEffect(() => {
        setIsPanelOpen(false);
    }, [currentDate, viewMode]);
    
    // MEMOS
    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const lastDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

    const daysInMonth = useMemo(() => {
        const days = [];
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const endDate = new Date(lastDayOfMonth);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        let currentDatePointer = startDate;
        while (currentDatePointer <= endDate) {
            days.push(new Date(currentDatePointer));
            currentDatePointer.setDate(currentDatePointer.getDate() + 1);
        }
        return days;
    }, [firstDayOfMonth, lastDayOfMonth]);
    
    const filteredEvents = useMemo(() => {
        return projects.filter(p => {
            const isInternalEvent = profile.eventTypes.includes(p.projectType);
            if (isInternalEvent) {
                return visibleEventTypes.has(p.projectType);
            }
            // It's a client project
            return isClientProjectVisible;
        });
    }, [projects, visibleEventTypes, isClientProjectVisible, profile.eventTypes]);
    
     const agendaByDate = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const map = new Map<string, Project[]>();
        filteredEvents
            .filter(event => new Date(event.date) >= today)
            .sort((a,b) => {
                const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                if (dateDiff !== 0) return dateDiff;
                if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                return 0;
            })
            .forEach(event => {
                const dateKey = new Date(event.date).toDateString();
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(event);
            });
        return Array.from(map.entries());
    }, [filteredEvents]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, Project[]>();
        filteredEvents.forEach(p => {
            const dateKey = new Date(p.date).toDateString();
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(p);
        });
        return map;
    }, [filteredEvents]);
    
    // HANDLERS
    const handlePrev = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNext = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const openPanelForAdd = (date: Date) => {
        setSelectedEvent(null);
        setSelectedDate(date);
        setEventForm({
            ...initialFormState,
            date: date.toISOString().split('T')[0]
        });
        setPanelMode('edit');
        setIsPanelOpen(true);
    };

    const openPanelForEdit = (event: Project) => {
        setSelectedEvent(event);
        setSelectedDate(new Date(event.date));
        setEventForm({
            id: event.id,
            projectName: event.projectName,
            projectType: event.projectType,
            date: event.date,
            startTime: event.startTime || '',
            endTime: event.endTime || '',
            notes: event.notes || '',
            team: event.team || [],
            image: event.image || '',
        });
        setPanelMode('detail');
        setIsPanelOpen(true);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEventForm(prev => ({ ...prev, [name]: value }));
    };

    const handleTeamChange = (memberId: string) => {
        const member = teamMembers.find(m => m.id === memberId);
        if (!member) return;

        setEventForm(prev => {
            const isSelected = prev.team.some(t => t.memberId === memberId);
            if (isSelected) {
                return { ...prev, team: prev.team.filter(t => t.memberId !== memberId) };
            } else {
                return { ...prev, team: [...prev.team, { memberId: member.id, name: member.name, role: member.role, fee: member.standardFee, reward: 0 }] };
            }
        });
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isInternalEvent = profile.eventTypes.includes(eventForm.projectType);

        if (selectedEvent) { // Editing
            setProjects(prev => prev.map(p => {
                if (p.id === selectedEvent.id) {
                    const updatedEvent = {
                        ...p,
                        projectName: eventForm.projectName,
                        projectType: eventForm.projectType,
                        date: eventForm.date,
                        startTime: eventForm.startTime,
                        endTime: eventForm.endTime,
                        notes: eventForm.notes,
                        team: eventForm.team,
                        image: eventForm.image,
                    };
                    setSelectedEvent(updatedEvent); // Update selectedEvent in state for immediate detail view refresh
                    return updatedEvent;
                }
                return p;
            }));
            setPanelMode('detail'); // Switch back to detail view after editing
        } else { // Adding
            const newEvent: Project = {
                id: `EVT-${Date.now()}`,
                projectName: eventForm.projectName,
                clientName: isInternalEvent ? 'Acara Internal' : 'N/A',
                clientId: isInternalEvent ? 'INTERNAL' : 'N/A',
                projectType: eventForm.projectType,
                packageName: '', packageId: '', addOns: [],
                date: eventForm.date,
                deadlineDate: '', location: '',
                progress: isInternalEvent ? 100 : 0,
                status: 'Dikonfirmasi',
                totalCost: 0, amountPaid: 0, paymentStatus: PaymentStatus.LUNAS,
                team: eventForm.team,
                notes: eventForm.notes,
                startTime: eventForm.startTime,
                endTime: eventForm.endTime,
                image: eventForm.image,
            };
            setProjects(prev => [...prev, newEvent].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setIsPanelOpen(false);
        }
    };
    
    const handleDeleteEvent = () => {
        if (selectedEvent && window.confirm(`Yakin ingin menghapus acara "${selectedEvent.projectName}"?`)) {
            setProjects(prev => prev.filter(p => p.id !== selectedEvent.id));
            setIsPanelOpen(false);
        }
    };
    
    const toggleEventTypeVisibility = (eventType: string) => {
        setVisibleEventTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventType)) {
                newSet.delete(eventType);
            } else {
                newSet.add(eventType);
            }
            return newSet;
        });
    };
    
    const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    const eventTypeColors: { [key: string]: string } = {
        'Meeting Klien': '#3b82f6',
        'Survey Lokasi': '#22c55e',
        'Libur': '#94a3b8',
        'Workshop': '#a855f7',
        'Lainnya': '#eab308',
    };
    
    const getEventColor = (event: Project) => {
        const isInternal = profile.eventTypes.includes(event.projectType);
        if (isInternal) {
            return eventTypeColors[event.projectType] || '#64748b';
        }
        return profile.projectStatusConfig.find(s => s.name === event.status)?.color || '#64748b';
    };

    const renderForm = () => (
        <div className="p-6">
            <h3 className="text-lg font-semibold text-brand-text-light mb-6">{selectedEvent ? 'Edit Detail Acara' : 'Buat Acara Baru'}</h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                 <div className="input-group">
                    <input type="text" id="eventName" name="projectName" value={eventForm.projectName} onChange={handleFormChange} className="input-field" placeholder=" " required/>
                    <label htmlFor="eventName" className="input-label">Nama Acara</label>
                </div>
                <div className="input-group">
                    <select name="projectType" id="projectType" value={eventForm.projectType} onChange={handleFormChange} className="input-field">
                        {profile.eventTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <label htmlFor="projectType" className="input-label">Jenis Acara</label>
                </div>
                <div className="input-group">
                    <input type="date" id="eventDate" name="date" value={eventForm.date} onChange={handleFormChange} className="input-field" placeholder=" " required/>
                    <label htmlFor="eventDate" className="input-label">Tanggal</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="input-group">
                        <input type="time" id="startTime" name="startTime" value={eventForm.startTime} onChange={handleFormChange} className="input-field" placeholder=" " />
                        <label htmlFor="startTime" className="input-label">Mulai</label>
                    </div>
                    <div className="input-group">
                        <input type="time" id="endTime" name="endTime" value={eventForm.endTime} onChange={handleFormChange} className="input-field" placeholder=" "/>
                        <label htmlFor="endTime" className="input-label">Selesai</label>
                    </div>
                </div>
                <div className="input-group">
                    <input type="url" id="imageUrl" name="image" value={eventForm.image} onChange={handleFormChange} className="input-field" placeholder=" "/>
                    <label htmlFor="imageUrl" className="input-label">URL Gambar Sampul (Opsional)</label>
                </div>
                <div className="input-group">
                     <label className="input-label !static !-top-4 !text-brand-accent">Tim</label>
                     <div className="p-3 border border-brand-border bg-brand-bg rounded-md max-h-32 overflow-y-auto space-y-2 mt-2">
                         {teamMembers.map(member => (
                             <label key={member.id} className="flex items-center">
                                 <input type="checkbox" checked={eventForm.team.some(t => t.memberId === member.id)} onChange={() => handleTeamChange(member.id)} />
                                 <span className="ml-2 text-sm">{member.name}</span>
                             </label>
                         ))}
                     </div>
                </div>
                <div className="input-group">
                    <textarea name="notes" id="eventNotes" value={eventForm.notes} onChange={handleFormChange} className="input-field" rows={3} placeholder=" "></textarea>
                    <label htmlFor="eventNotes" className="input-label">Catatan</label>
                </div>
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-brand-border">
                    {selectedEvent && (<button type="button" onClick={handleDeleteEvent} className="text-brand-danger hover:underline text-sm font-semibold">Hapus Acara</button>)}
                    <div className="flex-grow text-right space-x-2">
                        <button type="button" onClick={panelMode === 'edit' && selectedEvent ? () => setPanelMode('detail') : () => setIsPanelOpen(false)} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{selectedEvent ? 'Update' : 'Simpan'}</button>
                    </div>
                </div>
            </form>
        </div>
    );

    const renderDetailView = () => (
        <div className="flex-1 flex flex-col">
            {selectedEvent?.image && <img src={selectedEvent.image} alt={selectedEvent.projectName} className="w-full h-48 object-cover" />}
            <div className="p-6 flex-1">
                 <h3 className="text-xl font-semibold text-brand-text-light">{selectedEvent?.projectName}</h3>
                 <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block" style={{ backgroundColor: `${getEventColor(selectedEvent!)}30`, color: getEventColor(selectedEvent!) }}>
                    {selectedEvent?.projectType}
                 </span>

                 <div className="mt-6 space-y-5 text-sm">
                    <div className="flex items-start gap-4">
                        <ClockIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5"/>
                        <p className="text-brand-text-primary font-medium">{new Date(selectedEvent!.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} <br/>
                        <span className="text-brand-text-secondary">{selectedEvent!.startTime && selectedEvent!.endTime ? `${selectedEvent!.startTime} - ${selectedEvent!.endTime}` : 'Sepanjang hari'}</span>
                        </p>
                    </div>
                    
                    {selectedEvent!.location && (
                        <div className="flex items-start gap-4">
                            <MapPinIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5"/>
                            <p className="text-brand-text-primary font-medium">{selectedEvent!.location}</p>
                        </div>
                    )}
                    
                    {selectedEvent!.team.length > 0 && (
                        <div className="flex items-start gap-4"><UsersIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5"/>
                            <div>
                                <p className="font-medium text-brand-text-light mb-2">Tim yang Bertugas</p>
                                <div className="flex items-center -space-x-2">
                                    {selectedEvent!.team.map(t => (
                                        <div key={t.memberId} className="w-8 h-8 rounded-full bg-brand-input flex items-center justify-center text-xs font-bold text-brand-text-secondary border-2 border-brand-surface" title={t.name}>
                                            {getInitials(t.name)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedEvent!.notes && <div className="flex items-start gap-4"><FileTextIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5"/><p className="text-brand-text-primary whitespace-pre-wrap">{selectedEvent!.notes}</p></div>}
                </div>
            </div>
             <div className="p-6 border-t border-brand-border">
                 <button onClick={() => setPanelMode('edit')} className="button-primary w-full">Edit Detail Acara</button>
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-brand-surface rounded-2xl overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-64 border-r border-brand-border p-4 flex-col hidden lg:flex">
                 <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center font-bold text-brand-text-secondary">
                        {getInitials(profile.fullName)}
                     </div>
                     <div>
                         <p className="font-semibold text-sm text-brand-text-light">{profile.fullName.split(' ')[0]}</p>
                         <p className="text-xs text-brand-text-secondary">{profile.email}</p>
                     </div>
                 </div>
                 <button onClick={() => openPanelForAdd(new Date())} className="button-primary w-full mb-6 inline-flex items-center justify-center gap-2">
                     <PlusIcon className="w-5 h-5" />
                     Buat Acara
                 </button>
                 
                 <h3 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-2">Filter Kalender</h3>
                 <div className="space-y-1">
                    <label className="flex items-center p-2 rounded-lg hover:bg-brand-bg cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded" checked={isClientProjectVisible} onChange={() => setIsClientProjectVisible(prev => !prev)} style={{accentColor: '#ef4444'}} />
                        <span className="ml-2 text-sm font-medium text-brand-text-light">Proyek Klien</span>
                    </label>
                    {profile.eventTypes.map(type => (
                         <label key={type} className="flex items-center p-2 rounded-lg hover:bg-brand-bg cursor-pointer">
                             <input type="checkbox" className="h-4 w-4 rounded" checked={visibleEventTypes.has(type)} onChange={() => toggleEventTypeVisibility(type)} style={{accentColor: eventTypeColors[type] || '#94a3b8'}}/>
                             <span className="w-2 h-2 rounded-full ml-2" style={{backgroundColor: eventTypeColors[type] || '#94a3b8'}}></span>
                             <span className="ml-2 text-sm font-medium text-brand-text-light">{type}</span>
                         </label>
                    ))}
                 </div>
            </div>
            
            <div className="flex-1 flex flex-row overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <div className="flex-shrink-0 p-4 flex items-center justify-between border-b border-brand-border">
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrev} className="p-2 rounded-full hover:bg-brand-input"><ChevronLeftIcon className="w-5 h-5"/></button>
                            <button onClick={handleNext} className="p-2 rounded-full hover:bg-brand-input"><ChevronRightIcon className="w-5 h-5"/></button>
                            <h2 className="text-lg font-semibold text-brand-text-light ml-2 hidden sm:block">{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                        </div>
                        <button onClick={handleToday} className="button-secondary px-3 py-1.5 text-sm">Hari Ini</button>
                        <div className="p-1 bg-brand-bg rounded-lg hidden sm:flex">
                            {(['Month', 'Agenda'] as const).map(v => (<button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === v ? 'bg-brand-surface shadow-sm' : 'text-brand-text-secondary'}`}>{v}</button>))}
                        </div>
                    </div>
                    
                    <div className="flex-1">
                        {viewMode === 'Month' ? (
                             <div className="grid grid-cols-7 flex-grow h-full">
                                {weekdays.map(day => (<div key={day} className="text-center py-2 text-xs font-semibold text-brand-text-secondary border-b border-l border-brand-border">{day}</div>))}
                                {daysInMonth.map((day, i) => {
                                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    const events = eventsByDate.get(day.toDateString()) || [];
                                    return (
                                        <div key={i} onClick={() => openPanelForAdd(day)} className={`relative border-b border-l border-brand-border p-1.5 flex flex-col min-h-[120px] ${isCurrentMonth ? 'bg-brand-surface' : 'bg-brand-bg'} cursor-pointer hover:bg-brand-input transition-colors`}>
                                            <span className={`text-xs font-semibold self-start mb-1 ${isCurrentMonth ? 'text-brand-text-light' : 'text-brand-text-secondary/50'} ${isToday ? 'bg-brand-text-light text-brand-bg rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>{day.getDate()}</span>
                                            <div className="flex-grow space-y-1 overflow-hidden">
                                                {events.map(event => {
                                                    const bgColor = getEventColor(event);
                                                    return (
                                                        <div key={event.id} onClick={(e) => { e.stopPropagation(); openPanelForEdit(event); }} className="text-xs p-1.5 rounded text-white truncate cursor-pointer" style={{ backgroundColor: bgColor }}>
                                                            {event.image && <img src={event.image} alt={event.projectName} className="h-4 w-full object-cover rounded-sm mb-1"/>}
                                                            <p className="font-semibold truncate">{event.projectName}</p>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : ( // Agenda View
                             <div className="p-4 md:p-6">
                                {agendaByDate.map(([dateString, eventsOnDate]) => (
                                    <div key={dateString} className="mb-8">
                                        <h3 className="font-semibold text-brand-text-light mb-4">{new Date(dateString).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                                        <div className="relative pl-8 border-l-2 border-brand-border">
                                            {eventsOnDate.map(event => {
                                                const bgColor = getEventColor(event);
                                                return (
                                                    <div key={event.id} className="relative mb-6">
                                                        <div className="absolute -left-[3.1rem] top-1 text-xs text-brand-text-secondary">{event.startTime}</div>
                                                        <div className="absolute -left-[0.6rem] top-1 w-4 h-4 rounded-full border-4 border-brand-surface" style={{backgroundColor: bgColor}}></div>
                                                        <div onClick={() => openPanelForEdit(event)} className="ml-4 p-4 rounded-lg cursor-pointer hover:bg-brand-input" style={{ border: `1px solid ${bgColor}40`, backgroundColor: `${bgColor}10` }}>
                                                            <h4 className="font-semibold text-brand-text-light">{event.projectName}</h4>
                                                            <p className="text-sm text-brand-text-secondary">{event.projectType}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                                 {agendaByDate.length === 0 && <p className="text-center text-brand-text-secondary py-16">Tidak ada acara mendatang.</p>}
                            </div>
                        )}
                    </div>
                </div>
                
                 {/* Right Panel */}
                <div className={`flex-shrink-0 w-full md:w-96 border-l border-brand-border flex flex-col bg-brand-surface transform transition-transform duration-300 ease-in-out ${isPanelOpen ? 'translate-x-0' : 'translate-x-full absolute right-0'}`}>
                    <div className="p-4 border-b border-brand-border">
                        <button onClick={() => setIsPanelOpen(false)} className="p-2 rounded-full hover:bg-brand-input">
                            <ChevronRightIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {panelMode === 'detail' && selectedEvent ? renderDetailView() : renderForm()}
                    </div>
                </div>
            </div>
        </div>
    );
};
