import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Project, Worker, WorkType, GenderType, WorkerStatus } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";
import { ArrowLeft, Plus, Search, Pencil, Trash2, X, Phone, User, Calendar, ShieldAlert } from "lucide-react";

interface WorkersViewProps {
  projectId: string;
  onBack: () => void;
}

export default function WorkersView({ projectId, onBack }: WorkersViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState(""); // store as string to allow empty input
  const [ageError, setAgeError] = useState("");
  const [formError, setFormError] = useState("");
  const [gender, setGender] = useState<GenderType>("Male");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [workType, setWorkType] = useState<WorkType>("");
  const [dailyWage, setDailyWage] = useState<number | "">("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>("Active");

  useEffect(() => {
    if (!projectId) return;

    // Fetch project
    const fetchProject = async () => {
      try {
        const snap = await getDoc(doc(db, "projects", projectId));
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() } as Project);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `projects/${projectId}`);
      }
    };
    fetchProject();

    // Listen to workers in real-time
    const q = query(collection(db, "workers"), where("projectId", "==", projectId));
    const unsub = onSnapshot(q, (snapshot) => {
      const wrks: Worker[] = [];
      snapshot.forEach((doc) => {
        wrks.push({ id: doc.id, ...doc.data() } as Worker);
      });
      // Sort workers by ID (W001, W002...)
      wrks.sort((a, b) => a.id.localeCompare(b.id));
      setWorkers(wrks);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `workers?projectId=${projectId}`);
    });

    return () => unsub();
  }, [projectId]);

  // Open modal for adding
  const handleAddClick = () => {
    setEditingWorker(null);
    setFullName("");
    setAge(""); // empty string for fresh input
    setAgeError("");
    setFormError("");
    setGender("Male");
    setCountryCode("+91");
    setPhone("");
    setWorkType("");
    setDailyWage("");
    setJoiningDate(new Date().toISOString().split("T")[0]);
    setWorkerStatus("Active");
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEditClick = (worker: Worker) => {
    setEditingWorker(worker);
    setFullName(worker.name);
    setAge(String(worker.age)); // store as string
    setAgeError("");
    setFormError("");
    setGender(worker.gender);
    const phoneParts = worker.phone.split(" ");
    if (phoneParts.length > 1 && phoneParts[0].startsWith("+")) {
      setCountryCode(phoneParts[0]);
      setPhone(phoneParts.slice(1).join(" "));
    } else {
      setCountryCode("+91");
      setPhone(worker.phone);
    }
    setWorkType(worker.workType);
    setDailyWage(worker.dailyWage);
    setJoiningDate(worker.joiningDate);
    setWorkerStatus(worker.status);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (workerId: string) => {
    if (confirm(`Are you sure you want to delete worker ${workerId}?`)) {
      try {
        await deleteDoc(doc(db, "workers", workerId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `workers/${workerId}`);
      }
    }
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!fullName || !phone || !joiningDate || !dailyWage || !workType) {
      setFormError("Please fill in all required fields.");
      return;
    }
    // Validate age must be >= 18
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 18) {
      setAgeError("Value must be greater than or equal to 18.");
      return;
    }

    try {
      let nextId = "";
      if (editingWorker) {
        nextId = editingWorker.id;
      } else {
        // Generate automatic ID sequence W001, W002...
        // Wait, let's look at existing workers to find next sequence
        const existingIds = workers.map(w => w.id).filter(id => id.startsWith("W"));
        if (existingIds.length > 0) {
          const numbers = existingIds.map(id => parseInt(id.substring(1))).filter(n => !isNaN(n));
          const maxNum = Math.max(...numbers);
          const nextNum = maxNum + 1;
          nextId = `W${nextNum.toString().padStart(3, "0")}`;
        } else {
          nextId = "W001";
        }
      }

      const workerData: Worker = {
        id: nextId,
        projectId,
        name: fullName,
        phone: `${countryCode} ${phone}`,
        age: Number(age),
        gender,
        workType,
        dailyWage: Number(dailyWage),
        joiningDate,
        status: workerStatus,
        createdAt: editingWorker ? editingWorker.createdAt : new Date().toISOString()
      };

      await setDoc(doc(db, "workers", nextId), workerData);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, editingWorker ? `workers/${editingWorker.id}` : "workers");
    }
  };

  const filteredWorkers = workers.filter((worker) => {
    const q = searchQuery.toLowerCase();
    return (
      worker.name.toLowerCase().includes(q) ||
      worker.id.toLowerCase().includes(q) ||
      worker.workType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl w-full mx-auto p-6 flex flex-col gap-6 animate-fade-in">
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
            <h2 className="text-4xl font-serif italic text-[#2D2A26] leading-tight font-semibold">Workers</h2>
            <p className="text-[#8C867E] text-sm mt-1">{project?.name || "Loading..."}</p>
          </div>
        </div>
        <button 
          onClick={handleAddClick}
          className="bg-[#8A9A5B] hover:bg-[#6B784A] text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Worker
        </button>
      </div>

      {/* SearchBar */}
      <div className="w-full max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-[#A8A298] w-5 h-5" />
          </div>
          <input 
            className="block w-full pl-10 pr-3 py-2.5 border border-[#EAE4DB] rounded-xl leading-5 bg-white placeholder-[#A8A298] text-[#4A453E] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] sm:text-sm shadow-sm transition-shadow" 
            placeholder="Search by name, ID or type..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* WorkersTable */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8A9A5B]"></div>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="bg-[#F5F1EA] rounded-[2.5rem] p-12 text-center border border-[#EAE4DB] shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-[#A8A298] mb-4" />
          <h3 className="text-lg font-serif italic text-[#2D2A26] mb-1">No Workers Found</h3>
          <p className="text-[#8C867E] mb-4 text-sm">No workers match your search or registered in this project.</p>
          <button 
            onClick={handleAddClick}
            className="bg-[#8A9A5B] text-white px-5 py-2.5 rounded-full font-semibold text-sm inline-flex items-center gap-2 hover:bg-[#6B784A] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Worker
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#F2EEE8] rounded-[2.5rem] shadow-sm overflow-hidden p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#F2EEE8] text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#F7F3EE] border-b border-[#EAE4DB] text-[10px] font-bold text-[#A8A298] uppercase tracking-[0.2em]">
                  <th className="px-6 py-4 rounded-l-2xl" scope="col">ID</th>
                  <th className="px-6 py-4" scope="col">Worker</th>
                  <th className="px-6 py-4" scope="col">Age</th>
                  <th className="px-6 py-4" scope="col">Work Type</th>
                  <th className="px-6 py-4" scope="col">Daily Wage</th>
                  <th className="px-6 py-4" scope="col">Status</th>
                  <th className="px-6 py-4 text-right rounded-r-2xl" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EEE8] bg-white">
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#F1EBE2] text-[#4A453E] border border-[#EAE4DB]">
                        {worker.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-serif italic font-semibold text-lg text-[#2D2A26]">{worker.name}</span>
                        <span className="text-[#8C867E] text-xs flex items-center gap-1 mt-1 font-medium">
                          <Phone className="w-3 h-3 text-[#A8A298]" /> {worker.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#4A453E] font-medium">{worker.age}</td>
                    <td className="px-6 py-4 text-[#8C867E] font-semibold text-xs uppercase tracking-wider">
                      {worker.workType}
                    </td>
                    <td className="px-6 py-4 text-[#2D2A26] font-bold">₹ {worker.dailyWage}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                        worker.status === "Active" 
                          ? "bg-[#EEF1E6] text-[#8A9A5B] border-[#EAE4DB]" 
                          : "bg-[#F4EDE4] text-[#D98E73] border-[#EAE4DB]"
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEditClick(worker)}
                        className="text-[#8C867E] hover:text-[#2D2A26] p-1.5 transition-colors cursor-pointer inline-flex items-center" 
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(worker.id)}
                        className="text-red-400 hover:text-red-600 p-1.5 ml-2 transition-colors cursor-pointer inline-flex items-center" 
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Worker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-[#F2EEE8]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#F2EEE8]">
              <h2 className="text-2xl font-serif italic text-[#2D2A26] font-semibold">
                {editingWorker ? "Edit Worker" : "Add Worker"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#8C867E] hover:text-[#2D2A26] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  {formError}
                </div>
              )}
              <form onSubmit={handleSaveWorker} className="space-y-4" autoComplete="off">
                {/* Full Name Field */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="full_name">
                    Full Name <span className="text-[#D98E73]">*</span>
                  </label>
                  <input 
                    className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] placeholder-[#A8A298] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all" 
                    id="full_name" 
                    placeholder="Arjun Singh" 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Age & Gender Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="age">
                      Age <span className="text-[#D98E73]">*</span>
                    </label>
                    <input 
                      className={`w-full rounded-xl border ${ageError ? 'border-red-400' : 'border-[#EAE4DB]'} bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 ${ageError ? 'focus:ring-red-400 focus:border-red-400' : 'focus:ring-[#8A9A5B] focus:border-[#8A9A5B]'} shadow-sm transition-all`}
                      id="age" 
                      type="number"
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value);
                        if (ageError) setAgeError("");
                      }}
                      required
                    />
                    {ageError && <p className="text-red-500 text-xs mt-1.5">{ageError}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="gender">
                      Gender <span className="text-[#D98E73]">*</span>
                    </label>
                    <select 
                      className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all" 
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as GenderType)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="phone">
                    Phone <span className="text-[#D98E73]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="w-[100px] rounded-xl border border-[#EAE4DB] bg-[#FDFBF7] text-[#4A453E] sm:text-sm px-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                    </select>
                    <input 
                      className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] placeholder-[#A8A298] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all" 
                      id="phone" 
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                {/* Work Type & Daily Wage Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="work_type">
                      Work Type <span className="text-[#D98E73]">*</span>
                    </label>
                    <input 
                      className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all" 
                      id="work_type"
                      list="work_type_options"
                      value={workType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWorkType(val.charAt(0).toUpperCase() + val.slice(1));
                      }}
                      required
                    />
                    <datalist id="work_type_options">
                      <option value="Mason" />
                      <option value="Helper" />
                      <option value="Carpenter" />
                      <option value="Electrician" />
                      <option value="Painter" />
                      <option value="Plumber" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="daily_wage">
                      Daily Wage (₹) <span className="text-[#D98E73]">*</span>
                    </label>
                    <input 
                      className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all" 
                      id="daily_wage" 
                      type="number"
                      value={dailyWage}
                      onChange={(e) => setDailyWage(e.target.value === "" ? "" : Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                {/* Joining Date & Status Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="joining_date">
                      Joining Date <span className="text-[#D98E73]">*</span>
                    </label>
                    <input 
                      className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all" 
                      id="joining_date" 
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-1.5" htmlFor="status">
                      Status
                    </label>
                    <select 
                      className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all" 
                      id="status"
                      value={workerStatus}
                      onChange={(e) => setWorkerStatus(e.target.value as WorkerStatus)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 flex justify-end">
                  <button 
                    className="bg-[#8A9A5B] hover:bg-[#6B784A] text-white font-semibold py-2.5 px-6 rounded-full text-sm transition-colors cursor-pointer shadow-sm"
                    type="submit"
                  >
                    Save Worker
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
