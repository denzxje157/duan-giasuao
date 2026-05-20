import { Textbook } from '../types';

export const TEXTBOOKS_DATA: Textbook[] = [
  {
    id: 'kntt-toan-1',
    title: 'Toán 1 - Tập 1',
    subject: 'Toán',
    grade: 1,
    series: 'Kết nối tri thức',
    thumbnail: 'https://images.unsplash.com/photo-1596496050827-8299e0220de1?auto=format&fit=crop&q=80&w=400',
    pages: 120,
    size: '12.5 MB',
    description: 'Sách giáo khoa Toán lớp 1 bộ Kết nối tri thức với cuộc sống.',
    chapters: [
      { title: 'Chương 1: Các số đến 10', description: 'Làm quen với các con số cơ bản' },
      { title: 'Chương 2: Hình phẳng và hình khối', description: 'Nhận biết các hình dạng cơ bản' },
      { title: 'Chương 3: Phép cộng trong phạm vi 10' }
    ]
  },
  {
    id: 'kntt-tv-1',
    title: 'Tiếng Việt 1 - Tập 1',
    subject: 'Tiếng Việt',
    grade: 1,
    series: 'Kết nối tri thức',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400',
    pages: 184,
    size: '25.8 MB',
    chapters: [
      { title: 'Chủ đề 1: Tôi và các bạn' },
      { title: 'Chủ đề 2: Mái ấm gia đình' }
    ]
  },
  {
    id: 'kntt-khtn-6',
    title: 'Khoa học tự nhiên 6',
    subject: 'KHTN',
    grade: 6,
    series: 'Kết nối tri thức',
    thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=400',
    pages: 200,
    size: '30.5 MB',
    isNew: true,
    chapters: [
      { title: 'Chương 1: Mở đầu về khoa học tự nhiên' },
      { title: 'Chương 2: Chất quanh ta' },
      { title: 'Chương 3: Một số vật liệu, nhiên liệu, nguyên liệu' }
    ]
  },
  {
    id: 'kntt-toan-11',
    title: 'Toán 11 - Tập 1',
    subject: 'Toán',
    grade: 11,
    series: 'Kết nối tri thức',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400',
    pages: 156,
    size: '18.2 MB',
    chapters: [
      { title: 'Chương 1: Hàm số lượng giác và phương trình lượng giác' },
      { title: 'Chương 2: Dãy số. Cấp số cộng. Cấp số nhân' }
    ]
  },
  {
    id: 'ctst-van-11',
    title: 'Ngữ văn 11 - Tập 1',
    subject: 'Ngữ văn',
    grade: 11,
    series: 'Chân trời sáng tạo',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400',
    pages: 140,
    size: '20.1 MB',
    chapters: [
      { title: 'Bài 1: Thông điệp từ thiên nhiên' },
      { title: 'Bài 2: Hành trình của tri thức' }
    ]
  }
];
