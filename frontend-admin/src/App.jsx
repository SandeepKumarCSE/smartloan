import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Building2, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  ArrowUpDown, 
  ChevronRight, 
  ArrowLeft, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  Briefcase, 
  Layers,
  History,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

// Mock Data for Top Summary Pie Charts
const STATUS_PIE_DATA = [
  { name: 'Approved', value: 60, color: '#10b981' },
  { name: 'Pending Verification', value: 25, color: '#3b82f6' },
  { name: 'Manual Review', value: 10, color: '#f59e0b' },
  { name: 'Rejected', value: 5, color: '#f43f5e' }
];

const PURPOSE_PIE_DATA = [
  { name: 'Debt Consolidation', value: 40, color: '#6366f1' },
  { name: 'Small Business', value: 25, color: '#ec4899' },
  { name: 'Home Improvement', value: 20, color: '#14b8a6' },
  { name: 'Credit Card Payoff', value: 15, color: '#8b5cf6' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING', 'AUDIT', 'MANUAL'
  const [pendingApps, setPendingApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [selectedAppDetail, setSelectedAppDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC'); // 'DESC' = most recent first

  // Fetch pending applications queue on load and tab change
  useEffect(() => {
    fetchPendingApplications();
  }, []);

  const fetchPendingApplications = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications?status=PENDING_VERIFICATION`);
      if (res.ok) {
        const data = await res.json();
        setPendingApps(data);
      }
    } catch (e) {
      console.warn('Failed to fetch pending applications', e);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectApplication = async (appId) => {
    setSelectedAppId(appId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAppDetail(data);
      }
    } catch (e) {
      console.warn('Failed to fetch application detail', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedAppId(null);
    setSelectedAppDetail(null);
    fetchPendingApplications();
  };

  // Filtered & Sorted Queue
  const processedQueue = useMemo(() => {
    let list = [...pendingApps];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        a => (a.full_name || a.applicant_name || '').toLowerCase().includes(q) ||
             (a.applicant_id || '').toLowerCase().includes(q) ||
             (a.purpose || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [pendingApps, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-20">
      
      {/* Top Bank Admin Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white">SmartLoan Underwriter Portal</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-medium">Bank Employee Review</span>
              </div>
              <p className="text-xs text-slate-400">Layer 1 DTI Verification & Internal Review Queue</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono">Operations System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-8">
        
        {/* If Application Detail View is open */}
        {selectedAppId && selectedAppDetail ? (
          <ApplicationDetail 
            app={selectedAppDetail} 
            loading={loadingDetail} 
            onBack={handleBackToDashboard} 
          />
        ) : (
          <>
            {/* TOP DASHBOARD OVERVIEW SECTION */}
            <DashboardOverview pendingCount={pendingApps.length} />

            {/* NAVIGATION TABS BELOW CHARTS */}
            <div className="border-b border-slate-800 flex items-center justify-between pt-2">
              <nav className="flex gap-2">
                <button
                  onClick={() => setActiveTab('PENDING')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'PENDING'
                      ? 'border-blue-500 bg-slate-900/80 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Pending Verification ({pendingApps.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('MANUAL')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'MANUAL'
                      ? 'border-blue-500 bg-slate-900/80 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Manual Review</span>
                </button>

                <button
                  onClick={() => setActiveTab('AUDIT')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'AUDIT'
                      ? 'border-blue-500 bg-slate-900/80 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Audit Log</span>
                </button>
              </nav>

              <button
                onClick={fetchPendingApplications}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Refresh Queue</span>
              </button>
            </div>

            {/* TAB 1: PENDING VERIFICATION LIST (Fully Built) */}
            {activeTab === 'PENDING' && (
              <PendingVerificationList 
                queue={processedQueue}
                loading={loadingList}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOrder={sortOrder}
                onSortToggle={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                onSelectApp={handleSelectApplication}
              />
            )}

            {/* TAB 2: MANUAL REVIEW (Placeholder) */}
            {activeTab === 'MANUAL' && (
              <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">Manual Review Queue — Coming Soon</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Secondary underwriter overrides and manual review queues will be integrated in the next operational milestone.
                </p>
              </div>
            )}

            {/* TAB 3: AUDIT LOG (Placeholder) */}
            {activeTab === 'AUDIT' && (
              <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mx-auto flex items-center justify-center">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">Audit Log & Decision History — Coming Soon</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Internal decision logs, historical audit trails, and system decision records will be displayed here.
                </p>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

{/* SUB-COMPONENT 1: Dashboard Overview (3 Summary Cards + 2 Recharts Pie Charts) */}
function DashboardOverview({ pendingCount }) {
  return (
    <div className="space-y-6">
      
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Pending Verification */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-blue-500/30 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-400 group-hover:scale-110 transition-transform">
            <Clock className="w-20 h-20" />
          </div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">Pending Verification</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{pendingCount}</span>
            <span className="text-xs text-slate-400">Applications</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Awaiting employee credit check & document review</p>
        </div>

        {/* Card 2: Manual Review (Stub) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Manual Review Queue</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-300">0</span>
            <span className="text-xs text-slate-500">(Stub)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Section built in upcoming phase</p>
        </div>

        {/* Card 3: Total Processed Today (Stub) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Total Processed Today</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-300">0</span>
            <span className="text-xs text-slate-500">(Stub)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Section built in upcoming phase</p>
        </div>

      </div>

      {/* 2 Recharts Pie Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart 1: Applications by Status */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Application Breakdown by Status</h3>
            <span className="text-[10px] text-slate-500 font-mono">Mock Distribution Data</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={STATUS_PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {STATUS_PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart 2: Pending Applications by Purpose */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Pending Queue by Loan Purpose</h3>
            <span className="text-[10px] text-slate-500 font-mono">Mock Purpose Distribution</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={PURPOSE_PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {PURPOSE_PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

{/* SUB-COMPONENT 2: Pending Verification List */}
function PendingVerificationList({ queue, loading, searchQuery, onSearchChange, sortOrder, onSortToggle, onSelectApp }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
      
      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by applicant name, ID, or purpose..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={onSortToggle}
          className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
          <span>Sort Date: {sortOrder === 'DESC' ? 'Most Recent First' : 'Oldest First'}</span>
        </button>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading pending verification queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">No applications awaiting verification</p>
          <p>Submit a new application from the Applicant Portal (Port 5173) to populate this queue.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Applicant Name</th>
                <th className="py-3 px-4">App ID</th>
                <th className="py-3 px-4">Requested Loan</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {queue.map((app) => (
                <tr 
                  key={app.request_id || app.applicant_id}
                  onClick={() => onSelectApp(app.applicant_id || app.request_id)}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                    {app.full_name || app.applicant_name || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {app.applicant_id || app.request_id}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                    ₹{parseFloat(app.loan_amount_requested || app.loan_amnt || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-[11px]">
                      {app.purpose}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {app.timestamp ? new Date(app.timestamp).toLocaleString() : 'Just now'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                      Review <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

{/* SUB-COMPONENT 3: Application Detail View */}
function ApplicationDetail({ app, loading, onBack }) {
  if (loading || !app) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
        Loading application details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-100 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">App ID: {app.applicant_id}</span>
          <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-semibold text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING_VERIFICATION</span>
          </span>
        </div>
      </div>

      {/* Detail Card Container */}
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-8 shadow-2xl">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{app.full_name || app.applicant_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Submitted on {app.timestamp ? new Date(app.timestamp).toLocaleString() : 'N/A'}</p>
          </div>
        </div>

        {/* Section 1: Personal Information */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Full Name:</span>
              <span className="font-semibold text-slate-200">{app.full_name || app.applicant_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Date of Birth:</span>
              <span className="font-mono text-slate-200">{app.date_of_birth || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Phone Number:</span>
              <span className="font-mono text-slate-200">{app.phone_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Email Address:</span>
              <span className="text-slate-200">{app.email || 'N/A'}</span>
            </div>
            <div className="col-span-full">
              <span className="text-slate-500 block">Address:</span>
              <span className="text-slate-200">{app.address || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Identity & Mock PAN (with Run Credit Check Placeholder Button) */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Identity Verification
          </h3>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Mock PAN Card Number:</span>
              <span className="font-mono font-bold text-lg text-white tracking-widest">{app.mock_pan || app.pan_number || 'ABCDE1234F'}</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Mock PAN for demo & credit bureau lookup</p>
            </div>

            {/* Placeholder Button: Run Credit Check */}
            <button
              onClick={() => alert('Run Credit Check logic will be integrated in upcoming phase!')}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Run Credit Check (Placeholder)</span>
            </button>
          </div>
        </div>

        {/* Section 3: Loan Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Loan Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Loan Amount Requested:</span>
              <span className="font-mono text-base font-bold text-blue-400">
                ₹{parseFloat(app.loan_amount_requested || app.loan_amnt || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Loan Term:</span>
              <span className="font-semibold text-slate-200">{app.term} Months</span>
            </div>
            <div>
              <span className="text-slate-500 block">Loan Purpose:</span>
              <span className="font-semibold text-slate-200">{app.purpose}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Financial Information & Computed DTI */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Financial Information & Computed DTI
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Annual Income:</span>
              <span className="font-mono font-semibold text-slate-200">
                ₹{parseFloat(app.annual_income || app.annual_inc || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Employment Tenure:</span>
              <span className="font-semibold text-slate-200">{app.employment_years || app.emp_length || 0} Years</span>
            </div>
            <div>
              <span className="text-slate-500 block">Home Ownership:</span>
              <span className="font-semibold text-slate-200">{app.home_ownership}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Existing Monthly EMI:</span>
              <span className="font-mono font-semibold text-slate-200">
                ₹{parseFloat(app.existing_monthly_debt_payments || app.existing_monthly_emi || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Pre-Screened DTI:</span>
              <span className={`font-mono text-sm font-bold ${app.calculated_dti > 43 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {app.calculated_dti}%
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
