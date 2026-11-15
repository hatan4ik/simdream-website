'use client';

import { type FormEvent, useState } from 'react';
import { useCustomerContactSeed } from '@/lib/customer/customer-draft';

export interface DispatchInquiryFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const INITIAL_FORM_DATA: DispatchInquiryFormData = {
  name: '',
  email: '',
  phone: '',
  subject: 'General Question',
  message: '',
};

/** Client state for the public Dispatch form. A success state is reachable only after the API accepts it. */
export function useDispatchInquiryForm(deliveryError: string) {
  const [formData, setFormData] = useState<DispatchInquiryFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { updateCustomerDraft } = useCustomerContactSeed((contact) => {
    setFormData((current) => ({
      ...current,
      name: current.name || contact.fullName,
      email: current.email || contact.email,
      phone: current.phone || contact.phone,
    }));
  });

  const updateFormData = <Field extends keyof DispatchInquiryFormData>(field: Field, value: DispatchInquiryFormData[Field]) => {
    setFormError(null);
    setFormData((current) => ({ ...current, [field]: value }));
    if (field === 'name') updateCustomerDraft({ fullName: String(value) });
    else if (field === 'email') updateCustomerDraft({ email: String(value) });
    else if (field === 'phone') updateCustomerDraft({ phone: String(value) });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== 'object' || !('accepted' in payload) || payload.accepted !== true) {
        setFormError(deliveryError);
        return;
      }
      setIsSuccess(true);
    } catch {
      setFormError(deliveryError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { formData, setFormData, updateFormData, isSubmitting, isSuccess, formError, handleSubmit };
}
