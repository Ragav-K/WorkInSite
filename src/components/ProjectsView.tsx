import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, onSnapshot, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Project, Worker, formatProjectArea } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";
import { Search, Plus, MapPin, Users, Calendar, Pencil, Trash2, Building2, AlertTriangle, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProjectsViewProps {
  onAddProject: () => void;
  onEditProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
}

export default function ProjectsView({ onAddProject, onEditProject, onOpenProject }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Listen to projects
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      // Sort projects by newest
      projs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setProjects(projs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "projects");
    });

    // Listen to workers for worker count calculation
    const unsubWorkers = onSnapshot(collection(db, "workers"), (snapshot) => {
      const wrks: Worker[] = [];
      snapshot.forEach((doc) => {
        wrks.push({ id: doc.id, ...doc.data() } as Worker);
      });
      setWorkers(wrks);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "workers");
    });

    return () => {
      unsubProjects();
      unsubWorkers();
    };
  }, []);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    const projectId = projectToDelete.id;
    try {
      const batch = writeBatch(db);

      // 1. Delete the project document itself
      batch.delete(doc(db, "projects", projectId));

      // 2. Query and delete all workers for this project
      const workersQuery = query(collection(db, "workers"), where("projectId", "==", projectId));
      const workersSnap = await getDocs(workersQuery);
      workersSnap.forEach((docSnap) => {
        batch.delete(doc(db, "workers", docSnap.id));
      });

      // 3. Query and delete all attendance records for this project
      const attendanceQuery = query(collection(db, "attendance"), where("projectId", "==", projectId));
      const attendanceSnap = await getDocs(attendanceQuery);
      attendanceSnap.forEach((docSnap) => {
        batch.delete(doc(db, "attendance", docSnap.id));
      });

      // 4. Query and delete all payments for this project
      const paymentsQuery = query(collection(db, "payments"), where("projectId", "==", projectId));
      const paymentsSnap = await getDocs(paymentsQuery);
      paymentsSnap.forEach((docSnap) => {
        batch.delete(doc(db, "payments", docSnap.id));
      });

      // Commit the batch delete
      await batch.commit();
      
      setProjectToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}`);
    } finally {
      setDeleting(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const q = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(q) ||
      project.location.toLowerCase().includes(q) ||
      project.supervisorName.toLowerCase().includes(q)
    );
  });

  const getWorkerCount = (projectId: string) => {
    return workers.filter((w) => w.projectId === projectId && w.status === "Active").length;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-serif italic text-[#2D2A26] mb-1">Projects</h1>
          <p className="text-[#8C867E] text-sm">Manage your construction projects</p>
        </div>
        <button 
          onClick={onAddProject}
          className="bg-[#8A9A5B] hover:bg-[#6B784A] text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Search Section */}
      <div className="mb-8 max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-[#A8A298] w-5 h-5" />
          </div>
          <input
            className="block w-full pl-10 pr-3 py-2.5 border border-[#EAE4DB] rounded-xl leading-5 bg-white placeholder-[#A8A298] text-[#4A453E] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] sm:text-sm shadow-sm transition-all"
            placeholder="Search projects..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8A9A5B]"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-[#F5F1EA] rounded-[2.5rem] p-12 text-center border border-[#EAE4DB] shadow-sm">
          <Building2 className="mx-auto h-12 w-12 text-[#A8A298] mb-4" />
          <h3 className="text-lg font-serif italic text-[#2D2A26] mb-1">No Projects Found</h3>
          <p className="text-[#8C867E] text-sm mb-6">Create your first construction project to get started.</p>
          <button 
            onClick={onAddProject}
            className="inline-flex items-center gap-2 bg-[#8A9A5B] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#6B784A] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <article 
              key={project.id}
              onClick={() => onOpenProject(project.id)}
              className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#F2EEE8] flex flex-col hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#EEF1E6] p-3 rounded-2xl text-[#8A9A5B]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif italic font-semibold text-lg text-[#2D2A26] leading-tight">{project.name}</h2>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    project.status === "Active" 
                      ? "bg-[#EEF1E6] text-[#8A9A5B]" 
                      : project.status === "Completed"
                      ? "bg-[#F4EDE4] text-[#D98E73]"
                      : "bg-[#F1EBE2] text-[#8C867E]"
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="space-y-3 text-sm text-[#4A453E] mt-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#A8A298] shrink-0" />
                    <span className="truncate">{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize className="w-4 h-4 text-[#A8A298] shrink-0" />
                    <span>{formatProjectArea(project.area, project.areaUnit)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#A8A298] shrink-0" />
                    <span>{getWorkerCount(project.id)} workers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#A8A298] shrink-0" />
                    <span>Started {formatDate(project.startDate)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#F2EEE8] mt-6 pt-4 flex justify-between items-center">
                <div className="flex gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProject(project.id);
                    }}
                    className="text-[#8C867E] hover:text-[#2D2A26] text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToDelete(project);
                    }}
                    className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProject(project.id);
                  }}
                  className="bg-[#8A9A5B] hover:bg-[#6B784A] text-white px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Open
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setProjectToDelete(null)}
              className="absolute inset-0 bg-[#2D2A26]/40 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-white rounded-[2rem] max-w-md w-full p-8 border border-[#EAE4DB] shadow-xl z-10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-red-50 text-red-500 p-4 rounded-full mb-5">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-serif italic text-[#2D2A26] font-bold mb-3">
                  Delete Project?
                </h3>
                
                <p className="text-[#8C867E] text-sm leading-relaxed mb-6">
                  Are you sure you want to permanently delete <strong className="text-[#2D2A26]">{projectToDelete.name}</strong>? 
                  This will also delete all associated workers, attendance logs, and payroll records. This action cannot be undone.
                </p>
                
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setProjectToDelete(null)}
                    className="flex-1 py-3 px-5 border border-[#EAE4DB] hover:bg-[#F5F1EA] text-[#4A453E] rounded-full text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="flex-1 py-3 px-5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-full text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
