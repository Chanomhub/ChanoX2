import React, { createContext, useContext, useState, useEffect } from 'react';

import { Colors, ThemeColors } from '@/constants/Colors';

export type Festival = 'none' | 'christmas' | 'new_year' | 'halloween';

interface FestivalContextType {
    currentFestival: Festival;
    isFestivalActive: boolean;
    theme: ThemeColors;
}

const FestivalContext = createContext<FestivalContextType>({
    currentFestival: 'none',
    isFestivalActive: false,
    theme: Colors.dark,
});

export const useFestival = () => useContext(FestivalContext);

export const FestivalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentFestival, setCurrentFestival] = useState<Festival>('none');
    const [theme, setTheme] = useState<ThemeColors>(Colors.dark);

    useEffect(() => {
        const checkFestival = () => {
            const now = new Date();
            const month = now.getMonth(); // 0-11
            const date = now.getDate();

            let festival: Festival = 'none';

            // Christmas: Dec 1 - Dec 31
            if (month === 11 && date >= 1 && date <= 31) {
                festival = 'christmas';
            }
            // New Year: Jan 1 - Jan 5
            else if (month === 0 && date >= 1 && date <= 5) {
                festival = 'new_year';
            }
            // Halloween: Oct 25 - Nov 1
            else if ((month === 9 && date >= 25) || (month === 10 && date === 1)) {
                festival = 'halloween';
            }

            setCurrentFestival(festival);

            // Set theme based on festival
            switch (festival) {
                case 'christmas':
                    setTheme(Colors.christmas);
                    break;
                case 'halloween':
                    setTheme(Colors.halloween);
                    break;
                case 'new_year':
                    setTheme(Colors.new_year);
                    break;
                default:
                    setTheme(Colors.dark);
            }
        };

        checkFestival();
    }, []);

    return (
        <FestivalContext.Provider value={{ currentFestival, isFestivalActive: currentFestival !== 'none', theme }}>
            {children}
        </FestivalContext.Provider>
    );
};
