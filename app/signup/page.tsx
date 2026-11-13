import AuthForm from '@/app/login/auth-form'

export const metadata = {
  title: 'Sign Up | HeadCount',
  description: 'Create a host account on HeadCount.',
}

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            HeadCount
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Collect RSVPs, manage events, and track guest attendance.
          </p>
        </div>
        <AuthForm initialMode="signup" />
      </div>
    </main>
  )
}

