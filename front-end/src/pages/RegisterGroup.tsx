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
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-text tracking-tight mb-2">Group Registration</h1>
          <p className="text-text/50 font-medium italic">EvalSys: Automated Rubric Evaluation System</p>
        </div>

        <div className="evl-card p-8 md:p-10 shadow-2xl shadow-primary/5">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="evl-label block mb-1">
                Group Name / Student Name
              </label>
              <div className="mb-2">
                <span className="text-[11px] font-bold text-danger bg-danger/5 px-2 py-1 rounded border border-danger/20 inline-block">
                  Note: Put your <span className="underline">Full Name</span> if Individual (No Group)
                </span>
              </div>
              <input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="evl-input !py-3 !text-lg font-bold"
                placeholder="e.g. Group Omega or Juan Dela Cruz" 
              />
            </div>

            <div>
              <label className="evl-label">Assigned Section / Block</label>
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

            <div>
              <label className="evl-label block mb-1">Members (Names)</label>
              <div className="mb-2">
                <span className="text-[11px] font-bold text-danger bg-danger/5 px-2 py-1 rounded border border-danger/20 inline-block">
                  Note: Put <span className="underline">N/A</span> if Individual. For groups, separate with <span className="underline">commas</span>.
                </span>
              </div>
              <textarea 
                value={form.members} 
                onChange={(e) => setForm({ ...form, members: e.target.value })}
                required
                rows={3}
                className="evl-input !py-3 resize-none"
                placeholder="Juan Dela Cruz, Maria Clara, or N/A" 
              />
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  required
                  className="mt-1 w-4 h-4 rounded border-muted text-primary focus:ring-primary/30 cursor-pointer"
                />
                <span className="text-[11px] text-text/60 leading-relaxed">
                  By registering, you agree that the information provided will be used solely for the purpose of project evaluation and grading within the <span className="font-bold text-primary">EvalSys Platform</span>.
                </span>
              </label>
            </div>

            {isWakingUp && !error && (
              <div className="bg-primary/10 text-primary text-[11px] font-bold py-2 px-3 rounded-lg mb-5 text-center flex items-center justify-center gap-2 animate-pulse">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                Initializing system… (Server is waking up)
              </div>
            )}

            {error && (
              <div className="evl-alert-error text-xs py-3">
                {error}
              </div>
            )}

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

        <p className="text-center mt-8 text-text/30 text-xs font-medium">
          &copy; 2026 EvalSys Automated Rubrics Platform <br/>
          <span className="text-[10px] uppercase tracking-widest mt-1 inline-block opacity-60">Developed & Maintained by Jerico B. Garcia</span>
        </p>
      </div>
    </div>
  );
}
