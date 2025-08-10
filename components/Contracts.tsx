
import React, { useState, useMemo, useEffect } from 'react';
import { Contract, Client, Project, Profile, NavigationAction, QRCodeRecord, Package } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import { PlusIcon, EyeIcon, PencilIcon, Trash2Icon, PrinterIcon, QrCodeIcon } from '../constants';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return '[Tanggal belum diisi]';
    return new Date(dateString).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
};

const generateSHA256 = async (data: string): Promise<string> => {
    const textAsBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};


const initialFormState: Omit<Contract, 'id' | 'contractNumber' | 'clientId' | 'projectId' | 'createdAt'> = {
    signingDate: new Date().toISOString().split('T')[0],
    signingLocation: '',
    clientName1: '',
    clientAddress1: '',
    clientPhone1: '',
    clientName2: '',
    clientAddress2: '',
    clientPhone2: '',
    shootingDuration: '',
    guaranteedPhotos: '',
    albumDetails: '',
    digitalFilesFormat: 'JPG High-Resolution',
    otherItems: '',
    personnelCount: '',
    deliveryTimeframe: '30 hari kerja',
    dpDate: '',
    finalPaymentDate: '',
    cancellationPolicy: 'DP yang sudah dibayarkan tidak dapat dikembalikan.\nJika pembatalan dilakukan H-7 sebelum hari pelaksanaan, PIHAK KEDUA wajib membayar 50% dari total biaya.',
    jurisdiction: ''
};

interface ContractsProps {
    contracts: Contract[];
    setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
    clients: Client[];
    projects: Project[];
    profile: Profile;
    showNotification: (message: string) => void;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    qrCodes: QRCodeRecord[];
    packages: Package[];
}

const Contracts: React.FC<ContractsProps> = ({ contracts, setContracts, clients, projects, profile, showNotification, initialAction, setInitialAction, qrCodes, packages }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

    // Form specific state
    const [formData, setFormData] = useState(initialFormState);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [showDigitalSignature, setShowDigitalSignature] = useState(false);
    
    const availableProjects = useMemo(() => {
        return projects.filter(p => p.clientId === selectedClientId);
    }, [selectedClientId, projects]);
    
    // Auto-populate form when project is selected
    useEffect(() => {
        if (selectedProjectId) {
            const project = projects.find(p => p.id === selectedProjectId);
            const client = clients.find(c => c.id === project?.clientId);
            if (project && client) {
                const pkg = packages.find(p => p.id === project.packageId); // Find package
                const clientNames = client.name.split(/&|,/);
                setFormData(prev => ({
                    ...prev,
                    clientName1: clientNames[0]?.trim() || client.name,
                    clientPhone1: client.phone,
                    clientAddress1: project.location,
                    clientName2: clientNames[1]?.trim() || '',
                    clientPhone2: client.phone,
                    clientAddress2: project.location,
                    jurisdiction: project.location.split(',')[0] || '',
                    signingLocation: profile.address,
                    dpDate: project.amountPaid > 0 ? new Date().toISOString().split('T')[0] : '',
                    finalPaymentDate: project.date ? new Date(new Date(project.date).setDate(new Date(project.date).getDate() - 7)).toISOString().split('T')[0] : '',
                    // Auto-populate scope from project
                    shootingDuration: pkg?.processingTime || 'Sesuai detail paket',
                    guaranteedPhotos: pkg?.digitalItems.find(item => item.toLowerCase().includes('foto edit')) || 'Sesuai detail paket',
                    albumDetails: pkg?.physicalItems.map(item => item.name).join(', ') || 'Tidak ada',
                    digitalFilesFormat: pkg?.digitalItems.find(item => item.toLowerCase().includes('file')) || 'JPG High-Resolution',
                    otherItems: project.addOns.map(a => a.name).join(', ') || 'Tidak ada',
                    personnelCount: [pkg?.photographers, pkg?.videographers].filter(Boolean).join(', ') || 'Sesuai detail paket',
                }));
            }
        }
    }, [selectedProjectId, projects, clients, profile.address, packages]);

    // Handle initial action from another page (e.g., Clients page)
    useEffect(() => {
        if (initialAction) {
            if (initialAction.type === 'CREATE_CONTRACT_FOR_CLIENT' && initialAction.id) {
                handleOpenModal('add');
                setSelectedClientId(initialAction.id);
            }
            if (initialAction.type === 'VIEW_CONTRACT' && initialAction.id) {
                const contractToView = contracts.find(c => c.id === initialAction.id);
                if (contractToView) {
                    handleViewContract(contractToView);
                }
            }
            setInitialAction(null);
        }
    }, [initialAction, contracts, setInitialAction]);
    
    useEffect(() => {
        const qrCodeContainer = document.getElementById('contract-signature-qr');
        if (isViewModalOpen && selectedContract && showDigitalSignature && qrCodeContainer) {
            const generateQrCode = async () => {
                const signatureQr = qrCodes[0];
                if (!signatureQr) {
                    qrCodeContainer.innerHTML = '<span class="text-xs text-red-500">QR Tanda Tangan tidak tersedia</span>';
                    return;
                }

                const dataToSign = {
                    jenis_qr: "Verifikasi Kontrak Digital",
                    no_kontrak: selectedContract.contractNumber,
                    klien: selectedContract.clientName1,
                    proyek: projects.find(p => p.id === selectedContract.projectId)?.projectName || 'N/A',
                    tanggal_ttd: selectedContract.signingDate
                };

                const signatureText = typeof signatureQr.content === 'string' ? signatureQr.content : 'Digitally Signed by Vena Pictures';
                const dataString = JSON.stringify(dataToSign);
                const hash = await generateSHA256(dataString);
                const finalQrData = JSON.stringify({
                    pesan_tanda_tangan: signatureText,
                    data_verifikasi: dataToSign,
                    kode_verifikasi: hash
                });
                
                const verificationUrl = `${window.location.origin}${window.location.pathname}#/verify-signature?data=${encodeURIComponent(finalQrData)}`;

                const container = document.getElementById('contract-signature-qr');
                if (container && typeof (window as any).QRCode !== 'undefined') {
                    container.innerHTML = '';
                    new (window as any).QRCode(container, {
                        text: verificationUrl,
                        width: 100,
                        height: 100,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: 2
                    });
                }
            };
            setTimeout(generateQrCode, 100); 
        }
    }, [isViewModalOpen, selectedContract, showDigitalSignature, qrCodes, projects, clients]);


    const handleOpenModal = (mode: 'add' | 'edit', contract?: Contract) => {
        setModalMode(mode);
        if (mode === 'edit' && contract) {
            setSelectedContract(contract);
            setFormData(contract);
            setSelectedClientId(contract.clientId);
            setSelectedProjectId(contract.projectId);
        } else {
            setSelectedContract(null);
            setFormData(initialFormState);
            setSelectedClientId('');
            setSelectedProjectId('');
        }
        setIsFormModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsFormModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedContract(null);
        setShowDigitalSignature(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const contractNumber = selectedContract?.contractNumber || `VP/CTR/${new Date().getFullYear()}/${String(contracts.length + 1).padStart(3, '0')}`;

        if (modalMode === 'add') {
            const newContract: Contract = {
                id: `CTR${Date.now()}`,
                contractNumber,
                clientId: selectedClientId,
                projectId: selectedProjectId,
                createdAt: new Date().toISOString(),
                ...formData,
            };
            setContracts(prev => [...prev, newContract]);
            showNotification(`Kontrak ${contractNumber} berhasil dibuat.`);
        } else if (modalMode === 'edit' && selectedContract) {
            const updatedContract = {
                 ...selectedContract,
                 ...formData,
                 clientId: selectedClientId,
                 projectId: selectedProjectId,
            }
            setContracts(prev => prev.map(c => c.id === selectedContract.id ? updatedContract : c));
            showNotification(`Kontrak ${selectedContract.contractNumber} berhasil diperbarui.`);
        }
        handleCloseModal();
    };
    
    const handleDelete = (contractId: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus kontrak ini?")) {
            setContracts(prev => prev.filter(c => c.id !== contractId));
            showNotification('Kontrak berhasil dihapus.');
        }
    };
    
    const handleViewContract = (contract: Contract) => {
        setSelectedContract(contract);
        setShowDigitalSignature(false);
        setIsViewModalOpen(true);
    };

    const renderContractContent = (contract: Contract) => {
        const client = clients.find(c => c.id === contract.clientId);
        const project = projects.find(p => p.id === contract.projectId);
        if (!client || !project) return <p>Data klien atau proyek tidak ditemukan.</p>;
        
        return (
            <div className="printable-content bg-white text-black p-8 font-serif leading-relaxed printable-area text-sm">
                <h2 className="text-xl font-bold text-center mb-1">SURAT PERJANJIAN KERJA SAMA</h2>
                <h3 className="text-lg font-bold text-center mb-6">JASA FOTOGRAFI PERNIKAHAN</h3>
                <p>Pada hari ini, {formatDate(contract.signingDate)}, bertempat di {contract.signingLocation}, telah dibuat dan disepakati perjanjian kerja sama antara:</p>

                <div className="my-4">
                    <p className="font-bold">PIHAK PERTAMA</p>
                    <table>
                        <tbody>
                            <tr><td className="pr-4 align-top">Nama</td><td>: {profile.fullName}</td></tr>
                            <tr><td className="pr-4 align-top">Jabatan</td><td>: Pemilik Usaha</td></tr>
                            <tr><td className="pr-4 align-top">Alamat</td><td>: {profile.address}</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {profile.phone}</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Identitas</td><td>: {profile.idNumber}</td></tr>
                        </tbody>
                    </table>
                    <p className="mt-1">Dalam hal ini bertindak atas nama perusahaannya, {profile.companyName}, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>
                </div>

                <div className="my-4">
                    <p className="font-bold">PIHAK KEDUA</p>
                    <table>
                        <tbody>
                            <tr><td className="pr-4 align-top">Nama</td><td>: {contract.clientName1}</td></tr>
                            <tr><td className="pr-4 align-top">Alamat</td><td>: {contract.clientAddress1}</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {contract.clientPhone1}</td></tr>
                            {contract.clientName2 && <>
                            <tr><td className="pr-4 align-top font-bold pt-2"></td><td className="pt-2"></td></tr>
                            <tr><td className="pr-4 align-top">Nama</td><td>: {contract.clientName2}</td></tr>
                            <tr><td className="pr-4 align-top">Alamat</td><td>: {contract.clientAddress2}</td></tr>
                            <tr><td className="pr-4 align-top">Nomor Telepon</td><td>: {contract.clientPhone2}</td></tr>
                            </>}
                        </tbody>
                    </table>
                    <p className="mt-1">Dalam hal ini bertindak atas nama pribadi/bersama sebagai pasangan calon pengantin, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
                </div>
                
                {/* PASAL-PASAL */}
                <div className="space-y-4 mt-6">
                    <div><h4 className="font-bold text-center">PASAL 1: DEFINISI</h4><p>Pekerjaan adalah jasa fotografi pernikahan yang diberikan oleh PIHAK PERTAMA untuk acara PIHAK KEDUA. Hari Pelaksanaan adalah tanggal {formatDate(project.date)}. Lokasi Pelaksanaan adalah {project.location}.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 2: RUANG LINGKUP PEKERJAAN</h4><p>PIHAK PERTAMA akan memberikan jasa fotografi sesuai dengan paket {project.packageName} yang mencakup: Durasi pemotretan {contract.shootingDuration}, Jumlah foto {contract.guaranteedPhotos}, {contract.albumDetails}, File digital {contract.digitalFilesFormat}, dan {contract.otherItems}. PIHAK PERTAMA akan menyediakan {contract.personnelCount}. Penyerahan hasil akhir dilakukan maksimal {contract.deliveryTimeframe} setelah acara.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 3: HAK DAN KEWAJIBAN PIHAK PERTAMA</h4><p><strong>Hak:</strong> Menerima pembayaran sesuai kesepakatan; Menggunakan hasil foto untuk promosi/portofolio dengan persetujuan PIHAK KEDUA. <strong>Kewajiban:</strong> Melaksanakan pekerjaan secara profesional; Menyerahkan hasil tepat waktu; Menjaga privasi PIHAK KEDUA.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 4: HAK DAN KEWAJIBAN PIHAK KEDUA</h4><p><strong>Hak:</strong> Menerima hasil pekerjaan sesuai paket; Meminta revisi minor jika ada kesalahan teknis. <strong>Kewajiban:</strong> Melakukan pembayaran sesuai jadwal; Memberikan informasi yang dibutuhkan; Menjamin akses kerja di lokasi.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 5: BIAYA DAN CARA PEMBAYARAN</h4><p>Total biaya jasa adalah sebesar {formatCurrency(project.totalCost)}. Pembayaran dilakukan dengan sistem: Uang Muka (DP) sebesar {formatCurrency(project.amountPaid)} dibayarkan pada {formatDate(contract.dpDate)}; Pelunasan sebesar {formatCurrency(project.totalCost - project.amountPaid)} dibayarkan paling lambat pada {formatDate(contract.finalPaymentDate)}. Pembayaran dapat ditransfer ke rekening: {profile.bankAccount}.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 6: PEMBATALAN</h4><p className="whitespace-pre-wrap">{contract.cancellationPolicy}</p></div>
                    <div><h4 className="font-bold text-center">PASAL 7: PENYELESAIAN SENGKETA</h4><p>Segala sengketa yang timbul akan diselesaikan secara musyawarah. Apabila tidak tercapai, maka akan diselesaikan secara hukum di wilayah hukum {contract.jurisdiction}.</p></div>
                    <div><h4 className="font-bold text-center">PASAL 8: PENUTUP</h4><p>Demikian surat perjanjian ini dibuat dalam 2 (dua) rangkap bermaterai cukup dan mempunyai kekuatan hukum yang sama, ditandatangani dengan penuh kesadaran oleh kedua belah pihak.</p></div>
                </div>

                <div className="flex justify-between items-end mt-16">
                    <div className="text-center w-2/5">
                        <p>PIHAK PERTAMA</p>
                        <div className="h-[108px] w-full mx-auto my-1 flex flex-col items-center justify-center text-gray-400 text-xs">
                             {showDigitalSignature ? (
                                <>
                                    <div id="contract-signature-qr"></div>
                                    {qrCodes[0] && typeof qrCodes[0].content === 'string' && <p className="text-[8px] text-gray-500 max-w-[100px] text-center mt-1">{qrCodes[0].content}</p>}
                                </>
                            ) : (
                                <span>Materai Rp10.000</span>
                            )}
                        </div>
                        <p className="border-t-2 border-dotted w-4/5 mx-auto pt-1">({profile.fullName})</p>
                    </div>
                     <div className="text-center w-2/5">
                        <p>PIHAK KEDUA</p>
                        <div className="h-28 border-b-2 border-dotted w-4/5 mx-auto my-1 flex items-center justify-center text-gray-400 text-xs">Materai Rp10.000</div>
                        <p>({contract.clientName1}{contract.clientName2 ? ` & ${contract.clientName2}` : ''})</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Manajemen Kontrak Kerja" subtitle="Buat, kelola, dan cetak semua kontrak kerja klien Anda.">
                <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Buat Kontrak Baru
                </button>
            </PageHeader>
            
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">No. Kontrak</th>
                                <th className="px-6 py-4 font-medium">Klien</th>
                                <th className="px-6 py-4 font-medium">Proyek</th>
                                <th className="px-6 py-4 font-medium">Tgl. Dibuat</th>
                                <th className="px-6 py-4 font-medium text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {contracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-brand-bg">
                                    <td className="px-6 py-4 font-semibold text-brand-text-light">{contract.contractNumber}</td>
                                    <td className="px-6 py-4">{clients.find(c => c.id === contract.clientId)?.name}</td>
                                    <td className="px-6 py-4">{projects.find(p => p.id === contract.projectId)?.projectName}</td>
                                    <td className="px-6 py-4">{new Date(contract.createdAt).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => handleViewContract(contract)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Lihat & Cetak"><EyeIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleOpenModal('edit', contract)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDelete(contract.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {contracts.length === 0 && <p className="text-center py-10 text-brand-text-secondary">Belum ada kontrak yang dibuat.</p>}
                </div>
            </div>

            <Modal isOpen={isFormModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Buat Kontrak Baru' : 'Edit Kontrak'} size="5xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        <div>
                            <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Data Awal</h4>
                            <div className="input-group"><select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="input-field" required><option value="">Pilih Klien...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label className="input-label">Klien</label></div>
                            <div className="input-group"><select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="input-field" required disabled={!selectedClientId}><option value="">Pilih Proyek...</option>{availableProjects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}</select><label className="input-label">Proyek</label></div>
                            
                            <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 mt-6 mb-4">Detail Pihak Kedua (1)</h4>
                             <div className="input-group"><input type="text" name="clientName1" value={formData.clientName1} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Nama Klien 1</label></div>
                             <div className="input-group"><input type="text" name="clientAddress1" value={formData.clientAddress1} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Alamat Klien 1</label></div>
                             <div className="input-group"><input type="text" name="clientPhone1" value={formData.clientPhone1} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Telepon Klien 1</label></div>
                            
                            <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 mt-6 mb-4">Detail Pihak Kedua (2) - Opsional</h4>
                             <div className="input-group"><input type="text" name="clientName2" value={formData.clientName2} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Nama Klien 2</label></div>
                             <div className="input-group"><input type="text" name="clientAddress2" value={formData.clientAddress2} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Alamat Klien 2</label></div>
                             <div className="input-group"><input type="text" name="clientPhone2" value={formData.clientPhone2} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Telepon Klien 2</label></div>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Pasal 2: Lingkup Pekerjaan</h4>
                            <div className="input-group"><input type="text" name="shootingDuration" value={formData.shootingDuration} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Durasi Pemotretan</label></div>
                            <div className="input-group"><input type="text" name="guaranteedPhotos" value={formData.guaranteedPhotos} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Foto Dijamin</label></div>
                            <div className="input-group"><input type="text" name="albumDetails" value={formData.albumDetails} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Detail Album Cetak</label></div>
                            <div className="input-group"><input type="text" name="digitalFilesFormat" value={formData.digitalFilesFormat} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Format File Digital</label></div>
                            <div className="input-group"><input type="text" name="otherItems" value={formData.otherItems} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Item Lainnya (e.g., Video)</label></div>
                            <div className="input-group"><input type="text" name="personnelCount" value={formData.personnelCount} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Jumlah Personel</label></div>
                            <div className="input-group"><input type="text" name="deliveryTimeframe" value={formData.deliveryTimeframe} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Waktu Penyerahan Hasil</label></div>
                           
                            <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 mt-6 mb-4">Pasal Lainnya</h4>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="input-group"><input type="date" name="dpDate" value={formData.dpDate} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Tanggal Pembayaran DP</label></div>
                               <div className="input-group"><input type="date" name="finalPaymentDate" value={formData.finalPaymentDate} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Tanggal Pelunasan</label></div>
                               <div className="input-group"><input type="date" name="signingDate" value={formData.signingDate} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Tanggal TTD</label></div>
                               <div className="input-group"><input type="text" name="signingLocation" value={formData.signingLocation} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Lokasi TTD</label></div>
                            </div>
                             <div className="input-group"><input type="text" name="jurisdiction" value={formData.jurisdiction} onChange={handleFormChange} className="input-field" placeholder=" "/><label className="input-label">Wilayah Hukum (Sengketa)</label></div>
                             <div className="input-group"><textarea name="cancellationPolicy" value={formData.cancellationPolicy} onChange={handleFormChange} className="input-field" rows={4} placeholder=" "/><label className="input-label">Kebijakan Pembatalan</label></div>
                        </div>
                     </div>
                    
                     <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Kontrak' : 'Update Kontrak'}</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isViewModalOpen} onClose={handleCloseModal} title={`Detail Kontrak: ${selectedContract?.contractNumber}`} size="4xl">
                {selectedContract && (
                    <div>
                        <div className="printable-area max-h-[65vh] overflow-y-auto pr-4">
                            {renderContractContent(selectedContract)}
                        </div>
                        <div className="mt-6 text-right non-printable space-x-2 border-t border-brand-border pt-4">
                            <button type="button" onClick={() => setShowDigitalSignature(p => !p)} className="button-secondary inline-flex items-center gap-2">
                                <QrCodeIcon className="w-4 h-4"/>
                                {showDigitalSignature ? 'Sembunyikan' : 'Tampilkan'} Tanda Tangan Digital
                            </button>
                            <button type="button" onClick={() => window.print()} className="button-primary inline-flex items-center gap-2">
                                <PrinterIcon className="w-4 h-4"/> Cetak / Simpan PDF
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Contracts;