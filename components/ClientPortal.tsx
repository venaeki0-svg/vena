import React, { useState, useMemo, useEffect } from 'react';
import { Client, Project, ClientFeedback, SatisfactionLevel, Contract, Transaction, TransactionType, Profile, Package, QRCodeRecord, ClientType, ProjectStatusConfig } from '../types';
import { FolderKanbanIcon, ClockIcon, MapPinIcon, CalendarIcon, StarIcon, SmileIcon, DownloadIcon, UsersIcon, FileTextIcon, HistoryIcon, HomeIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon, PrinterIcon, QrCodeIcon, BriefcaseIcon, PencilIcon, CheckSquareIcon, CheckCircleIcon, UserCheckIcon } from '../constants';
import Modal from './Modal';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const generateSHA256 = async (data: string): Promise<string> => {
    const textAsBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

interface ClientPortalProps {
    accessId: string;
    clients: Client[];
    projects: Project[];
    contracts: Contract[];
    transactions: Transaction[];
    setClientFeedback: React.Dispatch<React.SetStateAction<ClientFeedback[]>>;
    showNotification: (message: string) => void;
    profile: Profile;
    packages: Package[];
    qrCodes: QRCodeRecord[];
    onClientConfirmation: (projectId: string, stage: 'editing' | 'printing' | 'delivery') => void;
    onClientSubStatusConfirmation: (projectId: string, subStatusName: string, note: string) => void;
}

const getSatisfactionFromRating = (rating: number): SatisfactionLevel => {
    if (rating >= 5) return SatisfactionLevel.VERY_SATISFIED;
    if (rating >= 4) return SatisfactionLevel.SATISFIED;
    if (rating >= 3) return SatisfactionLevel.NEUTRAL;
    return SatisfactionLevel.UNSATISFIED;
};

const getIconForStatus = (statusName: string) => {
    const lowerCaseName = statusName.toLowerCase();
    if (lowerCaseName.includes('konfirmasi') || lowerCaseName.includes('setuju') || lowerCaseName.includes('dp')) {
        return UserCheckIcon;
    }
    if (lowerCaseName.includes('persiapan') || lowerCaseName.includes('briefing') || lowerCaseName.includes('survey')) {
        return BriefcaseIcon;
    }
    if (lowerCaseName.includes('edit') || lowerCaseName.includes('revisi') || lowerCaseName.includes('seleksi')) {
        return PencilIcon;
    }
    if (lowerCaseName.includes('cetak') || lowerCaseName.includes('album')) {
        return PrinterIcon;
    }
    if (lowerCaseName.includes('selesai') || lowerCaseName.includes('kirim')) {
        return CheckSquareIcon;
    }
    return FolderKanbanIcon; // Default icon
};


const ClientPortal: React.FC<ClientPortalProps> = ({ accessId, clients, projects, contracts, transactions, setClientFeedback, showNotification, profile, packages, qrCodes, onClientConfirmation, onClientSubStatusConfirmation }) => {
    
    const client = useMemo(() => clients.find(c => c.portalAccessId === accessId), [clients, accessId]);
    
    const [activeTab, setActiveTab] = useState(client?.clientType === ClientType.VENDOR ? 'journey' : 'dashboard');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [invoiceToView, setInvoiceToView] = useState<Project | null>(null);
    const [showDigitalSignature, setShowDigitalSignature] = useState(false);
    
    const clientProjects = useMemo(() => projects.filter(p => p.clientId === client?.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [projects, client]);
    const clientContracts = useMemo(() => contracts.filter(c => c.clientId === client?.id), [contracts, client]);
    const clientTransactions = useMemo(() => transactions.filter(t => clientProjects.some(p => p.id === t.projectId) && t.type === TransactionType.INCOME), [transactions, clientProjects]);

    const stats = useMemo(() => {
        const totalValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
        const totalPaid = clientProjects.reduce((sum, p) => sum + p.amountPaid, 0);
        const remaining = totalValue - totalPaid;
        const upcomingProjects = clientProjects.filter(p => new Date(p.date) >= new Date() && p.status !== 'Selesai');
        return { totalValue, totalPaid, remaining, upcomingProjects };
    }, [clientProjects]);
    
     useEffect(() => {
        if (invoiceToView) {
            const generateQrCode = async () => {
                if (!client) return;
                const project = invoiceToView;
                const dataToSign = {
                    jenis_qr: "Verifikasi Invoice Digital",
                    no_invoice: `INV-${project.id.slice(-6)}`,
                    klien: client.name,
                    proyek: project.projectName,
                    total_tagihan: formatCurrency(project.totalCost),
                    sisa_tagihan: formatCurrency(project.totalCost - project.amountPaid),
                    tanggal_terbit: new Date().toISOString(),
                };

                const signatureText = qrCodes[0] && typeof qrCodes[0].content === 'string' ? qrCodes[0].content : 'Digitally Signed by Vena Pictures';
                const dataString = JSON.stringify(dataToSign);
                const hash = await generateSHA256(dataString);
                const finalQrData = JSON.stringify({
                    pesan_tanda_tangan: signatureText,
                    data_verifikasi: dataToSign,
                    kode_verifikasi: hash
                });
                
                const verificationUrl = `${window.location.origin}${window.location.pathname}#/verify-signature?data=${encodeURIComponent(finalQrData)}`;

                setTimeout(() => {
                    const qrCodeContainer = document.getElementById('portal-invoice-qrcode-container');
                    if (qrCodeContainer) {
                        qrCodeContainer.innerHTML = '';
                        if (typeof (window as any).QRCode !== 'undefined') {
                            new (window as any).QRCode(qrCodeContainer, {
                                text: verificationUrl,
                                width: 80,
                                height: 80,
                                colorDark: "#000000",
                                colorLight: "#ffffff",
                                correctLevel: 2 // H
                            });
                        }
                    }
                }, 100);
            };
            generateQrCode();
        }
    }, [invoiceToView, client, transactions, qrCodes]);


    if (!client) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
                <div className="w-full max-w-lg p-8 text-center bg-brand-surface rounded-2xl shadow-lg">
                    <h1 className="text-2xl font-bold text-brand-danger">Portal Tidak Ditemukan</h1>
                    <p className="mt-4 text-brand-text-primary">Tautan yang Anda gunakan tidak valid atau sudah tidak berlaku.</p>
                </div>
            </div>
        );
    }
    
    const allTabs = [
        { id: 'dashboard', label: 'Dasbor', icon: HomeIcon, type: ClientType.DIRECT },
        { id: 'projects', label: 'Proyek', icon: FolderKanbanIcon, type: ClientType.DIRECT },
        { id: 'journey', label: 'Perjalanan Proyek', icon: TrendingUpIcon, type: 'all' },
        { id: 'contracts', label: 'Kontrak', icon: FileTextIcon, type: ClientType.DIRECT },
        { id: 'payments', label: 'Pembayaran', icon: HistoryIcon, type: ClientType.DIRECT },
        { id: 'terms', label: 'Syarat & Ketentuan', icon: FileTextIcon, type: 'all' },
    ];
    
    const visibleTabs = allTabs.filter(tab => tab.type === 'all' || tab.type === client.clientType);
    
    const renderInvoiceBody = () => {
        if (!invoiceToView || !client) return null;
        const project = invoiceToView;
        const selectedPackage = packages.find(p => p.id === project.packageId);
        
        return (
            <div id="invoice-content" className="p-1">
                <div className="printable-content bg-white p-8 font-sans text-gray-800">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{profile.companyName}</h1>
                            <p className="text-gray-500">{profile.address}</p>
                            <p className="text-gray-500">{profile.website}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-semibold text-gray-400 uppercase tracking-widest">INVOICE</h2>
                            <p className="text-gray-500 mt-1">No: INV-{project.id.slice(-6)}</p>
                            <p className="text-gray-500">Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-50 printable-bg-gray p-4 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">Ditagihkan Kepada</h3>
                            <p className="font-bold text-gray-900">{client.name}</p>
                            <p className="text-gray-600 text-sm">{client.email}</p>
                        </div>
                        <div className="bg-gray-50 printable-bg-gray p-4 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">Diterbitkan Oleh</h3>
                            <p className="font-bold text-gray-900">{profile.companyName}</p>
                            <p className="text-gray-600 text-sm">{profile.email}</p>
                        </div>
                        <div className="bg-blue-500 printable-bg-blue text-white printable-text-white p-4 rounded-lg text-center">
                            <h3 className="text-sm font-semibold text-blue-100 mb-1">Jumlah Tagihan</h3>
                            <p className="font-bold text-3xl">{formatCurrency(project.totalCost - project.amountPaid)}</p>
                            <p className="text-xs text-blue-200 mt-1">Jatuh Tempo: {new Date(project.date).toLocaleDateString('id-ID')}</p>
                        </div>
                    </div>
                    <table className="w-full text-left mb-8">
                        <thead><tr><th className="p-3">Deskripsi</th><th className="p-3 text-center">Jml</th><th className="p-3 text-right">Harga</th><th className="p-3 text-right">Total</th></tr></thead>
                        <tbody>
                            <tr><td className="p-3"><p className="font-semibold">{project.packageName}</p><p className="text-xs text-gray-500">{selectedPackage?.digitalItems.join(', ')}</p></td><td className="p-3 text-center">1</td><td className="p-3 text-right">{formatCurrency(selectedPackage?.price || 0)}</td><td className="p-3 text-right">{formatCurrency(selectedPackage?.price || 0)}</td></tr>
                            {project.addOns.map(addon => (<tr key={addon.id}><td className="p-3 pl-6 text-gray-600">- {addon.name}</td><td className="p-3 text-center">1</td><td className="p-3 text-right">{formatCurrency(addon.price)}</td><td className="p-3 text-right">{formatCurrency(addon.price)}</td></tr>))}
                        </tbody>
                    </table>
                    <div className="flex justify-between items-start">
                         <div className={`transition-opacity duration-300 ${showDigitalSignature ? 'opacity-100' : 'opacity-0'}`}>
                            <h4 className="font-semibold text-gray-600">Tanda Tangan Digital</h4>
                            <div className="flex flex-col items-center">
                                <div id="portal-invoice-qrcode-container" className="mt-2 p-1 bg-white inline-block"></div>
                                {showDigitalSignature && qrCodes[0] && typeof qrCodes[0].content === 'string' && <p className="text-[8px] text-gray-500 max-w-[100px] text-center mt-1">{qrCodes[0].content}</p>}
                            </div>
                        </div>
                        <div className="w-2/5 space-y-2"><div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{formatCurrency(project.totalCost)}</span></div><div className="flex justify-between"><span className="text-gray-500">Telah Dibayar</span><span className="font-semibold">{formatCurrency(project.amountPaid)}</span></div><div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2 mt-2"><span >Sisa Tagihan</span><span>{formatCurrency(project.totalCost - project.amountPaid)}</span></div></div>
                    </div>
                </div>
            </div>
        );
    };


    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardTab client={client} stats={stats} setClientFeedback={setClientFeedback} showNotification={showNotification} />;
            case 'projects':
                return <ProjectsTab projects={clientProjects} onProjectClick={setSelectedProject} projectStatusConfig={profile.projectStatusConfig} />;
            case 'journey':
                return <ProjectJourneyTab projects={clientProjects} onClientConfirmation={onClientConfirmation} onClientSubStatusConfirmation={onClientSubStatusConfirmation} projectStatusConfig={profile.projectStatusConfig} />;
            case 'contracts':
                return <ContractsTab contracts={clientContracts} projects={clientProjects} />;
            case 'payments':
                return <PaymentsTab transactions={clientTransactions} projects={clientProjects} onViewInvoice={setInvoiceToView} />;
            case 'terms':
                return <TermsTab terms={profile.termsAndConditions} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text-primary p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 p-6 bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                    <h1 className="text-3xl font-bold text-gradient">Vena Pictures</h1>
                    <p className="text-lg text-brand-text-secondary mt-2">Selamat Datang di Portal Klien, {client.name}!</p>
                </header>

                 <div className="border-b border-brand-border mb-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {visibleTabs.map(tab => (
                             <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}>
                                <tab.icon className="w-5 h-5"/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                
                <main>{renderTabContent()}</main>

                <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={`Detail Proyek: ${selectedProject?.projectName}`} size="3xl">
                    {selectedProject && <ProjectDetailModal project={selectedProject} transactions={transactions} projectStatusConfig={profile.projectStatusConfig} />}
                </Modal>
                
                {invoiceToView && <Modal isOpen={!!invoiceToView} onClose={() => setInvoiceToView(null)} title={`Invoice: ${invoiceToView.projectName}`} size="4xl"><div className="printable-area">{renderInvoiceBody()}</div><div className="mt-6 text-right non-printable space-x-2"><button type="button" onClick={() => setShowDigitalSignature(prev => !prev)} className="button-secondary inline-flex items-center gap-2"><QrCodeIcon className="w-4 h-4"/>{showDigitalSignature ? 'Sembunyikan' : 'Tambah'} Tanda Tangan Digital</button><button onClick={() => window.print()} className="button-primary inline-flex items-center gap-2"><PrinterIcon className="w-4 h-4"/>Cetak</button></div></Modal>}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS FOR TABS ---

const DashboardTab: React.FC<{client: Client, stats: any, setClientFeedback: any, showNotification: any}> = ({ client, stats, setClientFeedback, showNotification }) => {
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    
    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!client || !feedbackMessage.trim()) return;

        setIsSubmittingFeedback(true);
        const newFeedback: ClientFeedback = {
            id: `FB-${client.id}-${Date.now()}`, clientName: client.name,
            satisfaction: getSatisfactionFromRating(feedbackRating), rating: feedbackRating,
            feedback: feedbackMessage, date: new Date().toISOString(),
        };
        
        setClientFeedback((prev: any) => [newFeedback, ...prev]);
        showNotification('Terima kasih! Masukan Anda telah kami terima.');
        
        setTimeout(() => {
            setFeedbackMessage(''); setFeedbackRating(5); setIsSubmittingFeedback(false);
        }, 500);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h2 className="text-xl font-bold text-brand-text-light mb-4">Ringkasan Keuangan</h2>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-brand-bg rounded-lg"><p className="text-sm text-brand-text-secondary">Total Nilai Proyek</p><p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.totalValue)}</p></div>
                        <div className="p-4 bg-brand-bg rounded-lg"><p className="text-sm text-brand-text-secondary">Total Terbayar</p><p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalPaid)}</p></div>
                        <div className="p-4 bg-brand-bg rounded-lg"><p className="text-sm text-brand-text-secondary">Sisa Tagihan</p><p className="text-2xl font-bold text-red-400">{formatCurrency(stats.remaining)}</p></div>
                    </div>
                </div>
                <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h2 className="text-xl font-bold text-brand-text-light mb-4">Proyek Mendatang</h2>
                     <div className="space-y-3">
                        {stats.upcomingProjects.length > 0 ? stats.upcomingProjects.map((p: Project) => (
                            <div key={p.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                <div><p className="font-semibold text-brand-text-light">{p.projectName}</p><p className="text-sm text-brand-text-secondary">{p.location}</p></div>
                                <p className="text-sm font-medium text-brand-text-primary">{formatDate(p.date)}</p>
                            </div>
                        )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada proyek yang akan datang.</p>}
                    </div>
                </div>
            </div>
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border lg:sticky lg:top-8">
                <h2 className="text-xl font-bold text-brand-text-light mb-4">Berikan Masukan</h2>
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-brand-text-secondary">Peringkat Kepuasan</label>
                        <div className="flex items-center gap-2 mt-2">
                            {[1, 2, 3, 4, 5].map(star => (<button key={star} type="button" onClick={() => setFeedbackRating(star)} className={`p-1 ${feedbackRating >= star ? 'scale-110' : ''}`}><StarIcon className={`w-7 h-7 ${feedbackRating >= star ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} /></button>))}
                        </div>
                    </div>
                    <div className="input-group"><textarea id="feedbackMessage" value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} rows={4} className="input-field" placeholder=" " required /><label htmlFor="feedbackMessage" className="input-label">Saran & masukan...</label></div>
                    <button type="submit" className="button-primary w-full" disabled={isSubmittingFeedback}>{isSubmittingFeedback ? 'Mengirim...' : 'Kirim Masukan'}</button>
                </form>
            </div>
        </div>
    );
}

const ProjectsTab: React.FC<{projects: Project[], onProjectClick: (project: Project) => void, projectStatusConfig: ProjectStatusConfig[]}> = ({ projects, onProjectClick, projectStatusConfig }) => {
    const getSubStatusDisplay = (project: Project) => {
        if (project.activeSubStatuses?.length) {
            return `${project.status}: ${project.activeSubStatuses.join(', ')}`;
        }
        if (project.status === 'Dikirim' && project.shippingDetails) {
            return `Dikirim: ${project.shippingDetails}`;
        }
        return project.status;
    };
    
    const getStatusColor = (statusName: string) => {
        return projectStatusConfig.find(s => s.name === statusName)?.color || '#64748b';
    }

    return (
     <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
        <h2 className="text-xl font-bold text-brand-text-light mb-4">Semua Proyek Anda</h2>
        <div className="space-y-4">
            {projects.map(p => (
                <div key={p.id} onClick={() => onProjectClick(p)} className="p-4 bg-brand-bg rounded-xl border border-brand-border cursor-pointer hover:border-brand-accent">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-brand-text-light">{p.projectName}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full`} style={{ backgroundColor: `${getStatusColor(p.status)}20`, color: getStatusColor(p.status)}}>{getSubStatusDisplay(p)}</span>
                    </div>
                    <div className="w-full bg-brand-input rounded-full h-2.5 my-3"><div className="h-2.5 rounded-full" style={{ width: `${p.progress}%`, backgroundColor: getStatusColor(p.status) }}></div></div>
                    <div className="flex justify-between items-center text-sm text-brand-text-secondary">
                        <span>{formatDate(p.date)}</span>
                        <span>{formatCurrency(p.totalCost)}</span>
                    </div>
                </div>
            ))}
             {projects.length === 0 && <p className="text-center text-brand-text-secondary py-8">Anda belum memiliki proyek.</p>}
        </div>
    </div>
);
};

const ProjectJourneyTab: React.FC<{ projects: Project[], onClientConfirmation: (projectId: string, stage: 'editing' | 'printing' | 'delivery') => void, onClientSubStatusConfirmation: (projectId: string, subStatusName: string, note: string) => void, projectStatusConfig: ProjectStatusConfig[] }> = ({ projects, onClientConfirmation, onClientSubStatusConfirmation, projectStatusConfig }) => {
    const [confirmationModal, setConfirmationModal] = useState<{ projectId: string, subStatus: string } | null>(null);
    const [noteText, setNoteText] = useState('');

    if (projects.length === 0) {
        return <div className="bg-brand-surface p-6 rounded-2xl text-center"><p className="text-brand-text-secondary py-8">Anda belum memiliki proyek.</p></div>
    }

    const handleConfirmSubStatus = () => {
        if (confirmationModal) {
            onClientSubStatusConfirmation(confirmationModal.projectId, confirmationModal.subStatus, noteText);
            setConfirmationModal(null);
            setNoteText('');
        }
    };

    return (
        <div className="space-y-8">
            {projects.map(project => {
                const journeyStages = projectStatusConfig.filter(s => s.name !== 'Dibatalkan' && s.name !== 'Tertunda');
                const currentVisualIndex = journeyStages.findIndex(s => s.name === project.status);

                return (
                    <div key={project.id} className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                        <h2 className="text-xl font-bold text-brand-text-light mb-8">{project.projectName}</h2>
                        
                        <div className="relative pl-8">
                            {journeyStages.map((stage, index) => {
                                let stageState: 'completed' | 'current' | 'upcoming';
                                if (project.status === 'Selesai') {
                                    stageState = 'completed';
                                } else if (index < currentVisualIndex) {
                                    stageState = 'completed';
                                } else if (index === currentVisualIndex) {
                                    stageState = 'current';
                                } else {
                                    stageState = 'upcoming';
                                }
                                
                                const IconComponent = getIconForStatus(stage.name);

                                return (
                                    <div key={stage.id} className="relative pb-10 last:pb-0">
                                        {index < journeyStages.length - 1 && (
                                            <div className={`absolute top-4 -left-[2.1rem] w-0.5 h-full ${stageState === 'completed' ? 'bg-brand-accent' : 'bg-brand-border'}`}></div>
                                        )}
                                        <div className={`absolute -left-[2.5rem] w-8 h-8 rounded-full flex items-center justify-center
                                            ${stageState === 'completed' ? 'bg-brand-accent' : (stageState === 'current' ? 'bg-brand-accent ring-4 ring-brand-accent/30' : 'bg-brand-border border-4 border-brand-surface')}
                                        `}>
                                            <IconComponent className={`w-5 h-5 ${stageState === 'upcoming' ? 'text-brand-text-secondary' : 'text-white'}`} />
                                        </div>
                                        <div className={`ml-4 transition-opacity ${stageState === 'upcoming' ? 'opacity-50' : 'opacity-100'}`}>
                                            <h4 className={`font-bold ${stageState === 'current' ? 'text-brand-accent' : 'text-brand-text-light'}`}>{stage.name}</h4>
                                            <p className="text-sm text-brand-text-secondary mt-1">{stage.note}</p>
                                            
                                            {stageState === 'current' && project.activeSubStatuses && project.activeSubStatuses.length > 0 && (
                                                <div className="mt-4 space-y-3 pl-4 border-l-2 border-brand-border/50">
                                                    {project.activeSubStatuses.map(subStatus => {
                                                        const isConfirmed = project.confirmedSubStatuses?.includes(subStatus);
                                                        const note = project.clientSubStatusNotes?.[subStatus];
                                                        return (
                                                            <div key={subStatus} className="p-3 bg-brand-bg rounded-lg">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="font-semibold text-brand-text-light">{subStatus}</p>
                                                                    {isConfirmed ? (
                                                                        <span className="inline-flex items-center gap-2 text-sm text-green-400 font-semibold"><CheckCircleIcon className="w-5 h-5"/> Telah Dikonfirmasi</span>
                                                                    ) : (
                                                                        <button onClick={() => setConfirmationModal({ projectId: project.id, subStatus: subStatus })} className="button-secondary text-xs">Konfirmasi</button>
                                                                    )}
                                                                </div>
                                                                {isConfirmed && note && <p className="text-xs text-brand-text-secondary italic mt-2 pt-2 border-t border-brand-border">"{note}"</p>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            })}
             <Modal isOpen={!!confirmationModal} onClose={() => setConfirmationModal(null)} title={`Konfirmasi: ${confirmationModal?.subStatus}`}>
                <div className="space-y-4">
                    <p className="text-sm text-brand-text-secondary">Anda akan mengonfirmasi bahwa tahap "{confirmationModal?.subStatus}" telah selesai sesuai harapan. Anda dapat menambahkan catatan jika ada.</p>
                    <div className="input-group">
                        <textarea
                            id="confirmationNote"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="input-field"
                            placeholder=" "
                            rows={3}
                        />
                        <label htmlFor="confirmationNote" className="input-label">Catatan (Opsional)</label>
                    </div>
                     <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                        <button type="button" onClick={() => setConfirmationModal(null)} className="button-secondary">Batal</button>
                        <button type="button" onClick={handleConfirmSubStatus} className="button-primary">Kirim Konfirmasi</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const ContractsTab: React.FC<{contracts: Contract[], projects: Project[]}> = ({ contracts, projects }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
        <h2 className="text-xl font-bold text-brand-text-light mb-4">Dokumen Kontrak</h2>
        <div className="space-y-3">
            {contracts.map(c => {
                const project = projects.find(p => p.id === c.projectId);
                return (
                    <div key={c.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-brand-text-light">{c.contractNumber}</p>
                            <p className="text-sm text-brand-text-secondary">Proyek: {project?.projectName || 'N/A'}</p>
                        </div>
                        <p className="text-sm font-medium text-brand-text-primary">Ditandatangani: {formatDate(c.signingDate)}</p>
                    </div>
                );
            })}
             {contracts.length === 0 && <p className="text-center text-brand-text-secondary py-8">Tidak ada dokumen kontrak.</p>}
        </div>
    </div>
);

const PaymentsTab: React.FC<{transactions: Transaction[], projects: Project[], onViewInvoice: (project: Project) => void}> = ({ transactions, projects, onViewInvoice }) => (
     <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
        <h2 className="text-xl font-bold text-brand-text-light mb-4">Riwayat Pembayaran</h2>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-brand-input"><tr><th className="p-3 text-left font-semibold text-brand-text-secondary">Tanggal</th><th className="p-3 text-left font-semibold text-brand-text-secondary">Deskripsi</th><th className="p-3 text-left font-semibold text-brand-text-secondary">Proyek</th><th className="p-3 text-right font-semibold text-brand-text-secondary">Jumlah</th><th className="p-3 text-center font-semibold text-brand-text-secondary">Invoice</th></tr></thead>
                <tbody className="divide-y divide-brand-border">
                    {transactions.map(t => {
                        const project = projects.find(p => p.id === t.projectId);
                        return(
                            <tr key={t.id}>
                                <td className="p-3">{formatDate(t.date)}</td>
                                <td className="p-3">{t.description}</td>
                                <td className="p-3 text-brand-text-secondary">{project?.projectName || 'N/A'}</td>
                                <td className="p-3 text-right font-semibold text-green-400">{formatCurrency(t.amount)}</td>
                                <td className="p-3 text-center">{project && <button onClick={() => onViewInvoice(project)} className="text-brand-accent hover:underline text-xs font-semibold">Lihat</button>}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {transactions.length === 0 && <p className="text-center text-brand-text-secondary py-8">Belum ada riwayat pembayaran.</p>}
        </div>
    </div>
);

const TermsTab: React.FC<{ terms: string | undefined }> = ({ terms }) => {
    const formattedTerms = useMemo(() => {
        if (!terms) return null;
        return terms.split('\n').map((line, index) => {
            if (line.trim() === '') return <div key={index} className="h-4"></div>;
            const emojiRegex = /^(📜|📅|💰|📦|⏱|➕)\s/;
            if (emojiRegex.test(line)) {
                return <h3 key={index} className="text-lg font-semibold text-gradient mt-4 mb-2">{line}</h3>;
            }
            if (line.trim().startsWith('- ')) {
                 return <p key={index} className="ml-4 text-brand-text-primary">{line.trim().substring(2)}</p>;
            }
            return <p key={index} className="text-brand-text-primary">{line}</p>;
        });
    }, [terms]);
    
    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
            {formattedTerms ? (
                <div>{formattedTerms}</div>
            ) : (
                <p className="text-brand-text-secondary text-center py-8">Syarat dan ketentuan belum diatur oleh vendor.</p>
            )}
        </div>
    );
};

const ProjectDetailModal: React.FC<{project: Project, transactions: Transaction[], projectStatusConfig: ProjectStatusConfig[]}> = ({ project, transactions, projectStatusConfig }) => {
    const projectPayments = transactions.filter(t => t.projectId === project.id && t.type === TransactionType.INCOME);
    const getStatusColor = (statusName: string) => projectStatusConfig.find(s => s.name === statusName)?.color || '#64748b';
    
    return (
        <div className="space-y-4 text-sm">
            <div><p className="font-semibold text-brand-text-secondary">Status & Progress</p><div className="w-full bg-brand-input rounded-full h-2.5 mt-2"><div className="h-2.5 rounded-full" style={{ width: `${project.progress}%`, backgroundColor: getStatusColor(project.status) }}></div></div></div>
            <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-3 bg-brand-bg rounded-lg"><p className="text-xs text-brand-text-secondary">Total Biaya</p><p className="font-bold">{formatCurrency(project.totalCost)}</p></div>
                <div className="p-3 bg-brand-bg rounded-lg"><p className="text-xs text-brand-text-secondary">Telah Dibayar</p><p className="font-bold text-green-400">{formatCurrency(project.amountPaid)}</p></div>
                <div className="p-3 bg-brand-bg rounded-lg"><p className="text-xs text-brand-text-secondary">Sisa Tagihan</p><p className="font-bold text-red-400">{formatCurrency(project.totalCost - project.amountPaid)}</p></div>
            </div>
            
            <div className="pt-2"><p className="font-semibold text-brand-text-secondary">Tautan Penting</p>
                <div className="p-3 bg-brand-bg rounded-lg space-y-2 mt-2">
                    <p><strong>Moodboard/Brief:</strong> {project.driveLink ? <a href={project.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-2">Buka Tautan</a> : 'N/A'}</p>
                    <p><strong>File dari Klien:</strong> {project.clientDriveLink ? <a href={project.clientDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-2">Buka Tautan</a> : 'N/A'}</p>
                    <p><strong>File Hasil Jadi:</strong> {project.finalDriveLink ? <a href={project.finalDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-2">Buka Tautan</a> : 'Belum tersedia'}</p>
                </div>
            </div>
            
            {(project.revisions || []).length > 0 && <div className="pt-2"><p className="font-semibold text-brand-text-secondary">Informasi Revisi</p>
                <div className="space-y-2 mt-2">{project.revisions?.map(rev => (<div key={rev.id} className="p-3 bg-brand-bg rounded-lg"><p className="font-bold text-xs">{rev.status}</p><p className="mt-1"><strong>Catatan Admin:</strong> {rev.adminNotes}</p><p><strong>Catatan Freelancer:</strong> {rev.freelancerNotes || '-'}</p></div>))}</div>
            </div>}

            {projectPayments.length > 0 && <div className="pt-2"><p className="font-semibold text-brand-text-secondary">Riwayat Pembayaran Proyek Ini</p>
                <div className="p-3 bg-brand-bg rounded-lg mt-2">{projectPayments.map(t => (<div key={t.id} className="flex justify-between items-center py-1 border-b border-brand-border last:border-b-0"><p>{t.description}</p><p className="font-semibold text-green-400">{formatCurrency(t.amount)}</p></div>))}</div>
            </div>}
        </div>
    );
}

export default ClientPortal;
