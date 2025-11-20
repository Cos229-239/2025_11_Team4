import React from 'react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-card border border-dark-surface rounded-2xl shadow-2xl w-full max-w-md transform transition-all p-6">
                <h3 className="text-xl font-bold text-text-primary mb-2">
                    {title}
                </h3>

                <p className="text-text-secondary mb-6">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-semibold text-text-secondary hover:bg-dark-surface transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg font-semibold text-white transition ${isDangerous
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-brand-orange hover:opacity-90'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
