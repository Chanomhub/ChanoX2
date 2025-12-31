import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, PartyPopper, Volume2, VolumeX } from 'lucide-react';
import { useNewYearCountdown } from '@/hooks/useNewYearCountdown';

// Particle class for Canvas animation
class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
    size: number;
    type: 'firework' | 'spark' | 'confetti';
    rotation: number;
    rotationSpeed: number;

    constructor(x: number, y: number, color: string, type: 'firework' | 'spark' | 'confetti') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.alpha = 1;

        if (type === 'firework') {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = -(Math.random() * 4 + 8); // Launch up high
            this.size = 3;
            this.rotation = 0;
            this.rotationSpeed = 0;
        } else if (type === 'spark') {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 4 + 1;
            this.vx = Math.cos(angle) * velocity;
            this.vy = Math.sin(angle) * velocity;
            this.size = Math.random() * 2 + 1;
            this.rotation = 0;
            this.rotationSpeed = 0;
        } else { // confetti
            this.x = Math.random() * window.innerWidth;
            this.y = -(Math.random() * 100);
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = Math.random() * 2 + 2;
            this.size = Math.random() * 6 + 4;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = (Math.random() - 0.5) * 10;
        }
    }

    update() {
        if (this.type === 'firework') {
            this.vy += 0.15; // Gravity
            this.x += this.vx;
            this.y += this.vy;
        } else if (this.type === 'spark') {
            this.vx *= 0.95; // Friction
            this.vy *= 0.95;
            this.vy += 0.15; // Gravity
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= 0.015; // Fade out
        } else { // confetti
            this.y += this.vy;
            this.x += Math.sin(this.y * 0.01) + this.vx; // Sway
            this.rotation += this.rotationSpeed;

            if (this.y > window.innerHeight) {
                this.y = -20;
                this.x = Math.random() * window.innerWidth;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.type === 'confetti') {
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        ctx.restore();
    }
}

export default function NewYearCelebration() {
    const { timeLeft, isNewYear, newYearDate } = useNewYearCountdown();
    const [previewMode, setPreviewMode] = useState(false);
    const [showCelebration, setShowCelebration] = useState(true);
    const [muted, setMuted] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // DEBUG LOG
    console.log('[NewYearCelebration] Render:', { isNewYear, previewMode, showCelebration });

    const animationRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);

    useEffect(() => {
        // Initialize Audio
        audioRef.current = new Audio('/sounds/firework.mp3');
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = muted;
        }
    }, [muted]);

    const playSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
    }, []);

    const stopSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    }, []);

    // Event listener for global trigger
    useEffect(() => {
        const handleTrigger = () => {
            setPreviewMode(true);
            setShowCelebration(true);
            playSound();

            // Auto stop after 10 seconds
            setTimeout(() => {
                setPreviewMode(false);
                setShowCelebration(false);
                stopSound();
                particlesRef.current = [];
            }, 10000);
        };

        window.addEventListener('CHANOK_NEW_YEAR_PREVIEW', handleTrigger);
        return () => window.removeEventListener('CHANOK_NEW_YEAR_PREVIEW', handleTrigger);
    }, [playSound, stopSound]);

    // Canvas Animation Loop
    useEffect(() => {
        if ((!isNewYear && !previewMode) || !showCelebration) {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Trigger sound if it's actual New Year (and not already playing from preview)
        if (isNewYear) playSound();

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handler
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initialize Confetti
        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6eb4', '#a855f7'];
        for (let i = 0; i < 50; i++) {
            particlesRef.current.push(
                new Particle(0, 0, colors[Math.floor(Math.random() * colors.length)], 'confetti')
            );
        }

        let fireworkTimer = 0;

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Spawn Fireworks
            fireworkTimer++;
            if (fireworkTimer > 40) { // Every ~40 frames
                fireworkTimer = 0;
                particlesRef.current.push(
                    new Particle(
                        Math.random() * canvas.width,
                        canvas.height,
                        colors[Math.floor(Math.random() * colors.length)],
                        'firework'
                    )
                );
            }

            // Update & Draw Particles
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.update();
                p.draw(ctx);

                // Handle Firework Explosion
                if (p.type === 'firework' && p.vy >= -1) { // When it slows down near peak
                    // Create sparks
                    for (let j = 0; j < 30; j++) {
                        particlesRef.current.push(new Particle(p.x, p.y, p.color, 'spark'));
                    }
                    particlesRef.current.splice(i, 1);
                }
                // Convert confetti back to top when out of screen (handled inside Particle update)
                // Remove dead sparks
                else if (p.type === 'spark' && p.alpha <= 0) {
                    particlesRef.current.splice(i, 1);
                }
            }

            animationRef.current = requestAnimationFrame(loop);
        };

        loop();

        // Auto-stop preview after 10s
        let stopTimeout: any;
        if (previewMode) {
            stopTimeout = setTimeout(() => {
                setPreviewMode(false);
                setShowCelebration(false); // Close after finish
                particlesRef.current = []; // Clear particles
            }, 10000);
        }

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (stopTimeout) clearTimeout(stopTimeout);
            // Don't clear particles immediately so they don't disappear abruptly if re-triggered, 
            // but for clean up we normally would. For this use case, let's reset if mode off.
            if (!isNewYear && !previewMode) particlesRef.current = [];
        };
    }, [isNewYear, previewMode, showCelebration]);

    // Trigger preview
    const triggerPreview = () => {
        setPreviewMode(true);
    };

    // Only render if active (New Year or Preview) AND specifically enabled
    if ((!isNewYear && !previewMode) || !showCelebration) return null;

    // Visibility Window Logic (7 days before, 3 days after) - Bypass if preview
    const now = new Date();
    const daysBefore = Math.floor((newYearDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysAfter = Math.floor((now.getTime() - newYearDate.getTime()) / (1000 * 60 * 60 * 24));
    if (!previewMode && (daysBefore > 7 || daysAfter > 3)) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            {/* Canvas Overlay */}
            <canvas
                ref={canvasRef}
                className="fixed inset-0 pointer-events-none z-0"
            />

            {/* Banner Content */}
            <div className="relative overflow-hidden rounded-2xl mx-4 mb-8 border border-white/10 shadow-2xl">
                {/* Glassmorphism Background */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20" />

                {/* Animated Orbs */}
                <div className="absolute inset-0 overflow-hidden opacity-50">
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob" />
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-yellow-600 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
                </div>

                {/* Mute Button */}
                <button
                    onClick={() => setMuted(!muted)}
                    className="absolute top-4 right-14 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/60 hover:text-white"
                    title={muted ? "Unmute" : "Mute"}
                >
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Close Button */}
                <button
                    onClick={() => setShowCelebration(false)}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/60 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="relative z-10 p-8 sm:p-10 text-center">
                    {isNewYear ? (
                        <div className="animate-fadeIn space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                                <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-white drop-shadow-2xl">
                                    HAPPY NEW YEAR
                                </h2>
                                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                            </div>
                            <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-lg">
                                2026
                            </div>
                            <p className="text-xl text-white/90 font-medium tracking-wide">
                                ขอให้มีความสุข สุขภาพแข็งแรง ตลอดปีและตลอดไป 🎉
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-2">
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200 flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                    COUNTDOWN TO 2026
                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                </h2>
                                <p className="text-white/60 text-sm tracking-widest uppercase">
                                    Time Remaining
                                </p>
                            </div>

                            {timeLeft && (
                                <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-3xl mx-auto">
                                    <TimeBox value={timeLeft.days} label="DAYS" />
                                    <TimeBox value={timeLeft.hours} label="HOURS" />
                                    <TimeBox value={timeLeft.minutes} label="MINS" />
                                    <TimeBox value={timeLeft.seconds} label="SECS" />
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={triggerPreview}
                                    disabled={previewMode}
                                    className="group relative px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <span className="relative flex items-center gap-2 text-white/90 font-medium text-sm">
                                        {previewMode ? (
                                            <>
                                                <PartyPopper className="w-4 h-4" />
                                                Enjoy the Show!
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Preview Celebration
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                .animate-fadeIn {
                    animation: fadeIn 1s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

function TimeBox({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center group">
            <div className="relative w-full aspect-square max-w-[100px] flex items-center justify-center bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg group-hover:border-white/30 transition-all duration-300 group-hover:bg-white/5">
                <span className="text-3xl sm:text-5xl font-black text-white tabular-nums tracking-tighter bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-white/70 transition-all">
                    {value.toString().padStart(2, '0')}
                </span>
            </div>
            <span className="mt-3 text-[10px] sm:text-xs font-bold text-white/40 tracking-[0.2em] group-hover:text-white/70 transition-colors">
                {label}
            </span>
        </div>
    );
}
