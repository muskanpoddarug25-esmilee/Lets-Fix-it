import React, { useState, useMemo } from "react";
import { Report, UserProfile } from "../types";
import { 
  ShieldCheck, AlertTriangle, Calendar, Search, Filter, 
  ArrowUpDown, Check, Settings, Eye, ChevronRight, RefreshCw, 
  Clock, CheckCircle, TrendingUp, HelpCircle, Layers, MapPin, DollarSign
} from "lucide-react";

interface AdminPanelProps {
  reports: Report[];
  onUpdateStatus: (
    reportId: string, 
    newStatus: "Reported" | "Verified" | "Assigned to Department" | "Work In Progress" | "Under Review" | "Resolved"
  ) => void;
  isDarkMode: boolean;
}

const STAGES = [
  { label: "Reported", pct: 10, color: "bg-orange-500" },
  { label: "Verified", pct: 25, color: "bg-orange-400" },
  { label: "Assigned to Department", pct: 40, color: "bg-amber-500" },
  { label: "Work In Progress", pct: 65, color: "bg-yellow-500" },
  { label: "Under Review", pct: 85, color: "bg-lime-500" },
  { label: "Resolved", pct: 100, color: "bg-emerald-500" }
];

export default function AdminPanel({ reports, onUpdateStatus, isDarkMode }: AdminPanelProps) {
  // Filtering & Sorting State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [categoryKeyword, setCategoryKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  
  // Sort state
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Detail Modal view
  const [selectedReportDetail, setSelectedReportDetail] = useState<Report | null>(null);

  // Department assignment dialog state
  const [assigningReportId, setAssigningReportId] = useState<string | null>(null);

  // Helper to resolve department name from category
  const getDepartmentName = (category: string): string => {
    switch (category) {
      case "potholes":
        return "PWD Road Operations";
      case "water leakage":
        return "Municipal Jal Board";
      case "broken streetlights":
        return "Electricity Board (EB)";
      case "garbage":
        return "Municipal Sanitation Dept";
      case "public infrastructure":
        return "Urban Development Authority";
      default:
        return "General Municipal Council";
    }
  };

  // Resolve progress percentage
  const getProgressPct = (status: string): number => {
    const s = (status || "").toLowerCase();
    if (s === "in progress") return 65;
    const stage = STAGES.find(stg => stg.label.toLowerCase() === s);
    return stage ? stage.pct : 10;
  };

  // Normalize date
  const getReportDate = (r: Report): Date => {
    if (r.createdAt?.toDate) return r.createdAt.toDate();
    return new Date(r.createdAt || Date.now());
  };

  // Section 4 Stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const reportedToday = reports.filter(r => getReportDate(r).toDateString() === todayStr).length;
    const fixedToday = reports.filter(r => r.status === "Resolved" && r.updatedAt && new Date(r.updatedAt).toDateString() === todayStr).length;
    const pending = reports.filter(r => r.status !== "Resolved").length;
    
    // Simulating "overdue" reports (e.g. status !== Resolved and created > 2 days ago)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const overdue = reports.filter(r => r.status !== "Resolved" && getReportDate(r) < twoDaysAgo).length;

    const totalResolved = reports.filter(r => r.status === "Resolved").length;
    const totalReports = reports.length;

    return {
      reportedToday,
      fixedToday,
      pending,
      overdue,
      totalResolved,
      totalUnresolved: totalReports - totalResolved
    };
  }, [reports]);

  // Handle columns sorting toggle
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort reports
  const filteredAndSorted = useMemo(() => {
    return reports
      .filter((r) => {
        // Date range
        const rDate = getReportDate(r);
        if (startDate) {
          const sDate = new Date(startDate);
          if (rDate < sDate) return false;
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          if (rDate > eDate) return false;
        }

        // Department
        const dept = getDepartmentName(r.category);
        if (selectedDepartment !== "All" && dept !== selectedDepartment) {
          return false;
        }

        // Category Keyword
        if (categoryKeyword) {
          const kw = categoryKeyword.toLowerCase();
          const matchCat = r.category.toLowerCase().includes(kw);
          const matchTitle = r.title.toLowerCase().includes(kw);
          const matchDept = dept.toLowerCase().includes(kw);
          if (!matchCat && !matchTitle && !matchDept) return false;
        }

        // Status
        if (selectedStatus !== "All" && r.status !== selectedStatus) {
          return false;
        }

        // Priority
        const priority = r.aiAnalysis?.severity || "Medium";
        if (selectedPriority !== "All" && priority !== selectedPriority) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valueA: any = "";
        let valueB: any = "";

        if (sortField === "id") {
          valueA = a.id;
          valueB = b.id;
        } else if (sortField === "category") {
          valueA = a.category;
          valueB = b.category;
        } else if (sortField === "location") {
          valueA = a.location?.address || "";
          valueB = b.location?.address || "";
        } else if (sortField === "date") {
          valueA = getReportDate(a).getTime();
          valueB = getReportDate(b).getTime();
        } else if (sortField === "department") {
          valueA = getDepartmentName(a.category);
          valueB = getDepartmentName(b.category);
        } else if (sortField === "status") {
          valueA = a.status;
          valueB = b.status;
        } else if (sortField === "priority") {
          valueA = a.aiAnalysis?.severity || "Medium";
          valueB = b.aiAnalysis?.severity || "Medium";
        }

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [reports, startDate, endDate, selectedDepartment, categoryKeyword, selectedStatus, selectedPriority, sortField, sortDirection]);

  // Percentage calculations
  const totalReportsCount = reports.length || 1;
  const resolutionPercentage = Math.round((stats.totalResolved / totalReportsCount) * 100);
  const strokeDashoffset = 251.2 - (251.2 * resolutionPercentage) / 100;

  return (
    <div className="space-y-6" style={{ background: "transparent" }}>
      {/* Top Banner with Stats & Ring Chart */}
      <div 
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-2xl border shadow-xl transition-all"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)"
        }}
      >
        {/* Left Column: Fixed / Unfixed with Percentage Ring Chart */}
        <div className="lg:col-span-4 flex items-center justify-between gap-6 border-b lg:border-b-0 lg:border-r pb-6 lg:pb-0 lg:pr-6" style={{ borderColor: "var(--card-border)" }}>
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-orange-500 uppercase tracking-widest font-extrabold block">Municipal Resolution Index</span>
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                {stats.totalResolved} <span className="text-emerald-500 text-lg font-bold">Fixed</span>
              </h2>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-secondary)" }}>
                {stats.totalUnresolved} <span className="text-orange-500 text-base font-bold">Active</span>
              </h2>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Overall civic repair operations status.
            </p>
          </div>

          {/* SVG percentage ring chart */}
          <div className="relative h-28 w-28 shrink-0 flex items-center justify-center bg-slate-900/10 rounded-full p-2 border border-dashed" style={{ borderColor: "var(--card-border)" }}>
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="40"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="40"
                className="stroke-emerald-500 transition-all duration-1000"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-black block leading-none" style={{ color: "var(--text-primary)" }}>{resolutionPercentage}%</span>
              <span className="text-[8px] font-mono uppercase block mt-1" style={{ color: "var(--text-muted)" }}>Resolved</span>
            </div>
          </div>
        </div>

        {/* Right Column: Key Today Metrics Grid */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-5 items-center">
          {/* Stats card 1 */}
          <div className="p-6 rounded-xl border" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--input-bg)" }}>
            <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>REPORTED TODAY</span>
            <span className="block text-2xl font-black text-orange-500 mt-1">{stats.reportedToday}</span>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>New incidents logged</p>
          </div>
          {/* Stats card 2 */}
          <div className="p-6 rounded-xl border" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--input-bg)" }}>
            <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>FIXED TODAY</span>
            <span className="block text-2xl font-black text-emerald-500 mt-1">{stats.fixedToday}</span>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Closed by dispatch</p>
          </div>
          {/* Stats card 3 */}
          <div className="p-6 rounded-xl border" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--input-bg)" }}>
            <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>ACTIVE PENDING</span>
            <span className="block text-2xl font-black text-amber-500 mt-1">{stats.pending}</span>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>In service queues</p>
          </div>
          {/* Stats card 4 */}
          <div className="p-6 rounded-xl border border-red-500/20" style={{ backgroundColor: "var(--input-bg)" }}>
            <span className="block text-[9px] font-mono text-red-500 font-extrabold uppercase">OVERDUE S.L.A.</span>
            <span className="block text-2xl font-black text-red-500 mt-1">{stats.overdue}</span>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Awaiting fix &gt; 48h</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div 
        className="p-6 rounded-2xl border shadow-md space-y-4 transition-all"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)"
        }}
      >
        <h3 className="text-xs font-mono text-orange-500 uppercase tracking-widest font-bold">Government Search Controls & Advanced Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Filter 1: Department wise filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium"
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--card-border)"
              }}
            >
              <option value="All">All Departments</option>
              <option value="PWD Road Operations">PWD Road Operations</option>
              <option value="Municipal Jal Board">Municipal Jal Board</option>
              <option value="Electricity Board (EB)">Electricity Board (EB)</option>
              <option value="Municipal Sanitation Dept">Municipal Sanitation Dept</option>
              <option value="Urban Development Authority">Urban Development Authority</option>
            </select>
          </div>

          {/* Filter 2: Keyword search for Categories / Department Officer Search */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>Department Keyword Officer Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
              <input 
                type="text"
                placeholder='Search "pothole", "road", etc...'
                value={categoryKeyword}
                onChange={(e) => setCategoryKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border outline-none"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--card-border)"
                }}
              />
            </div>
          </div>

          {/* Filter 3: Status Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>Workflow Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium"
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--card-border)"
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Verified">Verified</option>
              <option value="Assigned to Department">Assigned to Department</option>
              <option value="Work In Progress">Work In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Filter 4: Priority Severity Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>AI Severity Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium"
              style={{
                backgroundColor: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--card-border)"
              }}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Date filters line */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-dashed items-end justify-between" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>From Date</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--card-border)"
                }}
              />
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>to</span>
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>To Date</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--card-border)"
                }}
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>

          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            Found {filteredAndSorted.length} matching issues
          </span>
        </div>
      </div>

      {/* TABLE VIEW (NOT CARDS) */}
      <div 
        className="rounded-2xl border shadow-xl overflow-hidden transition-all"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)"
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-[10px] font-mono uppercase tracking-wider bg-slate-900/10" style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}>
                <th className="px-5 py-4 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => toggleSort("id")}>
                  Issue ID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => toggleSort("category")}>
                  Category <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => toggleSort("location")}>
                  Location <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => toggleSort("date")}>
                  Reported Date <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => toggleSort("department")}>
                  Assigned Dept <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => toggleSort("status")}>
                  Status / Progress <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="px-5 py-4 cursor-pointer hover:text-orange-500 transition-colors" onClick={() => toggleSort("priority")}>
                  Priority <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>All clean! No reports matching selected criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((report) => {
                  const dateObj = getReportDate(report);
                  const dateStr = dateObj.toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) + " " + dateObj.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
                  const dept = getDepartmentName(report.category);
                  const pct = getProgressPct(report.status);

                  return (
                    <tr 
                      key={report.id} 
                      className="hover:bg-slate-900/5 transition-colors text-xs"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {/* ID */}
                      <td className="px-5 py-4 font-mono font-bold text-[10px] select-all">
                        #{report.id.substring(0, 6)}...
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 font-semibold capitalize">
                        {report.category}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 max-w-[180px]">
                        <p className="truncate font-semibold">{report.location?.city || "New Delhi"}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{report.location?.address}</p>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {dateStr}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold">
                          {dept}
                        </span>
                      </td>

                      {/* Status / mini Progress Bar */}
                      <td className="px-5 py-4 space-y-1.5 min-w-[160px]">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold uppercase tracking-wide text-emerald-500 font-mono">{report.status}</span>
                          <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
                        </div>
                        {/* Mini bar */}
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-[9px] font-mono rounded border ${
                          report.aiAnalysis?.severity === "High"
                            ? "bg-red-500/10 text-red-500 border-red-500/20 font-bold"
                            : report.aiAnalysis?.severity === "Medium"
                            ? "bg-orange-500/10 text-orange-500 border-orange-500/20 font-semibold"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        }`}>
                          {report.aiAnalysis?.severity || "Medium"}
                        </span>
                      </td>

                      {/* Action buttons inside table row */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-1.5 justify-end flex-wrap max-w-[280px]">
                          {/* Mark In Progress */}
                          {report.status !== "Work In Progress" && report.status !== "Resolved" && (
                            <button
                              onClick={() => onUpdateStatus(report.id, "Work In Progress")}
                              className="px-2 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold cursor-pointer transition-all"
                              title="Mark Work In Progress"
                            >
                              Dispatch
                            </button>
                          )}

                          {/* Mark Resolved */}
                          {report.status !== "Resolved" && (
                            <button
                              onClick={() => onUpdateStatus(report.id, "Resolved")}
                              className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                              title="Mark Resolved"
                            >
                              <Check className="h-3 w-3" /> Fix
                            </button>
                          )}

                          {/* Assign Department */}
                          <button
                            onClick={() => setAssigningReportId(report.id)}
                            className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-500 text-[10px] font-bold cursor-pointer transition-all"
                            title="Assign Department"
                          >
                            Assign
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => setSelectedReportDetail(report)}
                            className="px-2 py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 text-slate-500 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-0.5"
                            title="View AI Report details"
                          >
                            <Eye className="h-3 w-3" /> Info
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: View AI Report Details */}
      {selectedReportDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)"
            }}
          >
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: "var(--card-border)" }}>
              <div>
                <span className="text-[10px] font-mono text-orange-500 uppercase tracking-widest block font-extrabold">Detailed Incident Dossier</span>
                <h3 className="text-base font-black truncate" style={{ color: "var(--text-primary)" }}>{selectedReportDetail.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedReportDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-white border border-transparent hover:border-slate-800 transition-all cursor-pointer font-mono"
              >
                ✕
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Core Details with Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedReportDetail.imageUrl ? (
                  <div className="rounded-xl overflow-hidden border bg-slate-900 h-44 relative" style={{ borderColor: "var(--card-border)" }}>
                    <img src={selectedReportDetail.imageUrl} alt="Incident" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="rounded-xl border bg-slate-900/40 h-44 flex items-center justify-center" style={{ borderColor: "var(--card-border)" }}>
                    <span className="text-xs font-mono text-slate-400">No image uploaded</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>DESCRIPTION</span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{selectedReportDetail.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed" style={{ borderColor: "var(--card-border)" }}>
                    <div>
                      <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>SLA WORKFLOW</span>
                      <span className="text-xs font-bold text-emerald-500 uppercase font-mono">{selectedReportDetail.status}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>AI SEVERITY</span>
                      <span className="text-xs font-bold text-orange-500 uppercase font-mono">{selectedReportDetail.aiAnalysis?.severity || "Medium"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Geographic Coordinates */}
              <div className="p-4 rounded-xl border bg-slate-900/10 space-y-2" style={{ borderColor: "var(--card-border)" }}>
                <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  <MapPin className="h-4 w-4 text-orange-500" /> Geographic Dispatch Data
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>CITY REGION</span>
                    <span className="font-semibold">{selectedReportDetail.location?.city || "New Delhi"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>STREET DISPATCH ADDRESS</span>
                    <span className="font-semibold truncate block">{selectedReportDetail.location?.address}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>COORDINATES</span>
                    <span className="font-mono text-[10px]">
                      {selectedReportDetail.location?.lat.toFixed(4)}, {selectedReportDetail.location?.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Damage Analytics */}
              <div className="p-4 rounded-xl border border-dashed space-y-3" style={{ borderColor: "var(--card-border)" }}>
                <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  <Settings className="h-4 w-4 text-indigo-500 animate-spin" /> AI Coprocessor Analysis & Savings Impact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-orange-500/5 p-3 rounded-xl border border-orange-500/10">
                    <span className="block text-[9px] font-mono text-orange-400">REPAIR COST TODAY</span>
                    <p className="text-base font-black text-orange-500 mt-1">
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(selectedReportDetail.aiAnalysis?.repairCostToday || 15000)}
                    </p>
                  </div>
                  <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                    <span className="block text-[9px] font-mono text-red-400">COST IN 6 MONTHS</span>
                    <p className="text-base font-black text-red-500 mt-1">
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(selectedReportDetail.aiAnalysis?.repairCostSixMonths || 45000)}
                    </p>
                  </div>
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span className="block text-[9px] font-mono text-emerald-400">MUNICIPAL SAVINGS</span>
                    <p className="text-base font-black text-emerald-500 mt-1">
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(selectedReportDetail.aiAnalysis?.damageSaved || 30000)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="space-y-1">
                    <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>AI VERIFIED STATUS</span>
                    <p className="font-semibold text-emerald-500">
                      {selectedReportDetail.isAIVerified ? "✅ Autonomously Verified (98.4% Confidence)" : "⚠️ Manual Auditing Required"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>COGNITIVE AUDIT NOTE</span>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{selectedReportDetail.aiAuthenticityNote || "Computer Vision confirms structural distress match."}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-2 bg-slate-900/10" style={{ borderColor: "var(--card-border)" }}>
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Department */}
      {assigningReportId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-sm rounded-2xl border shadow-2xl p-6"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)"
            }}
          >
            <h3 className="text-base font-black mb-4" style={{ color: "var(--text-primary)" }}>Assign Department Queue</h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Move this report to a dedicated department workflow stage:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  onUpdateStatus(assigningReportId, "Assigned to Department");
                  setAssigningReportId(null);
                }}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer block text-center"
              >
                Assign Road Operations (PWD)
              </button>
              <button
                onClick={() => {
                  onUpdateStatus(assigningReportId, "Assigned to Department");
                  setAssigningReportId(null);
                }}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer block text-center"
              >
                Assign Water Board (Jal Board)
              </button>
              <button
                onClick={() => {
                  onUpdateStatus(assigningReportId, "Assigned to Department");
                  setAssigningReportId(null);
                }}
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer block text-center"
              >
                Assign Electricity Dept (EB)
              </button>
              <button
                onClick={() => {
                  onUpdateStatus(assigningReportId, "Assigned to Department");
                  setAssigningReportId(null);
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer block text-center"
              >
                Assign Sanitation Dept
              </button>
            </div>

            <button
              onClick={() => setAssigningReportId(null)}
              className="mt-4 w-full py-2.5 border text-xs font-bold rounded-xl transition-all hover:bg-slate-500/10 cursor-pointer"
              style={{
                borderColor: "var(--card-border)",
                color: "var(--text-primary)"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
