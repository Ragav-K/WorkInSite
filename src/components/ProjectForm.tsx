import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Project, ProjectStatus } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreErrorHandler";
import { ArrowLeft, Save, ShieldAlert } from "lucide-react";

interface ProjectFormProps {
  projectId: string | null;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export default function ProjectForm({ projectId, onBack, onSaveSuccess }: ProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(projectId));
  const [formError, setFormError] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("Sq. Ft");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Active");

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      setFetching(true);
      try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Project;
          setName(data.name || "");
          setDescription(data.description || "");
          
          // Gracefully split area and areaUnit if not explicitly present
          let parsedArea = data.area || "";
          let parsedUnit = data.areaUnit || "";
          if (!parsedUnit && parsedArea) {
            const lowerArea = parsedArea.toLowerCase();
            if (lowerArea.endsWith("sq. ft") || lowerArea.endsWith("sq.ft")) {
              parsedArea = parsedArea.replace(/sq\.?\s*ft/gi, "").trim();
              parsedUnit = "Sq. Ft";
            } else if (lowerArea.endsWith("sq. yard") || lowerArea.endsWith("sq.yard")) {
              parsedArea = parsedArea.replace(/sq\.?\s*yard/gi, "").trim();
              parsedUnit = "Sq. Yard";
            } else if (lowerArea.endsWith("sq. meter") || lowerArea.endsWith("sq.meter")) {
              parsedArea = parsedArea.replace(/sq\.?\s*meter/gi, "").trim();
              parsedUnit = "Sq. Meter";
            } else if (lowerArea.endsWith("cent") || lowerArea.endsWith("cents")) {
              parsedArea = parsedArea.replace(/cents?/gi, "").trim();
              parsedUnit = "Cent";
            } else if (lowerArea.endsWith("acre") || lowerArea.endsWith("acres")) {
              parsedArea = parsedArea.replace(/acres?/gi, "").trim();
              parsedUnit = "Acre";
            } else {
              parsedUnit = "Sq. Ft";
            }
          }
          setArea(parsedArea);
          setAreaUnit(parsedUnit || "Sq. Ft");
          
          setLocation(data.location || "");
          setStartDate(data.startDate || "");
          setExpectedCompletion(data.expectedCompletion || "");
          setSupervisorName(data.supervisorName || "");
          setStatus(data.status || "Active");
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `projects/${projectId}`);
      } finally {
        setFetching(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name || !area || !location || !startDate || !supervisorName) {
      setFormError("Please fill in all required fields marked with *");
      return;
    }

    setLoading(true);
    try {
      const id = projectId || `proj_${Date.now()}`;
      const projectData: Project = {
        id,
        name,
        description,
        area,
        areaUnit,
        location,
        startDate,
        expectedCompletion,
        supervisorName,
        status,
        createdAt: projectId ? "" : new Date().toISOString() // will be merged/set
      };

      if (projectId) {
        // Editing: update document but keep original createdAt
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          projectData.createdAt = docSnap.data().createdAt || new Date().toISOString();
        }
        await setDoc(docRef, projectData);
      } else {
        // Creating new
        await setDoc(doc(db, "projects", id), projectData);
      }

      onSaveSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, projectId ? `projects/${projectId}` : "projects");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8A9A5B]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-6 py-12 animate-fade-in">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <button 
            type="button"
            onClick={onBack}
            className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#8C867E] hover:text-[#2D2A26] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-4xl font-serif italic text-[#2D2A26] leading-tight font-semibold">
              {projectId ? "Edit Project" : "New Project"}
            </h1>
            <p className="text-[#8C867E] text-sm mt-1">
              {projectId ? "Modify details of your construction project" : "Create a new construction project"}
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          {formError}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-[2.5rem] border border-[#F2EEE8] shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name Field */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="projectName">
              Project Name <span className="text-[#D98E73]">*</span>
            </label>
            <input
              className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] placeholder-[#A8A298] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
              id="projectName"
              placeholder="e.g. Skyline Residency Phase 2"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] placeholder-[#A8A298] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all resize-y"
              id="description"
              placeholder="Brief project description..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Area and Location Row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="area">
                Area <span className="text-[#D98E73]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 min-w-0 rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] placeholder-[#A8A298] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
                  id="area"
                  placeholder="e.g. 8,200"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                />
                <select
                  className="w-32 rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all cursor-pointer"
                  id="areaUnit"
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value)}
                >
                  <option value="Sq. Ft">Sq. Ft</option>
                  <option value="Cent">Cent</option>
                  <option value="Acre">Acre</option>
                  <option value="Sq. Yard">Sq. Yard</option>
                  <option value="Sq. Meter">Sq. Meter</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="location">
                Location <span className="text-[#D98E73]">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] placeholder-[#A8A298] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
                id="location"
                placeholder="e.g. Sector 62, Noida, UP"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Start Date and Expected Completion Row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="startDate">
                Start Date <span className="text-[#D98E73]">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="expectedCompletion">
                Expected Completion
              </label>
              <input
                className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
                id="expectedCompletion"
                type="date"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
              />
            </div>
          </div>

          {/* Supervisor Name and Status Row */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="supervisorName">
                Supervisor Name <span className="text-[#D98E73]">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] placeholder-[#A8A298] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
                id="supervisorName"
                placeholder="e.g. Rajesh Kumar"
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#A8A298] font-bold mb-2" htmlFor="status">
                Status
              </label>
              <select
                className="w-full rounded-xl border border-[#EAE4DB] bg-white text-[#4A453E] sm:text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] shadow-sm transition-all"
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-4 pt-6 border-t border-[#F2EEE8]">
            <button
              className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-full shadow-sm text-sm font-semibold text-white bg-[#8A9A5B] hover:bg-[#6B784A] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] cursor-pointer transition-colors disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              <Save className="mr-2 w-4 h-4" />
              {loading ? "Saving..." : "Save Project"}
            </button>
            <button
              className="inline-flex items-center justify-center px-6 py-2.5 border border-[#EAE4DB] rounded-full shadow-sm text-sm font-semibold text-[#8C867E] hover:text-[#2D2A26] bg-white hover:bg-[#FDFBF7] focus:outline-none cursor-pointer transition-colors"
              type="button"
              onClick={onBack}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
