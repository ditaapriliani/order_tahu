import AuthSliderClient from '@/components/auth/AuthSliderClient';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#18222d] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dekorasi Latar Halus */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-950/30 rounded-full blur-3xl pointer-events-none" />

      {/* Sliding Auth Card Component */}
      <AuthSliderClient initialMode="login" />
    </div>
  );
}
