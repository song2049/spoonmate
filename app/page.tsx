// app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  // 루트 경로(/)로 접근 시 로그인 페이지로 리다이렉트
  redirect('/login');
}