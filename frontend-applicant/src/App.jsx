import React, { useState, useMemo } from 'react';

// ASSUMED_RATE = 13.0 (flat, hardcoded, annual % — this is a provisional placeholder rate
// for DTI pre-screening only, NOT the applicant's actual assigned interest rate)
const ASSUMED_RATE = 13.0;

const API_BASE_URL = 'http://localhost:8000';

const PURPOSE_OPTIONS = [
  'Debt Consolidation',
  'Credit Card Payoff',
  'Home Improvement',
  'Medical',
  'Small Business',
  'Major Purchase',
  'Moving',
  'Vacation',
  'Wedding',
  'House',
  'Educational',
  'Renewable Energy',
  'Other'
];

const HOME_OWNERSHIP_OPTIONS = [
  'Rent',
  'Own',
  'Mortgage',
  'Other',
  'None'
];

export default function App() {
  const [formData, setFormData] = useState({
    applicant_id: 'APP-' + Math.floor(100000 + Math.random() * 900000),
    full_name: 'Sandeep Kumar',
    date_of_birth: '1998-05-20',
    phone_number: '9876543210',
    email: 'sandeep.kumar@example.com',
    address: '45 MG Road, Indiranagar, Bengaluru, KA 560038',
    mock_pan: 'ABCDE1234F',
    loan_amount_requested: 250000,
    term: 36,
    purpose: 'Debt Consolidation',
    annual_income: 900000,
    employment_years: 5,
    home_ownership: 'Rent',
    existing_monthly_debt_payments: 12000
  });

  const [touched, setTouched] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null); // 'SUCCESS', 'HARD_REJECT', null
  const [rejectReasons, setRejectReasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Client-side Age calculation
  const calculatedAge = useMemo(() => {
    if (!formData.date_of_birth) return 0;
    const dob = new Date(formData.date_of_birth);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }, [formData.date_of_birth]);

  // Client-side Amortized EMI calculation: P * r * (1+r)^n / ((1+r)^n - 1)
  const calculatedCalculations = useMemo(() => {
    const P = parseFloat(formData.loan_amount_requested) || 0;
    const n = parseInt(formData.term, 10) || 36;
    const r = (ASSUMED_RATE / 12) / 100;

    let newEmi = 0;
    if (P > 0 && n > 0 && r > 0) {
      const power = Math.pow(1 + r, n);
      newEmi = (P * r * power) / (power - 1);
    }

    const annualInc = parseFloat(formData.annual_income) || 0;
    const monthlyIncome = annualInc > 0 ? annualInc / 12 : 0;
    const existingDebt = parseFloat(formData.existing_monthly_debt_payments) || 0;
    const totalDebt = existingDebt + newEmi;

    const dti = monthlyIncome > 0 ? (totalDebt / monthlyIncome) * 100 : 0;

    return {
      newEmi: Math.round(newEmi),
      monthlyIncome: Math.round(monthlyIncome),
      totalDebt: Math.round(totalDebt),
      dti: parseFloat(dti.toFixed(1)),
      dtiExceeded: dti > 43.0
    };
  }, [formData.loan_amount_requested, formData.term, formData.annual_income, formData.existing_monthly_debt_payments]);

  // Real-time Field Validation Rules
  const errors = useMemo(() => {
    const errs = {};
    if (!formData.full_name.trim()) {
      errs.full_name = 'Full name is required';
    }
    if (!formData.date_of_birth) {
      errs.date_of_birth = 'Date of birth is required';
    } else if (calculatedAge < 18) {
      errs.date_of_birth = 'Applicant must be at least 18 years old';
    }
    if (!formData.phone_number.trim()) {
      errs.phone_number = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone_number.trim())) {
      errs.phone_number = 'Enter a valid 10-digit phone number';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    if (!formData.address.trim()) {
      errs.address = 'Residential address is required';
    }
    if (!formData.mock_pan.trim()) {
      errs.mock_pan = 'Mock PAN is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.mock_pan.trim().toUpperCase())) {
      errs.mock_pan = 'Format must be ABCDE1234F';
    }
    if (parseFloat(formData.loan_amount_requested) <= 0) {
      errs.loan_amount_requested = 'Requested amount must be greater than ₹0';
    }
    if (parseFloat(formData.annual_income) <= 0) {
      errs.annual_income = 'Annual income must be greater than ₹0';
    }
    return errs;
  }, [formData, calculatedAge]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    // Touch all fields
    const allTouched = Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);

    // Layer 1 Hard-Reject Checks (Client-Side Pre-Check)
    const layer1Failures = [];

    if (calculatedAge < 18) {
      layer1Failures.push('Applicant must be at least 18 years old to apply.');
    }

    if (calculatedCalculations.dti > 43.0) {
      layer1Failures.push(`Your debt-to-income ratio (${calculatedCalculations.dti}%) exceeds our lending threshold (43%).`);
    }

    if (Object.keys(errors).length > 0) {
      layer1Failures.push('Please correct all highlighted validation errors before submitting.');
    }

    if (layer1Failures.length > 0) {
      setSubmitStatus('HARD_REJECT');
      setRejectReasons(layer1Failures);
      return;
    }

    // Pass Layer 1 Pre-screening -> POST to backend
    setLoading(true);
    try {
      const payload = {
        ...formData,
        dti: calculatedCalculations.dti,
        estimated_new_emi: calculatedCalculations.newEmi,
        total_monthly_debt: calculatedCalculations.totalDebt
      };

      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.layer1_passed === false) {
        setSubmitStatus('HARD_REJECT');
        setRejectReasons(data.layer1_rejection_reasons || ['Application failed initial eligibility criteria.']);
      } else {
        setSubmitStatus('SUCCESS');
      }
    } catch (err) {
      setApiError(err.message || 'Unable to connect to bank application server');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitStatus(null);
    setRejectReasons([]);
    setApiError(null);
    setFormData(prev => ({
      ...prev,
      applicant_id: 'APP-' + Math.floor(100000 + Math.random() * 900000)
    }));
    setTouched({});
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16 font-sans">
      
      {/* Bank Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-base">
              SB
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">SmartLoan Banking Portal</h1>
              <p className="text-xs text-slate-400">Step 1 of 2: Applicant Pre-Qualification Form</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded font-mono">
            Portal ID: {formData.applicant_id}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 pt-8">

        {/* Confirmation Screen */}
        {submitStatus === 'SUCCESS' && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm text-center space-y-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Application Submitted</h2>
              <p className="text-sm text-slate-600 mt-1">
                Status: <span className="font-semibold text-blue-700 font-mono">PENDING_VERIFICATION</span>
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 max-w-md mx-auto text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Application Reference ID:</span>
                <span className="font-bold text-slate-900">{formData.applicant_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant Name:</span>
                <span className="font-bold text-slate-900">{formData.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loan Amount Requested:</span>
                <span className="font-bold text-slate-900">₹{parseFloat(formData.loan_amount_requested).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Pre-Screen DTI:</span>
                <span className="font-bold text-slate-900">{calculatedCalculations.dti}%</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Your application has successfully passed initial Layer 1 eligibility screening. A bank officer will review and verify your identity and documents.
            </p>

            <button
              onClick={resetForm}
              className="px-5 py-2.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Submit Another Application
            </button>
          </div>
        )}

        {/* Screening Hard-Reject Screen */}
        {submitStatus === 'HARD_REJECT' && (
          <div className="bg-white border border-rose-200 rounded-lg p-8 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-bold shrink-0 text-lg">
                !
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-rose-900">Application Eligibility Pre-Screening Notice</h2>
                <p className="text-xs text-slate-600">
                  Your application doesn't meet initial eligibility criteria for bank review.
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-md p-4 text-xs text-rose-900 space-y-2">
              <span className="font-semibold block uppercase tracking-wider text-[11px] text-rose-800">Pre-Screening Criteria Unmet:</span>
              <ul className="list-disc pl-4 space-y-1">
                {rejectReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-slate-500">
              Note: This is an initial automated eligibility screening step to check lending threshold compliance, not a final bank decision. You may modify your inputs (e.g., requested loan amount or term) and try again.
            </p>

            <button
              onClick={() => setSubmitStatus(null)}
              className="px-4 py-2 bg-slate-800 text-white rounded text-xs font-medium hover:bg-slate-700 transition-colors"
            >
              Return & Edit Application
            </button>
          </div>
        )}

        {/* Active Application Form */}
        {!submitStatus && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 space-y-8">
            
            {apiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                {apiError}
              </div>
            )}

            {/* SECTION 1: Personal Information */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Personal Information</h2>
                <p className="text-xs text-slate-500">KYC & Contact verification details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    onBlur={() => handleBlur('full_name')}
                    placeholder="Enter full legal name"
                    className={`w-full px-3 py-2 text-xs rounded border ${
                      touched.full_name && errors.full_name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.full_name && errors.full_name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.full_name}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth * (Must be 18+)</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    onBlur={() => handleBlur('date_of_birth')}
                    className={`w-full px-3 py-2 text-xs rounded border ${
                      touched.date_of_birth && errors.date_of_birth ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.date_of_birth && errors.date_of_birth && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.date_of_birth}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => handleChange('phone_number', e.target.value)}
                    onBlur={() => handleBlur('phone_number')}
                    placeholder="10-digit mobile number"
                    className={`w-full px-3 py-2 text-xs rounded border ${
                      touched.phone_number && errors.phone_number ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.phone_number && errors.phone_number && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.phone_number}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="name@example.com"
                    className={`w-full px-3 py-2 text-xs rounded border ${
                      touched.email && errors.email ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.email && errors.email && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.email}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    placeholder="City, State / Full address"
                    className={`w-full px-3 py-2 text-xs rounded border ${
                      touched.address && errors.address ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.address && errors.address && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.address}</p>
                  )}
                </div>

                {/* Mock PAN */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Mock PAN *</label>
                    <span className="text-[10px] text-slate-400 font-mono">(Demo / Pre-Screening Only)</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.mock_pan}
                    onChange={(e) => handleChange('mock_pan', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('mock_pan')}
                    placeholder="ABCDE1234F"
                    className={`w-full px-3 py-2 text-xs rounded border font-mono uppercase ${
                      touched.mock_pan && errors.mock_pan ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.mock_pan && errors.mock_pan && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.mock_pan}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Loan Details */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Loan Details</h2>
                <p className="text-xs text-slate-500">Specify requested credit amount and loan duration</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Loan Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Amount Requested (₹) *</label>
                  <input
                    type="number"
                    value={formData.loan_amount_requested}
                    onChange={(e) => handleChange('loan_amount_requested', parseFloat(e.target.value) || 0)}
                    onBlur={() => handleBlur('loan_amount_requested')}
                    className={`w-full px-3 py-2 text-xs rounded border font-mono ${
                      touched.loan_amount_requested && errors.loan_amount_requested ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.loan_amount_requested && errors.loan_amount_requested && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.loan_amount_requested}</p>
                  )}
                </div>

                {/* Term */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Term *</label>
                  <select
                    value={formData.term}
                    onChange={(e) => handleChange('term', parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:border-blue-600"
                  >
                    <option value={36}>36 Months (3 Years)</option>
                    <option value={60}>60 Months (5 Years)</option>
                  </select>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Purpose *</label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => handleChange('purpose', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:border-blue-600"
                  >
                    {PURPOSE_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: Financial Information */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Financial Information</h2>
                <p className="text-xs text-slate-500">Self-reported income, employment, and existing obligations</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Annual Income */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Income (₹) *</label>
                  <input
                    type="number"
                    value={formData.annual_income}
                    onChange={(e) => handleChange('annual_income', parseFloat(e.target.value) || 0)}
                    onBlur={() => handleBlur('annual_income')}
                    className={`w-full px-3 py-2 text-xs rounded border font-mono ${
                      touched.annual_income && errors.annual_income ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                    } focus:outline-none focus:border-blue-600`}
                  />
                  {touched.annual_income && errors.annual_income && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.annual_income}</p>
                  )}
                </div>

                {/* Existing Monthly Debt Payments */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Existing Monthly Debt Payments (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.existing_monthly_debt_payments}
                    onChange={(e) => handleChange('existing_monthly_debt_payments', parseFloat(e.target.value) || 0)}
                    onBlur={() => handleBlur('existing_monthly_debt_payments')}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 font-mono focus:outline-none focus:border-blue-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Current monthly EMIs or ongoing credit obligations</p>
                </div>

                {/* Employment Years Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Employment Duration</label>
                    <span className="text-xs font-bold text-blue-700">
                      {formData.employment_years === 0 ? '< 1 Year' : `${formData.employment_years} ${formData.employment_years === 1 ? 'Year' : 'Years'}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={formData.employment_years}
                    onChange={(e) => handleChange('employment_years', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0 (Under 1y)</span>
                    <span>5y</span>
                    <span>10+ Years</span>
                  </div>
                </div>

                {/* Home Ownership */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Home Ownership Status *</label>
                  <select
                    value={formData.home_ownership}
                    onChange={(e) => handleChange('home_ownership', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-none focus:border-blue-600"
                  >
                    {HOME_OWNERSHIP_OPTIONS.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* REAL-TIME DTI TRANSPARENT INFO BOX */}
            <div className={`p-4 rounded-md border text-xs space-y-2 transition-colors ${
              calculatedCalculations.dtiExceeded 
                ? 'bg-rose-50 border-rose-300 text-rose-900' 
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between font-semibold">
                <span>Pre-Screening Debt-To-Income (DTI) Calculation</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  calculatedCalculations.dtiExceeded ? 'bg-rose-200 text-rose-900 font-bold' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Estimated DTI: {calculatedCalculations.dti}% — must be under 43% to proceed
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-slate-500 block">Est. New EMI (at 13%):</span>
                  <span className="font-semibold">₹{calculatedCalculations.newEmi.toLocaleString('en-IN')}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Existing Monthly EMI:</span>
                  <span className="font-semibold">₹{parseFloat(formData.existing_monthly_debt_payments || 0).toLocaleString('en-IN')}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Gross Monthly Income:</span>
                  <span className="font-semibold">₹{calculatedCalculations.monthlyIncome.toLocaleString('en-IN')}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">DTI Status:</span>
                  <span className={`font-bold ${calculatedCalculations.dtiExceeded ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {calculatedCalculations.dtiExceeded ? 'EXCEEDS THRESHOLD' : 'ELIGIBLE (≤ 43%)'}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic pt-1">
                * Note: The 13.0% interest rate is a hardcoded provisional placeholder rate used solely for DTI pre-screening calculations before bank underwriter review.
              </p>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Submitting to Bank Server...' : 'Submit Application for Review →'}
              </button>
            </div>

          </form>
        )}

      </main>
    </div>
  );
}
