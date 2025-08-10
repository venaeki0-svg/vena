import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import { DownloadIcon, PencilIcon } from '../constants';
import { QRCodeRecord } from '../types';
import Modal from './Modal';

interface QRCodeGeneratorProps {
    qrCodes: QRCodeRecord[];
    setQrCodes: React.Dispatch<React.SetStateAction<QRCodeRecord[]>>;
    showNotification: (message: string) => void;
}

const formatQrContent = (qr: QRCodeRecord): string => {
    if (typeof qr.content === 'string') {
        return qr.content;
    }
    if (qr.type === 'vcard') {
        const { name = '', phone = '', email = '', company = '' } = qr.content;
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${company}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
    }
    if (qr.type === 'wifi') {
        const { ssid = '', password = '', encryption = 'WPA' } = qr.content;
        return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
    }
    return '';
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ qrCodes, setQrCodes, showNotification }) => {
    const signatureQrCode = qrCodes[0];
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editedContent, setEditedContent] = useState('');

    useEffect(() => {
        if (signatureQrCode) {
            const qrContainer = document.createElement('div');
            if (typeof (window as any).QRCode !== 'undefined') {
                new (window as any).QRCode(qrContainer, {
                    text: formatQrContent(signatureQrCode),
                    width: 256,
                    height: 256,
                    colorDark: "#020617",
                    colorLight: "#ffffff",
                    correctLevel: 2 // H for high
                });
                const canvas = qrContainer.querySelector('canvas');
                if (canvas) {
                    setQrDataUrl(canvas.toDataURL('image/png'));
                }
            }
        }
    }, [signatureQrCode]);

    const handleDownload = () => {
        if (qrDataUrl) {
            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = 'tanda-tangan-digital-resmi.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleOpenEditModal = () => {
        if (signatureQrCode) {
            setEditedContent(typeof signatureQrCode.content === 'string' ? signatureQrCode.content : '');
            setIsEditModalOpen(true);
        }
    };

    const handleSaveChanges = () => {
        if (signatureQrCode) {
            const updatedQrCodes = qrCodes.map(qr => 
                qr.id === signatureQrCode.id ? { ...qr, content: editedContent } : qr
            );
            setQrCodes(updatedQrCodes);
            showNotification('Konten QR Code berhasil diperbarui.');
            setIsEditModalOpen(false);
        }
    };
    
    if (!signatureQrCode) {
        return (
            <div>
                <PageHeader title="Tanda Tangan Digital Resmi" subtitle="Gunakan QR Code ini untuk verifikasi digital pada dokumen resmi." />
                <p className="text-center text-brand-text-secondary py-10">QR Code tanda tangan digital tidak ditemukan.</p>
            </div>
        );
    }
    
    return (
        <div>
            <PageHeader title="Tanda Tangan Digital Resmi" subtitle="Gunakan QR Code ini untuk verifikasi digital pada dokumen resmi seperti kontrak dan slip pembayaran." />
            
            <div className="flex justify-center mt-8">
                <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border flex flex-col items-center text-center max-w-sm">
                    {qrDataUrl ? (
                        <img src={qrDataUrl} alt={signatureQrCode.name} className="w-64 h-64 rounded-lg bg-white p-4" />
                    ) : (
                        <div className="w-64 h-64 rounded-lg bg-gray-200 animate-pulse flex items-center justify-center">
                            <p className="text-brand-text-secondary">Membuat QR...</p>
                        </div>
                    )}
                    <h3 className="font-bold text-xl text-brand-text-light mt-4">{signatureQrCode.name}</h3>
                    <p className="text-sm text-brand-text-secondary mt-2">
                        Pindai kode ini untuk memverifikasi keaslian dokumen. Kode ini berisi teks: "{typeof signatureQrCode.content === 'string' ? signatureQrCode.content : ''}"
                    </p>
                    <div className="flex items-center gap-3 mt-6 w-full">
                         <button onClick={handleOpenEditModal} className="button-secondary inline-flex items-center gap-2 w-full justify-center">
                            <PencilIcon className="w-5 h-5" />
                            Edit Konten
                        </button>
                        <button onClick={handleDownload} disabled={!qrDataUrl} className="button-primary inline-flex items-center gap-2 w-full justify-center">
                            <DownloadIcon className="w-5 h-5" />
                            Unduh
                        </button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Konten QR Code">
                <div className="space-y-4">
                    <div className="input-group">
                        <textarea 
                            id="qrContent"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="input-field"
                            rows={4}
                            placeholder=" "
                        />
                        <label htmlFor="qrContent" className="input-label">Konten Teks untuk QR Code</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="button-secondary">Batal</button>
                        <button type="button" onClick={handleSaveChanges} className="button-primary">Simpan Perubahan</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default QRCodeGenerator;