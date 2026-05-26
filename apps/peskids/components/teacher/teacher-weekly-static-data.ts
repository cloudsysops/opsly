export type DaySlot = {
  day: string;
  time: string;
  className: string;
  students: number;
  status: 'scheduled' | 'ongoing' | 'done';
};

export type TeacherNote = {
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

export const weeklyAgenda: DaySlot[] = [
  { day: 'Lun', time: '07:00', className: 'Grupo Iniciacion', students: 8, status: 'done' },
  { day: 'Mar', time: '16:00', className: 'Tecnica Junior', students: 10, status: 'scheduled' },
  { day: 'Mie', time: '07:00', className: 'Grupo Iniciacion', students: 8, status: 'ongoing' },
  { day: 'Jue', time: '16:00', className: 'Avanzado', students: 6, status: 'scheduled' },
  {
    day: 'Vie',
    time: '07:00',
    className: 'Seguimiento familiar',
    students: 5,
    status: 'scheduled',
  },
];

export const teacherNotes: TeacherNote[] = [
  {
    id: 'note-1',
    student: 'Salome',
    className: 'Grupo Iniciacion',
    note: 'Mejoro respiracion; revisar confianza en desplazamiento.',
    priority: 'media',
  },
  {
    id: 'note-2',
    student: 'Tomas',
    className: 'Tecnica Junior',
    note: 'Solicitar apoyo visual en la salida y mantener ritmo corto.',
    priority: 'alta',
  },
  {
    id: 'note-3',
    student: 'Maria Jose',
    className: 'Avanzado',
    note: 'Muy buen control, dejar como referente del grupo.',
    priority: 'baja',
  },
];

export const baseTeacherCards: TeacherDashboardCard[] = [
  {
    title: 'Hoy',
    description: 'Clases programadas para el dia',
    value: '3',
    tone: 'teal',
  },
  {
    title: 'Asistencia',
    description: 'Promedio de la semana',
    value: '92%',
    tone: 'green',
  },
  {
    title: 'Alertas',
    description: 'Observaciones pendientes',
    value: '2',
    tone: 'amber',
  },
  {
    title: 'Mensajes',
    description: 'Familias esperando respuesta',
    value: '4',
    tone: 'violet',
  },
];
