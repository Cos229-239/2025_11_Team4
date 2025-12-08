import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const id = searchParams.get('id');
    const [status, setStatus] = useState('Verifying...');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!token || !id) {
            setStatus('Invalid verification link.');
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch(`${API_URL}/api/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, token }),
                });
                const data = await res.json();
                if (data.success) {
                    setStatus('Email verified successfully!');
                    setIsSuccess(true);
                } else {
                    setStatus(data.message || 'Verification failed.');
                }
            } catch (err) {
                setStatus('Failed to connect to server.');
            }
        };

        verify();
    }, [token, id]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
                background: `radial-gradient(circle at center, #00BFFFaa 0%, #000000 70%)`,
                filter: "blur(60px)",
                opacity: 0.3,
            }}></div>

            <div className="relative z-10 w-full max-w-md p-8 bg-dark-card/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl text-center">
                <h2 className="text-3xl font-bold text-white mb-6">Email Verification</h2>

                <div className={`p-4 rounded-xl mb-8 ${isSuccess ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-gray-300 border border-white/10'}`}>
                    <p className="text-lg font-medium">{status}</p>
                </div>

                <Link
                    to={isSuccess ? "/login" : "/"}
                    className="inline-block bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-all transform hover:-translate-y-1 shadow-lg"
                >
                    {isSuccess ? 'Go to Login' : 'Go Home'}
                </Link>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
