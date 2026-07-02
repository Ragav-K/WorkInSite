export type ProjectStatus = "Active" | "Inactive" | "Completed";

export interface Project {
  id: string;
  name: string;
  description: string;
  area: string;
  areaUnit?: string;
  location: string;
  startDate: string;
  expectedCompletion: string;
  supervisorName: string;
  status: ProjectStatus;
  createdAt: string;
}

export type WorkType = string; // allow any custom work type
export type WorkerStatus = "Active" | "Inactive";
export type GenderType = "Male" | "Female" | "Other";

export interface Worker {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  age: number;
  gender: GenderType;
  workType: WorkType;
  dailyWage: number;
  joiningDate: string;
  status: WorkerStatus;
  createdAt: string;
}

export type AttendanceStatus = "Present" | "Half Day" | "Absent";

export interface AttendanceItem {
  status: AttendanceStatus;
  workDone: string;
}

export interface AttendanceRecord {
  id: string; // projectId_date
  projectId: string;
  date: string; // YYYY-MM-DD
  records: {
    [workerId: string]: AttendanceItem;
  };
  updatedAt: string;
}

export type PaymentStatus = "Pending" | "Paid";

export interface PaymentRecord {
  id: string;
  projectId: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  wage: number;
  status: PaymentStatus;
  paidAt?: string;
  attendanceStatus?: AttendanceStatus;
}

export function formatProjectArea(area: string | undefined, areaUnit?: string): string {
  if (!area) return "No area specified";
  const lowerArea = area.toLowerCase();
  
  // Check if it already has units in the area string
  if (
    lowerArea.includes("sq. ft") || 
    lowerArea.includes("sq.ft") ||
    lowerArea.includes("cent") ||
    lowerArea.includes("acre") ||
    lowerArea.includes("yard") ||
    lowerArea.includes("meter")
  ) {
    return area;
  }
  
  // Otherwise append the unit (defaulting to "Sq. Ft" if not provided)
  const unit = areaUnit || "Sq. Ft";
  return `${area} ${unit}`;
}
