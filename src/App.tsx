import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import ProjectsView from "./components/ProjectsView";
import ProjectForm from "./components/ProjectForm";
import ProjectDetailsView from "./components/ProjectDetailsView";
import AttendanceView from "./components/AttendanceView";
import WorkersView from "./components/WorkersView";
import PayrollView from "./components/PayrollView";
import { seedDatabaseIfEmpty } from "./dbSeed";

type AppView = "projects" | "project_form" | "project_details" | "attendance" | "workers" | "payroll";

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("projects");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(true);

  // Seed database if empty on first launch
  useEffect(() => {
    const initializeData = async () => {
      try {
        await seedDatabaseIfEmpty();
      } catch (err) {
        console.error("Error running database seed:", err);
      } finally {
        setSeeding(false);
      }
    };
    initializeData();
  }, []);

  const handleGoHome = () => {
    setCurrentView("projects");
    setActiveProjectId(null);
    setEditingProjectId(null);
  };

  const handleAddProject = () => {
    setEditingProjectId(null);
    setCurrentView("project_form");
  };

  const handleEditProject = (projectId: string) => {
    setEditingProjectId(projectId);
    setCurrentView("project_form");
  };

  const handleOpenProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setCurrentView("project_details");
  };

  const handleSaveProjectSuccess = () => {
    // If we were editing, return to project details, otherwise back to list
    if (activeProjectId) {
      setCurrentView("project_details");
    } else {
      setCurrentView("projects");
    }
    setEditingProjectId(null);
  };

  const handleBackFromForm = () => {
    if (activeProjectId) {
      setCurrentView("project_details");
    } else {
      setCurrentView("projects");
    }
    setEditingProjectId(null);
  };

  if (seeding) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8A9A5B] mb-4"></div>
        <p className="text-[#8C867E] font-serif italic font-semibold">Initializing WorkInSite Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#4A453E] flex flex-col font-sans">
      <Navbar onGoHome={handleGoHome} />

      <main className="flex-grow">
        {currentView === "projects" && (
          <ProjectsView
            onAddProject={handleAddProject}
            onEditProject={handleEditProject}
            onOpenProject={handleOpenProject}
          />
        )}

        {currentView === "project_form" && (
          <ProjectForm
            projectId={editingProjectId}
            onBack={handleBackFromForm}
            onSaveSuccess={handleSaveProjectSuccess}
          />
        )}

        {currentView === "project_details" && activeProjectId && (
          <ProjectDetailsView
            projectId={activeProjectId}
            onBack={handleGoHome}
            onEditProject={handleEditProject}
            onNavigateToAttendance={(id) => {
              setActiveProjectId(id);
              setCurrentView("attendance");
            }}
            onNavigateToWorkers={(id) => {
              setActiveProjectId(id);
              setCurrentView("workers");
            }}
            onNavigateToPayroll={(id) => {
              setActiveProjectId(id);
              setCurrentView("payroll");
            }}
          />
        )}

        {currentView === "attendance" && activeProjectId && (
          <AttendanceView
            projectId={activeProjectId}
            onBack={() => setCurrentView("project_details")}
          />
        )}

        {currentView === "workers" && activeProjectId && (
          <WorkersView
            projectId={activeProjectId}
            onBack={() => setCurrentView("project_details")}
          />
        )}

        {currentView === "payroll" && activeProjectId && (
          <PayrollView
            projectId={activeProjectId}
            onBack={() => setCurrentView("project_details")}
          />
        )}
      </main>
    </div>
  );
}
