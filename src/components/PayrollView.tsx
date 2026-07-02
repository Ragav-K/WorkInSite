import React, { useState, useEffect } from "react";
import WorkerCalendarModal from "./WorkerCalendarModal";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Project, Worker, PaymentRecord } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";
import { ArrowLeft, CheckCircle2, DollarSign, Wallet, ClipboardCheck, History, AlertCircle, Download } from "lucide-react";

interface PayrollViewProps {
  projectId: string;
  onBack: () => void;
}

export default function PayrollView({ projectId, onBack }: PayrollViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedWorkerRecords, setSelectedWorkerRecords] = useState<{name: string, records: PaymentRecord[]} | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Fetch project
    const unsubProject = onSnapshot(doc(db, "projects", projectId), (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() } as Project);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
    });

    // Fetch workers to map worker names
    const qWorkers = query(collection(db, "workers"), where("projectId", "==", projectId));
    const unsubWorkers = onSnapshot(qWorkers, (snapshot) => {
      const wrks: Worker[] = [];
      snapshot.forEach((doc) => {
        wrks.push({ id: doc.id, ...doc.data() } as Worker);
      });
      setWorkers(wrks);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `workers?projectId=${projectId}`);
    });

    // Fetch daily payments for this project
    const qPayments = query(collection(db, "payments"), where("projectId", "==", projectId));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const pmts: PaymentRecord[] = [];
      snapshot.forEach((doc) => {
        pmts.push({ id: doc.id, ...doc.data() } as PaymentRecord);
      });
      // Sort payments: newest date first
      pmts.sort((a, b) => b.date.localeCompare(a.date));
      setPayments(pmts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `payments?projectId=${projectId}`);
    });

    return () => {
      unsubProject();
      unsubWorkers();
      unsubPayments();
    };
  }, [projectId]);

  const handleMarkWorkerAsPaid = async (pendingPaymentIds: string[], workerName: string) => {
    if (pendingPaymentIds.length === 0) return;
    try {
      const promises = pendingPaymentIds.map(async (id) => {
        try {
          await updateDoc(doc(db, "payments", id), {
            status: "Paid",
            paidAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `payments/${id}`);
        }
      });
      await Promise.all(promises);
      setNotification({ message: `Wages for ${workerName} marked as Paid!`, type: "success" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Error batch updating worker payments:", err);
    }
  };

  const handleMarkAllAsPaid = async () => {
    const pendingPmts = payments.filter((p) => p.status === "Pending");
    if (pendingPmts.length === 0) {
      setNotification({ message: "No pending payments to pay.", type: "error" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const promises = pendingPmts.map(async (p) => {
        try {
          await updateDoc(doc(db, "payments", p.id), {
            status: "Paid",
            paidAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `payments/${p.id}`);
        }
      });
      await Promise.all(promises);
      setNotification({ message: "All payments processed successfully!", type: "success" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Error batch updating payments:", err);
    }
  };

  const getWorkerDetails = (workerId: string) => {
    const w = workers.find((wrk) => wrk.id === workerId);
    return {
      name: w?.name || "Unknown Worker",
      role: w?.workType || "N/A"
    };
  };

  // Group payments by worker
  interface GroupedPayment {
    workerId: string;
    totalDays: number;
    pendingDays: number;
    paidDays: number;
    totalWage: number;
    pendingWage: number;
    paidWage: number;
    paidWage: number;
    status: "Paid" | "Pending";
    pendingPaymentIds: string[];
    records: PaymentRecord[];
  }

  const groupedMap: { [workerId: string]: GroupedPayment } = {};

  payments.forEach((p) => {
    if (!groupedMap[p.workerId]) {
      groupedMap[p.workerId] = {
        workerId: p.workerId,
        totalDays: 0,
        pendingDays: 0,
        paidDays: 0,
        totalWage: 0,
        pendingWage: 0,
        paidWage: 0,
        status: "Paid",
        pendingPaymentIds: [],
        records: []
      };
    }
    const group = groupedMap[p.workerId];
    
    let dayFraction = 1;
    if (p.attendanceStatus) {
      if (p.attendanceStatus === "Present") {
        dayFraction = 1;
      } else if (p.attendanceStatus === "Half Day") {
        dayFraction = 0.5;
      }
    } else {
      const w = workers.find((wrk) => wrk.id === p.workerId);
      if (w && w.dailyWage) {
        if (p.wage < w.dailyWage) {
          dayFraction = 0.5;
        }
      }
    }

    group.totalDays += dayFraction;
    group.totalWage += p.wage;

    if (p.status === "Pending") {
      group.pendingDays += dayFraction;
      group.pendingWage += p.wage;
      group.pendingPaymentIds.push(p.id);
      group.status = "Pending";
    } else {
      group.paidDays += dayFraction;
      group.paidWage += p.wage;
    }
    group.records.push(p);
  });

  const groupedPayments = Object.values(groupedMap).map((g) => {
    const workerInfo = getWorkerDetails(g.workerId);
    return { ...g, workerName: workerInfo.name, workerRole: workerInfo.role };
  });

  // Sort alphabetically by worker name
  groupedPayments.sort((a, b) => a.workerName.localeCompare(b.workerName));

  const handleDownloadCSV = () => {
    if (groupedPayments.length === 0) {
      setNotification({ message: "No payroll records available to download.", type: "error" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const headers = [
      "Worker ID",
      "Worker Name",
      "Role/Work Type",
      "Total Days",
      "Paid Days",
      "Pending Days",
      "Total Wage (INR)",
      "Paid Wage (INR)",
      "Pending Wage (INR)",
      "Status"
    ];

    const rows = groupedPayments.map((g) => [
      g.workerId,
      g.workerName,
      g.workerRole,
      g.totalDays.toFixed(1),
      g.paidDays.toFixed(1),
      g.pendingDays.toFixed(1),
      g.totalWage,
      g.paidWage,
      g.pendingWage,
      g.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => {
            const stringValue = typeof value === "string" ? value : String(value);
            // Escape double quotes and wrap in quotes if contains comma, quote, or newline
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const projectNameClean = project?.name ? project.name.replace(/[^a-zA-Z0-9]/g, "_") : "project";
    link.setAttribute("href", url);
    link.setAttribute("download", `${projectNameClean}_payroll_summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const pendingAmount = payments
    .filter((p) => p.status === "Pending")
    .reduce((sum, p) => sum + p.wage, 0);

  const paidAmount = payments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.wage, 0);

  const pendingCount = payments.filter((p) => p.status === "Pending").length;
  const paidCount = payments.filter((p) => p.status === "Paid").length;

  return (
    <div className="max-w-7xl w-full mx-auto p-6 flex flex-col gap-6 animate-fade-in relative">
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-4">
          <button 
            onClick={onBack}
            className="text-[#8C867E] hover:text-[#2D2A26] mt-1 flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h2 className="text-4xl font-serif italic text-[#2D2A26] leading-tight font-semibold">Payroll Dashboard</h2>
            <p className="text-[#8C867E] text-sm mt-1">{project?.name || "Loading..."}</p>
          </div>
        </div>
        <button 
          onClick={handleMarkAllAsPaid}
          disabled={pendingCount === 0}
          className="bg-[#8A9A5B] hover:bg-[#6B784A] disabled:opacity-40 disabled:hover:bg-[#8A9A5B] text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <CheckCircle2 className="w-4 h-4" />
          Pay All Pending
        </button>
      </div>

      {/* Stats row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Pending amount */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-[#F2EEE8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#F5EDE4] flex items-center justify-center text-[#D98E73] font-bold text-xl">
            ₹
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#A8A298] uppercase tracking-[0.2em] mb-1">Pending Amount</p>
            <p className="text-2xl font-bold text-[#D98E73]">₹{pendingAmount}</p>
            <p className="text-xs text-[#8C867E] mt-0.5">{pendingCount} payments pending</p>
          </div>
        </div>

        {/* Card: Paid amount */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-[#F2EEE8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EEF1E6] flex items-center justify-center text-[#8A9A5B] font-bold text-xl">
            ₹
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#A8A298] uppercase tracking-[0.2em] mb-1">Total Paid Amount</p>
            <p className="text-2xl font-bold text-[#8A9A5B]">₹{paidAmount}</p>
            <p className="text-xs text-[#8C867E] mt-0.5">{paidCount} transactions completed</p>
          </div>
        </div>

        {/* Card: Total Records */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-[#F2EEE8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#F5F1EA] flex items-center justify-center text-[#8C867E]">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#A8A298] uppercase tracking-[0.2em] mb-1">Processed Days</p>
            <p className="text-2xl font-bold text-[#2D2A26]">{payments.length}</p>
            <p className="text-xs text-[#8C867E] mt-0.5">Total recorded sessions</p>
          </div>
        </div>
      </section>

      {/* Payroll Records */}
      <div className="bg-white border border-[#F2EEE8] rounded-[2.5rem] shadow-sm overflow-hidden mt-2 p-4">
        <div className="px-6 py-4 border-b border-[#F2EEE8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="font-serif italic font-semibold text-[#2D2A26] text-xl">Payroll Transactions</h3>
          {payments.length > 0 && (
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#EAE4DB] hover:border-[#8A9A5B] rounded-full text-xs font-semibold text-[#4A453E] hover:text-[#8A9A5B] bg-white transition-colors cursor-pointer shadow-sm"
              title="Download summary report as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Download Report (CSV)
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8A9A5B]"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center bg-[#FDFBF7] rounded-[2rem]">
            <AlertCircle className="mx-auto h-12 w-12 text-[#A8A298] mb-4" />
            <h4 className="text-lg font-serif italic text-[#2D2A26] mb-1">No Payroll Logs Yet</h4>
            <p className="text-[#8C867E] text-sm max-w-md mx-auto">
              Wages are calculated automatically once you mark "Present" or "Half Day" on the Attendance sheet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#F2EEE8] text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-[10px] font-bold text-[#A8A298] uppercase tracking-[0.2em]">
                  <th className="px-6 py-4 rounded-l-2xl">Days of Work</th>
                  <th className="px-6 py-4">Worker</th>
                  <th className="px-6 py-4">Work Type</th>
                  <th className="px-6 py-4">Earned Wage</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right rounded-r-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EEE8] bg-white">
                {groupedPayments.map((g) => {
                  return (
                    <tr key={g.workerId} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedWorkerRecords({name: g.workerName, records: g.records})}
                          className="font-serif italic font-semibold text-[#2D2A26] hover:text-[#8A9A5B] transition-colors underline decoration-dotted underline-offset-4 cursor-pointer"
                        >
                          {Number(g.totalDays.toFixed(1))} {g.totalDays === 1 ? 'Day' : 'Days'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-serif italic font-semibold text-base text-[#2D2A26]">{g.workerName}</span>
                          <span className="text-[#8C867E] text-xs font-medium mt-0.5">{g.workerId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#8C867E] font-semibold text-xs uppercase tracking-wider">{g.workerRole}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[#2D2A26] font-bold font-mono">₹ {g.totalWage}</span>
                          {g.pendingWage > 0 && g.paidWage > 0 && (
                            <span className="text-[10px] text-[#D98E73] font-bold mt-0.5">
                              ₹ {g.pendingWage} PENDING
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                          g.status === "Paid" 
                            ? "bg-[#EEF1E6] text-[#8A9A5B] border-[#EAE4DB]" 
                            : "bg-[#F4EDE4] text-[#D98E73] border-[#EAE4DB]"
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {g.status === "Pending" ? (
                          <button 
                            onClick={() => handleMarkWorkerAsPaid(g.pendingPaymentIds, g.workerName)}
                            className="bg-[#8A9A5B] hover:bg-[#6B784A] text-white font-semibold py-1.5 px-4 rounded-full text-xs transition-colors cursor-pointer shadow-sm"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-xs text-[#8C867E] font-semibold italic flex items-center justify-end gap-1">
                            <History className="w-3 h-3" /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {selectedWorkerRecords && (
        <WorkerCalendarModal 
          workerName={selectedWorkerRecords.name}
          records={selectedWorkerRecords.records}
          onClose={() => setSelectedWorkerRecords(null)}
        />
      )}
    </div>
  );
}
