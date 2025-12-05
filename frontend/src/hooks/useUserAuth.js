import { useContext } from 'react';
import UserAuthContext from '../context/UserAuthContext';

export const useUserAuth = () => {
    const ctx = useContext(UserAuthContext);
    if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
    return ctx;
};
