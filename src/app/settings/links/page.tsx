"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
// @ts-ignore
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaGlobe, FaInstagram, FaTwitter, FaTiktok, FaYoutube, FaLinkedin, FaGithub, 
         FaFacebook, FaDiscord, FaTwitch, FaSpotify, FaPinterest, FaSnapchatGhost, 
         FaReddit, FaMedium, FaBehance, FaDribbble, FaLink } from 'react-icons/fa';

interface Link {
  id: string;
  user_id: string;
  title: string;
  url: string;
  icon?: string;
  platform_id?: string;
  is_active: boolean;
  position: number;
  created_at: string;
}

interface NewLink {
  title: string;
  url: string;
  platform: string;
  is_active: boolean;
}

// Popular social media platforms with their icons and URL patterns
const SOCIAL_PLATFORMS = [
  { id: 'website', name: 'Website', icon: <FaGlobe />, urlPattern: '', placeholder: 'https://yourwebsite.com' },
  { id: 'instagram', name: 'Instagram', icon: <FaInstagram />, urlPattern: 'https://instagram.com/', placeholder: 'username' },
  { id: 'twitter', name: 'Twitter/X', icon: <FaTwitter />, urlPattern: 'https://twitter.com/', placeholder: 'username' },
  { id: 'tiktok', name: 'TikTok', icon: <FaTiktok />, urlPattern: 'https://tiktok.com/@', placeholder: 'username' },
  { id: 'youtube', name: 'YouTube', icon: <FaYoutube />, urlPattern: 'https://youtube.com/@', placeholder: 'channelname' },
  { id: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, urlPattern: 'https://linkedin.com/in/', placeholder: 'username' },
  { id: 'github', name: 'GitHub', icon: <FaGithub />, urlPattern: 'https://github.com/', placeholder: 'username' },
  { id: 'facebook', name: 'Facebook', icon: <FaFacebook />, urlPattern: 'https://facebook.com/', placeholder: 'username' },
  { id: 'discord', name: 'Discord', icon: <FaDiscord />, urlPattern: 'https://discord.gg/', placeholder: 'invite-code' },
  { id: 'twitch', name: 'Twitch', icon: <FaTwitch />, urlPattern: 'https://twitch.tv/', placeholder: 'username' },
  { id: 'spotify', name: 'Spotify', icon: <FaSpotify />, urlPattern: 'https://open.spotify.com/user/', placeholder: 'username' },
  { id: 'pinterest', name: 'Pinterest', icon: <FaPinterest />, urlPattern: 'https://pinterest.com/', placeholder: 'username' },
  { id: 'snapchat', name: 'Snapchat', icon: <FaSnapchatGhost />, urlPattern: 'https://snapchat.com/add/', placeholder: 'username' },
  { id: 'reddit', name: 'Reddit', icon: <FaReddit />, urlPattern: 'https://reddit.com/u/', placeholder: 'username' },
  { id: 'medium', name: 'Medium', icon: <FaMedium />, urlPattern: 'https://medium.com/@', placeholder: 'username' },
  { id: 'behance', name: 'Behance', icon: <FaBehance />, urlPattern: 'https://behance.net/', placeholder: 'username' },
  { id: 'dribbble', name: 'Dribbble', icon: <FaDribbble />, urlPattern: 'https://dribbble.com/', placeholder: 'username' },
  { id: 'custom', name: 'Custom Link', icon: <FaLink />, urlPattern: '', placeholder: 'https://example.com' }
];

export default function LinksEditorPage() {
  const router = useRouter();
  const [links, setLinks] = useState<Link[]>([]);
  const [newLink, setNewLink] = useState<NewLink>({ title: '', url: '', platform: 'custom', is_active: true });
  const [selectedPlatform, setSelectedPlatform] = useState(SOCIAL_PLATFORMS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        setUser(user);

        // Load user's username from users table
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (userData?.username) {
          setUsername(userData.username);
        }
        
        // Load user's links
        const { data: linksData, error: linksError } = await supabase
          .from('user_links')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true });
          
        if (linksError) throw linksError;
        
        setLinks(linksData || []);
      } catch (err: any) {
        const errorMessage = err?.message || err?.error?.message || 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error loading links:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [router]);

  useEffect(() => {
    const platform = SOCIAL_PLATFORMS.find(p => p.id === newLink.platform) || SOCIAL_PLATFORMS[0];
    setSelectedPlatform(platform);
  }, [newLink.platform]);
  
  const buildUrl = (platform: any, input: string) => {
    if (platform.id === 'custom' || platform.id === 'website') {
      // For custom links, expect full URL
      return input.startsWith('http') ? input : `https://${input}`;
    }
    // For social platforms, combine pattern + username
    return platform.urlPattern + input;
  };

  const extractDisplayName = (platform: any, url: string) => {
    if (platform.id === 'custom' || platform.id === 'website') {
      try {
        return new URL(url).hostname.replace('www.', '');
      } catch {
        return url;
      }
    }
    return platform.name;
  };
  
  const handleAddLink = async () => {
    if (!user) return;
    if (!newLink.url.trim()) {
      setError('URL or username is required');
      return;
    }
    
    const finalUrl = buildUrl(selectedPlatform, newLink.url.trim());
    const displayTitle = newLink.title.trim() || extractDisplayName(selectedPlatform, finalUrl);
    
    setSaving(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_links')
        .insert({
          user_id: user.id,
          title: displayTitle,
          url: finalUrl,
          platform_id: selectedPlatform.id,
          is_active: newLink.is_active,
          position: links.length
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setLinks([...links, data]);
      setNewLink({ title: '', url: '', platform: 'custom', is_active: true });
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding link:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_links')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setLinks(links.filter(link => link.id !== id));
      
      // Update positions after deletion
      const updatedLinks = links
        .filter(link => link.id !== id)
        .map((link, index) => ({ ...link, position: index }));
        
      await updateLinkPositions(updatedLinks);
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting link:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleToggleActive = async (id: string, is_active: boolean) => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_links')
        .update({ is_active: !is_active })
        .eq('id', id);
        
      if (error) throw error;
      
      setLinks(links.map(link => 
        link.id === id ? { ...link, is_active: !is_active } : link
      ));
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating link:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const updateLinkPositions = async (updatedLinks: Link[]) => {
    try {
      for (const link of updatedLinks) {
        await supabase
          .from('user_links')
          .update({ position: link.position })
          .eq('id', link.id);
      }
    } catch (err: any) {
      console.error('Error updating positions:', err);
    }
  };
  
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(links);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update positions
    const updatedLinks = items.map((item, index) => ({
      ...item,
      position: index
    }));
    
    setLinks(updatedLinks);
    await updateLinkPositions(updatedLinks);
  };
  
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 mt-6 sm:mt-10">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Loading...</h1>
      </div>
    );
  }
  
  return (
    <div className="max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Manage Your Links</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">Create your personal link tree to showcase all your social profiles and websites in one place.</p>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
          {error}
        </div>
      )}
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Add New Link</h2>
        
        {/* Platform Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {SOCIAL_PLATFORMS.map(platform => (
              <button
                key={platform.id}
                onClick={() => setNewLink({ ...newLink, platform: platform.id })}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  newLink.platform === platform.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-1 flex justify-center">{platform.icon}</div>
                <div className="text-xs font-medium">{platform.name}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedPlatform.id === 'custom' || selectedPlatform.id === 'website' ? 'URL' : `${selectedPlatform.name} Username`}
            </label>
            <div className="flex">
              {selectedPlatform.urlPattern && (
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  {selectedPlatform.urlPattern}
                </span>
              )}
              <input
                type="text"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className={`flex-1 p-2 border border-gray-300 ${selectedPlatform.urlPattern ? 'rounded-r-md' : 'rounded-md'}`}
                placeholder={selectedPlatform.placeholder}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Title (optional)
            </label>
            <input
              type="text"
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder={`Leave empty to use "${extractDisplayName(selectedPlatform, selectedPlatform.placeholder)}"`}
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={newLink.is_active}
              onChange={(e) => setNewLink({ ...newLink, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-700">
              Active (visible to visitors)
            </label>
          </div>
          
          <button
            onClick={handleAddLink}
            disabled={saving}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding...' : 'Add Link'}
          </button>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Your Links</h2>
      <p className="text-gray-600 mb-4 text-sm">Drag to reorder • Toggle to show/hide • Click link to test</p>
      
      {links.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <div className="text-gray-400 text-6xl mb-4 flex justify-center"><FaLink size={60} /></div>
          <p className="text-gray-500 font-medium">No links added yet</p>
          <p className="text-gray-400 text-sm">Add your first social media link above</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="links">
            {(provided: any) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {links.map((link, index) => (
                  <Draggable key={link.id} draggableId={link.id} index={index}>
                    {(provided: any, snapshot: any) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border transition-all ${
                          link.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                        } ${snapshot.isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'}`}
                      >
                        <div className="flex items-center flex-1">
                          <div
                            {...provided.dragHandleProps}
                            className="mr-3 p-1 text-gray-400 hover:text-gray-600 cursor-grab"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </div>
                          
                          <div className="text-2xl mr-3">
                            {SOCIAL_PLATFORMS.find(p => p.id === link.platform_id)?.icon || 
                             (link.platform_id ? <FaLink /> : <span>{link.icon}</span>)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{link.title}</h3>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate block"
                            >
                              {link.url}
                            </a>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleToggleActive(link.id, link.is_active)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              link.is_active 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={link.is_active ? 'Hide link' : 'Show link'}
                          >
                            {link.is_active ? 'Active' : 'Hidden'}
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      
      {user && username && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <h3 className="font-semibold text-blue-900">Share Your Profile</h3>
          </div>
          <p className="text-blue-700 text-sm mb-3">Share this link to let people discover you and your content:</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white border border-blue-200 rounded-lg overflow-hidden">
              <span className="px-3 py-2 bg-blue-100 text-blue-600 text-sm font-medium border-r border-blue-200">
                identify.com/
              </span>
              <input
                type="text"
                value={username}
                readOnly
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-800 bg-transparent outline-none"
              />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/profile/${username}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
