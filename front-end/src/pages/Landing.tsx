import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const roleFlow = [
  {
    tag: 'INSTRUCTOR',
    label: 'Sets up the evaluation',
    desc: 'The instructor creates the subject, sections, groups, rubrics, panel accounts, and registration links for the current project evaluation.',
  },
  {
    tag: 'STUDENTS',
    label: 'Register their group',
    desc: 'Students open the registration link, enter members in structured name fields, and optionally attach a proposal or project document.',
  },
  {
    tag: 'PANELS',
    label: 'Grade assigned groups',
    desc: 'Panel judges only see their assigned blocks and groups, use the active rubric, add scores and feedback, and submit the evaluation.',
  },
  {
    tag: 'RESULTS',
    label: 'Instructor reviews and exports',
    desc: 'EvalSys averages panel scores, shows missing panel submissions, keeps comments, and exports group or member-grade CSV files.',
  },
];

const systemNotes = [
  {
    label: 'Data is separated by instructor and subject',
    desc: 'Subjects, sections, groups, rubrics, panels, and grading locks stay scoped to the owner so records do not mix.',
  },
  {
    label: 'Old records are still supported',
    desc: 'Older comma-separated member data can still be displayed while newer registrations use structured member fields.',
  },
  {
    label: 'Results stay available for review',
    desc: 'Submitted evaluations are preserved for results and archive views even when accounts or old data are cleaned up.',
  },
];

const panelFlow = [
  {
    label: 'Open assigned block',
    desc: 'The panel account shows only the blocks and groups assigned by the instructor.',
  },
  {
    label: 'Review proposal if uploaded',
    desc: 'If students attached a proposal, the panel can open it while grading the group.',
  },
  {
    label: 'Score using the active rubric',
    desc: 'Scores are checked before submission so missing or invalid fields are caught early.',
  },
  {
    label: 'Submit feedback',
    desc: 'Comments and scores are saved for the instructor to review in the Results page.',
  },
];

const demoSteps = [
  {
    time: '00:01',
    title: 'Instructor sets up the subject',
    desc: 'Create subjects, sections, groups, active rubrics, registration links, and panel assignments.',
  },
  {
    time: '00:25',
    title: 'Students register groups',
    desc: 'Students use the instructor registration link, add structured members, and optionally upload a proposal file.',
  },
  {
    time: '00:50',
    title: 'Panels grade assigned groups',
    desc: 'Panel judges open their assigned block, view proposals, score each rubric criterion, and submit comments.',
  },
  {
    time: '01:20',
    title: 'Instructor reviews and exports',
    desc: 'Results show averages, missing panels, comments, and CSV exports for group summaries or alphabetical member grades.',
  },
];

const faqs = [
  {
    q: 'How do student groups register?',
    a: 'The instructor creates a registration link for the subject or block. Students use that link to submit their group name, member names, and optional proposal file.',
  },
  {
    q: 'How do I get an Instructor or Panel account?',
    a: 'Accounts are created by an authorized administrator or instructor. The user receives a temporary password, signs in, and then creates a private password before using the system.',
  },
  {
    q: 'What does the instructor review after panels submit?',
    a: 'The Results page shows averaged scores per group, missing panel submissions, panel comments, final scores, and CSV export options.',
  },
  {
    q: 'What happens when a panel account is deleted?',
    a: 'The account and assignments are removed, but submitted evaluations remain preserved so results are not lost.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col selection:bg-primary/20">
      <header className="bg-dark text-white border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left"
            aria-label="EvalSys home"
          >
            <span className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white text-base font-black shrink-0">
              E
            </span>
            <span>
              <span className="block text-sm font-black tracking-tight uppercase">EvalSys</span>
              <span className="block text-[10px] text-white/70 uppercase tracking-widest font-bold">
                Project Evaluation System
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStudentModal(true)}
              className="hidden sm:inline-flex text-xs font-bold text-white/55 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Student Registration
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-primary hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-bg border-b border-muted/30">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)] gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary mb-4">
                Instructor-led project evaluation
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-dark tracking-tight leading-none">
                EvalSys
              </h1>
              <p className="mt-5 text-lg text-text/65 leading-relaxed max-w-xl font-medium">
                EvalSys guides project evaluation from account setup to student registration, panel grading, instructor review, and final grade export.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="evl-btn-primary py-3.5 px-7 text-sm uppercase tracking-wider"
                >
                  Open Portal
                </button>
                <button
                  onClick={() => setShowStudentModal(true)}
                  className="evl-btn-secondary py-3.5 px-7 text-sm uppercase tracking-wider"
                >
                  Registration Link Help
                </button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
                {[
                  ['Setup', 'Create subjects and panels'],
                  ['Evaluate', 'Panels grade assigned groups'],
                  ['Review', 'Export final grade lists'],
                ].map(([label, desc]) => (
                  <div key={label} className="border border-muted/50 bg-white rounded-lg p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text/65">{label}</p>
                    <p className="text-xs text-text/60 mt-1 leading-snug">{desc}</p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-text/65">
                Accounts are created by administrators.{' '}
                <button onClick={() => setShowAccountModal(true)} className="text-primary font-bold hover:underline">
                  Request access
                </button>
              </p>
            </div>

            <div className="border border-muted/60 rounded-lg bg-surface shadow-xl overflow-hidden">
              <div className="px-4 py-3 bg-dark text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Final Review</p>
                  <p className="text-sm font-extrabold">22-ITE-04</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold bg-white/10 text-white px-2.5 py-1 rounded-md">Group Summary CSV</span>
                  <span className="text-[10px] font-bold bg-primary text-white px-2.5 py-1 rounded-md">Member Grades CSV</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1.08fr_0.92fr]">
                <div className="p-4 border-b md:border-b-0 md:border-r border-muted/40">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text/65">Group</p>
                      <p className="font-black text-dark">Project Alpha</p>
                    </div>
                    <span className="evl-badge-success">92.5 / 100</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['System Functionality', 24, 25, 'bg-success'],
                      ['API Integration', 25, 25, 'bg-success'],
                      ['Presentation', 14, 15, 'bg-primary'],
                      ['UI / UX', 9.5, 10, 'bg-success'],
                      ['Q & A', 20, 25, 'bg-primary'],
                    ].map(([label, score, max, color]) => (
                      <div key={String(label)}>
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-text/65">{label}</span>
                          <span className="text-dark">{score}/{max}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/25 overflow-hidden">
                          <div
                            className={`h-full ${color}`}
                            style={{ width: `${(Number(score) / Number(max)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-bg/70">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text/65">
                      Member export preview
                    </p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                      Alphabetical
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Garcia', 'Jerico', 'Bautista'],
                      ['Luna', 'Andrea', 'Santos'],
                      ['Reyes', 'Marco', 'Dela Cruz'],
                      ['Tan', 'Mikaela', 'Uy'],
                    ].map(([last, first, middle]) => (
                      <div key={`${last}-${first}`} className="grid grid-cols-3 gap-2 text-[11px] bg-white border border-muted/40 rounded-lg px-3 py-2">
                        <span className="font-bold text-dark truncate">{last}</span>
                        <span className="text-text/60 truncate">{first}</span>
                        <span className="text-text/65 truncate">{middle}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-text/65 leading-relaxed">
                    Member rows are exported alphabetically by Last Name, then First Name, then Middle Name.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border-b border-muted/30">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  Workflow
                </p>
                <h2 className="text-3xl font-black text-dark mt-2 tracking-tight">
                  From setup to export.
                </h2>
                <p className="text-sm text-text/55 leading-relaxed mt-3">
                  EvalSys follows the same order used during a project defense or final presentation: prepare the class setup, collect groups, grade presentations, review results, then export.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 border border-muted/50 rounded-lg overflow-hidden">
                {[
                  ['01', 'Prepare', 'Create the subject, blocks, panels, and rubric'],
                  ['02', 'Register', 'Students submit their group and members'],
                  ['03', 'Evaluate', 'Panel judges score assigned groups'],
                  ['04', 'Finalize', 'Instructor reviews and exports grades'],
                ].map(([step, label, desc]) => (
                  <div key={step} className="p-5 border-b md:border-b-0 md:border-r last:border-r-0 last:border-b-0 border-muted/40 bg-surface">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{step}</p>
                    <h3 className="font-black text-dark mt-2">{label}</h3>
                    <p className="text-xs text-text/70 leading-relaxed mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-bg border-b border-muted/30">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14">
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  Demo Walkthrough
                </p>
                <h2 className="text-3xl font-black text-dark mt-2 tracking-tight">
                  See how EvalSys is used from setup to export.
                </h2>
                <p className="text-sm text-text/55 leading-relaxed mt-3 max-w-lg">
                  This quick guide follows the whole evaluation journey, from instructor setup to exporting the final grade list.
                </p>

                <div className="mt-6 space-y-3">
                  {demoSteps.map((step) => (
                    <div key={step.time} className="grid grid-cols-[56px_1fr] gap-3 rounded-lg border border-muted/50 bg-white px-4 py-3">
                      <span className="text-[11px] font-black text-primary bg-primary/10 rounded-md px-2 py-1 self-start text-center">
                        {step.time}
                      </span>
                      <div>
                        <h3 className="font-black text-dark text-sm">{step.title}</h3>
                        <p className="text-xs text-text/60 leading-relaxed mt-1">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-muted/60 bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-dark text-white px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger" />
                    <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                    <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    EvalSys Demo Preview
                  </p>
                </div>

                <div className="relative aspect-video bg-slate-950 overflow-hidden">
                  <div className="absolute inset-0 opacity-70 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#2563eb_100%)]" />
                  <div className="absolute inset-5 rounded-lg border border-white/10 bg-white/95 shadow-2xl overflow-hidden">
                    <div className="h-10 bg-dark flex items-center justify-between px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-black flex items-center justify-center">E</span>
                        <span className="text-white text-xs font-black">EvalSys</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Live Flow</span>
                    </div>
                    <div className="grid grid-cols-[90px_1fr] h-[calc(100%-2.5rem)]">
                      <div className="bg-slate-900 p-3 space-y-2">
                        {['Subjects', 'Groups', 'Rubrics', 'Grade', 'Results'].map((item, index) => (
                          <div key={item} className={`h-7 rounded-md ${index === 4 ? 'bg-primary' : 'bg-white/10'} px-2 flex items-center`}>
                            <span className="text-[8px] font-bold text-white/85 truncate">{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-bg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="h-3 w-28 bg-slate-900 rounded-sm" />
                            <div className="h-2 w-44 bg-muted rounded-sm mt-2" />
                          </div>
                          <div className="h-8 w-24 bg-primary rounded-lg" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[85, 92, 100].map((width, index) => (
                            <div key={index} className="rounded-lg border border-muted/50 bg-white p-3">
                              <div className="h-2 w-14 bg-muted rounded-sm mb-3" />
                              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                                <div className="h-full bg-success" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-muted/50 bg-white overflow-hidden">
                          {[0, 1, 2, 3].map((row) => (
                            <div key={row} className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr] gap-2 px-3 py-2 border-b last:border-b-0 border-muted/30">
                              <div className="h-2 bg-slate-800 rounded-sm" />
                              <div className="h-2 bg-muted rounded-sm" />
                              <div className="h-2 bg-muted rounded-sm" />
                              <div className="h-2 bg-success rounded-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-6 right-6 bottom-5">
                    <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-primary evalsys-demo-progress" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-white">
                      <span className="text-[10px] font-bold uppercase tracking-widest">How to use EvalSys</span>
                      <span className="text-[10px] font-mono">01:45</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-white border-t border-muted/40">
                  <p className="text-xs text-text/60 leading-relaxed">
                    Demo preview only. It explains the workflow without requiring a recorded video file.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-bg border-b border-muted/30">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  How it works
                </p>
                <h2 className="text-3xl font-black text-dark mt-2 tracking-tight">
                  Each user has a clear part in the evaluation.
                </h2>
              </div>
              <p className="text-sm text-text/55 max-w-md leading-relaxed">
                EvalSys is organized around the real people involved in evaluation: instructor, students, panel judges, and results reviewer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {roleFlow.map((item) => (
                <div key={item.tag} className="bg-white border border-muted/50 rounded-lg p-5">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{item.tag}</p>
                  <h3 className="font-black text-dark mt-2">{item.label}</h3>
                  <p className="text-xs text-text/55 leading-relaxed mt-2">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-dark text-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-success">
                During evaluation
              </p>
              <h2 className="text-3xl font-black mt-2 tracking-tight">
                Instructors manage while panels grade.
              </h2>
              <p className="text-sm text-white/75 leading-relaxed mt-3">
                Instructors control the subject setup, rubric, panel assignments, grading locks, and results review. Panels focus on their assigned groups, score the active rubric, and submit comments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {panelFlow.map((item, index) => (
                <div key={item.label} className="border border-white/10 rounded-lg p-5 bg-white/[0.03]">
                  <p className="text-[10px] font-black text-success uppercase tracking-widest">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="font-black text-white mt-2">{item.label}</h3>
                  <p className="text-xs text-white/75 leading-relaxed mt-2">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white border-b border-muted/30">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                System behavior
              </p>
              <h2 className="text-3xl font-black text-dark mt-2 tracking-tight">
                The system protects the evaluation records.
              </h2>
              <p className="text-sm text-text/55 leading-relaxed mt-3 max-w-md">
                EvalSys keeps ownership clear, supports old data during migration, and keeps submitted results available for later review.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowAccountModal(true)} className="evl-btn-primary !text-sm">
                  Request Access
                </button>
                <button onClick={() => setShowStudentModal(true)} className="evl-btn-secondary !text-sm">
                  Registration Help
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemNotes.map((item) => (
                <div key={item.label} className="border border-muted/50 rounded-lg p-5 bg-bg">
                  <h3 className="font-black text-dark">{item.label}</h3>
                  <p className="text-xs text-text/55 leading-relaxed mt-2">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-bg border-b border-muted/30">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 grid grid-cols-1 lg:grid-cols-[0.7fr_1fr] gap-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                FAQ
              </p>
              <h2 className="text-3xl font-black text-dark mt-2 tracking-tight">
                Common questions.
              </h2>
              <p className="text-sm text-text/55 leading-relaxed mt-3">
                Fast answers for instructors, panels, and students using EvalSys.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const active = activeFaq === index;
                return (
                  <div key={faq.q} className="bg-white border border-muted/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full px-5 py-4 text-left flex justify-between items-center gap-4 hover:bg-bg/50 transition-colors"
                    >
                      <span className="font-bold text-sm text-dark">{faq.q}</span>
                      <span className="text-text/65 text-xs font-mono font-bold">{active ? '[-]' : '[+]'}</span>
                    </button>
                    {active && (
                      <div className="px-5 pb-5 pt-1 border-t border-muted/20 text-sm text-text/60 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-dark text-white py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-base font-black shrink-0">
              E
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider">EvalSys</p>
              <p className="text-[10px] text-white/65">Project rubric evaluations and panel grading.</p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-white/25 text-[9px] font-bold uppercase tracking-widest">
              Developed and maintained by
            </p>
            <p className="text-sm font-black text-white/80">Jerico B. Garcia</p>
            <p className="text-xs text-primary font-bold font-mono">garciajerico217@gmail.com</p>
          </div>
        </div>
      </footer>

      {showStudentModal && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-muted max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute right-4 top-4 text-text/65 hover:text-text font-bold text-sm"
            >
              x
            </button>
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg font-black mb-4">
              R
            </div>
            <h4 className="text-lg font-black text-dark">Student Group Registration</h4>
            <p className="text-sm text-text/55 leading-relaxed mt-2">
              Public registrations require unique token links generated by instructors.
            </p>
            <p className="text-xs text-text/60 leading-relaxed mt-4 font-semibold p-4 bg-primary/5 border border-primary/20 rounded-lg">
              Check your class group or email for a link like <code className="text-primary font-mono text-[10px]">/register?token=...</code>.
            </p>
            <p className="text-xs text-text/70 leading-relaxed mt-4">
              Contact your subject instructor if you have not received your registration link.
            </p>
            <button
              onClick={() => setShowStudentModal(false)}
              className="evl-btn-primary w-full mt-6 py-3 text-xs uppercase tracking-wider"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-muted max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowAccountModal(false)}
              className="absolute right-4 top-4 text-text/65 hover:text-text font-bold text-sm"
            >
              x
            </button>
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg font-black mb-4">
              A
            </div>
            <h4 className="text-lg font-black text-dark">Portal Access Request</h4>
            <p className="text-sm text-text/55 leading-relaxed mt-2">
              Instructor and Panel accounts are created by administrators.
            </p>
            <p className="text-xs text-text/60 leading-relaxed mt-4 font-semibold p-4 bg-success/5 border border-success/20 rounded-lg text-success">
              To request an account, email:
              <span className="block font-black text-sm mt-1.5 select-all font-mono text-dark bg-white py-2 px-3 border border-muted/50 rounded-lg text-center">
                garciajerico217@gmail.com
              </span>
            </p>
            <p className="text-xs text-text/70 leading-relaxed mt-4">
              Include your full name, role, and subject or department.
            </p>
            <button
              onClick={() => setShowAccountModal(false)}
              className="evl-btn-primary w-full mt-6 py-3 text-xs uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

