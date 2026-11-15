import React from 'react';
import { HONEYPOT_FIELD } from '@/lib/security/honeypot';

export interface HoneypotFieldProps {
  /** Localized text for the field's label. It is never shown or announced, but a label keeps the control well-formed. */
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A decoy input only a script fills in. It sits off-screen, outside the tab order and out of the
 * accessibility tree, and adds no visible text, so a person never sees, reaches or hears it.
 * The server treats any value as a bot (lib/security/honeypot.ts).
 *
 * Browsers and password managers must not fill it for a real person either: its name carries no
 * autofill word, it has no id, `autoComplete="off"`, and the vendor opt-outs below. Place it away
 * from fields of a recognisable type (at the end of the form, not beside a name or email field).
 * `data-honeypot` marks it for tests.
 */
export function HoneypotField({ label, value, onChange }: HoneypotFieldProps) {
  return (
    <div aria-hidden="true" data-honeypot="" className="absolute -start-[9999px] h-px w-px overflow-hidden">
      <label>
        {label}
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
