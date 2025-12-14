import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Callback() {
    const navigate = useNavigate();

    useEffect(() => {
        // TODO: Handle OAuth callback tokens
        // This page receives tokens from OAuth flow and processes them

        // For now, redirect to home after a delay
        const timer = setTimeout(() => {
            navigate('/');
        }, 2000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-7rem)]">
            <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-chanox-accent border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Logging you in...</p>
            </div>
        </div>
    );
}
