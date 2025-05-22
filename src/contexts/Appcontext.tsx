// src/contexts/AppContext.tsx (or similar)
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { CurrentContext } from '../types/contentTypes';

interface AppContextType {
    currentContext: CurrentContext;
    updateCurrentContext: (updates: Partial<CurrentContext>) => void;
    // You can add other global state here too, like sessionId, localParticipant if needed widely
    sessionId?: string;
    setSessionId: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode, userId: string }> = ({ children, userId }) => {
    const [currentContext, setCurrentContextState] = useState<CurrentContext>({
        user_id: userId,
        task_stage: 'idle',
        // ... other initial values
    });
    const [sessionId, setSessionIdState] = useState<string | undefined>(undefined);

    const updateCurrentContext = useCallback((updates: Partial<CurrentContext>) => {
        setCurrentContextState(prev => {
            const newState = { ...prev, user_id: userId, ...updates }; // Ensure user_id is always present
            console.log("Global context updated:", newState);
            return newState;
        });
    }, [userId]);

    const setSessionId = useCallback((id: string) => {
        setSessionIdState(id);
    }, []);

    return (
        <AppContext.Provider value={{ currentContext, updateCurrentContext, sessionId, setSessionId }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};