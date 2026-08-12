import { useState } from "react";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await signUpWithEmail(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push("/auth/onboarding");
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push("/auth/onboarding");
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        {error && <div className="text-red-500">{error}</div>}
        <button type="submit" className="w-full bg-black text-white py-2 rounded" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
      <button
        onClick={handleGoogle}
        className="w-full mt-4 bg-blue-500 text-white py-2 rounded"
        disabled={loading}
      >
        {loading ? "Redirecting..." : "Sign Up with Google"}
      </button>
    </div>
  );
}
