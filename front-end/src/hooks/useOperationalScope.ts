import { useEffect, useState } from 'react';

export const currentSubjectKey = 'evalsys_current_subject_id';
export const currentInstructorKey = 'evalsys_current_instructor_id';
export const operationalScopeChangedEvent = 'evalsys:operational-scope-changed';

export const notifyOperationalScopeChanged = () => {
  window.dispatchEvent(new Event(operationalScopeChangedEvent));
};

export const useOperationalScope = () => {
  const [scope, setScope] = useState(() => ({
    instructorId: localStorage.getItem(currentInstructorKey) || '',
    subjectId: localStorage.getItem(currentSubjectKey) || '',
    version: 0,
  }));

  useEffect(() => {
    const syncScope = () => {
      setScope((current) => ({
        instructorId: localStorage.getItem(currentInstructorKey) || '',
        subjectId: localStorage.getItem(currentSubjectKey) || '',
        version: current.version + 1,
      }));
    };

    window.addEventListener(operationalScopeChangedEvent, syncScope);
    window.addEventListener('storage', syncScope);
    return () => {
      window.removeEventListener(operationalScopeChangedEvent, syncScope);
      window.removeEventListener('storage', syncScope);
    };
  }, []);

  return scope;
};
