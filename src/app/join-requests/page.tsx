import { redirect } from 'next/navigation';

export default function JoinRequestsPage() {
  redirect('/users?tab=requests');
}
