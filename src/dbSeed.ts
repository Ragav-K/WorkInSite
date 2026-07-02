import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase";
import { Project, Worker } from "./types";
import { handleFirestoreError, OperationType } from "./firestoreErrorHandler";

export async function seedDatabaseIfEmpty() {
  let snapshot;
  try {
    const projectsCol = collection(db, "projects");
    snapshot = await getDocs(projectsCol);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "projects");
    return;
  }

  try {
    if (!snapshot.empty) {
      console.log("Database already seeded with projects");
      return;
    }

    console.log("Seeding database with demo projects and workers...");
    const batch = writeBatch(db);

    // Demo Projects
    const project1: Project = {
      id: "proj_skyline_2",
      name: "Skyline Residency Phase 2",
      description: "G+15 residential tower with commercial podium on floors 1-3. Includes basement parking and landscaped terraces.",
      area: "8,200 sq. ft",
      location: "Sector 62, Noida, UP",
      startDate: "2026-01-10",
      expectedCompletion: "2026-12-31",
      supervisorName: "Rajesh Kumar",
      status: "Active",
      createdAt: new Date().toISOString()
    };

    const project2: Project = {
      id: "proj_ragav_house",
      name: "Ragav K House",
      description: "Custom premium two-story independent villa project with modular kitchen and landscaped lawn.",
      area: "8,000 sq. ft",
      location: "Karumathampatti",
      startDate: "2026-06-27",
      expectedCompletion: "2026-12-25",
      supervisorName: "Rajesh Kumar",
      status: "Active",
      createdAt: new Date().toISOString()
    };

    // Add projects
    batch.set(doc(db, "projects", project1.id), project1);
    batch.set(doc(db, "projects", project2.id), project2);

    // Demo Workers for Skyline Residency Phase 2
    const workersProj1: Omit<Worker, "id">[] = [
      {
        projectId: project1.id,
        name: "Arjun Singh",
        phone: "9876543210",
        age: 34,
        gender: "Male",
        workType: "Mason",
        dailyWage: 650,
        joiningDate: "2026-01-10",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project1.id,
        name: "Ramesh Yadav",
        phone: "9812345678",
        age: 28,
        gender: "Male",
        workType: "Carpenter",
        dailyWage: 600,
        joiningDate: "2026-01-12",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project1.id,
        name: "Suresh Patel",
        phone: "9823456789",
        age: 42,
        gender: "Male",
        workType: "Electrician",
        dailyWage: 750,
        joiningDate: "2026-01-15",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project1.id,
        name: "Kavita Sharma",
        phone: "9834567890",
        age: 25,
        gender: "Female",
        workType: "Painter",
        dailyWage: 500,
        joiningDate: "2026-02-01",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project1.id,
        name: "Mohan Lal",
        phone: "9845678901",
        age: 38,
        gender: "Male",
        workType: "Plumber",
        dailyWage: 700,
        joiningDate: "2026-02-10",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project1.id,
        name: "Deepak Kumar",
        phone: "9856789012",
        age: 30,
        gender: "Male",
        workType: "Helper",
        dailyWage: 400,
        joiningDate: "2026-01-10",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project1.id,
        name: "Sita Devi",
        phone: "9867890123",
        age: 22,
        gender: "Female",
        workType: "Helper",
        dailyWage: 380,
        joiningDate: "2026-01-10",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project1.id,
        name: "Vijay Tiwari",
        phone: "9890123456",
        age: 29,
        gender: "Male",
        workType: "Helper",
        dailyWage: 400,
        joiningDate: "2026-01-15",
        status: "Active",
        createdAt: new Date().toISOString()
      }
    ];

    // Demo Workers for Ragav K House
    const workersProj2: Omit<Worker, "id">[] = [
      {
        projectId: project2.id,
        name: "Raghav Raman",
        phone: "9123456780",
        age: 31,
        gender: "Male",
        workType: "Mason",
        dailyWage: 680,
        joiningDate: "2026-06-27",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project2.id,
        name: "Kartik Swamy",
        phone: "9811223344",
        age: 27,
        gender: "Male",
        workType: "Helper",
        dailyWage: 410,
        joiningDate: "2026-06-28",
        status: "Active",
        createdAt: new Date().toISOString()
      },
      {
        projectId: project2.id,
        name: "Ananya Sen",
        phone: "9988776655",
        age: 24,
        gender: "Female",
        workType: "Painter",
        dailyWage: 520,
        joiningDate: "2026-06-29",
        status: "Active",
        createdAt: new Date().toISOString()
      }
    ];

    // Write workers with ids
    workersProj1.forEach((w, idx) => {
      const id = `W00${idx + 1}`;
      batch.set(doc(db, "workers", id), { ...w, id });
    });

    workersProj2.forEach((w, idx) => {
      const id = `W01${idx + 1}`;
      batch.set(doc(db, "workers", id), { ...w, id });
    });

    try {
      await batch.commit();
      console.log("Seeding complete!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "batch_commit_seed");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
