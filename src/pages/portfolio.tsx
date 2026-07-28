import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PublicCalendar } from "@/components/public-calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronDown, Phone, Mail, MapPin, Send, Film, X, CheckCircle2, Images, ArrowLeft } from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";

import { BASE_URL } from "@/lib/api";

const BACKEND = BASE_URL;
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

function isVideoUrl(url: string) {
    if (!url) return false;
    const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
    return VIDEO_EXTENSIONS.includes(ext);
}
function resolveUrl(url: string) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND}${url}`;
}

export default function Portfolio() {
    const [enquiryOpen, setEnquiryOpen] = useState(false);
    const [hasShownPopup, setHasShownPopup] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState<any>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const contactRef = useRef<HTMLDivElement>(null);
    const heroInView = useInView(heroRef, { amount: 0.5 });

    // Scroll-triggered popup: show when user scrolls past hero (hero leaves view)
    useEffect(() => {
        if (!heroInView && !hasShownPopup && !submitted) {
            setEnquiryOpen(true);
            setHasShownPopup(true);
        }
    }, [heroInView, hasShownPopup, submitted]);

    // Fetch public themes
    const { data: themes = [], isLoading: themesLoading } = useQuery({
        queryKey: ["public-themes"],
        queryFn: async () => {
            const res = await fetch(`${BACKEND}/api/public/themes`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    // Fetch public calendar
    const { data: calendarEvents = [] } = useQuery({
        queryKey: ["public-calendar"],
        queryFn: async () => {
            const res = await fetch(`${BACKEND}/api/public/calendar`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    const scrollToContact = () => {
        contactRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="min-h-screen bg-white">
            {/* ===== HERO SECTION ===== */}
            <div ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1920&auto=format&fit=crop')`,
                        backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)'
                    }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/80" />
                </div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="relative z-10 text-center px-6 max-w-4xl"
                >
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 text-sm font-medium mb-8 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Now accepting bookings
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[0.95]">
                        Classic
                        <span className="block text-3xl md:text-4xl lg:text-5xl font-light text-white/60 tracking-[0.3em] uppercase mt-3">
                            Function Hall
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/50 mt-8 max-w-2xl mx-auto leading-relaxed font-light">
                        Where timeless elegance meets modern celebrations. Create unforgettable moments in our beautifully crafted spaces.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                        <Button
                            onClick={() => setEnquiryOpen(true)}
                            className="h-14 px-10 text-base font-semibold bg-white text-slate-900 hover:bg-white/90 rounded-full shadow-2xl shadow-white/10"
                        >
                            Enquire Now
                        </Button>
                        <Button
                            onClick={scrollToContact}
                            variant="outline"
                            className="h-14 px-10 text-base font-semibold border-white/20 text-white hover:bg-white/10 rounded-full backdrop-blur-sm"
                        >
                            View Availability
                        </Button>
                    </div>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    animate={{ y: [0, 12, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40"
                >
                    <ChevronDown className="w-8 h-8" />
                </motion.div>
            </div>

            {/* ===== THEMES GALLERY ===== */}
            <section className="py-20 md:py-28 px-6 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.7 }}
                        className="text-center mb-16"
                    >
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Our Collection</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">Decoration Themes</h2>
                        <p className="text-gray-500 mt-4 max-w-xl mx-auto text-lg font-light">
                            Choose from our curated selection of exquisite themes to make your event truly special
                        </p>
                    </motion.div>

                    {themesLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {themes.map((theme: any, i: number) => {
                                const mediaUrl = resolveUrl(theme.imageUrl || '');
                                const isVideo = isVideoUrl(theme.imageUrl || '');
                                const mediaCount = theme.media?.length || 0;
                                return (
                                    <motion.div
                                        key={theme.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1, duration: 0.5 }}
                                        className="group rounded-3xl overflow-hidden bg-white shadow-md hover:shadow-2xl transition-all duration-500 border border-gray-100 cursor-pointer"
                                        onClick={() => setSelectedTheme(theme)}
                                    >
                                        <div className="h-64 overflow-hidden relative">
                                            {isVideo ? (
                                                <>
                                                    <video
                                                        src={mediaUrl} muted loop playsInline
                                                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                                        onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                    <div className="absolute bottom-3 left-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                        <Film className="w-3 h-3" /> Video
                                                    </div>
                                                </>
                                            ) : (
                                                <img
                                                    src={mediaUrl || "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop"}
                                                    alt={theme.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop" }}
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            {/* Media count badge */}
                                            {mediaCount > 1 && (
                                                <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Images className="w-3 h-3" /> {mediaCount} photos
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-slate-600 transition-colors">{theme.name}</h3>
                                            <p className="text-gray-500 text-sm mt-2 line-clamp-2 leading-relaxed">{theme.description}</p>
                                            {mediaCount > 1 && (
                                                <p className="text-primary text-xs font-semibold mt-3 tracking-wide uppercase">Click to view gallery →</p>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ===== THEME GALLERY LIGHTBOX ===== */}
            <Dialog open={!!selectedTheme} onOpenChange={open => { if (!open) setSelectedTheme(null); }}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-5xl rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="h-2 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700" />
                    <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        {selectedTheme && (
                            <>
                                <DialogHeader className="mb-6">
                                    <DialogTitle className="text-3xl font-bold text-slate-800">{selectedTheme.name}</DialogTitle>
                                    <p className="text-gray-500 mt-2 text-base leading-relaxed">{selectedTheme.description}</p>
                                </DialogHeader>

                                {selectedTheme.media?.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {selectedTheme.media.map((m: any, idx: number) => {
                                            const url = resolveUrl(m.mediaUrl);
                                            const isVid = isVideoUrl(m.mediaUrl);
                                            return (
                                                <motion.div
                                                    key={m.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                                                    className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 group"
                                                >
                                                    {isVid ? (
                                                        <video src={url} controls playsInline className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img
                                                            src={url}
                                                            alt={`${selectedTheme.name} ${idx + 1}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600" }}
                                                        />
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <Images className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                        <p>No additional media for this theme.</p>
                                    </div>
                                )}

                                <div className="mt-6 text-center">
                                    <Button
                                        onClick={() => { setSelectedTheme(null); setEnquiryOpen(true); }}
                                        className="h-12 px-8 rounded-full font-semibold shadow-lg bg-slate-800 hover:bg-slate-700 text-white"
                                    >
                                        <Send className="w-4 h-4 mr-2" /> Enquire About This Theme
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== AVAILABILITY CALENDAR ===== */}
            <section className="py-20 md:py-28 px-6 bg-white">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.7 }}
                        className="text-center mb-12"
                    >
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Plan Ahead</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">Check Availability</h2>
                        <p className="text-gray-500 mt-4 max-w-xl mx-auto text-lg font-light">
                            Browse our calendar to find the perfect date for your event
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <PublicCalendar events={calendarEvents} />
                    </motion.div>
                </div>
            </section>

            {/* ===== CONTACT / CTA SECTION ===== */}
            <section ref={contactRef} className="py-20 md:py-28 px-6 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.7 }}
                    >
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Get in Touch</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready to Book?</h2>
                        <p className="text-slate-400 mt-4 max-w-xl mx-auto text-lg font-light">
                            Fill out our enquiry form and our team will get back to you within 24 hours
                        </p>
                        <Button
                            onClick={() => { setEnquiryOpen(true); setSubmitted(false); }}
                            className="mt-10 h-14 px-12 text-base font-semibold bg-white text-slate-900 hover:bg-white/90 rounded-full shadow-2xl shadow-white/10"
                        >
                            <Send className="w-5 h-5 mr-2" />
                            Enquire Now
                        </Button>

                        <div className="flex flex-col sm:flex-row gap-8 justify-center mt-16 text-slate-400">
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-slate-500" />
                                <span className="font-medium">+91 94484 41633</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-slate-500" />
                                <span className="font-medium">classicfunctionhallbly@gmail.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-slate-500" />
                                <span className="font-medium">Classic A/C Function Hall, 5WG7+4CQ, Ballari, Karnataka 583103</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-6 bg-slate-950 text-center text-slate-500 text-sm">
                © {new Date().getFullYear()} Classic Function Hall. All rights reserved.
            </footer>

            {/* ===== ENQUIRY POPUP DIALOG ===== */}
            <EnquiryDialog open={enquiryOpen} onOpenChange={setEnquiryOpen} submitted={submitted} setSubmitted={setSubmitted} />
        </div>
    );
}

// --- Enquiry Form Dialog ---
function EnquiryDialog({ open, onOpenChange, submitted, setSubmitted }: {
    open: boolean; onOpenChange: (o: boolean) => void; submitted: boolean; setSubmitted: (s: boolean) => void;
}) {
    const [form, setForm] = useState({ name: "", phone: "", startDate: "", endDate: "", notes: "" });

    const submit = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${BACKEND}/api/public/enquiry`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            setSubmitted(true);
            setForm({ name: "", phone: "", startDate: "", endDate: "", notes: "" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-3xl border-0 shadow-2xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
                {/* Top accent */}
                <div className="h-2 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 flex-shrink-0" />

                <div className="p-6 md:p-8 overflow-y-auto flex-1">
                    {submitted ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">Thank You!</h3>
                            <p className="text-gray-500 mt-2">We've received your enquiry and will contact you within 24 hours.</p>
                            <Button
                                onClick={() => onOpenChange(false)}
                                className="mt-6 rounded-full px-8"
                            >
                                Continue Exploring
                            </Button>
                        </motion.div>
                    ) : (
                        <>
                            <DialogHeader className="mb-5">
                                <DialogTitle className="text-2xl font-bold text-slate-800">Send us an Enquiry</DialogTitle>
                                <p className="text-gray-500 text-sm mt-1">Fill in your details and we'll get back to you shortly</p>
                            </DialogHeader>

                            <form onSubmit={(e) => { 
                                 e.preventDefault(); 
                                 if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
                                     alert("End Date cannot be before Start Date.");
                                     return;
                                 }
                                 submit.mutate(); 
                             }} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pub-name" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Full Name *</Label>
                                        <Input
                                            id="pub-name" required placeholder="John Doe"
                                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="h-11 rounded-xl bg-gray-50 border-gray-200"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pub-phone" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phone *</Label>
                                        <Input
                                            id="pub-phone" required placeholder="+91 98765 43210"
                                            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                            className="h-11 rounded-xl bg-gray-50 border-gray-200"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pub-start" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Preferred Start Date</Label>
                                        <Input
                                            id="pub-start" type="date"
                                            value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                                            className="h-11 rounded-xl bg-gray-50 border-gray-200"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pub-end" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Preferred End Date</Label>
                                        <Input
                                            id="pub-end" type="date"
                                            value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                                            className="h-11 rounded-xl bg-gray-50 border-gray-200"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="pub-notes" className="text-xs font-semibold uppercase tracking-wider text-gray-500">What are you looking for?</Label>
                                    <Textarea
                                        id="pub-notes" placeholder="Tell us about your event, expected guests, any special requirements..."
                                        value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                        className="resize-none h-24 rounded-xl bg-gray-50 border-gray-200"
                                    />
                                </div>
                                <Button type="submit" disabled={submit.isPending} className="w-full h-12 text-base font-semibold rounded-xl shadow-lg mt-2">
                                    {submit.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                                    Submit Enquiry
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
