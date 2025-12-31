import { useState, useEffect, useCallback } from 'react';

export interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

// Shared target date for consistency across components
// REAL TARGET (Local Time):
// currentYear was unused
// If it's already past Jan 1st, target next year. (Simple logic for now: Fixed to 2026 as per requirement, or dynamic next year)
// User specifically mentioned "New Year 2026", so let's target 2026.
// But "according to each country" implies local midnight.
// new Date(year, monthIndex, day, hours, minutes, seconds) creates a Local Time date.
const TARGET_YEAR = 2026;
const LOCAL_NEW_YEAR = new Date(TARGET_YEAR, 0, 1, 0, 0, 0);

// TEST MODE: Set to 1 minute from now (calculated once)
// const TEST_TARGET_DATE = new Date(Date.now() + 60000);

export function useNewYearCountdown() {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
    const [isNewYear, setIsNewYear] = useState(false);

    // Use the shared target date (Local Time)
    const newYearDate = LOCAL_NEW_YEAR;
    // const newYearDate = TEST_TARGET_DATE;

    const calculateTimeLeft = useCallback(() => {
        const now = new Date();
        const difference = newYearDate.getTime() - now.getTime();

        if (difference <= 0) {
            setIsNewYear(true);
            return null;
        }

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60)
        };
    }, []);

    useEffect(() => {
        // Initial calculation
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    return { timeLeft, isNewYear, newYearDate };
}

export const triggerNewYearPreview = () => {
    window.dispatchEvent(new Event('CHANOK_NEW_YEAR_PREVIEW'));
};
