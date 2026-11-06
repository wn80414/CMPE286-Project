import { redirect } from 'next/navigation';

export default function Home() {
  // Proxy handles authenticated routing for the root path.
  redirect('/dashboard');
}