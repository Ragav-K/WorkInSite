import React, { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Project, Worker, AttendanceRecord, PaymentRecord, formatProjectArea } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";
import { ArrowLeft, Pencil, Users, UserCheck, UserX, Calendar, ClipboardList, Wallet, Landmark, MapPin, Maximize, Clock } from "lucide-react";

interface ProjectDetailsViewProps {
  projectId: string;
  onBack: () => void;
  onEditProject: (projectId: string) => void;
  onNavigateToAttendance: (projectId: string) => void;
  onNavigateToWorkers: (projectId: string) => void;
  onNavigateToPayroll: (projectId: string) => void;
}

export default function ProjectDetailsView({
  projectId,
  onBack,
  onEditProject,
  onNavigateToAttendance,
  onNavigateToWorkers,
  onNavigateToPayroll
}: ProjectDetailsViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Today's date dynamic
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayDateString();
  useEffect(() => {
    if (!projectId) return;

    // Listen to Project details
    const unsubProject = onSnapshot(doc(db, "projects", projectId), (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() } as Project);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
    });

    // Listen to project workers
    const workersQuery = query(collection(db, "workers"), where("projectId", "==", projectId));
    const unsubWorkers = onSnapshot(workersQuery, (snapshot) => {
      const wrks: Worker[] = [];
      snapshot.forEach((doc) => {
        wrks.push({ id: doc.id, ...doc.data() } as Worker);
      });
      setWorkers(wrks);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `workers?projectId=${projectId}`);
    });

    // Listen to today's attendance (using todayStr formatted date)
    const attendanceDocId = `${projectId}_${todayStr}`;
    const unsubAttendance = onSnapshot(doc(db, "attendance", attendanceDocId), (docSnap) => {
      if (docSnap.exists()) {
        setAttendance({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
      } else {
        setAttendance(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `attendance/${attendanceDocId}`);
    });

    // Listen to project payments
    const paymentsQuery = query(collection(db, "payments"), where("projectId", "==", projectId));
    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      const pmts: PaymentRecord[] = [];
      snapshot.forEach((doc) => {
        pmts.push({ id: doc.id, ...doc.data() } as PaymentRecord);
      });
      setPayments(pmts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `payments?projectId=${projectId}`);
    });

    return () => {
      unsubProject();
      unsubWorkers();
      unsubAttendance();
      unsubPayments();
    };
  }, [projectId]);

  // Statistics calculations
  const totalWorkersCount = workers.filter((w) => w.status === "Active").length;

  let presentTodayCount = 0;
  let halfDayTodayCount = 0;
  let absentTodayCount = 0;

  if (attendance && attendance.records) {
    Object.values(attendance.records).forEach((val) => {
      const item = val as any;
      if (item.status === "Present") presentTodayCount++;
      else if (item.status === "Half Day") halfDayTodayCount++;
      else if (item.status === "Absent") absentTodayCount++;
    });
  } else {
    // If no attendance sheet created yet, default to all absent
    absentTodayCount = totalWorkersCount;
  }

  // Pending payroll calculations
  const pendingPayrollSum = payments
    .filter((p) => p.status === "Pending")
    .reduce((sum, p) => sum + p.wage, 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8A9A5B]"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-[#8C867E]">Project not found.</p>
        <button onClick={onBack} className="mt-4 text-[#8A9A5B] font-semibold underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Project Header Section */}
      <section className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button 
            onClick={onBack}
            className="mt-1 flex items-center gap-1.5 text-[#8C867E] hover:text-[#2D2A26] text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-4xl font-serif italic text-[#2D2A26] font-semibold leading-tight">{project.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                project.status === "Active" 
                  ? "bg-[#EEF1E6] text-[#8A9A5B]" 
                  : project.status === "Completed"
                  ? "bg-[#F4EDE4] text-[#D98E73]"
                  : "bg-[#F1EBE2] text-[#8C867E]"
              }`}>
                {project.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#4A453E] mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#A8A298]" />
                <span>{project.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Maximize className="w-4 h-4 text-[#A8A298]" />
                <span>{formatProjectArea(project.area, project.areaUnit)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#8C867E]">Supervisor: <span className="font-serif italic font-semibold text-[#2D2A26]">{project.supervisorName}</span></span>
              </div>
            </div>
            <p className="text-sm text-[#4A453E] max-w-3xl leading-relaxed">
              {project.description || "No project description available."}
            </p>
          </div>
        </div>
        <div>
          <button 
            onClick={() => onEditProject(project.id)}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#EAE4DB] hover:bg-[#F1EBE2] rounded-full text-sm font-semibold text-[#4A453E] transition-colors shadow-sm bg-white cursor-pointer"
          >
            <Pencil className="w-4 h-4 text-[#8A9A5B]" />
            Edit Project
          </button>
        </div>
      </section>

      {/* Summary Cards Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-4">
        {/* Card: Total Workers */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#F2EEE8] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF1E6] flex items-center justify-center text-[#8A9A5B]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1">Total Workers</p>
            <p className="text-3xl font-serif italic text-[#2D2A26] font-semibold">{totalWorkersCount}</p>
          </div>
        </div>

        {/* Card: Present Today */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#F2EEE8] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF1E6] flex items-center justify-center text-[#8A9A5B]">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1">Present</p>
            <p className="text-3xl font-serif italic text-[#2D2A26] font-semibold">{presentTodayCount}</p>
          </div>
        </div>

        {/* Card: Half Day Today */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#F2EEE8] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F4EDE4] flex items-center justify-center text-[#D98E73]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1">Half Day</p>
            <p className="text-3xl font-serif italic text-[#2D2A26] font-semibold">{halfDayTodayCount}</p>
          </div>
        </div>

        {/* Card: Absent Today */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#F2EEE8] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F4EDE4] flex items-center justify-center text-[#D98E73]">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1">Absent Today</p>
            <p className="text-3xl font-serif italic text-[#2D2A26] font-semibold">{absentTodayCount}</p>
          </div>
        </div>

        {/* Card: Pending Payroll */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#F2EEE8] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F1EBE2] flex items-center justify-center text-[#4A453E] font-serif italic font-bold text-xl">
            ₹
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1">Pending Payroll</p>
            <p className="text-3xl font-serif italic text-[#2D2A26] font-semibold">₹{pendingPayrollSum}</p>
          </div>
        </div>
      </section>

      {/* Main Dashboard Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Action Card: Attendance */}
        <div 
          onClick={() => onNavigateToAttendance(project.id)}
          className="bg-white rounded-[2.5rem] border border-[#F2EEE8] p-8 shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF1E6] flex items-center justify-center text-[#8A9A5B] shrink-0 group-hover:bg-[#8A9A5B] group-hover:text-white transition-colors">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-serif italic font-semibold text-[#2D2A26]">Attendance</h3>
                <p className="text-xs text-[#A8A298] uppercase tracking-widest mt-0.5">Mark daily attendance</p>
              </div>
            </div>
            <p className="text-sm text-[#4A453E] leading-relaxed mb-6">
              Record daily presence, half-days, leaves, and work descriptions for each worker.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#EEF1E6] text-[#8A9A5B] border border-[#EAE4DB]">
              <UserCheck className="w-3.5 h-3.5" /> {presentTodayCount} Present
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#F4EDE4] text-[#D98E73] border border-[#EAE4DB]">
              <Calendar className="w-3.5 h-3.5" /> {halfDayTodayCount} Half Day
            </span>
          </div>
        </div>

        {/* Action Card: Payroll Dashboard */}
        <div 
          onClick={() => onNavigateToPayroll(project.id)}
          className="bg-white rounded-[2.5rem] border border-[#F2EEE8] p-8 shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF1E6] flex items-center justify-center text-[#8A9A5B] shrink-0 group-hover:bg-[#8A9A5B] group-hover:text-white transition-colors">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-serif italic font-semibold text-[#2D2A26]">Payroll Dashboard</h3>
                <p className="text-xs text-[#A8A298] uppercase tracking-widest mt-0.5">Daily wage payroll</p>
              </div>
            </div>
            <p className="text-sm text-[#4A453E] leading-relaxed mb-6">
              View calculated wages, track pending payments, and mark payments as paid.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#F4EDE4] text-[#D98E73] border border-[#EAE4DB]">
              ₹ {pendingPayrollSum} Pending
            </span>
          </div>
        </div>
      </section>

      {/* Workers Management Section */}
      <section className="bg-[#F5F1EA] rounded-[2.5rem] p-8 border border-[#EAE4DB] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-[#8A9A5B]" />
            <h3 className="text-xl font-serif italic text-[#2D2A26] font-semibold flex items-center gap-2">
              Workers 
              <span className="bg-[#F1EBE2] text-[#4A453E] text-xs py-0.5 px-2.5 rounded-full font-semibold border border-[#EAE4DB]">
                {totalWorkersCount}
              </span>
            </h3>
          </div>
          <p className="text-sm text-[#4A453E] leading-relaxed">
            Add, edit, and manage workers registered for this project. Set their work type, daily wage, and track their details.
          </p>
        </div>
        <button 
          onClick={() => onNavigateToWorkers(project.id)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#8A9A5B] hover:bg-[#6B784A] text-white rounded-full text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <ClipboardList className="w-4 h-4" />
          Manage Workers
        </button>
      </section>

      {/* Project Timeline Section */}
      <section className="bg-white rounded-[2.5rem] border border-[#F2EEE8] p-8 shadow-sm">
        <h3 className="text-xl font-serif italic text-[#2D2A26] font-semibold mb-6">Project Timeline</h3>
        <div className="flex flex-wrap gap-x-24 gap-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1">Start Date</p>
            <p className="text-sm font-serif italic font-semibold text-[#2D2A26]">{formatDate(project.startDate)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1">Expected Completion</p>
            <p className="text-sm font-serif italic font-semibold text-[#2D2A26]">
              {project.expectedCompletion ? formatDate(project.expectedCompletion) : "Ongoing"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
