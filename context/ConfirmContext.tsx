import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface ConfirmOptions {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'neutral' | 'success';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ title: '', description: '' });
    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setOptions(opts);
            setIsOpen(true);
            setResolveRef(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        if (resolveRef) {
            resolveRef(true);
            setResolveRef(null);
        }
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolveRef) {
            resolveRef(false);
            setResolveRef(null);
        }
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <ConfirmDialog
                isOpen={isOpen}
                title={options.title}
                description={options.description}
                confirmLabel={options.confirmLabel}
                cancelLabel={options.cancelLabel}
                variant={options.variant}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
