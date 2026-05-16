import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Section { _id: string; name: string; block: string; }

export default function RegisterGroup() {
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState({ name: '', section: '', members: '' });
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    // Fetch sections from the new public endpoint
    setIsWakingUp(true);
    api.get('/sections/public') 
      .then((res) => {
        setSections(res.data);
        setIsWakingUp(false);
      })
      .catch(() => {
        setError('Failed to load sections. Please try again later.');
        setIsWakingUp(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Confirmation Dialog
    const selectedBlock = sections.find(s => s._id === form.section)?.block;
    const confirmMsg = `Please confirm your details:\n\n` + 
                       `Group/Name: ${form.name}\n` + 
                       `Block: ${selectedBlock}\n` + 
                       `Members: ${form.members}\n\n` + 
                       `Is this correct?\n\n` +
                       `Note: If you made a mistake after submitting, please contact the person who sent you this form for corrections.`;
                       
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setError('');
    
    try {
      let members = form.members.split(',').map(m => m.trim()).filter(Boolean);
      
      // If individual, put the group name (which is the student name) into members list
      if (form.members.trim().toUpperCase() === 'N/A') {
        members = [form.name.trim()];
      }

      await api.post('/groups/register', { ...form, members });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md evl-card p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            ✓
          </div>
          <h2 className="text-2xl font-black text-text mb-2">Registration Successful!</h2>
          <p className="text-text/50 mb-8">Your group <strong>{form.name}</strong> has been registered. You can now wait for your panel to start the evaluation.</p>
          <button 
            onClick={() => { setSuccess(false); setForm({ name: '', section: '', members: '' }); }}
            className="evl-btn-primary w-full"
          >
            Register Another Group
          </button>
          <div className="mt-6">
             <Link to="/login" className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">← Return to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-extrabold mx-auto mb-5 shadow-lg shadow-primary/20">
            E
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-text tracking-tight mb-2">Group Registration</h1>
          <p className="text-text/40 text-sm font-medium">EvalSys · Automated Rubric Evaluation System</p>
        </div>

        {/* Instructions Card */}
        <div className="evl-card p-5 mb-6 bg-primary/[0.03] border-primary/10">
          <h3 className="text-xs font-extrabold text-primary uppercase tracking-widest mb-3">📋 How to Register</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p className="text-[11px] text-text/60 leading-relaxed"><strong className="text-text/80">Group?</strong> Enter your group name and list all members separated by commas.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p className="text-[11px] text-text/60 leading-relaxed"><strong className="text-text/80">Individual?</strong> Enter your full name as the group name and type <strong className="text-danger">N/A</strong> for members.</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="evl-card p-6 md:p-8 shadow-2xl shadow-primary/5">

          {isWakingUp && !error && (
            <div className="bg-primary/10 text-primary text-[11px] font-bold py-2.5 px-4 rounded-lg mb-6 text-center flex items-center justify-center gap-2 animate-pulse">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              Initializing system… (Server is waking up)
            </div>
          )}

          {error && (
            <div className="evl-alert-error text-xs py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Name + Block side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="evl-label block mb-1.5">
                  Group Name / Student Name
                </label>
                <input 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="evl-input !py-3"
                  placeholder="e.g. Group Omega or Juan Dela Cruz" 
                />
              </div>

              <div>
                <label className="evl-label block mb-1.5">Assigned Block</label>
                <select 
                  value={form.section} 
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  required
                  className="evl-select !py-3"
                >
                  <option value="">-- Select your block --</option>
                  {sections.map(s => (
                    <option key={s._id} value={s._id}>{s.block}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Members */}
            <div>
              <label className="evl-label block mb-1.5">Members</label>
              <textarea 
                value={form.members} 
                onChange={(e) => setForm({ ...form, members: e.target.value })}
                required
                rows={3}
                className="evl-input !py-3 resize-none"
                placeholder="Juan Dela Cruz, Maria Clara, Jose Rizal   —or—   N/A if individual" 
              />
              <p className="text-[10px] text-text/30 mt-1.5 font-medium">Separate names with commas. Type <strong className="text-danger/60">N/A</strong> if registering as individual.</p>
            </div>

            {/* Privacy Consent */}
            <div className="bg-surface/50 p-4 rounded-xl border border-muted/20">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  required
                  className="mt-0.5 w-4 h-4 rounded border-muted text-primary focus:ring-primary/30 cursor-pointer"
                />
                <span className="text-[11px] text-text/50 leading-relaxed">
                  By registering, you agree that the information provided will be used solely for the purpose of project evaluation and grading within the <span className="font-bold text-primary">EvalSys Platform</span>.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={loading || !agreedToPrivacy}
              className={`evl-btn-primary w-full py-4 text-base shadow-lg transition-all ${
                (!agreedToPrivacy || loading) ? 'opacity-50 grayscale cursor-not-allowed shadow-none' : 'shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link to="/login" className="text-xs font-bold text-primary hover:underline">← Back to Login</Link>
          <p className="text-text/20 text-[10px] font-medium">
            &copy; 2026 EvalSys · <span className="uppercase tracking-widest">Developed by Jerico B. Garcia</span>
          </p>
        </div>
      </div>
    </div>
  );
}
