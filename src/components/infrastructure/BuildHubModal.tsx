
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Clock, Euro, AlertTriangle, TrendingUp } from 'lucide-react';

interface Props {
  open: boolean;
  countryCode: string;
  countryName: string;
  city: string;
  onClose: () => void;
  onConfirm: (payload: { duration: number; estimatedPrice: number }) => void;
}

/**
 * BuildHubModal
 * @description Variations in price (500k-900k) based on city name + 1% Speed Premium.
 */
const BuildHubModal: React.FC<Props> = ({ open, countryCode, countryName, city, onClose, onConfirm }) => {
  const [duration, setDuration] = useState(60);

  // Deterministic price based on city name to ensure variety (e.g. 545k, 613k)
  const basePrice = useMemo(() => {
    if (!city) return 500000;
    const seed = (city + countryCode).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variance = (seed * 1337 % 401) * 1000; // 0 to 400,000 variance
    return 500000 + variance;
  }, [city, countryCode]);

  // Speed Premium: 1% of base price for every day under 60
  const daysSaved = 60 - duration;
  const speedPremium = basePrice * 0.01 * daysSaved;
  const totalPrice = basePrice + speedPremium;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span>Investment Analysis</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Review the construction costs and timeline for the new {city} Hub.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Location</span>
              <span className="text-xs font-bold text-blue-400">{countryName}</span>
            </div>
            <div className="text-lg font-bold text-white">{city}</div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <label className="text-slate-400 font-medium">Construction Speed</label>
              <div className="flex items-center text-blue-400 font-bold">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {duration} In-Game Days
              </div>
            </div>
            <input
              type="range"
              min="40"
              max="60"
              step="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
              <span>Fast (40d)</span>
              <span>Standard (60d)</span>
            </div>
          </div>

          <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10 space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Local Market Base Price:</span>
              <span className="text-white font-mono">€{basePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Speed Premium ({daysSaved}d @ 1%/d):</span>
              <span className="text-amber-400 font-mono">+ €{speedPremium.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
              <span className="text-sm font-bold text-white">Total Investment:</span>
              <div className="text-xl font-bold text-green-400 font-mono">€{totalPrice.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-start space-x-2 text-[10px] text-slate-500 italic leading-relaxed">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
            <p>Investment is final. Cancellation only yields a 50% refund. Construction follows the global server clock.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-700">
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm({ duration, estimatedPrice: totalPrice })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8"
          >
            Authorize Build
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuildHubModal;
