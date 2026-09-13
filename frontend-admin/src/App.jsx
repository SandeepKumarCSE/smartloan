import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  BrainCircuit, 
  Sparkles, 
  Activity, 
  RotateCcw, 
  Send, 
  UserCheck, 
  Building2, 
  CreditCard, 
  FileText,
  Sliders,
  ChevronRight,
  Gauge
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const PRESETS = {
  prime: {
    title: '🟢 Prime Applicant',
    subtitle: 'High income, clean history, low utilization',
    data: {
      applicant_id: 'APP-PRIME-882',
      loan_amnt: 20000,
      term: 36,
      emp_length: 8,
      annual_inc: 125000,
      dti: 12.5,
      fico_score: 780,
      revol_util: 15.0,
      inq_last_6mths: 0,
      delinq_2yrs: 0,
      pub_rec: 0,
      open_acc: 12,
      total_acc: 24,
      home_ownership: 'MORTGAGE',
      purpose: 'debt_consolidation'
    }
  },
  borderline: {
    title: '🟡 Borderline Review',
    subtitle: 'Moderate income, 45% util, 1 inquiry',
    data: {
      applicant_id: 'APP-BORDER-419',
      loan_amnt: 18000,
      term: 36,
      emp_length: 3,
      annual_inc: 58000,
      dti: 29.0,
      fico_score: 665,
      revol_util: 52.0,
      inq_last_6mths: 1,
      delinq_2yrs: 0,
      pub_rec: 0,
      open_acc: 7,
      total_acc: 15,
      home_ownership: 'RENT',
      purpose: 'credit_card'
    }
  },
  high_risk: {
    title: '🔴 Subprime / High Risk',
    subtitle: 'High DTI, low credit score, 60m term',
    data: {
      applicant_id: 'APP-RISK-903',
      loan_amnt: 35000,
      term: 60,
      emp_length: 1,
      annual_inc: 38000,
      dti: 46.5,
      fico_score: 550,
      revol_util: 88.0,
      inq_last_6mths: 4,
      delinq_2yrs: 2,
      pub_rec: 1,
      open_acc: 5,
      total_acc: 10,
      home_ownership: 'RENT',
      purpose: 'small_business'
    }
  }
};

const HOME_OPTIONS = [
  { value: 'RENT', label: 'Rent' },
  { value: 'OWN', label: 'Own (Outright)' },
  { value: 'MORTGAGE', label: 'Mortgage' },
  { value: 'OTHER', label: 'Other' },
  { value: 'NONE', label: 'None' },
  { value: 'ANY', label: 'Any (Baseline Category)' }
];

const PURPOSE_OPTIONS = [
  { value: 'debt_consolidation', label: 'Debt Consolidation' },
  { value: 'credit_card', label: 'Credit Card Refinance' },
  { value: 'home_improvement', label: 'Home Improvement' },
  { value: 'major_purchase', label: 'Major Purchase' },
  { value: 'small_business', label: 'Small Business' },
  { value: 'medical', label: 'Medical Expenses' },
  { value: 'car', label: 'Auto Financing (Baseline Category)' },
  { value: 'house', label: 'House Purchase' },
  { value: 'moving', label: 'Moving / Relocation' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'educational', label: 'Educational' },
  { value: 'other', label: 'Other Purpose' }
];

export default function App() {
  const [formData, setFormData] = useState(PRESETS.prime.data);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.warn('Backend server connection check failed', e);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyPreset = (presetKey) => {
    setFormData(PRESETS[presetKey].data);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to decision engine backend');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'APPROVED':
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>APPROVED — Straight-Through Processing</span>
          </div>
        );
      case 'MANUAL_REVIEW':
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>MANUAL REVIEW — Routed to Underwriter Queue</span>
          </div>
        );
      case 'REJECTED':
      default:
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold text-sm">
            <XCircle className="w-5 h-5 text-rose-400" />
            <span>REJECTED — Adverse Action Notice Issued</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white pb-20">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">SmartLoan</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-medium">Underwriter Portal</span>
              </div>
              <p className="text-xs text-slate-400">Custom 30-Feature ML Logistic Regression Model Tester</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <div className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">
                {health ? `API Engine Online (${health.features_count} Features)` : 'Connecting to backend...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 pt-8">
        
        {/* Preset Selection Toolbar */}
        <div className="mb-8 p-5 rounded-2xl glass-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Quick Test Scenarios (1-Click Fill)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select a pre-configured applicant profile to benchmark model predictions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                type="button"
                className="flex flex-col text-left p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all group cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                  {preset.title}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  {preset.subtitle}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Applicant Input Form */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-panel space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-400" />
                  Applicant Financial & Credit Inputs
                </h3>
                <span className="text-xs font-mono text-slate-400">{formData.applicant_id}</span>
              </div>

              {/* Section 1: Financial & Credit Basics */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Financial & Credit Benchmarks</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Annual Income ($)</label>
                    <input
                      type="number"
                      value={formData.annual_inc}
                      onChange={(e) => handleInputChange('annual_inc', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">FICO Credit Score (300-850)</label>
                    <input
                      type="number"
                      min="300"
                      max="850"
                      value={formData.fico_score}
                      onChange={(e) => handleInputChange('fico_score', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Debt-To-Income DTI (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.dti}
                      onChange={(e) => handleInputChange('dti', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Revolving Utilization (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.revol_util}
                      onChange={(e) => handleInputChange('revol_util', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Loan Request Specifications */}
              <div className="space-y-4 pt-2 border-t border-slate-800/60">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Loan Specifications</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Requested Amount ($)</label>
                    <input
                      type="number"
                      value={formData.loan_amnt}
                      onChange={(e) => handleInputChange('loan_amnt', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Term (Months)</label>
                    <select
                      value={formData.term}
                      onChange={(e) => handleInputChange('term', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value={36}>36 Months</option>
                      <option value={60}>60 Months</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Loan Purpose</label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => handleInputChange('purpose', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    >
                      {PURPOSE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Bureau Credit History */}
              <div className="space-y-4 pt-2 border-t border-slate-800/60">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Bureau History & Stability</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Employment Yrs (0-10)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={formData.emp_length}
                      onChange={(e) => handleInputChange('emp_length', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Inquiries (Past 6M)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.inq_last_6mths}
                      onChange={(e) => handleInputChange('inq_last_6mths', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Delinquencies (Past 2Y)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.delinq_2yrs}
                      onChange={(e) => handleInputChange('delinq_2yrs', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Public Records</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.pub_rec}
                      onChange={(e) => handleInputChange('pub_rec', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Open Accounts</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.open_acc}
                      onChange={(e) => handleInputChange('open_acc', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Total Accounts</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.total_acc}
                      onChange={(e) => handleInputChange('total_acc', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1.5 font-medium">Home Ownership Status</label>
                  <select
                    value={formData.home_ownership}
                    onChange={(e) => handleInputChange('home_ownership', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {HOME_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Run ML Risk Model & Decision Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Side: Prediction & Explanation Output */}
          <div className="lg:col-span-5 space-y-6">
            
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Inference Error</p>
                  <p className="text-xs text-rose-300/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="p-10 rounded-2xl glass-panel text-center flex flex-col items-center justify-center min-h-[420px]">
                <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
                  <Gauge className="w-10 h-10" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">Model Output & Explainability Dashboard</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-2">
                  Submit the form or click one of the quick test scenario presets above to execute real-time model inference.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                
                {/* Decision Summary Panel */}
                <div className="p-6 rounded-2xl glass-panel-glow space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs text-slate-400 font-mono">REQ ID: {result.request_id}</span>
                    <span className="text-xs text-slate-400">{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">Final Credit Decision</div>
                    {getDecisionBadge(result.decision)}
                  </div>

                  {/* Probability Gauge Progress Bar */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Repayment Probability Score</span>
                      <span className="font-mono text-sm font-bold text-blue-400">
                        {(result.risk_score * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          result.risk_score >= 0.75 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                            : result.risk_score >= 0.65 
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                              : 'bg-gradient-to-r from-rose-500 to-pink-500'
                        }`}
                        style={{ width: `${Math.max(5, result.risk_score * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                      <span>0% (Default)</span>
                      <span>65% (Review Line)</span>
                      <span>75% (Approve)</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Layer 1 Rule Status */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${result.layer1_passed ? 'text-emerald-400' : 'text-rose-400'}`} />
                      <span className="text-xs font-medium text-slate-300">Layer 1 Rule Gatekeeper</span>
                    </div>
                    <span className={`text-xs font-semibold ${result.layer1_passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {result.layer1_passed ? 'PASSED' : 'TRIGGERED REJECTION'}
                    </span>
                  </div>
                </div>

                {/* Adverse Action Notice Reasons */}
                {result.adverse_reasons && result.adverse_reasons.length > 0 && (
                  <div className="p-5 rounded-2xl glass-panel border-rose-500/20 bg-rose-950/10 space-y-3">
                    <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Adverse Action Disclosures (ECOA Notice)
                    </h4>
                    <p className="text-xs text-slate-400">Legal denial factors generated from logistic regression coefficients:</p>
                    
                    <ul className="space-y-2 pt-1">
                      {result.adverse_reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                          <span className="text-rose-400 font-mono mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top Model Weight Contributions */}
                <div className="p-5 rounded-2xl glass-panel space-y-3">
                  <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Feature Weight Breakdown</span>
                    <span className="text-[10px] text-slate-500 font-mono">Logistic Coef × Scaled Input</span>
                  </h4>

                  <div className="space-y-2">
                    {result.top_feature_contributions.map((c, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-medium text-slate-200">{c.label}</p>
                          <p className="text-[10px] font-mono text-slate-400">Raw: {String(c.raw_value)} | Scaled: {c.scaled_value}</p>
                        </div>
                        <div className={`font-mono text-xs font-semibold px-2 py-1 rounded ${
                          c.direction === 'REDUCES_RISK' || c.impact_score < 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {c.impact_score > 0 ? `+${c.impact_score}` : c.impact_score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
