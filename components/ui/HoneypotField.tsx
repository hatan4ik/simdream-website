import React from 'react';

export interface HoneypotFieldProps {
  /** Localized text for the field's label. It is never shown or announced, but a label keeps the control well-formed. */
  label: string;
  /** Input name; pick one that does not give away the trap. */
  name: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A decoy input only a script fills in. It sits off-screen, outside the tab order and out of the
 * accessibility tree, and adds no visible text, so a person never sees, reaches or hears it.
 * The server treats any value as a bot (lib/security/honeypot.ts).
 */
export function HoneypotField({ label, name, value, onChange }: HoneypotFieldProps) {
  return (
    <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
      <label>
        {label}
        <input
          type="text"
          name={name}
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
