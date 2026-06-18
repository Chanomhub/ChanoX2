import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { exchangeBetterAuthSession } from '@/libs/api/auth';

export default function Callback() {
    const navigate = useNavigate();
    const { handleExchangeCallback } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log('Callback page mounted: exchanging Better Auth session');
                const response = await exchangeBetterAuthSession();
                const token = response.user?.token;
                if (token) {
                    await handleExchangeCallback(token, response.refreshToken, response.expiresIn);
                    navigate('/');
                } else {
                    throw new Error('No access token returned');
                }
            } catch (err: any) {
                console.error('Callback error:', err);
                setError(err.message || 'Authentication failed');
            }
        };

        handleCallback();
    }, [navigate, handleExchangeCallback]);

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-7rem)]">
            <div className="text-center">
                {error ? (
                    <div className="text-red-500 max-w-md mx-auto p-4 bg-red-500/10 border border-red-500 rounded-lg">
                        <h2 className="text-xl font-bold mb-2">Login Failed</h2>
                        <p>{error}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 px-4 py-2 bg-chanox-accent text-chanox-surface rounded hover:bg-chanox-accent/90 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="animate-spin w-12 h-12 border-4 border-chanox-accent border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground">Logging you in...</p>
                    </>
                )}
            </div>
        </div>
    );
}
