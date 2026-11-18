"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ProjectRecordField = {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "date" | "datetime-local" | "select" | "textarea" | "hidden";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  value?: string;
  options?: { value: string; label: string }[];
};

export function ProjectRecordForm({
  projectId,
  recordType,
  fields,
  submitLabel,
  compact = false
}: {
  projectId: string;
  recordType: string;
  fields: ProjectRecordField[];
  submitLabel: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload: Record<string, string | number> = { type: recordType };

    fields.forEach((field) => {
      if (field.type === "hidden") {
        payload[field.name] = field.value ?? "";
        return;
      }
      const value = String(values.get(field.name) ?? "");
      if (!value) return;
      if (field.type === "number") {
        payload[field.name] = Number(value);
      } else if (field.type === "datetime-local") {
        payload[field.name] = new Date(value).toISOString();
      } else {
        payload[field.name] = value;
      }
    });

    try {
      const response = await fetch(`/api/projects/${projectId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error?.message ?? "The record could not be saved.");
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setMessage("OnSite could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={compact ? "module-form module-form-compact" : "module-form"} onSubmit={submit}>
      {fields.map((field) => {
        if (field.type === "hidden") {
          return <input key={field.name} name={field.name} type="hidden" value={field.value ?? ""} readOnly />;
        }
        const common = {
          id: `${recordType}-${field.name}`,
          name: field.name,
          required: field.required
        };
        return (
          <label className={field.type === "textarea" ? "form-field form-field-wide" : "form-field"} htmlFor={common.id} key={field.name}>
            <span>{field.label}</span>
            {field.type === "select" ? (
              <select {...common} defaultValue={field.value ?? ""}>
                <option value="" disabled>Select…</option>
                {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : field.type === "textarea" ? (
              <textarea {...common} placeholder={field.placeholder} defaultValue={field.value ?? ""} />
            ) : (
              <input
                {...common}
                type={field.type}
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
                defaultValue={field.value ?? ""}
              />
            )}
          </label>
        );
      })}
      {message && <p className="notice notice-error" role="alert">{message}</p>}
      <button className="button button-dark" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
