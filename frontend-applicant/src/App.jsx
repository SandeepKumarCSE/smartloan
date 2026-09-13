import React, { useState } from 'react';
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield, 
  HelpCircle,
  FileCheck,
  ChevronRight
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function App() {
  const [formData, setFormData] = useState({
    applicant_id: 'APP-' + Math.floor(100000 + Math.random() * 900000),
    loan_amnt: 15000,
    term: 36,
    emp_length: 5,
    annual_inc: 75000,
    dti: 18.0,
    fico_score: 720,
    revol_util: 30.0,
    inq_last_6mths: 0,
    delinq_2yrs: 0,
    pub_rec: 0,
    open_acc: 8,
    total_acc: 16,
    home_ownership: 'RENT',
    purpose: 'debt_consolidation'
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/loans/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Submission failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unable to submit loan application');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setFormData(prev => ({
      ...prev,
      applicant_id: 'APP-' + Math.floor(100000 + Math.random() * 900000)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight">SmartLoan Applicant Portal</h1>
              <p className="text-xs text-slate-400">Instant Automated Eligibility & Screening</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit Encrypted Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-6 pt-10">
        
        {!result && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl font-bold text-slate-100">Apply for Personal Financing</h2>
              <p className="text-sm text-slate-400">
                Complete our 2-minute pre-qualification form to get an instant credit decision powered by real-time risk evaluation.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 rounded-2xl applicant-card space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Application Form</span>
                <span className="text-xs text-slate-400 font-mono">ID: {formData.applicant_id}</span>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Requested Loan Amount ($)</label>
                  <input
                    type="number"
                    value={formData.loan_amnt}
                    onChange={(e) => handleInputChange('loan_amnt', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Loan Term</label>
                  <select
                    value={formData.term}
                    onChange={(e) => handleInputChange('term', parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value={36}>36 Months (3 Years)</option>
                    <option value={60}>60 Months (5 Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Annual Income ($)</label>
                  <input
                    type="number"
                    value={formData.annual_inc}
                    onChange={(e) => handleInputChange('annual_inc', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">FICO Credit Score Estimate</label>
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={formData.fico_score}
                    onChange={(e) => handleInputChange('fico_score', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Employment Length (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={formData.emp_length}
                    onChange={(e) => handleInputChange('emp_length', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Loan Purpose</label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="debt_consolidation">Debt Consolidation</option>
                    <option value="credit_card">Credit Card Refinancing</option>
                    <option value="home_improvement">Home Improvement</option>
                    <option value="major_purchase">Major Purchase</option>
                    <option value="small_business">Small Business</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Housing Status</label>
                  <select
                    value={formData.home_ownership}
                    onChange={(e) => handleInputChange('home_ownership', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="RENT">Rent</option>
                    <option value="MORTGAGE">Mortgage</option>
                    <option value="OWN">Own (Outright)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Estimated DTI Ratio (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.dti}
                    onChange={(e) => handleInputChange('dti', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Result Screen */}
        {result && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-8 rounded-2xl applicant-card text-center space-y-6 shadow-2xl">
              
              {result.decision === 'APPROVED' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-400">Congratulations! Application Approved</h2>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    Your loan application of <span className="font-semibold text-white">${formData.loan_amnt.toLocaleString()}</span> has been pre-approved at competitive market rates.
                  </p>
                </div>
              )}

              {result.decision === 'MANUAL_REVIEW' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                    <Clock className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-amber-400">Application Under Underwriter Review</h2>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    Your profile requires standard secondary verification by our credit underwriting team. No additional action is required at this time.
                  </p>
                </div>
              )}

              {result.decision === 'REJECTED' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-rose-400">Application Status: Declined</h2>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    Thank you for applying. Based on our credit risk evaluation model, we are unable to approve your application at this time.
                  </p>

                  {result.adverse_reasons && result.adverse_reasons.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-left space-y-2 mt-4">
                      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Statement of Denial Reasons (ECOA Notice):</p>
                      <ul className="space-y-1.5">
                        {result.adverse_reasons.map((r, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-rose-400">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-center">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-all"
                >
                  Submit Another Application
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
