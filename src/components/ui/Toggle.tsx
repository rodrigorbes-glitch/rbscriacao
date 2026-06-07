import React from 'react';

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export default function Toggle({ label, checked, onChange, id }: ToggleProps) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input 
        id={id}
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <span className="toggle-slider"></span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
}
