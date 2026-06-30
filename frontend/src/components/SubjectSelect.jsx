import React from "react";
import { SUBJECTS, SUBJECT_LABELS } from "@/lib/constants";

export default function SubjectSelect({ value, onChange, className = "", allOption = false, ...props }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    >
      {allOption && <option value="ALL">All subjects</option>}
      {SUBJECTS.map((code) => (
        <option key={code} value={code} title={SUBJECT_LABELS[code]}>
          {code} — {SUBJECT_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
