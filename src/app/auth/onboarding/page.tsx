"use client";
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
    router.push("/");
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-3xl font-bold mb-6 text-center">Welcome! Create Your Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full border p-2 rounded text-lg"
          required
        />
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border p-2 rounded text-lg"
          required
        />
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="w-full border p-2 rounded text-lg"
          required
        >
          <option value="">Select country</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <textarea
          placeholder="Tell us about yourself (bio)"
          value={bio}
          onChange={e => setBio(e.target.value)}
          className="w-full border p-2 rounded text-lg"
          required
        />
        <div>
          <div className="font-semibold mb-2">What content do you create?</div>
          <div className="flex flex-wrap gap-2">
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
          <div className="font-semibold mb-2">What content do you like?</div>
          <div className="flex flex-wrap gap-2">
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
        {error && <div className="text-red-500 text-center">{error}</div>}
        <button type="submit" className="w-full bg-black text-white py-3 rounded text-lg font-semibold" disabled={loading}>
          {loading ? "Saving..." : "Complete Onboarding"}
        </button>
      </form>
    </div>
  );
}
