import React from 'react';
import useUIStore from '../../stores/uiStore';
import { AlertTriangle, Info } from 'lucide-react';

const ConfirmModal = () => {
    const { confirmModal, closeConfirm } = useUIStore();
    const { isOpen, title, message, options } = confirmModal;

    if (!isOpen) return null;

    const variant = options.variant || 'danger'; // 'danger' | 'info' | 'warning'
    const confirmText = options.confirmText || 'Confirm';
    const cancelText = options.cancelText || 'Cancel';

    const getIcon = () => {
        if (variant === 'danger' || variant === 'warning') return <AlertTriangle size={24} className={variant === 'danger' ? "text-red-500" : "text-yellow-500"} />;
        return <Info size={24} className="text-blue-500" />;
    };

    const getButtonStyles = () => {
        if (variant === 'danger') return "bg-red-500 hover:bg-red-600 text-white";
        if (variant === 'warning') return "bg-yellow-500 hover:bg-yellow-600 text-black";
        return "bg-brand-lime hover:bg-opacity-90 text-black";
    };

    // Focus management
    const cancelRef = React.useRef(null);
    const confirmRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            // Small timeout to allow render
            setTimeout(() => {
                // Default focus to cancel button for safety
                cancelRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    // Handle Escape key
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeConfirm(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeConfirm]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-desc"
        >
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100 animate-scale-in overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-500/10' : variant === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'}`}>
                            {getIcon()}
                        </div>
                        <div className="flex-1">
                            <h3 id="modal-title" className="text-xl font-bold text-white mb-2">{title}</h3>
                            <p id="modal-desc" className="text-zinc-400 leading-relaxed">{message}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 bg-white/5 border-t border-white/5">
                    <button
                        ref={cancelRef}
                        onClick={() => closeConfirm(false)}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={() => closeConfirm(true)}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${getButtonStyles()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
