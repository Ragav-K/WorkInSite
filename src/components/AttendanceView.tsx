import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Project, Worker, AttendanceRecord, AttendanceItem, AttendanceStatus, PaymentRecord } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";
import { ArrowLeft, Save, Calendar, CheckCircle2, Clock, XCircle, Palmtree, ChevronDown, Filter } from "lucide-react";

interface AttendanceViewProps {
  projectId: string;
  onBack: () => void;
}

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AttendanceView({ projectId, onBack }: AttendanceViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(getTodayDateString()); // Defaulting to local today's date
  const [attendanceMap, setAttendanceMap] = useState<{ [workerId: string]: AttendanceItem }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [filterRole, setFilterRole] = useState("All Workers");

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch project details
        let projSnap;
        try {
          projSnap = await getDoc(doc(db, "projects", projectId));
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `projects/${projectId}`);
          return;
        }
        if (projSnap.exists()) {
          setProject({ id: projSnap.id, ...projSnap.data() } as Project);
        }

        // Fetch workers in this project
        const workersQuery = query(collection(db, "workers"), where("projectId", "==", projectId));
        let workersSnap;
        try {
          workersSnap = await getDocs(workersQuery);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `workers?projectId=${projectId}`);
          return;
        }
        const wrks: Worker[] = [];
        workersSnap.forEach((doc) => {
          wrks.push({ id: doc.id, ...doc.data() } as Worker);
        });
        setWorkers(wrks);

        // Fetch existing attendance for this date
        await loadAttendanceForDate(attendanceDate, wrks);
      } catch (err) {
        console.error("Error loading attendance data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const loadAttendanceForDate = async (dateStr: string, activeWorkers: Worker[]) => {
    const docId = `${projectId}_${dateStr}`;
    let docSnap;
    try {
      docSnap = await getDoc(doc(db, "attendance", docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `attendance/${docId}`);
      return;
    }

    const newMap: { [workerId: string]: AttendanceItem } = {};
    if (docSnap && docSnap.exists()) {
      const data = docSnap.data() as AttendanceRecord;
      activeWorkers.forEach((w) => {
        newMap[w.id] = data.records[w.id] || { status: "Absent", workDone: "" };
      });
    } else {
      // Default all workers to "Absent" on initialization as in standard site
      activeWorkers.forEach((w) => {
        newMap[w.id] = { status: "Absent", workDone: "" };
      });
    }
    setAttendanceMap(newMap);
  };

  const handleDateChange = async (newDate: string) => {
    setAttendanceDate(newDate);
    setLoading(true);
    try {
      await loadAttendanceForDate(newDate, workers);
    } catch (err) {
      console.error("Error updating date attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (workerId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        status
      }
    }));
  };

  const updateWorkDone = (workerId: string, workDone: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        workDone
      }
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newMap = { ...attendanceMap };
    workers.forEach((w) => {
      if (filterRole === "All Workers" || w.workType === filterRole) {
        newMap[w.id] = {
          ...newMap[w.id],
          status
        };
      }
    });
    setAttendanceMap(newMap);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docId = `${projectId}_${attendanceDate}`;
      const attendanceData: AttendanceRecord = {
        id: docId,
        projectId,
        date: attendanceDate,
        records: attendanceMap,
        updatedAt: new Date().toISOString()
      };

      // 1. Save Attendance sheet
      try {
        await setDoc(doc(db, "attendance", docId), attendanceData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `attendance/${docId}`);
        return;
      }

      // 1.5 Fetch existing payments for this project (filtered client-side to avoid indexing issues)
      const paymentsQuery = query(
        collection(db, "payments"),
        where("projectId", "==", projectId)
      );

      let paymentsSnap;
      try {
        paymentsSnap = await getDocs(paymentsQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `payments?projectId=${projectId}`);
        return;
      }

      const existingPaymentsMap: { [workerId: string]: PaymentRecord } = {};
      paymentsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.date === attendanceDate) {
          existingPaymentsMap[data.workerId] = { id: docSnap.id, ...data } as PaymentRecord;
        }
      });

      // 2. Generate daily wages payments records in a batch
      const batch = writeBatch(db);
      workers.forEach((w) => {
        const item = attendanceMap[w.id];
        if (!item) return;

        let earnedWage = 0;
        if (item.status === "Present") {
          earnedWage = w.dailyWage;
        } else if (item.status === "Half Day") {
          earnedWage = Math.round(w.dailyWage / 2);
        }

        // Unique ID for payment: project_worker_date
        const paymentId = `pay_${projectId}_${w.id}_${attendanceDate}`;
        const existingPayment = existingPaymentsMap[w.id];
        
        // Only write payment if earned wage > 0, otherwise delete previous entry if any or skip
        if (earnedWage > 0) {
          let status = "Pending";
          let paidAt: string | undefined = undefined;

          if (existingPayment) {
            // Check if wage didn't change (which corresponds to attendance status staying the same)
            const isSameWage = Number(existingPayment.wage) === Number(earnedWage);

            if (isSameWage) {
              // Preserve payment status and payment date
              status = existingPayment.status;
              paidAt = existingPayment.paidAt;
            } else {
              // If attendance status actually changed, reset to pending
              status = "Pending";
            }
          }

          const paymentData: any = {
            id: paymentId,
            projectId,
            workerId: w.id,
            date: attendanceDate,
            wage: earnedWage,
            status,
            attendanceStatus: item.status
          };

          if (paidAt) {
            paymentData.paidAt = paidAt;
          }

          batch.set(doc(db, "payments", paymentId), paymentData);
        } else {
          // If absent/leave, delete payment record for today if it existed
          batch.delete(doc(db, "payments", paymentId));
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `batch_commit_attendance?projectId=${projectId}`);
        return;
      }
      setNotification({ message: "Attendance saved and payroll updated successfully!", type: "success" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Error saving attendance:", err);
      setNotification({ message: "Failed to save attendance. Please try again.", type: "error" });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Roles for filter
  const roles = ["All Workers", "Mason", "Helper", "Carpenter", "Electrician", "Painter", "Plumber"];

  const filteredWorkers = workers.filter((w) => {
    if (filterRole === "All Workers") return true;
    return w.workType === filterRole;
  });

  // Count summaries
  let presentCount = 0;
  let halfDayCount = 0;
  let absentCount = 0;

  Object.values(attendanceMap).forEach((val) => {
    const item = val as AttendanceItem;
    if (item.status === "Present") presentCount++;
    else if (item.status === "Half Day") halfDayCount++;
    else if (item.status === "Absent") absentCount++;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-xl border z-50 animate-scale-up text-sm font-semibold flex items-center gap-2 ${
          notification.type === "success" 
            ? "bg-[#EEF1E6] border-[#8A9A5B] text-[#6B784A]" 
            : "bg-[#F4EDE4] border-[#D98E73] text-[#A66146]"
        }`}>
          {notification.message}
        </div>
      )}

      {/* PageHeader */}
      <div className="flex justify-between items-start mb-8 gap-4">
        <div className="flex items-start gap-4">
          <button 
            onClick={onBack}
            className="mt-1 text-[#8C867E] hover:text-[#2D2A26] flex items-center text-sm font-medium cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
          <div>
            <h1 className="text-4xl font-serif italic text-[#2D2A26] leading-tight font-semibold">Attendance</h1>
            <p className="text-[#8C867E] text-sm mt-1">{project?.name || "Loading Project..."}</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-[#8A9A5B] hover:bg-[#6B784A] disabled:opacity-50 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center shadow-sm cursor-pointer"
        >
          <Save className="w-4 h-4 mr-2" /> 
          {saving ? "Saving..." : "Save Attendance"}
        </button>
      </div>

      {/* AttendanceControls */}
      <div className="flex flex-col gap-6 mb-6">
        {/* Date and Summary Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Calendar className="text-[#A8A298] w-4 h-4" />
            </div>
            <input 
              className="pl-9 pr-4 py-2 border border-[#EAE4DB] rounded-xl text-sm text-[#4A453E] w-44 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] bg-white shadow-sm"
              type="date" 
              value={attendanceDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
            <CheckCircle2 className="w-4 h-4" /> Present: {presentCount}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-50 border border-orange-200 text-orange-700 shadow-sm">
            <Clock className="w-4 h-4" /> Half Day: {halfDayCount}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-50 border border-red-200 text-red-700 shadow-sm">
            <XCircle className="w-4 h-4" /> Absent: {absentCount}
          </div>
        </div>

        {/* Mark All & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-t border-[#EAE4DB] pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867E]">Mark all:</span>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => handleMarkAll("Present")}
                className="inline-flex items-center px-3 py-1.5 border border-[#EAE4DB] rounded-full text-xs font-semibold text-[#4A453E] bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Present
              </button>
              <button 
                onClick={() => handleMarkAll("Half Day")}
                className="inline-flex items-center px-3 py-1.5 border border-[#EAE4DB] rounded-full text-xs font-semibold text-[#4A453E] bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors cursor-pointer shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Half Day
              </button>
              <button 
                onClick={() => handleMarkAll("Absent")}
                className="inline-flex items-center px-3 py-1.5 border border-[#EAE4DB] rounded-full text-xs font-semibold text-[#4A453E] bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Absent
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-[#EAE4DB] rounded-xl px-3 py-1.5 bg-white shadow-sm">
            <Filter className="w-4 h-4 text-[#A8A298]" />
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase tracking-wider text-[#4A453E] focus:ring-0 cursor-pointer pr-4 focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* WorkersTable */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8A9A5B]"></div>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="bg-[#F5F1EA] rounded-[2.5rem] p-12 text-center border border-[#EAE4DB] shadow-sm">
          <p className="text-[#8C867E]">No active workers registered under this project or match this role.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-[#F2EEE8] overflow-hidden shadow-sm p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#F7F3EE] border-b border-[#EAE4DB] text-[10px] font-bold text-[#A8A298] uppercase tracking-[0.2em]">
                  <th className="px-6 py-4 w-1/4 rounded-l-2xl">Worker</th>
                  <th className="px-6 py-4 w-1/6">Type</th>
                  <th className="px-6 py-4 w-5/12">Attendance</th>
                  <th className="px-6 py-4 w-1/6 rounded-r-2xl">Work Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EEE8] text-sm">
                {filteredWorkers.map((worker) => {
                  const item = attendanceMap[worker.id] || { status: "Absent", workDone: "" };
                  
                  return (
                    <tr key={worker.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-serif italic font-semibold text-lg text-[#2D2A26] leading-tight">{worker.name}</div>
                        <div className="text-xs text-[#A8A298] font-mono mt-0.5">{worker.id}</div>
                      </td>
                      <td className="px-6 py-4 text-[#8C867E] font-semibold text-xs uppercase tracking-wider">{worker.workType}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => updateStatus(worker.id, "Present")}
                            className={`inline-flex items-center px-3 py-1 border rounded-full text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                              item.status === "Present"
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm font-bold"
                                : "bg-white border-[#EAE4DB] text-[#4A453E] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Present
                          </button>
                          <button 
                            type="button"
                            onClick={() => updateStatus(worker.id, "Half Day")}
                            className={`inline-flex items-center px-3 py-1 border rounded-full text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                              item.status === "Half Day"
                                ? "bg-orange-50 border-orange-500 text-orange-700 shadow-sm font-bold"
                                : "bg-white border-[#EAE4DB] text-[#4A453E] hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" /> Half Day
                          </button>
                          <button 
                            type="button"
                            onClick={() => updateStatus(worker.id, "Absent")}
                            className={`inline-flex items-center px-3 py-1 border rounded-full text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${
                              item.status === "Absent"
                                ? "bg-red-50 border-red-500 text-red-700 shadow-sm font-bold"
                                : "bg-white border-[#EAE4DB] text-[#4A453E] hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Absent
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder="—"
                          value={item.workDone}
                          onChange={(e) => updateWorkDone(worker.id, e.target.value)}
                          className="w-full border border-[#EAE4DB] rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] text-[#4A453E] bg-white shadow-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
