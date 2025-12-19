import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveOnboarding } from "@/lib/onboarding";
import { useRouter } from "next/navigation";

const countries = ["United States", "Canada", "United Kingdom", "India", "Australia", "Other"];
const contentTags = [
  "Art", "Music", "Writing", "Tech", "Gaming", "Fashion", "Education", "Fitness", "Food", "Travel"
];

export default function Onboarding() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [tagsCreated, setTagsCreated] = useState<string[]>([]);
  const [tagsLiked, setTagsLiked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTagToggle = (tag: string, type: "created" | "liked") => {
    if (type === "created") {
      setTagsCreated(tagsCreated.includes(tag)
        ? tagsCreated.filter(t => t !== tag)
        : [...tagsCreated, tag]);
    } else {
      setTagsLiked(tagsLiked.includes(tag)
        ? tagsLiked.filter(t => t !== tag)
        : [...tagsLiked, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }
    const { error: saveError } = await saveOnboarding({
      userId: user.id,
      username,
      name,
      country,
      bio,
      tagsCreated,
      tagsLiked
    });
    if (saveError) {
      setError(saveError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push("/"); // Redirect to home page
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Onboarding</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Username (unique)"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Select Country</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <textarea
          placeholder="Bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <div>
          <label className="font-semibold">What kind of content do you create?</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {contentTags.map(tag => (
              <button
                type="button"
                key={tag}
                className={`px-3 py-1 rounded border ${tagsCreated.includes(tag) ? "bg-black text-white" : "bg-gray-100"}`}
                onClick={() => handleTagToggle(tag, "created")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="font-semibold">What kind of content do you like to see?</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {contentTags.map(tag => (
              <button
                type="button"
                key={tag}
                className={`px-3 py-1 rounded border ${tagsLiked.includes(tag) ? "bg-blue-500 text-white" : "bg-gray-100"}`}
                onClick={() => handleTagToggle(tag, "liked")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <button type="submit" className="w-full bg-black text-white py-2 rounded" disabled={loading}>
          {loading ? "Saving..." : "Complete Onboarding"}
        </button>
      </form>
    </div>
  );
}
