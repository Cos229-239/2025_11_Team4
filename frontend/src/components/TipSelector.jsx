import React, { useState, useEffect } from 'react';

const TipSelector = ({ subtotal, onTipChange }) => {
    const [selectedPercentage, setSelectedPercentage] = useState(null);
    const [customAmount, setCustomAmount] = useState('');

    const calculateTip = (percentage) => {
        return (subtotal * percentage) / 100;
    };

    const handlePercentageClick = (percentage) => {
        if (selectedPercentage === percentage) {
            // Toggle off
            setSelectedPercentage(null);
            setCustomAmount('');
            onTipChange(0);
        } else {
            setSelectedPercentage(percentage);
            setCustomAmount('');
            onTipChange(calculateTip(percentage));
        }
    };

    const handleCustomAmountChange = (e) => {
        const val = e.target.value;
        setCustomAmount(val);
        setSelectedPercentage('custom');

        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal >= 0) {
            onTipChange(numVal);
        } else {
            onTipChange(0);
        }
    };

    return (
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
            <h3 className="text-lg font-medium text-white mb-3">Add a Tip</h3>

            <div className="grid grid-cols-4 gap-2 mb-3">
                {[10, 15, 20].map((percent) => (
                    <button
                        key={percent}
                        type="button"
                        onClick={() => handlePercentageClick(percent)}
                        className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${selectedPercentage === percent
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                    >
                        {percent}%
                        <div className="text-xs opacity-75">${calculateTip(percent).toFixed(2)}</div>
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => {
                        setSelectedPercentage('custom');
                        setCustomAmount('');
                        onTipChange(0);
                    }}
                    className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${selectedPercentage === 'custom'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                >
                    Custom
                </button>
            </div>

            {selectedPercentage === 'custom' && (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        placeholder="Enter amount"
                        className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-7 pr-3 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                </div>
            )}
        </div>
    );
};

export default TipSelector;
