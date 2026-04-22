import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-serif text-lg text-[#6A6360]">
          Add <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-sm">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
          <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-sm">CLERK_SECRET_KEY</code> to{" "}
          <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-sm">.env.local</code>, then restart the dev server.
        </p>
      </div>
    );
  }
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={{
          variables: { colorPrimary: "#1C1917" },
          elements: {
            card: "shadow-none border border-[#EDE8E0]",
            formButtonPrimary: "bg-[#1C1917] hover:bg-[#2C2920]",
          },
        }}
      />
    </div>
  );
}
