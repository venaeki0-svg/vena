import React, { useState, useEffect } from 'react';

// Helper function to re-calculate hash
const generateSHA256 = async (data: string): Promise<string> => {
    const textAsBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Icons for UI
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);

const LoaderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
);

const DigitalSignatureVerification: React.FC = () => {
    const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const hash = window.location.hash;
                const urlParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
                const encodedData = urlParams.get('data');

                if (!encodedData) {
                    throw new Error("Data verifikasi tidak ditemukan.");
                }

                const decodedData = decodeURIComponent(encodedData);
                const parsedData = JSON.parse(decodedData);
                
                const { data_verifikasi, kode_verifikasi } = parsedData;

                if (!data_verifikasi || !kode_verifikasi) {
                    throw new Error("Format data tidak valid.");
                }

                const dataString = JSON.stringify(data_verifikasi);
                const calculatedHash = await generateSHA256(dataString);

                if (calculatedHash === kode_verifikasi) {
                    setStatus('success');
                    setData(parsedData);
                } else {
                    throw new Error("Verifikasi hash gagal. Tanda tangan tidak cocok.");
                }

            } catch (e: any) {
                setStatus('failed');
                setError(e.message || "Terjadi kesalahan saat memverifikasi data.");
                console.error(e);
            }
        };

        verify();
    }, []);

    const renderContent = () => {
        switch (status) {
            case 'verifying':
                return (
                    <div className="flex flex-col items-center text-center">
                        <LoaderIcon className="w-16 h-16 text-brand-accent animate-spin" />
                        <h2 className="text-xl font-bold text-brand-text-light mt-4">Memverifikasi Tanda Tangan...</h2>
                        <p className="text-brand-text-secondary mt-2">Mohon tunggu sebentar.</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="flex flex-col items-center text-center">
                        <CheckCircleIcon className="w-16 h-16 text-brand-success" />
                        <h2 className="text-xl font-bold text-brand-text-light mt-4">Verifikasi Berhasil</h2>
                        <p className="text-brand-text-secondary mt-2">{data?.pesan_tanda_tangan || 'Dokumen ini telah ditandatangani secara digital.'}</p>
                        <div className="mt-6 w-full text-left bg-brand-bg p-4 rounded-lg border border-brand-border space-y-2 text-sm">
                            <h3 className="font-semibold text-brand-text-light border-b border-brand-border pb-2 mb-2">Detail Dokumen Terverifikasi</h3>
                            {Object.entries(data?.data_verifikasi || {}).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="text-brand-text-secondary capitalize">{key.replace(/_/g, ' ')}:</span>
                                    <span className="font-medium text-brand-text-primary text-right">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'failed':
                return (
                     <div className="flex flex-col items-center text-center">
                        <XCircleIcon className="w-16 h-16 text-brand-danger" />
                        <h2 className="text-xl font-bold text-brand-text-light mt-4">Verifikasi Gagal</h2>
                        <p className="text-brand-text-secondary mt-2">Tanda tangan digital ini tidak valid atau data telah diubah.</p>
                        <p className="text-xs text-brand-text-secondary mt-4 bg-brand-bg p-2 rounded-md">{error}</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-bg p-4">
            <div className="w-full max-w-lg p-8 bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                {renderContent()}
            </div>
        </div>
    );
};

export default DigitalSignatureVerification;
