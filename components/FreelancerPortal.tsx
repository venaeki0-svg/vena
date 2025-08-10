
import React, { useState, useMemo } from 'react';
import { TeamMember, Project, TeamProjectPayment, FreelancerFeedback, Revision, RevisionStatus, PerformanceNoteType, TeamPaymentRecord, RewardLedgerEntry, PerformanceNote, SOP } from '../types';
import Modal from './Modal';
import { CalendarIcon, CreditCardIcon, MessageSquareIcon, ClockIcon, UsersIcon, FileTextIcon, MapPinIcon, HomeIcon, FolderKanbanIcon, StarIcon, DollarSignIcon, AlertCircleIcon, BookOpenIcon } from '../constants';
import StatCard from './StatCard';

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

interface FreelancerPortalProps {
    accessId: string;
    teamMembers: TeamMember[];
    projects: Project[];
    teamProjectPayments: TeamProjectPayment[];
    teamPaymentRecords: TeamPaymentRecord[];
    rewardLedgerEntries: RewardLedgerEntry[];
    showNotification: (message: string) => void;
    onUpdateRevision: (projectId: string, revisionId: string, updatedData: { freelancerNotes: string, driveLink: string, status: RevisionStatus }) => void;
    sops: SOP[];
}

const FreelancerPortal: React.FC<FreelancerPortalProps> = ({ accessId, teamMembers, projects, teamProjectPayments, teamPaymentRecords, rewardLedgerEntries, showNotification, onUpdateRevision, sops }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const freelancer = useMemo(() => teamMembers.find(m => m.portalAccessId === accessId), [teamMembers, accessId]);
    const assignedProjects = useMemo(() => projects.filter(p => p.team.some(t => t.memberId === freelancer?.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [projects, freelancer]);
    
    if (!freelancer) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
                <div className="w-full max-w-lg p-8 text-center bg-brand-surface rounded-2xl shadow-lg">
                    <h1 className="text-2xl font-bold text-brand-danger">Portal Tidak Ditemukan</h1>
                    <p className="mt-4 text-brand-text-primary">Tautan yang Anda gunakan tidak valid. Silakan hubungi admin.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'dashboard', label: 'Dasbor', icon: HomeIcon },
        { id: 'projects', label: 'Proyek & Revisi', icon: FolderKanbanIcon },
        { id: 'payments', label: 'Pembayaran', icon: CreditCardIcon },
        { id: 'performance', label: 'Kinerja', icon: StarIcon },
        { id: 'sop', label: 'SOP', icon: BookOpenIcon },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab freelancer={freelancer} projects={assignedProjects} teamProjectPayments={teamProjectPayments} />;
            case 'projects': return <ProjectsTab projects={assignedProjects} onProjectClick={setSelectedProject} freelancerId={freelancer.id} />;
            case 'payments': return <PaymentsTab freelancer={freelancer} projects={projects} teamProjectPayments={teamProjectPayments} teamPaymentRecords={teamPaymentRecords} />;
            case 'performance': return <PerformanceTab freelancer={freelancer} rewardLedgerEntries={rewardLedgerEntries} />;
            case 'sop': return <SOPsTab sops={sops} assignedProjects={assignedProjects} />;
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text-primary p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 p-6 bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                    <h1 className="text-3xl font-bold text-gradient">Portal Freelancer</h1>
                    <p className="text-lg text-brand-text-secondary mt-2">Selamat Datang, {freelancer.name}!</p>
                </header>
                <div className="border-b border-brand-border mb-6"><nav className="-mb-px flex space-x-6 overflow-x-auto">{tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><tab.icon className="w-5 h-5"/> {tab.label}</button>))}</nav></div>
                <main>{renderTabContent()}</main>
                <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={`Detail Proyek: ${selectedProject?.projectName}`} size="3xl">
                    {selectedProject && <ProjectDetailModal project={selectedProject} freelancer={freelancer} onUpdateRevision={onUpdateRevision} showNotification={showNotification} onClose={() => setSelectedProject(null)} />}
                </Modal>
            </div>
        </div>
    );
};


// --- SUB-COMPONENTS ---

const DashboardTab: React.FC<{freelancer: TeamMember, projects: Project[], teamProjectPayments: TeamProjectPayment[]}> = ({ freelancer, projects, teamProjectPayments }) => {
    const stats = useMemo(() => {
        const unpaidFee = teamProjectPayments.filter(p => p.teamMemberId === freelancer.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
        const pendingRevisions = projects.flatMap(p => p.revisions || []).filter(r => r.freelancerId === freelancer.id && r.status === RevisionStatus.PENDING).length;
        const upcomingProjects = projects.filter(p => new Date(p.date) >= new Date() && new Date(p.date).getTime() < new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
        return { unpaidFee, pendingRevisions, upcomingProjects, activeProjects: projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan').length };
    }, [freelancer, projects, teamProjectPayments]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={<AlertCircleIcon className="w-6 h-6"/>} title="Fee Belum Dibayar" value={formatCurrency(stats.unpaidFee)} iconBgColor="bg-red-500/20" iconColor="text-red-400" />
                <StatCard icon={<FolderKanbanIcon className="w-6 h-6"/>} title="Proyek Aktif" value={stats.activeProjects.toString()} iconBgColor="bg-blue-500/20" iconColor="text-blue-400" />
                <StatCard icon={<ClockIcon className="w-6 h-6"/>} title="Revisi Menunggu" value={stats.pendingRevisions.toString()} iconBgColor="bg-purple-500/20" iconColor="text-purple-400" />
            </div>
             <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                <h3 className="text-xl font-bold text-brand-text-light mb-4">Jadwal Proyek Mendatang (7 Hari)</h3>
                <div className="space-y-3">
                    {stats.upcomingProjects.length > 0 ? stats.upcomingProjects.map(p => (<div key={p.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center"><div><p className="font-semibold text-brand-text-light">{p.projectName}</p><p className="text-sm text-brand-text-secondary">{p.location}</p></div><p className="text-sm font-medium text-brand-text-primary">{formatDate(p.date)}</p></div>)) : <p className="text-center text-brand-text-secondary py-8">Tidak ada jadwal dalam 7 hari ke depan.</p>}
                </div>
            </div>
        </div>
    );
};

const ProjectsTab: React.FC<{projects: Project[], onProjectClick: (p: Project) => void, freelancerId: string}> = ({ projects, onProjectClick, freelancerId }) => (
    <div className="space-y-4">
        {projects.map(p => {
            const pendingRevisionsCount = (p.revisions || []).filter(r => r.freelancerId === freelancerId && r.status === RevisionStatus.PENDING).length;
            const assignmentDetails = p.team.find(t => t.memberId === freelancerId);
            return (
                 <div key={p.id} onClick={() => onProjectClick(p)} className="p-4 bg-brand-surface rounded-xl border border-brand-border cursor-pointer hover:border-brand-accent flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-lg text-brand-text-light">{p.projectName}</h3>
                        <p className="text-sm text-brand-text-secondary mt-1">{p.clientName} - {formatDate(p.date)}</p>
                        {assignmentDetails?.subJob && (
                            <p className="text-xs font-semibold text-brand-accent mt-2 bg-brand-accent/10 px-2 py-1 rounded-md inline-block">{assignmentDetails.subJob}</p>
                        )}
                    </div>
                    {pendingRevisionsCount > 0 && <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0"><ClockIcon className="w-4 h-4"/>{pendingRevisionsCount} Menunggu Update</span>}
                </div>
            );
        })}
        {projects.length === 0 && <div className="bg-brand-surface p-6 rounded-2xl text-center"><p className="text-brand-text-secondary py-8">Anda belum ditugaskan ke proyek manapun.</p></div>}
    </div>
);

const PaymentsTab: React.FC<{freelancer: TeamMember, projects: Project[], teamProjectPayments: TeamProjectPayment[], teamPaymentRecords: TeamPaymentRecord[]}> = ({ freelancer, projects, teamProjectPayments, teamPaymentRecords }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
        <h2 className="text-xl font-bold text-brand-text-light mb-4">Riwayat Pembayaran</h2>
        <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-brand-input"><tr><th className="p-3 text-left">Proyek</th><th className="p-3 text-left">Tanggal</th><th className="p-3 text-right">Fee</th><th className="p-3 text-right">Hadiah</th><th className="p-3 text-center">Status</th></tr></thead>
            <tbody className="divide-y divide-brand-border">
                {teamProjectPayments.filter(p => p.teamMemberId === freelancer.id).map(p => (<tr key={p.id}>
                    <td className="p-3 font-semibold text-brand-text-light">{projects.find(proj => proj.id === p.projectId)?.projectName || 'N/A'}</td>
                    <td className="p-3 text-brand-text-secondary">{formatDate(p.date)}</td>
                    <td className="p-3 text-right font-medium text-brand-text-primary">{formatCurrency(p.fee)}</td>
                    <td className="p-3 text-right font-medium text-yellow-400">{formatCurrency(p.reward || 0)}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-1 text-xs font-medium rounded-full ${p.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.status === 'Paid' ? 'Lunas' : 'Belum Lunas'}</span></td>
                </tr>))}
            </tbody>
        </table></div>
    </div>
);

const PerformanceTab: React.FC<{freelancer: TeamMember, rewardLedgerEntries: RewardLedgerEntry[]}> = ({ freelancer, rewardLedgerEntries }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border text-center">
                <h3 className="text-lg font-bold text-brand-text-light mb-2">Peringkat Kinerja</h3>
                <div className="flex justify-center items-center gap-2"><StarIcon className="w-8 h-8 text-yellow-400 fill-current" /><p className="text-3xl font-bold text-brand-text-light">{freelancer.rating.toFixed(1)} / 5.0</p></div>
            </div>
             <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border text-center">
                <h3 className="text-lg font-bold text-brand-text-light mb-2">Saldo Hadiah</h3>
                <div className="flex justify-center items-center gap-2"><DollarSignIcon className="w-8 h-8 text-yellow-400" /><p className="text-3xl font-bold text-brand-text-light">{formatCurrency(freelancer.rewardBalance)}</p></div>
            </div>
        </div>
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
            <h3 className="text-xl font-bold text-brand-text-light mb-4">Catatan Kinerja dari Admin</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {freelancer.performanceNotes.map(note => (<div key={note.id} className={`p-4 rounded-lg border-l-4 ${note.type === PerformanceNoteType.PRAISE ? 'border-green-400 bg-green-500/5' : 'border-yellow-400 bg-yellow-500/5'}`}>
                    <p className="text-sm text-brand-text-primary italic">"{note.note}"</p>
                    <p className="text-right text-xs text-brand-text-secondary mt-2">- {formatDate(note.date)}</p>
                </div>))}
                {freelancer.performanceNotes.length === 0 && <p className="text-center text-brand-text-secondary py-8">Belum ada catatan kinerja.</p>}
            </div>
        </div>
    </div>
);

const SOPsTab: React.FC<{sops: SOP[], assignedProjects: Project[]}> = ({ sops, assignedProjects }) => {
    const [viewingSop, setViewingSop] = useState<SOP | null>(null);
    const relevantCategories = useMemo(() => new Set(assignedProjects.map(p => p.projectType)), [assignedProjects]);

    const relevantSops = sops.filter(sop => relevantCategories.has(sop.category));
    const otherSops = sops.filter(sop => !relevantCategories.has(sop.category));

    return (
        <div className="space-y-6">
            {relevantSops.length > 0 && (
                <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h2 className="text-xl font-bold text-brand-text-light mb-4">SOP Relevan untuk Proyek Anda</h2>
                    <div className="space-y-3">
                        {relevantSops.map(sop => (
                            <div key={sop.id} onClick={() => setViewingSop(sop)} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-brand-input">
                                <div className="flex items-center gap-3">
                                    <BookOpenIcon className="w-5 h-5 text-brand-accent"/>
                                    <p className="font-semibold text-brand-text-light">{sop.title}</p>
                                </div>
                                <span className="text-xs font-medium bg-brand-input text-brand-text-secondary px-2 py-1 rounded-full">{sop.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                <h2 className="text-xl font-bold text-brand-text-light mb-4">Semua SOP</h2>
                 <div className="space-y-3">
                    {otherSops.map(sop => (
                        <div key={sop.id} onClick={() => setViewingSop(sop)} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center cursor-pointer hover:bg-brand-input">
                            <div className="flex items-center gap-3">
                                <BookOpenIcon className="w-5 h-5 text-brand-accent"/>
                                <p className="font-semibold text-brand-text-light">{sop.title}</p>
                            </div>
                            <span className="text-xs font-medium bg-brand-input text-brand-text-secondary px-2 py-1 rounded-full">{sop.category}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <Modal isOpen={!!viewingSop} onClose={() => setViewingSop(null)} title={viewingSop?.title || ''} size="4xl">
                {viewingSop && (
                    <div className="prose prose-sm md:prose-base prose-invert max-w-none max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: viewingSop.content.replace(/\n/g, '<br />') }}>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const ProjectDetailModal: React.FC<{project: Project, freelancer: TeamMember, onUpdateRevision: any, showNotification: any, onClose: any}> = ({ project, freelancer, onUpdateRevision, showNotification, onClose }) => {
     const [revisionUpdateForm, setRevisionUpdateForm] = useState<{ [revisionId: string]: { freelancerNotes: string; driveLink: string } }>({});
     const handleRevisionFormChange = (revisionId: string, field: 'freelancerNotes' | 'driveLink', value: string) => {
        setRevisionUpdateForm(prev => ({ ...prev, [revisionId]: { ...prev[revisionId], [field]: value } }));
    };
    const handleRevisionSubmit = (revision: Revision) => {
        const formData = revisionUpdateForm[revision.id];
        if (!formData || !formData.driveLink) { alert('Harap isi tautan Google Drive hasil revisi.'); return; }
        onUpdateRevision(project.id, revision.id, { freelancerNotes: formData.freelancerNotes || '', driveLink: formData.driveLink || '', status: RevisionStatus.COMPLETED });
        showNotification('Update revisi telah berhasil dikirim!');
        onClose();
    };

    const assignmentDetails = project.team.find(t => t.memberId === freelancer.id);

    return (
        <div className="space-y-6">
            <div><h4 className="font-semibold text-gradient mb-2">Informasi Umum</h4><div className="text-sm space-y-2 p-3 bg-brand-bg rounded-lg">
                {assignmentDetails && <p><strong>Peran Anda:</strong> {assignmentDetails.role} {assignmentDetails.subJob && <span className="text-brand-text-secondary">({assignmentDetails.subJob})</span>}</p>}
                <p><strong>Klien:</strong> {project.clientName}</p>
                <p><strong>Lokasi:</strong> {project.location}</p>
                <p><strong>Waktu:</strong> {project.startTime || 'N/A'} - {project.endTime || 'N/A'}</p>
                <p><strong>Brief/Moodboard:</strong> {project.driveLink ? <a href={project.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Buka Tautan</a> : 'N/A'}</p>
                {project.notes && <p className="whitespace-pre-wrap mt-2 pt-2 border-t border-brand-border"><strong>Catatan:</strong> {project.notes}</p>}
            </div></div>
            <div><h4 className="font-semibold text-gradient mb-2">Tugas Revisi Anda</h4><div className="space-y-3">
                {(project.revisions || []).filter(r => r.freelancerId === freelancer.id).map(rev => (<div key={rev.id} className="p-4 bg-brand-bg rounded-lg">
                    <p className="text-xs text-brand-text-secondary">Deadline: {formatDate(rev.deadline)}</p>
                    <p className="text-sm my-2 p-3 bg-brand-input rounded-md whitespace-pre-wrap"><strong>Catatan dari Admin:</strong><br/>{rev.adminNotes}</p>
                    {rev.status === RevisionStatus.COMPLETED ? (<div className="p-3 bg-green-500/10 rounded-md text-sm"><p className="font-semibold text-green-400">Revisi Selesai</p></div>) : (<form onSubmit={(e) => { e.preventDefault(); handleRevisionSubmit(rev); }} className="space-y-3 pt-3 border-t border-brand-border">
                        <div className="input-group"><textarea onChange={e => handleRevisionFormChange(rev.id, 'freelancerNotes', e.target.value)} defaultValue={rev.freelancerNotes} rows={2} className="input-field" placeholder=" "/><label className="input-label">Catatan Tambahan (Opsional)</label></div>
                        <div className="input-group"><input type="url" onChange={e => handleRevisionFormChange(rev.id, 'driveLink', e.target.value)} defaultValue={rev.driveLink} className="input-field" placeholder=" " required /><label className="input-label">Tautan Google Drive Hasil Revisi</label></div>
                        <button type="submit" className="button-primary w-full">Tandai Selesai & Kirim</button>
                    </form>)}
                </div>))}
                {(project.revisions || []).filter(r => r.freelancerId === freelancer.id).length === 0 && <p className="text-sm text-center text-brand-text-secondary py-4">Tidak ada tugas revisi untuk proyek ini.</p>}
            </div></div>
        </div>
    );
}

export default FreelancerPortal;
