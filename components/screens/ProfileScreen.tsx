import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, Settings, Edit, Trophy, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { PassportGrid } from "@/components/passport/PassportGrid";
import { getPassportData } from "@/lib/actions";

interface ProfileScreenProps {
    onNavigate: (screen: string, data?: any) => void;
    currentUser?: any;
}

export function ProfileScreen({ onNavigate, currentUser }: ProfileScreenProps) {
    const [passportData, setPassportData] = useState<any[]>([]);

    useEffect(() => {
        if (currentUser?.id) {
            getPassportData(currentUser.id).then(setPassportData);
        }
    }, [currentUser?.id]);

    return (
        <div className="bg-[#F9F7F2] dark:bg-[#1a211e] min-h-screen flex flex-col relative overflow-x-hidden text-[#1e2b25] dark:text-gray-100 font-sans pb-32">

            {/* Header Navigation */}
            <div className="sticky top-0 z-50 bg-[#F9F7F2]/95 dark:bg-[#1a211e]/95 backdrop-blur-sm border-b border-primary/10 px-4 py-3 flex items-center justify-between">
                <button onClick={() => onNavigate('home')} className="text-[#1e2b25] dark:text-white p-2 rounded-full hover:bg-primary/10 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="font-serif text-xl font-medium tracking-wide text-[#1e2b25] dark:text-white">El Meu Quadern</h2>
                <button className="text-[#1e2b25] dark:text-white p-2 rounded-full hover:bg-primary/10 transition-colors">
                    <Settings className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col gap-6 pb-24">

                {/* User Profile Section */}
                <div className="flex flex-col items-center pt-6 px-4">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full p-1 border-[3px] border-primary bg-white shadow-sm">
                            <img
                                alt="Profile picture"
                                className="w-full h-full object-cover rounded-full"
                                src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop"} // Fallback image similar to HTML ref
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full border-2 border-[#F9F7F2] dark:border-[#1a211e] shadow-sm">
                            <Edit className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <h1 className="font-serif text-3xl font-bold text-[#1e2b25] dark:text-white leading-tight">
                            {currentUser?.username || "Explorador Anònim"}
                        </h1>
                        <p className="font-serif italic text-primary text-lg mt-1">
                            {currentUser?.level >= 3 ? "Naturalista Expert" : "Explorador Novell"}
                        </p>
                    </div>
                </div>

                {/* Stats Dashboard */}
                <div className="px-4">
                    <div className="bg-white dark:bg-white/5 rounded-2xl p-6 shadow-[0_2px_8px_-2px_rgba(86,143,114,0.15)] border border-primary/10 flex justify-between divide-x divide-primary/10">
                        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2">
                            <span className="font-serif text-3xl font-bold text-primary">{currentUser?.visitedCount || 0}</span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Llocs Visitats</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2">
                            <span className="font-serif text-3xl font-bold text-primary">{currentUser?.xp || 450}</span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Punts Totals</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2">
                            <span className="font-serif text-3xl font-bold text-primary">#42</span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Ranquing</span>
                        </div>
                    </div>
                </div>

                {/* Passport Section */}
                <div className="px-4 mt-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif text-2xl font-bold text-[#1e2b25] dark:text-white italic">El Teu Passaport</h3>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">Recent</span>
                    </div>

                    {/* Stamps Grid Container */}
                    <PassportGrid initialStamps={passportData} />
                </div>

                {/* Latest Achievement Banner */}
                <div className="px-4">
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                        <div className="bg-white dark:bg-white/10 p-2 rounded-full shadow-sm">
                            <Trophy className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-serif font-bold text-[#1e2b25] dark:text-white">Explorador de Cims</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Has visitat 5 cims diferents aquest mes!</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                </div>

            </main>
        </div>
    );
}


