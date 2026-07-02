import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { PaymentRecord, AttendanceStatus } from "../types";

interface WorkerCalendarModalProps {
  workerName: string;
  records: PaymentRecord[];
  onClose: () => void;
}

export default function WorkerCalendarModal({ workerName, records, onClose }: WorkerCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Create a map of date to attendance status
  const attendanceMap: Record<string, AttendanceStatus | "Present"> = {};
  records.forEach((record) => {
    let status: AttendanceStatus | "Present" = record.attendanceStatus || "Present";
    if (!record.attendanceStatus) {
       // if no attendanceStatus explicitly given but wage is paid, we can assume Present (or infer from wage fraction in parent). 
       // We'll trust the parent logic which should pass attendanceStatus if possible.
       if (record.wage === 0) status = "Absent";
    }
    attendanceMap[record.date] = status;
  });

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Generate blank spaces for the first week
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  // Generate days of the month
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-[#EAE4DB]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2EEE8] bg-[#FDFBF7]">
          <div>
            <h3 className="font-serif italic text-xl font-semibold text-[#2D2A26]">{workerName}</h3>
            <p className="text-xs text-[#8C867E] uppercase tracking-wider font-semibold">Attendance</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1EBE2] text-[#8C867E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-[#EAE4DB] hover:bg-[#F5F1EA] text-[#4A453E] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h4 className="font-semibold text-[#2D2A26]">{monthNames[currentMonth]} {currentYear}</h4>
            <button 
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-[#EAE4DB] hover:bg-[#F5F1EA] text-[#4A453E] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {daysOfWeek.map(day => (
              <div key={day} className="text-[10px] font-bold text-[#A8A298] uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {blanks.map(blank => (
              <div key={`blank-${blank}`} className="h-8"></div>
            ))}
            {days.map(day => {
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = attendanceMap[dateStr];
              
              let bgColor = "";
              let textColor = "text-[#4A453E]";
              
              if (status === "Present") {
                bgColor = "bg-[#EEF1E6]";
                textColor = "text-[#8A9A5B] font-bold";
              } else if (status === "Half Day") {
                bgColor = "bg-[#FFF8CC]"; // yellow
                textColor = "text-[#D9B22B] font-bold";
              } else if (status === "Absent") {
                bgColor = "bg-[#FCECE8]"; // red
                textColor = "text-[#D95B5B] font-bold";
              }

              return (
                <div 
                  key={day} 
                  className={`h-8 flex items-center justify-center rounded-full text-sm transition-colors ${bgColor} ${textColor} hover:bg-opacity-80`}
                  title={status ? `${dateStr}: ${status}` : dateStr}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-[#8A9A5B]">
              <div className="w-3 h-3 rounded-full bg-[#EEF1E6]"></div>
              Present
            </div>
            <div className="flex items-center gap-1.5 text-[#D9B22B]">
              <div className="w-3 h-3 rounded-full bg-[#FFF8CC]"></div>
              Half Day
            </div>
            <div className="flex items-center gap-1.5 text-[#D95B5B]">
              <div className="w-3 h-3 rounded-full bg-[#FCECE8]"></div>
              Leave
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
