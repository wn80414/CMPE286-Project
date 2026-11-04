import { redirect } from 'next/navigation';

export default function Home() {
  // Automatically route root visitors to the dashboard 
  // (The middleware will catch them if they aren't logged in and bounce them to /login)
  redirect('/dashboard');
}