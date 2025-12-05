import { useState, useEffect } from 'react';

const DateTimeDisplay = ({ timestamp, restaurantTimezone, className = '' }) => {
    const [userTimezone, setUserTimezone] = useState('');

    useEffect(() => {
        setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }, []);

    if (!timestamp) return null;

    const date = new Date(timestamp);

    // Format for User's Local Time
    const userTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const userDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Format for Restaurant's Local Time (if timezone differs)
    let restaurantTime = null;
    let restaurantDate = null;
    const showRestaurantTime = restaurantTimezone && restaurantTimezone !== userTimezone && restaurantTimezone !== 'UTC';

    if (showRestaurantTime) {
        try {
            restaurantTime = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: restaurantTimezone
            });

            restaurantDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: restaurantTimezone
            });
        } catch {
            console.warn('Invalid timezone:', restaurantTimezone);
        }
    }

    return (
        <div className={`flex flex-col ${className}`}>
            {/* User Time */}
            <div className="flex items-baseline gap-2">
                <span className="font-bold text-text-primary">{userTime}</span>
                <span className="text-xs text-text-secondary">{userDate}</span>
                <span className="text-[10px] uppercase tracking-wider text-text-secondary/60 ml-1 border border-text-secondary/20 px-1 rounded">
                    My Time
                </span>
            </div>

            {/* Restaurant Time (only if different) */}
            {showRestaurantTime && restaurantTime && (
                <div className="flex items-baseline gap-2 mt-1 opacity-80">
                    <span className="font-medium text-brand-orange">{restaurantTime}</span>
                    <span className="text-xs text-brand-orange/80">{restaurantDate}</span>
                    <span className="text-[10px] uppercase tracking-wider text-brand-orange/60 ml-1 border border-brand-orange/20 px-1 rounded">
                        Restaurant Time
                    </span>
                </div>
            )}
        </div>
    );
};

export default DateTimeDisplay;
