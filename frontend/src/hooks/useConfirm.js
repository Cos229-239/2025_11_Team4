import useUIStore from '../stores/uiStore';

export const useConfirm = () => {
    const { openConfirm } = useUIStore();

    const confirm = (title, message, options = {}) => {
        return openConfirm(title, message, options);
    };

    return { confirm };
};
