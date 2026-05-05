import { User, Package, ClipboardCheck } from 'lucide-react';
import type { Step } from './types';

const steps: { key: Step; label: string; icon: typeof User }[] = [
  { key: 'customer', label: 'Datos', icon: User },
  { key: 'products', label: 'Productos', icon: Package },
  { key: 'summary', label: 'Resumen', icon: ClipboardCheck },
];

interface StepIndicatorProps {
  current: Step;
}

export default function StepIndicator({ current }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isActive
                    ? 'border-amber-500 bg-amber-500/15 text-amber-400 shadow-lg shadow-amber-500/20'
                    : isDone
                      ? 'border-amber-600 bg-amber-600 text-black'
                      : 'border-gray-700 bg-gray-900 text-gray-600'
                }`}
              >
                <Icon size={18} />
              </div>
              <span
                className={`text-[10px] sm:text-xs font-semibold tracking-wider uppercase ${
                  isActive ? 'text-amber-400' : isDone ? 'text-amber-600' : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-px mb-5 transition-colors duration-300 ${
                  isDone ? 'bg-amber-600' : 'bg-gray-800'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
