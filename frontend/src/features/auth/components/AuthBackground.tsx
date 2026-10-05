import { Activity, BarChart3, CheckCircle2, CloudSun, LayoutDashboard, Plus } from 'lucide-react';
import { Github } from '@/components/ui/Github';

export function AuthBackground() {
    return (
        <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f4f6f8_45%,#e8edf2_100%)]"
        >
            <div className="auth-glow auth-glow-primary absolute -left-24 -top-28 size-[28rem] rounded-full bg-sky-300/25 blur-3xl" />
            <div className="auth-glow auth-glow-secondary absolute -bottom-40 -right-20 size-[32rem] rounded-full bg-violet-300/20 blur-3xl" />

            <div className="auth-dashboard-scene absolute left-1/2 top-1/2 h-[760px] w-[1180px] -translate-x-1/2 -translate-y-1/2 rotate-[-3deg] overflow-hidden rounded-[2rem] border border-white/90 bg-white/75 shadow-[0_40px_120px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xs">
                <div className="flex h-[76px] items-center border-b border-slate-200/80 bg-white/85 px-8">
                    <div className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                            <LayoutDashboard className="size-4" />
                        </span>
                        Dashboard
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <div className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-lg shadow-slate-900/10">
                            <Plus className="size-4" />
                            Add Widget
                        </div>
                        <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600">
                            <span className="flex size-6 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-semibold text-white">
                                U
                            </span>
                            Mon espace
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-5 p-8">
                    <div className="col-span-7 h-64 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xs">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Vue d’ensemble</p>
                                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                                    12 480
                                </p>
                            </div>
                            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <BarChart3 className="size-5" />
                            </span>
                        </div>
                        <div className="mt-9 flex h-28 items-end gap-3 border-b border-slate-100">
                            {[42, 68, 51, 84, 62, 94, 74, 88, 66, 98].map((height, index) => (
                                <span
                                    key={index}
                                    className="auth-chart-bar flex-1 rounded-t-md bg-slate-800/80"
                                    style={{
                                        height: `${height}%`,
                                        animationDelay: `${index * 90}ms`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="col-span-5 h-64 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Météo</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">
                                    Aujourd’hui
                                </p>
                            </div>
                            <CloudSun className="size-9 text-amber-500" />
                        </div>
                        <div className="mt-8 flex items-end gap-3">
                            <span className="text-6xl font-semibold tracking-tighter text-slate-900">
                                21°
                            </span>
                            <span className="mb-2 text-sm text-slate-500">Ensoleillé</span>
                        </div>
                        <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="auth-shimmer h-full w-3/4 rounded-full bg-gradient-to-r from-amber-300 to-orange-400" />
                        </div>
                    </div>

                    <div className="col-span-4 h-48 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Github className="size-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">GitHub</p>
                                <p className="text-xs text-slate-500">Activité récente</p>
                            </div>
                        </div>
                        <div className="mt-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="size-4 text-green-500" />
                                <span className="text-sm text-slate-600">CI/CD Pipeline</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="size-4 text-green-500" />
                                <span className="text-sm text-slate-600">Tests unitaires</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-4 h-48 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Activity className="size-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Performances</p>
                                <p className="text-xs text-slate-500">Temps de réponse</p>
                            </div>
                        </div>
                        <div className="mt-6 flex items-end gap-2">
                            <span className="text-4xl font-semibold text-slate-900">42</span>
                            <span className="mb-1 text-sm font-medium text-slate-500">ms</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-green-600">-12ms depuis hier</p>
                    </div>

                    <div className="col-span-4 h-48 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xs">
                        <div className="flex h-full flex-col justify-center">
                            <div className="flex items-center gap-2">
                                <span className="relative flex size-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex size-3 rounded-full bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-medium text-slate-700">
                                    Système opérationnel
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                Tous les services fonctionnent normalement sans aucune interruption
                                détectée.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
