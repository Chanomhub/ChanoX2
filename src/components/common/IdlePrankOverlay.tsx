import { useState, useEffect, useCallback } from 'react';

export default function IdlePrankOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const IDLE_TIMEOUT = 30000; // 30 seconds of inactivity

    const resetTimer = useCallback(() => {
        setIsVisible(false);
    }, []);

    useEffect(() => {
        let idleTimer: any;
        let hideTimer: any;

        const handleActivity = () => {
            if (isVisible) {
                setIsVisible(false);
            }
            clearTimeout(idleTimer);
            clearTimeout(hideTimer);
            idleTimer = setTimeout(() => {
                setIsVisible(true);
                // Hide after 3 seconds of being visible
                hideTimer = setTimeout(() => {
                    setIsVisible(false);
                }, 3000);
            }, IDLE_TIMEOUT);
        };

        // Listen for any user activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        // Start the initial timer
        idleTimer = setTimeout(() => {
            setIsVisible(true);
            hideTimer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        }, IDLE_TIMEOUT);

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            clearTimeout(idleTimer);
            clearTimeout(hideTimer);
        };
    }, [isVisible]);

    return (
        <div 
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-[110] pointer-events-none transition-transform duration-[1000ms] ease-in-out ${
                isVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
        >
            <div className="relative group">
                <img
                    src="/images.png"
                    alt=""
                    className="w-[400px] h-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                />
            </div>
        </div>
    );
}
