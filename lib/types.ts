export type Status = "Applied" | "Phone Screen" | "Interview" | "Offer" | "Rejected";

export interface Application {
  id: string;
  user_id: string;
  date: string;
  company: string;
  title: string;
  url: string;
  job_site: string;
  location: string;
  status: Status;
  notes: string;
  brief: string;
  yoe: string;
  skills: string;
  job_description: string;
  created_at: string;
  updated_at: string;
}

export const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string }> = {
  "Applied":      { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  "Phone Screen": { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  "Interview":    { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "Offer":        { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Rejected":     { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

export const STATUS_CYCLE: Status[] = [
  "Applied", "Phone Screen", "Interview", "Offer", "Rejected"
];
