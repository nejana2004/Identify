import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import PinProfileButtonWrapper from "@/components/PinProfileButtonWrapper";

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const { data: user } = await supabase
    .from("users")
    .select("id, username, name, bio, country, profile_photo, tags_created, tags_liked")
    .eq("username", params.username)
    .single();

  if (!user) return notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("links, pinned_count, views_count")
    .eq("id", user.id)
    .single();

  // Pinning UI logic (client component)
  // This is a placeholder for the client-side pinning dropdown/modal
  // You should move this logic to a separate client component for best practice
  return (
    <main className="max-w-xl mx-auto py-10">
      <div className="flex items-center gap-6 mb-6">
        {user.profile_photo && (
          <img src={user.profile_photo} alt={user.name} className="w-20 h-20 rounded-full" />
        )}
        <div>
          <div className="text-2xl font-bold">{user.name}</div>
          <div className="text-gray-500">@{user.username}</div>
          <div className="text-xs text-gray-400">{user.country}</div>
        </div>
      </div>
      <div className="mb-4 text-sm">{user.bio}</div>
      {profile?.links && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Links</h3>
          <div className="grid grid-cols-2 gap-2">
            {profile.links.map((link: any, i: number) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="block p-2 border rounded hover:bg-gray-50">
                {link.icon && <span className="mr-2">{link.icon}</span>}
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="mb-4 text-xs text-gray-500">Pinned by {profile?.pinned_count ?? 0} users</div>
      <div className="mb-4 text-xs text-gray-500">Views: {profile?.views_count ?? 0}</div>
  {/* Pinning UI: dropdown to select board and pin profile */}
  {/* This should be a client component for interactivity */}
  <PinProfileButtonWrapper profileId={user.id} />
    </main>
  );
}

