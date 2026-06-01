import { Check } from 'lucide-react';

export function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`w-4 h-4 rounded border-2 flex text-normal items-center justify-center shrink-0 transition-colors cursor-pointer
        ${checked ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </button>
  );
}