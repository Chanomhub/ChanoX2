import { useFestival } from "@/contexts/FestivalContext";

export function ThemeScrollbar() {
    const { theme } = useFestival();

    const styles = `
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: ${theme.background}; 
    }
    
    ::-webkit-scrollbar-thumb {
      background: ${theme.border};
      border-radius: 5px;
      border: 2px solid ${theme.background}; /* Creates padding effect */
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: ${theme.textSecondary};
    }

    /* Firefox */
    * {
      scrollbar-width: thin;
      scrollbar-color: ${theme.border} ${theme.background};
    }
  `;

    return (
        <style dangerouslySetInnerHTML={{ __html: styles }} />
    );
}
