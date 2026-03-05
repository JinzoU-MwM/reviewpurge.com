type Props = {
    icon: string;
    label: string;
    value: string;
    detail?: string;
};

export function StatCard({ icon, label, value, detail }: Props) {
    return (
        <div className="stat-card">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-lg">
                    {icon}
                </span>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
                    {detail && (
                        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
