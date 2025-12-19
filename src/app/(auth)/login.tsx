import { useState } from "react";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await signInWithEmail(email, password);
    if (error) setError(error.message);
    setLoading(false);
    // TODO: redirect on success
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
    setLoading(false);
    // TODO: redirect on success
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <button
        onClick={handleGoogle}
        className="w-full mt-4 bg-blue-500 text-white py-2 rounded"
        disabled={loading}
      >
        {loading ? "Redirecting..." : "Login with Google"}
      </button>
    </div>
  );
}
