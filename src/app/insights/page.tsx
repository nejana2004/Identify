"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiUsers, FiEye, FiMapPin, FiGrid, FiTrendingUp, FiCalendar, FiArrowUp, FiArrowDown, FiHeart } from 'react-icons/fi';

interface PinnerInfo {
  id: string;
  username: string;
  name: string;
  profile_photo: string | null;
  board_title: string;
  board_id: string;
  pinned_at: string;
}

interface BoardStats {
  id: string;
  title: string;
  pin_count: number;
  follower_count: number;
  is_public: boolean;
  created_at: string;
}

interface BoardFollower {
  id: string;
  username: string;
  name: string;
  profile_photo: string | null;
  board_title: string;
  board_id: string;
  followed_at: string;
}

interface Stats {
  totalPins: number;
  totalViews: number;
  totalBoards: number;
  totalBoardFollowers: number;
  profileViewsThisWeek: number;
  pinsThisWeek: number;
  followersThisWeek: number;
  viewsTrend: 'up' | 'down' | 'same';
  pinsTrend: 'up' | 'down' | 'same';
  followersTrend: 'up' | 'down' | 'same';
}

export default function InsightsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    totalPins: 0,
    totalViews: 0,
    totalBoards: 0,
    totalBoardFollowers: 0,
    profileViewsThisWeek: 0,
    pinsThisWeek: 0,
    followersThisWeek: 0,
    viewsTrend: 'same',
    pinsTrend: 'same',
    followersTrend: 'same'
  });
  const [pinners, setPinners] = useState<PinnerInfo[]>([]);
  const [boards, setBoards] = useState<BoardStats[]>([]);
  const [boardFollowers, setBoardFollowers] = useState<BoardFollower[]>([]);
  const [recentViewers, setRecentViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pinners' | 'boards' | 'followers' | 'viewers'>('overview');

  useEffect(() => {
    async function loadInsights() {
      setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        setUser(user);

        // Get user profile
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);

          // Get pins where this user is the profile (people who pinned them)
          const { data: pinsData } = await supabase
            .from('pins')
            .select(`
              id,
              created_at,
              board:boards!board_id(
                id,
                title,
                user_id,
                user:users!user_id(id, username, name, profile_photo)
              )
            `)
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false });

          const pinnersInfo: PinnerInfo[] = (pinsData || []).map((pin: any) => ({
            id: pin.board?.user?.id || '',
            username: pin.board?.user?.username || '',
            name: pin.board?.user?.name || 'Unknown',
            profile_photo: pin.board?.user?.profile_photo || null,
            board_title: pin.board?.title || 'Unknown Board',
            board_id: pin.board?.id || '',
            pinned_at: pin.created_at
          }));
          setPinners(pinnersInfo);

          // Get user's boards with pin counts and follower counts
          const { data: boardsData } = await supabase
            .from('boards')
            .select(`
              id,
              title,
              is_public,
              created_at,
              pins(count),
              board_followers(count)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          const boardStats: BoardStats[] = (boardsData || []).map((board: any) => ({
            id: board.id,
            title: board.title,
            pin_count: board.pins?.[0]?.count || 0,
            follower_count: board.board_followers?.[0]?.count || 0,
            is_public: board.is_public,
            created_at: board.created_at
          }));
          setBoards(boardStats);

          // Get board followers for user's boards
          const boardIds = (boardsData || []).map((b: any) => b.id);
          let allBoardFollowers: BoardFollower[] = [];
          
          if (boardIds.length > 0) {
            const { data: followersData } = await supabase
              .from('board_followers')
              .select(`
                id,
                created_at,
                board_id,
                boards!board_id(title),
                users!user_id(id, username, name, profile_photo)
              `)
              .in('board_id', boardIds)
              .order('created_at', { ascending: false });

            allBoardFollowers = (followersData || []).map((f: any) => ({
              id: f.users?.id || '',
              username: f.users?.username || '',
              name: f.users?.name || 'Unknown',
              profile_photo: f.users?.profile_photo || null,
              board_title: f.boards?.title || 'Unknown Board',
              board_id: f.board_id,
              followed_at: f.created_at
            }));
            setBoardFollowers(allBoardFollowers);
          }

          // Get profile views (from profile_views table if exists)
          const { data: viewsData } = await supabase
            .from('profile_views')
            .select(`
              id,
              viewed_at,
              viewer:users!viewer_id(id, username, name, profile_photo)
            `)
            .eq('profile_id', user.id)
            .order('viewed_at', { ascending: false })
            .limit(20);

          setRecentViewers(viewsData || []);

          // Calculate stats
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

          const pinsThisWeek = pinnersInfo.filter(p => new Date(p.pinned_at) > oneWeekAgo).length;
          const pinsLastWeek = pinnersInfo.filter(p => {
            const date = new Date(p.pinned_at);
            return date > twoWeeksAgo && date <= oneWeekAgo;
          }).length;

          const viewsThisWeek = (viewsData || []).filter((v: any) => new Date(v.viewed_at) > oneWeekAgo).length;
          
          const followersThisWeek = allBoardFollowers.filter(f => new Date(f.followed_at) > oneWeekAgo).length;
          const followersLastWeek = allBoardFollowers.filter(f => {
            const date = new Date(f.followed_at);
            return date > twoWeeksAgo && date <= oneWeekAgo;
          }).length;
          
          const totalBoardFollowers = boardStats.reduce((sum, b) => sum + b.follower_count, 0);

          setStats({
            totalPins: profileData.pin_count || pinnersInfo.length,
            totalViews: profileData.view_count || 0,
            totalBoards: boardStats.length,
            totalBoardFollowers,
            profileViewsThisWeek: viewsThisWeek,
            pinsThisWeek,
            followersThisWeek,
            viewsTrend: viewsThisWeek > 0 ? 'up' : 'same',
            pinsTrend: pinsThisWeek > pinsLastWeek ? 'up' : pinsThisWeek < pinsLastWeek ? 'down' : 'same',
            followersTrend: followersThisWeek > followersLastWeek ? 'up' : followersThisWeek < followersLastWeek ? 'down' : 'same'
          });
        }
      } catch (err) {
        console.error('Error loading insights:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, [router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Insights</h1>
          <p className="text-gray-600">Track your profile performance and see who's engaging with you</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <FiMapPin className="w-8 h-8 text-red-500" />
              {stats.pinsTrend === 'up' && <FiArrowUp className="w-5 h-5 text-green-500" />}
              {stats.pinsTrend === 'down' && <FiArrowDown className="w-5 h-5 text-red-500" />}
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalPins}</p>
            <p className="text-sm text-gray-500">Total Pins</p>
            {stats.pinsThisWeek > 0 && (
              <p className="text-xs text-green-600 mt-1">+{stats.pinsThisWeek} this week</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <FiEye className="w-8 h-8 text-blue-500" />
              {stats.viewsTrend === 'up' && <FiArrowUp className="w-5 h-5 text-green-500" />}
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalViews}</p>
            <p className="text-sm text-gray-500">Profile Views</p>
            {stats.profileViewsThisWeek > 0 && (
              <p className="text-xs text-green-600 mt-1">+{stats.profileViewsThisWeek} this week</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <FiHeart className="w-8 h-8 text-pink-500" />
              {stats.followersTrend === 'up' && <FiArrowUp className="w-5 h-5 text-green-500" />}
              {stats.followersTrend === 'down' && <FiArrowDown className="w-5 h-5 text-red-500" />}
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBoardFollowers}</p>
            <p className="text-sm text-gray-500">Board Followers</p>
            {stats.followersThisWeek > 0 && (
              <p className="text-xs text-green-600 mt-1">+{stats.followersThisWeek} this week</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <FiGrid className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBoards}</p>
            <p className="text-sm text-gray-500">Your Boards</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <FiUsers className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{new Set(pinners.map(p => p.id)).size}</p>
            <p className="text-sm text-gray-500">Unique Pinners</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['overview', 'pinners', 'boards', 'followers', 'viewers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'followers' && stats.totalBoardFollowers > 0 && (
                <span className="ml-1 bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full text-xs">
                  {stats.totalBoardFollowers}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Pinners */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiMapPin className="text-red-500" /> Recent Pinners
              </h2>
              {pinners.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No one has pinned you yet</p>
              ) : (
                <div className="space-y-3">
                  {pinners.slice(0, 5).map((pinner, idx) => (
                    <Link
                      key={`${pinner.id}-${idx}`}
                      href={`/profile/${pinner.username}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                        {pinner.profile_photo ? (
                          <Image
                            src={pinner.profile_photo}
                            alt={pinner.name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold">{pinner.name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{pinner.name}</p>
                        <p className="text-xs text-gray-500 truncate">to "{pinner.board_title}"</p>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(pinner.pinned_at)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {pinners.length > 5 && (
                <button
                  onClick={() => setActiveTab('pinners')}
                  className="w-full mt-4 text-sm text-blue-600 hover:underline"
                >
                  View all {pinners.length} pinners →
                </button>
              )}
            </div>

            {/* Board Performance */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiGrid className="text-purple-500" /> Your Boards
              </h2>
              {boards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You haven't created any boards yet</p>
                  <Link
                    href="/boards"
                    className="text-blue-600 hover:underline"
                  >
                    Create your first board →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {boards.slice(0, 5).map((board) => (
                    <Link
                      key={board.id}
                      href={`/boards/${board.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{board.title}</p>
                        <p className="text-xs text-gray-500">
                          {board.is_public ? 'Public' : 'Private'} • {board.pin_count} pins • ❤️ {board.follower_count}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{board.follower_count}</p>
                        <p className="text-xs text-gray-500">followers</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Board Followers */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiHeart className="text-pink-500" /> Recent Followers
              </h2>
              {boardFollowers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No board followers yet</p>
              ) : (
                <div className="space-y-3">
                  {boardFollowers.slice(0, 5).map((follower, idx) => (
                    <Link
                      key={`${follower.id}-${idx}`}
                      href={`/profile/${follower.username}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center overflow-hidden">
                        {follower.profile_photo ? (
                          <Image
                            src={follower.profile_photo}
                            alt={follower.name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold">{follower.name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{follower.name}</p>
                        <p className="text-xs text-gray-500 truncate">follows "{follower.board_title}"</p>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(follower.followed_at)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {boardFollowers.length > 5 && (
                <button
                  onClick={() => setActiveTab('followers')}
                  className="w-full mt-4 text-sm text-pink-600 hover:underline"
                >
                  View all {boardFollowers.length} followers →
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pinners' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">All People Who Pinned You</h2>
            {pinners.length === 0 ? (
              <div className="text-center py-12">
                <FiMapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No one has pinned you to a board yet</p>
                <p className="text-sm text-gray-400 mt-2">Share your profile to get discovered!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinners.map((pinner, idx) => (
                  <div
                    key={`${pinner.id}-${idx}`}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <Link href={`/profile/${pinner.username}`} className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                        {pinner.profile_photo ? (
                          <Image
                            src={pinner.profile_photo}
                            alt={pinner.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">{pinner.name[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{pinner.name}</p>
                        <p className="text-sm text-gray-500">@{pinner.username}</p>
                      </div>
                    </Link>
                    <div className="text-sm text-gray-600">
                      <p>Pinned to: <Link href={`/boards/${pinner.board_id}`} className="text-blue-600 hover:underline">{pinner.board_title}</Link></p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(pinner.pinned_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'boards' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Boards Analytics</h2>
              <Link href="/boards" className="text-sm text-blue-600 hover:underline">
                Manage boards →
              </Link>
            </div>
            {boards.length === 0 ? (
              <div className="text-center py-12">
                <FiGrid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No boards created yet</p>
                <Link href="/boards" className="text-blue-600 hover:underline mt-2 inline-block">
                  Create your first board
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Board</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Pins</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Followers</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Visibility</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boards.map((board) => (
                      <tr key={board.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <Link href={`/boards/${board.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {board.title}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {board.pin_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                            ❤️ {board.follower_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            board.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {board.is_public ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-500">
                          {formatDate(board.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiHeart className="text-pink-500" /> People Following Your Boards
            </h2>
            {boardFollowers.length === 0 ? (
              <div className="text-center py-12">
                <FiHeart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No board followers yet</p>
                <p className="text-sm text-gray-400 mt-2">Share your boards to get more followers!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boardFollowers.map((follower, idx) => (
                  <div
                    key={`${follower.id}-${idx}`}
                    className="border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors"
                  >
                    <Link href={`/profile/${follower.username}`} className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center overflow-hidden">
                        {follower.profile_photo ? (
                          <Image
                            src={follower.profile_photo}
                            alt={follower.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">{follower.name[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{follower.name}</p>
                        <p className="text-sm text-gray-500">@{follower.username}</p>
                      </div>
                    </Link>
                    <div className="text-sm text-gray-600">
                      <p className="flex items-center gap-1">
                        <FiHeart className="w-3 h-3 text-pink-500" />
                        Following: <Link href={`/boards/${follower.board_id}`} className="text-blue-600 hover:underline">{follower.board_title}</Link>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(follower.followed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'viewers' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Profile Viewers</h2>
            {recentViewers.length === 0 ? (
              <div className="text-center py-12">
                <FiEye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent profile views</p>
                <p className="text-sm text-gray-400 mt-2">Views from logged-in users will appear here</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentViewers.map((view) => (
                  <Link
                    key={view.id}
                    href={`/profile/${view.viewer?.username}`}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                      {view.viewer?.profile_photo ? (
                        <Image
                          src={view.viewer.profile_photo}
                          alt={view.viewer.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold">{view.viewer?.name?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{view.viewer?.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">{formatDate(view.viewed_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
