export type DaySlot = {
  classId: string;
  day: string;
  time: string;
  startsAt: string;
  endsAt: string;
  className: string;
  students: number;
  status: 'scheduled' | 'ongoing' | 'done';
};

export type TeacherActionNote = {
  id: string;
  student: string;
  className: string;
  note: string;
  priority: 'alta' | 'media' | 'baja';
};

export type TeacherDashboardCard = {
  title: string;
  description: string;
  value: string;
  tone: 'teal' | 'green' | 'amber' | 'violet';
};
