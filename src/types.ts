
export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Chapter {
  title: string;
  page?: number;
  description?: string;
}

export interface Textbook {
  id: string;
  title: string;
  subject: string;
  grade: Grade;
  series: 'Kết nối tri thức' | 'Chân trời sáng tạo' | 'Cánh Diều';
  thumbnail?: string;
  pdfUrl?: string;
  description?: string;
  pages?: number;
  size?: string;
  chapters?: Chapter[];
  isNew?: boolean;
}

export interface User {
  name: string;
  email: string;
  grade: Grade;
  avatar?: string;
  role?: 'student' | 'admin';
  isGuest?: boolean;
  guestStartTime?: number;
}
