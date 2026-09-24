import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Calendar, Clock, MapPin, Users, Award, 
  ArrowRight, CheckCircle2, ChevronRight, X, Heart, 
  Share2, ShieldCheck, Sparkles, Building, ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { Initiative, VolunteerTeam, Department, HomeSettings } from '../types';

interface OpportunitiesPageProps {
  initiatives: Initiative[];
  teams?: VolunteerTeam[];
  departments?: Department[];
  settings?: HomeSettings;
  lang?: 'ar' | 'en';
  onBackToHome: () => void;
  onJoinOpportunity: (opportunity: Initiative) => void;
  onOpenLogin?: (role: string) => void;
}

export const OpportunitiesPage: React.FC<OpportunitiesPageProps> = ({
  initiatives = [],
  teams = [],
  departments = [],
  settings,
  lang = 'ar',
  onBackToHome,
  onJoinOpportunity,
  onOpenLogin
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all'); // ميدانية / عن بعد
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // متاحة / مكتملة
  
  // Selected Opportunity for Details Modal
  const [selectedOpportunity, setSelectedOpportunity] = useState<Initiative | null>(null);

  // Extract available categories & cities dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    initiatives.forEach(init => {
      const cat = (init as any).category || (init as any).domain || 'خدمة ضيوف الرحمن والمجتمع';
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [initiatives]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    initiatives.forEach(init => {
      if (init.place) {
        const city = init.place.includes('مكة') ? 'مكة المكرمة' : 
                     init.place.includes('العسيلة') ? 'العسيلة' :
                     init.place.includes('المشاعر') ? 'المشاعر المقدسة' : init.place.split('-')[0].trim();
        if (city) set.add(city);
      }
    });
    return Array.from(set);
  }, [initiatives]);

  // Filtered Opportunities
  const filteredOpportunities = useMemo(() => {
    return initiatives.filter(opp => {
      const matchSearch = 
        !searchTerm.trim() ||
        (opp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.place || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.opportunityCode || '').toLowerCase().includes(searchTerm.toLowerCase());

      const oppCategory = (opp as any).category || (opp as any).domain || 'خدمة ضيوف الرحمن والمجتمع';
      const matchCategory = selectedCategory === 'all' || oppCategory === selectedCategory;

      const matchCity = selectedCity === 'all' || (opp.place && opp.place.includes(selectedCity));

      const isRemote = (opp as any).isRemote || opp.place?.includes('عن بعد');
      const matchType = selectedType === 'all' || 
        (selectedType === 'remote' && isRemote) || 
        (selectedType === 'field' && !isRemote);

      const isFull = (opp.acceptedVolunteerIds?.length || 0) >= (opp.neededCount || 10);
      const isAvailable = opp.registrationStatus === 'open' && !isFull;
      const matchStatus = selectedStatus === 'all' || 
        (selectedStatus === 'available' && isAvailable) ||
        (selectedStatus === 'full' && (!isAvailable || isFull));

      return matchSearch && matchCategory && matchCity && matchType && matchStatus;
    });
  }, [initiatives, searchTerm, selectedCategory, selectedCity, selectedType, selectedStatus]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans pb-24">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToHome}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  ر
                </div>
              )}
              <div className="hidden md:block text-right">
                <span className="font-extrabold text-sm block leading-tight text-slate-800 dark:text-white">
                  {settings?.associationNameAr || 'جمعية ريادة العطاء لخدمة الإنسان'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block">
                  منصة الفرص والمبادرات التطوعية
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLogin && (
              <button
                onClick={() => onOpenLogin('volunteer')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
              >
                {lang === 'ar' ? 'تسجيل دخول المتطوعين' : 'Volunteer Login'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white py-14 sm:py-20 overflow-hidden shadow-lg">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{initiatives.length} فرصة تطوعية ومبادرة مجتمعية متاحة</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            الفرص التطوعية المتاحة
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm lg:text-base text-emerald-100 font-medium leading-relaxed">
            استكشف الفرص والمبادرات التطوعية المجتمعية وسجّل مهاراتك وشغفك لتكون جزءاً من صناعة الأثر الخيري في خدمة الإنسان بمكة المكرمة.
          </p>
        </div>
      </div>

      {/* Main Content & Search Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Filters Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم الفرصة، المدينة، أو الكود..."
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">كافة المجالات</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">كافة المدن / المواقع</option>
                <option value="مكة المكرمة">مكة المكرمة</option>
                <option value="العسيلة">مخطط العسيلة</option>
                <option value="المشاعر">المشاعر المقدسة</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Opportunity Type Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">نوع الفرصة (الكل)</option>
                <option value="field">فرص ميدانية</option>
                <option value="remote">فرص عن بعد</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">حالة التسجيل (الكل)</option>
                <option value="available">متاحة للتسجيل</option>
                <option value="full">مكتملة العدد</option>
              </select>
            </div>
          </div>

          {/* Quick summary line */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span>
              عرض <strong>{filteredOpportunities.length}</strong> فرصة تطوعية
            </span>
            {(searchTerm || selectedCategory !== 'all' || selectedCity !== 'all' || selectedType !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedCity('all');
                  setSelectedType('all');
                  setSelectedStatus('all');
                }}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>
        </div>

        {/* Opportunities Grid */}
        <div className="mt-8">
          {filteredOpportunities.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                لا توجد فرص مطابقة للبحث
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                جرب تغيير معايير البحث أو اختيار مدينة أو مجال آخر للعثور على الفرص المناسبة لك.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredOpportunities.map(opp => {
                const totalNeeded = opp.neededCount || 10;
                const accepted = opp.acceptedVolunteerIds?.length || opp.acceptedCount || 0;
                const remaining = Math.max(0, totalNeeded - accepted);
                const percent = Math.min(100, Math.round((accepted / totalNeeded) * 100));
                const isFull = accepted >= totalNeeded || opp.registrationStatus === 'closed' || opp.registrationStatus === 'full';
                const isRemote = (opp as any).isRemote || opp.place?.includes('عن بعد');
                const oppCategory = (opp as any).category || (opp as any).domain || 'خدمة المجتمع';
                const volunteerHours = (opp as any).hours || opp.points || 4;

                const defaultImages = [
                  "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&h=500&fit=crop",
                  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=500&fit=crop",
                  "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=500&fit=crop",
                  "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&h=500&fit=crop"
                ];
                const coverImage = (opp as any).imageUrl || defaultImages[Math.abs(opp.id.charCodeAt(opp.id.length - 1)) % defaultImages.length];

                return (
                  <div
                    key={opp.id}
                    className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image & Tags */}
                      <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <img
                          src={coverImage}
                          alt={opp.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>

                        {/* Top Badges */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shadow-md ${
                            isFull 
                              ? 'bg-rose-600 text-white' 
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {isFull ? 'مكتملة المقاعد' : 'متاحة للتسجيل'}
                          </span>

                          {isRemote && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-md">
                              عن بعد
                            </span>
                          )}
                        </div>

                        {/* Domain Tag */}
                        <div className="absolute bottom-3 right-3">
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 backdrop-blur-md">
                            {oppCategory}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-3.5">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                            كود الفرصة: {opp.opportunityCode || opp.id.toUpperCase()}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-600 transition-colors">
                            {opp.name}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {opp.description || 'مبادرة تطوعية تهدف لتقديم أفضل الخدمات للمستفيدين وضيوف الرحمن.'}
                        </p>

                        {/* Opportunity Specs */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{opp.place || 'مكة المكرمة'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{volunteerHours} ساعات تطوعية</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{opp.date}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Users className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>متبقي {remaining} من {totalNeeded}</span>
                          </div>
                        </div>

                        {/* Registration Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span>نسبة اكتمال التسجيل</span>
                            <span className="font-mono">{percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-5 pt-0 flex gap-2">
                      <button
                        onClick={() => setSelectedOpportunity(opp)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all text-center cursor-pointer"
                      >
                        تفاصيل الفرصة
                      </button>

                      <button
                        disabled={isFull}
                        onClick={() => onJoinOpportunity(opp)}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all text-center cursor-pointer ${
                          isFull
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isFull ? 'اكتمل التسجيل' : 'الانضمام للفرصة'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* OPPORTUNITY DETAILS MODAL */}
      {/* ------------------------------------------------------------------- */}
      {selectedOpportunity && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  كود الفرصة: {selectedOpportunity.opportunityCode || selectedOpportunity.id.toUpperCase()}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {selectedOpportunity.name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedOpportunity(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <span className="text-slate-400 text-[10px] block mb-0.5">الموقع</span>
                <strong className="text-slate-800 dark:text-white truncate block">{selectedOpportunity.place}</strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <span className="text-slate-400 text-[10px] block mb-0.5">الساعات المعتمدة</span>
                <strong className="text-emerald-600 font-black font-mono text-sm block">{(selectedOpportunity as any).hours || selectedOpportunity.points || 4} ساعات</strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <span className="text-slate-400 text-[10px] block mb-0.5">المقاعد المطلوبة</span>
                <strong className="text-slate-800 dark:text-white font-mono text-sm block">{selectedOpportunity.neededCount || 10} متطوع</strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <span className="text-slate-400 text-[10px] block mb-0.5">المسجلون حالياً</span>
                <strong className="text-emerald-600 font-mono text-sm block">{selectedOpportunity.acceptedVolunteerIds?.length || selectedOpportunity.acceptedCount || 0} متطوع</strong>
              </div>
            </div>

            {/* Full Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                الوصف الكامل للفرصة
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                {selectedOpportunity.description || 'مبادرة رائدة تهدف إلى المساهمة الفاعلة في البرامج التنموية والإنسانية التي تقدمها الجمعية.'}
              </p>
            </div>

            {/* Tasks & Responsibilities */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                المهام التطوعية المطلوبة
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>المشاركة الميدانية الفعالة في تنفيذ محاور الفرصة</span>
                </li>
                <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>تنظيم وتوجيه المستفيدين وضيوف الرحمن</span>
                </li>
                <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>الالتزام بمواعيد الحضور والمغادرة وتوجيهات المشرف</span>
                </li>
                <li className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>تمثيل الجمعية بالصورة المشرفة واللباس المعتمد</span>
                </li>
              </ul>
            </div>

            {/* Conditions & Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white">الشروط والأحكام</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>العمر 18 سنة فما فوق</li>
                  <li>اللياقة الصحية المناسبة للمهام الميدانية</li>
                  <li>الهوية الوطنية أو الإقامة سارية المفعول</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white">المزايا والحوافز</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>توثيق الساعات في المنصة الوطنية للعمل التطوعي</li>
                  <li>شهادة تطوع رقمية معتمدة من الجمعية</li>
                  <li>نقاط إضافية في سجل فارس التطوع</li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOpportunity(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                إغلاق
              </button>

              <button
                type="button"
                onClick={() => {
                  const opp = selectedOpportunity;
                  setSelectedOpportunity(null);
                  onJoinOpportunity(opp);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                الانضمام لهذه الفرصة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
