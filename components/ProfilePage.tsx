import React, { useState, useEffect } from 'react';
import {
    User,
    Settings,
    Camera,
    ArrowLeft,
    MapPin,
    Phone,
    Key
} from 'lucide-react';
import { UserService, UserProfile } from '../store';
import { toast } from 'sonner';

interface ProfilePageProps {
    onBack: () => void;
    onProfileUpdate?: () => void;
}

type TabType = 'profile' | 'preferences';

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, onProfileUpdate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [profile, setProfile] = useState<UserProfile>(UserService.getProfile());

    const menuItems = [
        { id: 'profile', label: 'Edit Profile', icon: <User size={18} /> },
        { id: 'preferences', label: 'Preferences', icon: <Settings size={18} /> },
    ];

    const handleSave = () => {
        // Calculate initials
        const nameParts = profile.name.split(' ');
        let initials = nameParts[0].charAt(0);
        if (nameParts.length > 1) {
            initials += nameParts[nameParts.length - 1].charAt(0);
        }
        initials = initials.toUpperCase();

        const updatedProfile = { ...profile, initials };
        UserService.saveProfile(updatedProfile);
        setProfile(updatedProfile);

        if (onProfileUpdate) {
            onProfileUpdate();
        }

        toast.success("Profile Updated", { description: "Your changes have been saved successfully." });
    };

    return (
        <div className="flex-1 h-full bg-[#F8F9FD] overflow-hidden flex flex-col relative md:p-8">
            <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full h-full overflow-hidden md:bg-white md:rounded-[2.5rem] md:shadow-sm md:border md:border-slate-200">

                {/* Header Section (Simplified) */}
                <div className="p-6 md:p-10 shrink-0 border-b border-slate-100">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group font-bold text-sm"
                    >
                        <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-indigo-50 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        Back to Dashboard
                    </button>

                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-3xl font-bold border-4 border-white shadow-lg">
                                {profile.initials}
                            </div>
                            <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-md hover:scale-110 transition-transform border-2 border-white">
                                <Camera size={14} />
                            </button>
                        </div>

                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{profile.name}</h1>
                            <p className="text-slate-400 font-bold text-sm">Personal Account</p>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
                    {/* Sidebar Tabs (Simplified) */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-6 shrink-0 flex md:flex-col gap-2">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as TabType)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === item.id
                                    ? 'bg-slate-50 text-indigo-600'
                                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-700'}`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10">
                        <div className="max-w-2xl space-y-8">

                            {activeTab === 'profile' && (
                                <>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={profile.name}
                                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="tel"
                                                    value={profile.phone}
                                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Location</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={profile.location}
                                                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <h3 className="text-sm font-bold text-slate-800 mb-4">App Settings</h3>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Gemini API Key (Optional)</label>
                                                <div className="relative">
                                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                    <input
                                                        type="password"
                                                        value={profile.apiKey || ''}
                                                        onChange={(e) => setProfile({ ...profile, apiKey: e.target.value })}
                                                        placeholder="Leave empty to use default"
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 ml-1">Override the default API key for your own personal usage limits.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            onClick={handleSave}
                                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </>
                            )}

                            {activeTab === 'preferences' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">App Settings</h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-800">Bilingual Interface</h4>
                                            <p className="text-slate-500 text-xs font-medium mt-1">Show questions in both Hindi & English</p>
                                        </div>
                                        <div className="relative cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={profile.isBilingual}
                                                onChange={(e) => {
                                                    const updated = { ...profile, isBilingual: e.target.checked };
                                                    setProfile(updated);
                                                    UserService.saveProfile(updated);
                                                    if (onProfileUpdate) onProfileUpdate();
                                                }}
                                            />
                                            <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default ProfilePage;
