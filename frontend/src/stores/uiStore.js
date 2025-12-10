import { create } from 'zustand';

const useUIStore = create((set) => ({
    // Modal State
    confirmModal: {
        isOpen: false,
        title: '',
        message: '',
        options: {},
        resolve: null, // Promise resolve function
    },

    // Actions
    openConfirm: (title, message, options = {}) => {
        return new Promise((resolve) => {
            set({
                confirmModal: {
                    isOpen: true,
                    title,
                    message,
                    options, // e.g. { confirmText, cancelText, variant: 'danger'|'info' }
                    resolve,
                },
            });
        });
    },

    closeConfirm: (result = false) => {
        set((state) => {
            if (state.confirmModal.resolve) {
                state.confirmModal.resolve(result);
            }
            return {
                confirmModal: { ...state.confirmModal, isOpen: false, resolve: null },
            };
        });
    },
}));

export default useUIStore;
