import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export const instant = false;

export default async function HomePage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id_user', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login?error=profile_not_found');
  }

  if (profile.role === 'admin_pabrik') {
    redirect('/admin');
  } else {
    redirect('/lapak');
  }
}
